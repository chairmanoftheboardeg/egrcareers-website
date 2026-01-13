const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, X-HR-PASSWORD",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function requireHr(req: Request): Response | null {
  const expected = Deno.env.get("HR_DASH_PASSWORD") || "";
  const provided = req.headers.get("X-HR-PASSWORD") || "";
  if (!expected || provided !== expected) return json({ error: "Unauthorised" }, 401);
  return null;
}

export { corsHeaders, json, requireHr };