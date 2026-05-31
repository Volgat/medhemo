/**
 * Next.js API Route — Admin Metrics (sécurisée par ADMIN_PASSWORD)
 * GET /api/admin/metrics → retourne les métriques complètes
 */

const RUNPOD_API_KEY   = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT  = process.env.RUNPOD_ENDPOINT_ID || "hkc2dat65390jw";
const RUNPOD_SYNC_URL  = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/runsync`;
const ADMIN_PASSWORD   = process.env.ADMIN_PASSWORD || "hemo-admin-2025";

export async function GET(request) {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization") || "";
  const token      = authHeader.replace("Bearer ", "").trim();
  const qToken     = new URL(request.url).searchParams.get("token") || "";

  if (token !== ADMIN_PASSWORD && qToken !== ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!RUNPOD_API_KEY) {
    return Response.json({ error: "RUNPOD_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${RUNPOD_SYNC_URL}?timeout=30`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({ input: { action: "metrics_overview" } }),
    });

    const data = await res.json();

    if (data.status === "COMPLETED" && data.output !== undefined) {
      return Response.json(data.output);
    }
    if (data.status === "FAILED") {
      return Response.json({ error: data.error }, { status: 500 });
    }

    return Response.json(data);
  } catch (err) {
    console.error("[admin/metrics]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
