/**
 * Next.js API Route — Admin Metrics directement via Supabase (sans RunPod)
 * GET /api/admin/metrics → retourne les métriques complètes
 *
 * Utilise Supabase PostgREST REST API pour éviter le cold start RunPod (30-60s).
 * Fallback automatique vers RunPod si Supabase n'est pas configuré.
 */

const ADMIN_PASSWORD       = process.env.ADMIN_PASSWORD || "hemo-admin-2025";
const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RUNPOD_API_KEY       = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT      = process.env.RUNPOD_ENDPOINT_ID || "8b5zubt1yzl0or";
const RUNPOD_SYNC_URL      = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/runsync`;

// ── Supabase REST helper ─────────────────────────────────────────────────────
async function sb(table, query = "", method = "GET", body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      "apikey":          SUPABASE_SERVICE_KEY,
      "Authorization":   `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type":    "application/json",
      "Accept":          "application/json",
      "Prefer":          "count=exact",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase (${res.status}): ${err}`);
  }
  const text = await res.text();
  // Supabase returns count in Content-Range header
  const countHeader = res.headers.get("content-range");
  const totalCount = countHeader ? parseInt(countHeader.split("/")[1], 10) : null;
  const data = text ? JSON.parse(text) : [];
  return { data: Array.isArray(data) ? data : [data], total: totalCount };
}

// ── Direct Supabase metrics (fast, no RunPod cold start) ─────────────────────
async function getMetricsFromSupabase() {
  const now      = new Date();
  const week_ago = new Date(now - 7  * 24 * 3600 * 1000).toISOString();
  const month_ago= new Date(now - 30 * 24 * 3600 * 1000).toISOString();

  // Total users
  const { total: total_users } = await sb("users", "?select=id&limit=1");

  // Active subs
  const { total: active_subs } = await sb("users", "?select=id&subscription_status=eq.active&limit=1");

  // Active 7d
  const { total: active_7d } = await sb("users", `?select=id&last_seen=gte.${week_ago}&limit=1`);

  // New 30d
  const { total: new_30d } = await sb("users", `?select=id&created_at=gte.${month_ago}&limit=1`);

  // Total messages
  const { total: total_messages } = await sb("message_logs", "?select=id&limit=1");

  // Messages last 7d
  const { total: messages_7d } = await sb("message_logs", `?select=id&created_at=gte.${week_ago}&limit=1`);

  // Modalities breakdown (use RPC)
  // We'll fetch all logs and aggregate client-side (small table in early stage)
  const { data: allLogs } = await sb("message_logs", "?select=modality&limit=5000");
  const modalities = {};
  for (const log of allLogs) {
    if (log.modality) {
      modalities[log.modality] = (modalities[log.modality] || 0) + 1;
    }
  }

  // Countries (top 10)
  const { data: allUsers } = await sb("users", "?select=country,subscription_status,username,email,total_messages,created_at,last_seen&limit=500");
  const countryMap = {};
  for (const u of allUsers) {
    if (u.country) {
      countryMap[u.country] = (countryMap[u.country] || 0) + 1;
    }
  }
  const countries = Object.entries(countryMap)
    .map(([country, users]) => ({ country, users }))
    .sort((a, b) => b.users - a.users)
    .slice(0, 10);

  // Daily signups (last 30 days) — aggregate from allUsers
  const dailySignupsMap = {};
  for (const u of allUsers) {
    if (u.created_at) {
      const day = u.created_at.slice(0, 10);
      if (day >= month_ago.slice(0, 10)) {
        dailySignupsMap[day] = (dailySignupsMap[day] || 0) + 1;
      }
    }
  }
  const daily_signups = Object.entries(dailySignupsMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Daily messages (last 30 days) — fetch recent logs
  const { data: recentLogs } = await sb("message_logs", `?select=created_at&created_at=gte.${month_ago}&limit=5000`);
  const dailyMsgsMap = {};
  for (const log of recentLogs) {
    if (log.created_at) {
      const day = log.created_at.slice(0, 10);
      dailyMsgsMap[day] = (dailyMsgsMap[day] || 0) + 1;
    }
  }
  const daily_messages = Object.entries(dailyMsgsMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Recent users (last 20)
  const recent_users = allUsers
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 20)
    .map(u => ({
      username:            u.username,
      email:               u.email,
      created_at:          u.created_at,
      last_seen:           u.last_seen,
      subscription_status: u.subscription_status || "inactive",
      total_messages:      u.total_messages || 0,
      country:             u.country || "",
      plan:                u.subscription_status || "inactive",
    }));

  const free_users = (total_users || 0) - (active_subs || 0);

  return {
    total_users:    total_users   || 0,
    active_subs:    active_subs   || 0,
    free_users:     free_users    >= 0 ? free_users : 0,
    active_7d:      active_7d     || 0,
    new_30d:        new_30d       || 0,
    total_messages: total_messages|| 0,
    messages_7d:    messages_7d   || 0,
    modalities,
    countries,
    daily_signups,
    daily_messages,
    recent_users,
    generated_at:   now.toISOString(),
    source:         "supabase",
  };
}

// ── RunPod fallback ──────────────────────────────────────────────────────────
async function getMetricsFromRunPod(password) {
  if (!RUNPOD_API_KEY) {
    throw new Error("RUNPOD_API_KEY not configured");
  }
  const res = await fetch(`${RUNPOD_SYNC_URL}?timeout=60`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${RUNPOD_API_KEY}`,
    },
    body: JSON.stringify({ input: { action: "metrics_overview" } }),
  });
  const data = await res.json();
  if (data.status === "COMPLETED" && data.output !== undefined) return data.output;
  if (data.status === "FAILED") throw new Error(data.error || "RunPod job failed");
  return data;
}

export async function GET(request) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization") || "";
  const token      = authHeader.replace("Bearer ", "").trim();
  const qToken     = new URL(request.url).searchParams.get("token") || "";

  if (token !== ADMIN_PASSWORD && qToken !== ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Try Supabase first (fast, no cold start)
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        const metrics = await getMetricsFromSupabase();
        return Response.json(metrics);
      } catch (supaErr) {
        console.error("[admin/metrics] Supabase error, falling back to RunPod:", supaErr.message);
        // Fall through to RunPod
      }
    }

    // Fallback to RunPod
    const metrics = await getMetricsFromRunPod(qToken || token);
    return Response.json(metrics);

  } catch (err) {
    console.error("[admin/metrics] Error:", err);
    return Response.json({
      error: err.message,
      hint: "Vérifiez que SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ou RUNPOD_API_KEY sont configurés dans les variables d'environnement Vercel."
    }, { status: 500 });
  }
}
