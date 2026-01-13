(async function(){
  const cfgState = (window.EGR && EGR.getConfig) ? EGR.getConfig() : { ok:false };
  if(!cfgState.ok){ EGR.toast("Configuration missing. Update assets/js/config.js."); return; }

  const sb = EGR.supabase;
  const id = new URLSearchParams(location.search).get("id");
  if(!id){ location.href="/jobs.html"; return; }

  const { data, error } = await sb.from("jobs").select("*").eq("id", id).single();
  if(error || !data){ console.error(error); EGR.toast("Role not found."); location.href="/jobs.html"; return; }

  document.getElementById("jobTitle").textContent = data.title || "Role";
  document.getElementById("jobMeta").textContent = `${data.department || "Department"} • ${data.employment_type || "Staff"} • Status: ${data.status || "open"}`;
  document.getElementById("jobDesc").textContent = data.description || "—";
  document.getElementById("jobResp").textContent = data.responsibilities || "—";
  document.getElementById("jobReq").textContent = data.requirements || "—";
  document.getElementById("applyBtn").href = `/apply.html?job_id=${encodeURIComponent(data.id)}`;
})();