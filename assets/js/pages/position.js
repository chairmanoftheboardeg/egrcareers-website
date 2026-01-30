import { initCommon, qs, escapeHtml, getQueryParam, toast } from "../app.js";
import { supabase } from "../supabaseClient.js";

function fmtBlock(title, content){
  if(!content || !String(content).trim()) return "";
  return `
    <div class="card" style="margin-top:12px;">
      <h3 style="margin:0 0 6px; font-weight:900;">${escapeHtml(title)}</h3>
      <div style="color:var(--muted); line-height:1.65; white-space:pre-wrap;">${escapeHtml(content)}</div>
    </div>
  `;
}

await initCommon({ loadAnnouncement:true });

const slug = getQueryParam("slug");
if(!slug){
  qs("#roleWrap").innerHTML = `<div class="notice">Missing role slug in the URL.</div>`;
}else{
  try{
    const { data, error } = await supabase
      .from("jobs")
      .select("title,role_id,slug,summary,description,responsibilities,requirements,roblox_username_required,cv_link_allowed,department:departments(name,slug)")
      .eq("status","published")
      .eq("slug", slug)
      .maybeSingle();

    if(error) throw error;
    if(!data){
      qs("#roleWrap").innerHTML = `<div class="notice">This role was not found or is no longer available.</div>`;
    }else{
      qs("#roleTitle").textContent = data.title;
      qs("#roleDept").textContent = data.department?.name || "General";
      qs("#roleId").textContent = data.role_id;
      qs("#roleSummary").textContent = data.summary || "View responsibilities, requirements, and apply below.";

      const flags = [];
      flags.push(`Volunteer basis`);
      if(data.roblox_username_required) flags.push("Roblox username required");
      if(data.cv_link_allowed) flags.push("CV link optional");
      qs("#roleFlags").innerHTML = flags.map(f=>`<span class="badge">${escapeHtml(f)}</span>`).join(" ");

      const blocks = [
        fmtBlock("Role Description", data.description),
        fmtBlock("Responsibilities", data.responsibilities),
        fmtBlock("Requirements", data.requirements),
      ].join("");
      qs("#roleBlocks").innerHTML = blocks || `<div class="notice">This role is currently available. Apply using the button below.</div>`;

      const applyHref = `apply.html?slug=${encodeURIComponent(data.slug)}`;
      qs("#applyBtn").setAttribute("href", applyHref);

      qs("#shareBtn").addEventListener("click", async ()=>{
        try{
          await navigator.clipboard.writeText(location.href);
          toast("Role link copied to clipboard.", "success");
        }catch{
          toast("Could not copy link. You can manually copy the URL.", "error");
        }
      });
    }
  }catch(err){
    console.error(err);
    toast("Could not load this role. Please try again later.", "error");
  }
}
