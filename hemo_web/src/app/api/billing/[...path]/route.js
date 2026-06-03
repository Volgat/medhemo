/**
 * Next.js API Route — Proxy Billing vers RunPod Serverless
 * Couvre: /api/billing/create-checkout-session, /api/billing/portal
 */

const RUNPOD_API_KEY  = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT = process.env.RUNPOD_ENDPOINT_ID || "8b5zubt1yzl0or";
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
  if (data.status === "FAILED") throw new Error("The billing request failed. Please try again shortly.");
  return data;
}

export async function POST(request, { params }) {
  if (!RUNPOD_API_KEY) {
    return Response.json({ detail: "The billing service is temporarily unavailable. Please try again shortly." }, { status: 500 });
  }
  try {
    const path   = (await params).path || [];
    const action = path.join("_"); // "create-checkout-session" ou "portal"
    const body   = await request.json();

    const output = await callRunPod({ action: `billing_${action}`, ...body });

    if (output?.error || output?.detail) {
      return Response.json(output, { status: 400 });
    }
    return Response.json(output);
  } catch (err) {
    console.error("[billing proxy] error:", err);
    return Response.json({ detail: err.message || "An unexpected error occurred. Please try again shortly." }, { status: 500 });
  }
}
