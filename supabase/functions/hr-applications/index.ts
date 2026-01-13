import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, requireHr } from "../_shared.ts";

async function discordOnboard(discordId: string, roleTitle: string) {
  const token = Deno.env.get("DISCORD_BOT_TOKEN") || "";
  const guildId = Deno.env.get("DISCORD_GUILD_ID") || "";
  const roleId = Deno.env.get("DISCORD_STAFF_ROLE_ID") || "";
  const onboardingPdf = Deno.env.get("ONBOARDING_PDF_URL") || "";

  if (!token || !guildId || !roleId || !onboardingPdf) {
    return { ok: false, warning: "Discord onboarding variables not configured." };
  }

  const headers = { "Authorization": `Bot ${token}`, "Content-Type": "application/json" };

  // Add role
  const addRoleRes = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${roleId}`,
    { method: "PUT", headers }
  );

  // DM channel
  const dmChannelRes = await fetch(
    `https://discord.com/api/v10/users/@me/channels`,
    { method: "POST", headers, body: JSON.stringify({ recipient_id: discordId }) }
  );

  if (!dmChannelRes.ok) {
    return { ok: addRoleRes.ok, warning: `Role assigned. DM failed (${dmChannelRes.status}) — user may have DMs disabled.` };
  }

  const dm = await dmChannelRes.json();
  const msgRes = await fetch(
    `https://discord.com/api/v10/channels/${dm.id}/messages`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        content:
          `Welcome to Emirates Group Roblox.\n\n` +
          `You have been accepted as **${roleTitle}**.\n\n` +
          `Onboarding pack:\n${onboardingPdf}`
      }),
    }
  );

  if (!msgRes.ok) {
    return { ok: addRoleRes.ok, warning: `Role assigned. DM message failed (${msgRes.status}).` };
  }

  return { ok: addRoleRes.ok, warning: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const deny = requireHr(req);
  if (deny) return deny;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    if (req.method === "GET") {
      let q = sb.from("applications").select("*").order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ applications: data ?? [] });
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const id = body.id;
      const nextStatus = body.status;

      if (!id || !nextStatus) return json({ error: "Missing id or status" }, 400);
      if (!["pending", "accepted", "rejected"].includes(nextStatus)) return json({ error: "Invalid status" }, 400);

      const { data: app, error: fetchErr } = await sb.from("applications").select("*").eq("id", id).single();
      if (fetchErr || !app) return json({ error: fetchErr?.message || "Not found" }, 404);

      const { error: updErr } = await sb.from("applications").update({ status: nextStatus }).eq("id", id);
      if (updErr) return json({ error: updErr.message }, 400);

      if (nextStatus === "accepted") {
        const onboard = await discordOnboard(app.discord_id, app.role_title);
        return json({ ok: true, message: "Accepted. Discord onboarding attempted.", warning: onboard.warning });
      }

      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});