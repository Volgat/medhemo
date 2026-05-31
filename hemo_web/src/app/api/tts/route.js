/**
 * Next.js API Route — Proxy TTS vers RunPod Serverless
 *
 * Reçoit les requêtes JSON de synthèse vocale,
 * les transmet à RunPod et retourne l'audio base64.
 */

const RUNPOD_API_KEY  = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT = process.env.RUNPOD_ENDPOINT_ID || "hkc2dat65390jw";
const RUNPOD_SYNC_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/runsync`;

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

    const runpodData = await runpodRes.json();

    if (!runpodRes.ok) {
      console.error("[tts proxy] RunPod HTTP error:", runpodRes.status, runpodData);
      return Response.json(
        { error: `RunPod gateway error (${runpodRes.status})` },
        { status: runpodRes.status }
      );
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

    return Response.json(runpodData, { status: 202 });

  } catch (err) {
    console.error("[tts proxy] Internal error:", err);
    return Response.json(
      { error: "TTS proxy error", detail: err.message },
      { status: 500 }
    );
  }
}
