(async function(){
  const st = (window.EGR && EGR.getConfig) ? EGR.getConfig() : { ok:false };
  const sb = EGR.supabase;
  if(!st.ok || !sb){
    EGR.toast("Configuration missing. Check assets/js/config.js");
    return;
  }

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if(!id){
    location.href = "/jobs.html";
    return;
  }

  const titleEl = document.getElementById("jobTitle");
  const metaEl = document.getElementById("jobMeta");
  const descEl = document.getElementById("jobDesc");
  const respEl = document.getElementById("jobResp");
  const reqEl = document.getElementById("jobReq");
  const applyBtn = document.getElementById("applyBtn");

  function bullets(text){
    const t = (text || "").trim();
    if(!t) return "<div class='small'>Not provided.</div>";
    const lines = t.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(lines.length <= 1) return `<div class="small">${EGR.escape(t)}</div>`;
    return "<ul class='small' style='margin:10px 0 0 18px; line-height:1.8'>" + lines.map(l=>`<li>${EGR.escape(l)}</li>`).join("") + "</ul>";
  }

  try{
    const { data, error } = await sb.from("jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if(error) throw error;
    if(!data){
      EGR.toast("Role not found.");
      location.href = "/jobs.html";
      return;
    }

    const j = data;
    if(titleEl) titleEl.textContent = j.title || "Role";
    const meta = `${j.department || "Department TBD"} • ${j.location || "Online"} • ${j.employment_type || "Direct Entry"} • ${EGR.statusBadge((j.status||"open").toLowerCase())}`;
    if(metaEl) metaEl.innerHTML = meta;
    if(descEl) descEl.innerHTML = bullets(j.description);
    if(respEl) respEl.innerHTML = bullets(j.responsibilities);
    if(reqEl) reqEl.innerHTML = bullets(j.requirements);
    if(applyBtn) applyBtn.href = `/apply.html?id=${encodeURIComponent(j.id)}`;
  }catch(e){
    console.error(e);
    EGR.toast("Unable to load role. Check database + RLS policies.");
  }
})();