/**
 * Supabase Edge Function: hr-jobs
 * HR-only CRUD for jobs table using service role key.
 *
 * Required env vars:
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - HR_PASSWORD
 *
 * Optional:
 *  - ALLOWED_ORIGINS (comma-separated) for stricter CORS; if unset, allows *
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
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
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
  const id = u.searchParams.get("id") || null;

  try {
    if (req.method === "GET") {
      if (id) {
        const { data, error } = await sb.from("jobs").select("*").eq("id", id).maybeSingle();
        if (error) throw error;
        return json({ job: data }, req);
      } else {
        const { data, error } = await sb.from("jobs").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return json({ jobs: data || [] }, req);
      }
    }

    if (req.method === "POST") {
      const body = await req.json();
      const payload = {
        title: body.title,
        department: body.department,
        location: body.location || "Online",
        employment_type: body.employment_type || "Direct Entry",
        description: body.description || null,
        responsibilities: body.responsibilities || null,
        requirements: body.requirements || null,
        status: body.status || "open"
      };
      const { data, error } = await sb.from("jobs").insert(payload).select("*").single();
      if (error) throw error;
      return json({ job: data }, req, 201);
    }

    if (req.method === "PUT") {
      const body = await req.json();
      if (!body.id) return json({ error: "Missing id" }, req, 400);
      const payload = {
        title: body.title,
        department: body.department,
        location: body.location,
        employment_type: body.employment_type,
        description: body.description || null,
        responsibilities: body.responsibilities || null,
        requirements: body.requirements || null,
        status: body.status || "open"
      };
      const { data, error } = await sb.from("jobs").update(payload).eq("id", body.id).select("*").single();
      if (error) throw error;
      return json({ job: data }, req);
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      if (!body.id) return json({ error: "Missing id" }, req, 400);
      const { data: current, error: e1 } = await sb.from("jobs").select("status").eq("id", body.id).maybeSingle();
      if (e1) throw e1;
      const next = (current?.status === "open") ? "paused" : "open";
      const { data, error } = await sb.from("jobs").update({ status: next }).eq("id", body.id).select("*").single();
      if (error) throw error;
      return json({ job: data }, req);
    }

    if (req.method === "DELETE") {
      const body = await req.json();
      if (!body.id) return json({ error: "Missing id" }, req, 400);
      const { error } = await sb.from("jobs").delete().eq("id", body.id);
      if (error) throw error;
      return json({ ok: true }, req);
    }

    return json({ error: "Method not allowed" }, req, 405);
  } catch (e) {
    return json({ error: String(e) }, req, 500);
  }
});