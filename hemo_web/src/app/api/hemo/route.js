/**
 * Next.js API Route — Proxy Multimodal vers RunPod Serverless
 *
 * Reçoit les requêtes multipart/form-data du frontend,
 * les convertit au format RunPod {"input": {...}} et
 * transmet la réponse. La clé API RunPod reste côté serveur.
 */

const RUNPOD_API_KEY    = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT   = process.env.RUNPOD_ENDPOINT_ID || "8b5zubt1yzl0or";
const RUNPOD_SYNC_URL   = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/runsync`;
// Async URL for polling when runsync times out
const RUNPOD_RUN_URL    = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/run`;
const RUNPOD_STATUS_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/status`;

/** Convertit un File/Blob en string base64 */
async function fileToBase64(file) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

/** Poll RunPod status until COMPLETED or FAILED (max 90s) */
async function pollRunPodStatus(jobId, maxWaitMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 2500)); // poll every 2.5s
    const res = await fetch(`${RUNPOD_STATUS_URL}/${jobId}`, {
      headers: { "Authorization": `Bearer ${RUNPOD_API_KEY}` },
    });
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status === "COMPLETED") return data;
    if (data.status === "FAILED")    return data;
  }
  throw new Error("RunPod job timed out after 90 seconds");
}

export const maxDuration = 120; // Vercel: allow up to 120s

export async function POST(request) {
  if (!RUNPOD_API_KEY) {
    return Response.json(
      { error: "RUNPOD_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let jobInput = {};

    // ── Multipart form-data (texte + fichiers optionnels) ───────────────────
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const text       = formData.get("text")         || "";
      const rawHistory = formData.get("history_json") || "[]";
      const tts        = formData.get("tts")          || "false";
      const voiceType  = formData.get("voice_type")   || "lila";
      const username   = formData.get("username")     || "";

      let history = [];
      try { history = JSON.parse(rawHistory); } catch {}

      jobInput = {
        action:     "multimodal",
        text,
        history,
        tts:        tts === "true",
        voice_type: voiceType,
        username,
      };

      // Image en base64
      const imageFile = formData.get("image");
      if (imageFile && imageFile.size > 0) {
        jobInput.image_b64 = await fileToBase64(imageFile);
      }

      // Audio en base64
      const audioFile = formData.get("audio");
      if (audioFile && audioFile.size > 0) {
        jobInput.audio_b64 = await fileToBase64(audioFile);
      }

    // ── JSON simple (ex: chat) ───────────────────────────────────────────────
    } else {
      jobInput = await request.json();
      if (!jobInput.action) jobInput.action = "multimodal";
    }

    // ── Appel RunPod runsync (timeout 60s) ───────────────────────────────────
    // runsync has a max timeout of 90s on RunPod. We try sync first.
    let runpodData;
    const syncRes = await fetch(`${RUNPOD_SYNC_URL}?timeout=60`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({ input: jobInput }),
    });

    runpodData = await syncRes.json();

    if (!syncRes.ok) {
      console.error("[hemo proxy] RunPod HTTP error:", syncRes.status, runpodData);
      return Response.json(
        { error: `RunPod gateway error (${syncRes.status})`, detail: runpodData },
        { status: syncRes.status }
      );
    }

    // ── If job is still IN_QUEUE (cold start), poll async ───────────────────
    if (runpodData.status === "IN_QUEUE" || runpodData.status === "IN_PROGRESS") {
      console.log(`[hemo proxy] Job ${runpodData.id} in status ${runpodData.status}, polling...`);
      try {
        runpodData = await pollRunPodStatus(runpodData.id, 90000);
      } catch (pollErr) {
        return Response.json(
          { error: pollErr.message, hint: "Le worker RunPod est en cours de démarrage (cold start). Réessayez dans 10 secondes." },
          { status: 503 }
        );
      }
    }

    // ── Unwrap le format RunPod {id, status, output} ─────────────────────────
    if (runpodData.status === "COMPLETED" && runpodData.output !== undefined) {
      return Response.json(runpodData.output);
    }

    if (runpodData.status === "FAILED") {
      console.error("[hemo proxy] RunPod job failed:", runpodData.error);
      return Response.json(
        { error: "RunPod job failed", detail: runpodData.error },
        { status: 500 }
      );
    }

    // Statut inattendu — retourner quand même pour ne pas bloquer le frontend
    console.warn("[hemo proxy] Unexpected RunPod status:", runpodData.status);
    return Response.json(
      { error: `Statut inattendu : ${runpodData.status}. Le worker est peut-être en cours de démarrage.` },
      { status: 503 }
    );

  } catch (err) {
    console.error("[hemo proxy] Internal error:", err);
    return Response.json(
      { error: "Internal proxy error", detail: err.message },
      { status: 500 }
    );
  }
}
