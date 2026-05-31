/**
 * Next.js API Route — Proxy Multimodal vers RunPod Serverless
 *
 * Reçoit les requêtes multipart/form-data du frontend,
 * les convertit au format RunPod {"input": {...}} et
 * transmet la réponse. La clé API RunPod reste côté serveur.
 */

const RUNPOD_API_KEY    = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT   = process.env.RUNPOD_ENDPOINT_ID || "hkc2dat65390jw";
const RUNPOD_SYNC_URL   = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/runsync`;

/** Convertit un File/Blob en string base64 */
async function fileToBase64(file) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

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

    // ── Appel RunPod runsync ─────────────────────────────────────────────────
    const runpodRes = await fetch(`${RUNPOD_SYNC_URL}?timeout=120`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({ input: jobInput }),
    });

    const runpodData = await runpodRes.json();

    if (!runpodRes.ok) {
      console.error("[hemo proxy] RunPod HTTP error:", runpodRes.status, runpodData);
      return Response.json(
        { error: `RunPod gateway error (${runpodRes.status})`, detail: runpodData },
        { status: runpodRes.status }
      );
    }

    // ── Unwrap le format RunPod {id, status, output} ──────────────────────
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

    // IN_QUEUE ou autre statut inattendu
    console.warn("[hemo proxy] Unexpected RunPod status:", runpodData.status);
    return Response.json(runpodData, { status: 202 });

  } catch (err) {
    console.error("[hemo proxy] Internal error:", err);
    return Response.json(
      { error: "Internal proxy error", detail: err.message },
      { status: 500 }
    );
  }
}
