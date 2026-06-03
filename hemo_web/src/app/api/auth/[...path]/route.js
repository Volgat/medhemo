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
  if (data.status === "FAILED") throw new Error("The service is temporarily unavailable. Please try again shortly.");
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
    console.error(`[auth proxy] DB error (${res.status}): ${err}`);
    throw new Error("The database is currently inaccessible. Please try again shortly.");
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
      const username = body.username?.trim();
      const email    = body.email?.trim();
      const password = body.password;

      if (!username || !email || !password) {
        return Response.json({ detail: "Username, email and password are required." }, { status: 400 });
      }

      // Try direct Supabase first
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        try {
          // Check if user already exists (username or email)
          const existing = await supabaseQuery(
            "users", 
            "GET", 
            null, 
            `?or=(username.ilike.${encodeURIComponent(username)},email.ilike.${encodeURIComponent(email)})&select=username,email`
          );
          if (existing && existing.length > 0) {
            const match = existing[0];
            if (match.username.toLowerCase() === username.toLowerCase()) {
              return Response.json({ detail: "Username already exists" }, { status: 400 });
            } else {
              return Response.json({ detail: "Email already exists" }, { status: 400 });
            }
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
          console.error("[auth/signup] Database error, falling back to backup service:", supaErr.message);
          // Fall through to fallback
        }
      }

      // Fallback
      if (!RUNPOD_API_KEY) {
        return Response.json({ detail: "Server misconfiguration. Please try again shortly." }, { status: 500 });
      }
      const output = await callRunPod({ action: "auth_signup", ...body, username, email });
      if (output?.error || output?.detail) {
        return Response.json(output, { status: 400 });
      }
      return Response.json(output);
    }

    // ── LOGIN ───────────────────────────────────────────────────────────────
    if (action === "login") {
      const username = body.username?.trim();
      const password = body.password;

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
            `?or=(username.ilike.${encodeURIComponent(username)},email.ilike.${encodeURIComponent(username)})&select=id,username,email,hashed_password,subscription_status`
          );

          if (!users || users.length === 0) {
            return Response.json({ detail: "Invalid credentials" }, { status: 401 });
          }

          const user = users[0];
          const expectedHash = hashPassword(password);
          if (user.hashed_password !== expectedHash) {
            return Response.json({ detail: "Invalid credentials" }, { status: 401 });
          }

          // Update last_seen asynchronously using ID (don't wait)
          supabaseQuery("users", "PATCH", { last_seen: new Date().toISOString() }, `?id=eq.${user.id}`).catch(() => {});

          return Response.json({
            message:             "Logged in",
            username:            user.username,
            token:               "login-token",
            subscription_status: user.subscription_status || "inactive",
          });
        } catch (supaErr) {
          console.error("[auth/login] Database error, falling back to backup service:", supaErr.message);
          // Fall through to fallback
        }
      }

      // Fallback
      if (!RUNPOD_API_KEY) {
        return Response.json({ detail: "Server misconfiguration. Please try again shortly." }, { status: 500 });
      }
      const output = await callRunPod({ action: "auth_login", ...body, username });
      if (output?.error || output?.detail) {
        return Response.json(output, { status: 401 });
      }
      return Response.json(output);
    }

    // ── RESET REQUEST ────────────────────────────────────────────────────────
    if (action === "reset-request") {
      const email = body.email?.trim();
      if (!email) {
        return Response.json({ detail: "Email is required." }, { status: 400 });
      }

      // Try direct Supabase first
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        try {
          const users = await supabaseQuery(
            "users",
            "GET",
            null,
            `?email=ilike.${encodeURIComponent(email)}&select=id,username`
          );

          if (!users || users.length === 0) {
            return Response.json({ detail: "User with this email does not exist." }, { status: 404 });
          }

          const user = users[0];
          // Generate a 6-digit random code
          const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

          // Save the code to users table
          await supabaseQuery(
            "users",
            "PATCH",
            { reset_code: resetCode },
            `?id=eq.${user.id}`
          );

          return Response.json({
            username: user.username,
            resetCode: resetCode,
          });
        } catch (supaErr) {
          console.error("[auth/reset-request] Database error, falling back to backup service:", supaErr.message);
          // Fall through to fallback
        }
      }

      // Fallback
      if (!RUNPOD_API_KEY) {
        return Response.json({ detail: "Server misconfiguration. Please try again shortly." }, { status: 500 });
      }
      const output = await callRunPod({ action: "auth_reset_request", ...body, email });
      if (output?.error || output?.detail) {
        return Response.json(output, { status: 400 });
      }
      return Response.json(output);
    }

    // ── RESET PASSWORD ───────────────────────────────────────────────────────
    if (action === "reset-password") {
      const username = body.username?.trim();
      const resetCode = body.resetCode?.trim();
      const newPassword = body.newPassword;

      if (!username || !resetCode || !newPassword) {
        return Response.json({ detail: "Username, reset code and new password are required." }, { status: 400 });
      }

      // Try direct Supabase first
      if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
        try {
          const users = await supabaseQuery(
            "users",
            "GET",
            null,
            `?username=ilike.${encodeURIComponent(username)}&select=id,reset_code`
          );

          if (!users || users.length === 0) {
            return Response.json({ detail: "User not found." }, { status: 404 });
          }

          const user = users[0];
          if (!user.reset_code || user.reset_code !== resetCode) {
            return Response.json({ detail: "Invalid or expired recovery code." }, { status: 400 });
          }

          // Update password and clear reset code
          await supabaseQuery(
            "users",
            "PATCH",
            {
              hashed_password: hashPassword(newPassword),
              reset_code: null,
            },
            `?id=eq.${user.id}`
          );

          return Response.json({ message: "Success" });
        } catch (supaErr) {
          console.error("[auth/reset-password] Database error, falling back to backup service:", supaErr.message);
          // Fall through to fallback
        }
      }

      // Fallback
      if (!RUNPOD_API_KEY) {
        return Response.json({ detail: "Server misconfiguration. Please try again shortly." }, { status: 500 });
      }
      const output = await callRunPod({ action: "auth_reset_password", ...body, username, resetCode });
      if (output?.error || output?.detail) {
        return Response.json(output, { status: 400 });
      }
      return Response.json(output);
    }

    return Response.json({ detail: "Unknown action" }, { status: 400 });

  } catch (err) {
    console.error("[auth proxy] error:", err);
    const msg = err.message || "An unexpected error occurred. Please try again shortly.";
    return Response.json({ detail: msg }, { status: 500 });
  }
}

// GET /api/auth/status?username=xxx
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim() || "";

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
          `?or=(username.ilike.${encodeURIComponent(username)},email.ilike.${encodeURIComponent(username)})&select=username,email,subscription_status`
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
