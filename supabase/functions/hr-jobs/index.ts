import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, requireHr } from "../_shared.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const deny = requireHr(req);
  if (deny) return deny;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);
    const idFromQuery = url.searchParams.get("id");

    if (req.method === "GET") {
      const { data, error } = await sb.from("jobs").select("*").order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ jobs: data ?? [] });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { data, error } = await sb.from("jobs").insert(body).select("*").single();
      if (error) return json({ error: error.message }, 400);
      return json({ job: data });
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const id = body.id;
      if (!id) return json({ error: "Missing job id" }, 400);

      delete body.id;
      body.updated_at = new Date().toISOString();

      const { data, error } = await sb.from("jobs").update(body).eq("id", id).select("*").single();
      if (error) return json({ error: error.message }, 400);
      return json({ job: data });
    }

    if (req.method === "DELETE") {
      if (!idFromQuery) return json({ error: "Missing job id" }, 400);
      const { error } = await sb.from("jobs").delete().eq("id", idFromQuery);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});