/**
 * Next.js API Route — Auth directement via Supabase PostgreSQL
 * Couvre: /api/auth/signup, /api/auth/login, /api/auth/status
 *
 * IMPORTANT: Cette route ne passe plus par RunPod pour éviter les cold starts
 * de 30-60 secondes. Elle se connecte directement à Supabase.
 */

import crypto from "crypto";

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL; // postgresql://...
const RUNPOD_API_KEY  = process.env.RUNPOD_API_KEY;
const RUNPOD_ENDPOINT = process.env.RUNPOD_ENDPOINT_ID || "8b5zubt1yzl0or";
const RUNPOD_SYNC_URL = `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT}/runsync`;

// ── Hash password (same SHA-256 as Python backend) ──────────────────────────
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// ── Fetch from RunPod (fallback if no Supabase URL) ─────────────────────────
async function callRunPod(jobInput) {
  const res = await fetch(`${RUNPOD_SYNC_URL}?timeout=60`, {
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

// ── Direct Supabase DB query using REST API ──────────────────────────────────
// We use Supabase's REST API (PostgREST) via the anon key for server-side ops
const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseQuery(table, method = "GET", body = null, query = "") {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      "apikey":        SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type":  "application/json",
      "Prefer":        method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error (${res.status}): ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// POST /api/auth/signup  ou  POST /api/auth/login
export async function POST(request, { params }) {
  try {
    const pathArr = (await params).path || [];
    const action  = pathArr[0]; // "signup" ou "login"
    const body    = await request.json();

    // ── SIGNUP ──────────────────────────────────────────────────────────────
    if (action === "signup") {
      const { username, email, password } = body;
      if (!username || !email || !password) {
        return Response.json({ detail: "Username, email and password are required." }, { status: 400 });
      }

      // Try direct Supabase first
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        try {
          // Check if user already exists
          const existing = await supabaseQuery("users", "GET", null, `?username=eq.${encodeURIComponent(username)}&select=id`);
          if (existing && existing.length > 0) {
            return Response.json({ detail: "Username already exists" }, { status: 400 });
          }

          // Create user
          const newUser = await supabaseQuery("users", "POST", {
            username,
            email,
            hashed_password:     hashPassword(password),
            subscription_status: "inactive",
            plan:                "free",
            total_messages:      0,
          });

          const u = Array.isArray(newUser) ? newUser[0] : newUser;
          return Response.json({
            message:             "Success",
            username:            u.username,
            token:               "signup-token",
            subscription_status: u.subscription_status || "inactive",
          });
        } catch (supaErr) {
          console.error("[auth/signup] Supabase error, falling back to RunPod:", supaErr.message);
          // Fall through to RunPod fallback
        }
      }

      // Fallback to RunPod
      if (!RUNPOD_API_KEY) {
        return Response.json({ detail: "Server misconfiguration — no DB or RunPod configured." }, { status: 500 });
      }
      const output = await callRunPod({ action: "auth_signup", ...body });
      if (output?.error || output?.detail) {
        return Response.json(output, { status: 400 });
      }
      return Response.json(output);
    }

    // ── LOGIN ───────────────────────────────────────────────────────────────
    if (action === "login") {
      const { username, password } = body;
      if (!username || !password) {
        return Response.json({ detail: "Username and password are required." }, { status: 400 });
      }

      // Try direct Supabase first
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        try {
          const users = await supabaseQuery(
            "users",
            "GET",
            null,
            `?username=eq.${encodeURIComponent(username)}&select=id,username,email,hashed_password,subscription_status`
          );

          if (!users || users.length === 0) {
            return Response.json({ detail: "Invalid credentials" }, { status: 401 });
          }

          const user = users[0];
          const expectedHash = hashPassword(password);
          if (user.hashed_password !== expectedHash) {
            return Response.json({ detail: "Invalid credentials" }, { status: 401 });
          }

          // Update last_seen asynchronously (don't wait)
          supabaseQuery("users", "PATCH", { last_seen: new Date().toISOString() }, `?username=eq.${encodeURIComponent(username)}`).catch(() => {});

          return Response.json({
            message:             "Logged in",
            username:            user.username,
            token:               "login-token",
            subscription_status: user.subscription_status || "inactive",
          });
        } catch (supaErr) {
          console.error("[auth/login] Supabase error, falling back to RunPod:", supaErr.message);
          // Fall through to RunPod fallback
        }
      }

      // Fallback to RunPod
      if (!RUNPOD_API_KEY) {
        return Response.json({ detail: "Server misconfiguration — no DB or RunPod configured." }, { status: 500 });
      }
      const output = await callRunPod({ action: "auth_login", ...body });
      if (output?.error || output?.detail) {
        return Response.json(output, { status: 401 });
      }
      return Response.json(output);
    }

    return Response.json({ detail: "Unknown action" }, { status: 400 });

  } catch (err) {
    console.error("[auth proxy] error:", err);
    return Response.json({ detail: err.message }, { status: 500 });
  }
}

// GET /api/auth/status?username=xxx
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username") || "";

    if (!username) {
      return Response.json({ detail: "Username required" }, { status: 400 });
    }

    // Try direct Supabase first
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      try {
        const users = await supabaseQuery(
          "users",
          "GET",
          null,
          `?username=eq.${encodeURIComponent(username)}&select=username,email,subscription_status`
        );

        if (!users || users.length === 0) {
          return Response.json({ detail: "User not found" }, { status: 404 });
        }

        const user = users[0];
        return Response.json({
          username:            user.username,
          email:               user.email,
          subscription_status: user.subscription_status || "inactive",
        });
      } catch (supaErr) {
        console.error("[auth/status] Supabase error, falling back to RunPod:", supaErr.message);
      }
    }

    // Fallback to RunPod
    if (!RUNPOD_API_KEY) {
      return Response.json({ detail: "Server misconfiguration" }, { status: 500 });
    }
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
