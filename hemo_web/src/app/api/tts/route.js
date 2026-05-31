/**
 * Next.js API Route — Proxy TTS vers RunPod Serverless
 *
 * Reçoit les requêtes JSON de synthèse vocale,
 * les transmet à RunPod et retourne l'audio base64.
 * Supporte le polling async si le worker est en cold start.
 */

const RUNPOD_API_KEY    = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT   = process.env.RUNPOD_ENDPOINT_ID || "hkc2dat65390jw";
const RUNPOD_SYNC_URL   = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/runsync`;
const RUNPOD_STATUS_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/status`;

export const maxDuration = 90;

async function pollStatus(jobId, maxWaitMs = 80000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 2500));
    const res = await fetch(`${RUNPOD_STATUS_URL}/${jobId}`, {
      headers: { "Authorization": `Bearer ${RUNPOD_API_KEY}` },
    });
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status === "COMPLETED" || data.status === "FAILED") return data;
  }
  throw new Error("TTS timed out");
}

export async function POST(request) {
  if (!RUNPOD_API_KEY) {
    return Response.json(
      { error: "RUNPOD_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();

    const jobInput = {
      action:     "tts",
      message:    body.message    || "",
      voice_type: body.voice_type || "lila",
    };

    if (!jobInput.message.trim()) {
      return Response.json({ error: "Text cannot be empty." }, { status: 400 });
    }

    // ── Appel RunPod runsync ─────────────────────────────────────────────────
    const runpodRes = await fetch(`${RUNPOD_SYNC_URL}?timeout=60`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({ input: jobInput }),
    });

    let runpodData = await runpodRes.json();

    if (!runpodRes.ok) {
      console.error("[tts proxy] RunPod HTTP error:", runpodRes.status, runpodData);
      return Response.json(
        { error: `RunPod gateway error (${runpodRes.status})` },
        { status: runpodRes.status }
      );
    }

    // Poll if in queue (cold start)
    if (runpodData.status === "IN_QUEUE" || runpodData.status === "IN_PROGRESS") {
      try {
        runpodData = await pollStatus(runpodData.id, 80000);
      } catch {
        // TTS failed silently — frontend handles missing audio gracefully
        return Response.json({ error: "TTS timed out (cold start)" }, { status: 503 });
      }
    }

    // Unwrap le format RunPod {status, output}
    if (runpodData.status === "COMPLETED" && runpodData.output !== undefined) {
      return Response.json(runpodData.output);
    }

    if (runpodData.status === "FAILED") {
      return Response.json(
        { error: "TTS job failed", detail: runpodData.error },
        { status: 500 }
      );
    }

    // Fallback — return empty (TTS is optional, don't block the UI)
    return Response.json({});

  } catch (err) {
    console.error("[tts proxy] Internal error:", err);
    return Response.json(
      { error: "TTS proxy error", detail: err.message },
      { status: 500 }
    );
  }
}
