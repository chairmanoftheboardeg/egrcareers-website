/**
 * Supabase Edge Function: hr-applications
 * HR-only access to applications using service role key.
 *
 * Required env vars:
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - HR_PASSWORD
 *
 * Optional:
 *  - DISCORD_WEBHOOK_URL (notify on accept/reject)
 *  - ALLOWED_ORIGINS
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders(req: Request) {
  const allow = Deno.env.get("ALLOWED_ORIGINS");
  const origin = req.headers.get("origin") || "*";
  const allowed = allow ? allow.split(",").map(s => s.trim()).filter(Boolean) : ["*"];
  const ok = allowed.includes("*") || allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed[0] || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, X-HR-PASSWORD",
    "Access-Control-Allow-Methods": "GET,PATCH,OPTIONS",
    "Vary": "Origin"
  };
}

function json(data: any, req: Request, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) }
  });
}

function requireHr(req: Request) {
  const pass = req.headers.get("X-HR-PASSWORD") || "";
  const expected = Deno.env.get("HR_PASSWORD") || "";
  if (!expected || pass !== expected) {
    return json({ error: "Unauthorized" }, req, 401);
  }
  return null;
}

async function notifyDiscord(text: string) {
  const hook = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (!hook) return;
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text })
    });
  } catch {}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  const authFail = requireHr(req);
  if (authFail) return authFail;

  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) return json({ error: "Missing env vars" }, req, 500);

  const sb = createClient(url, key);

  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  const statusFilter = u.searchParams.get("status");

  try {
    if (req.method === "GET") {
      if (id) {
        const { data, error } = await sb.from("applications").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        return json({ application: data }, req);
      }
      let q = sb.from("applications").select("*").order("created_at", { ascending: false });
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return json({ applications: data || [] }, req);
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      if (!body.id || !body.status) return json({ error: "Missing id/status" }, req, 400);
      const { data, error } = await sb.from("applications").update({ status: body.status }).eq("id", body.id).select("*").single();
      if (error) throw error;

      if (body.status === "accepted") {
        await notifyDiscord(`✅ Application accepted: ${data.full_name} for ${data.role_title} (Discord: ${data.discord_username} / ${data.discord_id})`);
      } else if (body.status === "rejected") {
        await notifyDiscord(`❌ Application rejected: ${data.full_name} for ${data.role_title} (Discord: ${data.discord_username} / ${data.discord_id})`);
      }
      return json({ application: data }, req);
    }

    return json({ error: "Method not allowed" }, req, 405);
  } catch (e) {
    return json({ error: String(e) }, req, 500);
  }
});