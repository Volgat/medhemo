/**
 * Next.js API Route — Proxy Auth vers RunPod Serverless
 * Couvre: /api/auth/signup, /api/auth/login, /api/auth/status
 */

const RUNPOD_API_KEY  = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT = process.env.RUNPOD_ENDPOINT_ID || "hkc2dat65390jw";
const RUNPOD_SYNC_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/runsync`;

async function callRunPod(jobInput) {
  const res = await fetch(`${RUNPOD_SYNC_URL}?timeout=30`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${RUNPOD_API_KEY}`,
    },
    body: JSON.stringify({ input: jobInput }),
  });
  const data = await res.json();
  if (data.status === "COMPLETED" && data.output !== undefined) return data.output;
  if (data.status === "FAILED") throw new Error(data.error || "RunPod job failed");
  return data;
}

// POST /api/auth/signup  ou  POST /api/auth/login
export async function POST(request, { params }) {
  if (!RUNPOD_API_KEY) {
    return Response.json({ detail: "Server misconfiguration" }, { status: 500 });
  }
  try {
    const path   = (await params).path || [];
    const action = path[0]; // "signup" ou "login"
    const body   = await request.json();

    const output = await callRunPod({ action: `auth_${action}`, ...body });

    if (output?.error || output?.detail) {
      return Response.json(output, { status: 400 });
    }
    return Response.json(output);
  } catch (err) {
    console.error("[auth proxy] error:", err);
    return Response.json({ detail: err.message }, { status: 500 });
  }
}

// GET /api/auth/status?username=xxx
export async function GET(request) {
  if (!RUNPOD_API_KEY) {
    return Response.json({ detail: "Server misconfiguration" }, { status: 500 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username") || "";

    const output = await callRunPod({ action: "auth_status", username });

    if (output?.error || output?.detail) {
      return Response.json(output, { status: 404 });
    }
    return Response.json(output);
  } catch (err) {
    console.error("[auth status proxy] error:", err);
    return Response.json({ detail: err.message }, { status: 500 });
  }
}
