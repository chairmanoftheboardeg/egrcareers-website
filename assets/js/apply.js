(async function(){
  const cfgState = (window.EGR && EGR.getConfig) ? EGR.getConfig() : { ok:false };
  if(!cfgState.ok){ document.getElementById("configWarn")?.style.setProperty("display","block"); return; }

  const sb = EGR.supabase;
  const jobId = new URLSearchParams(location.search).get("job_id");
  if(!jobId){ EGR.toast("No role selected."); location.href="/jobs.html"; return; }

  const selectedRole = document.getElementById("selectedRole");
  const jobIdInput = document.getElementById("job_id");
  const roleTitleInput = document.getElementById("role_title");

  const { data: job, error } = await sb.from("jobs").select("id,title,department,employment_type,status").eq("id", jobId).single();
  if(error || !job){ console.error(error); EGR.toast("Role not found."); location.href="/jobs.html"; return; }

  jobIdInput.value = job.id;
  roleTitleInput.value = job.title || "Role";
  selectedRole.innerHTML = `<b>${EGR.escape(job.title || "Role")}</b><div class="small">${EGR.escape(job.department || "")} • ${EGR.escape(job.employment_type || "")}</div>`;

  const form = document.getElementById("appForm");
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();

    if(!document.getElementById("terms").checked){
      EGR.toast("You must agree to the Legal Terms.");
      return;
    }

    const fd = new FormData(form);
    const payload = {
      job_id: fd.get("job_id"),
      role_title: fd.get("role_title"),
      full_name: fd.get("full_name"),
      discord_username: fd.get("discord_username"),
      discord_id: fd.get("discord_id"),
      roblox_username: fd.get("roblox_username"),
      resume_link: fd.get("resume_link") || null,
      motivation: fd.get("motivation"),
      why_chosen: fd.get("why_chosen"),
      past_experience: fd.get("past_experience"),
      agreed_to_terms: true,
      status: "pending"
    };

    if(!payload.discord_id.toString().trim().match(/^\d{10,20}$/)){
      EGR.toast("Discord ID must be numeric.");
      return;
    }

    const btn = form.querySelector("button[type='submit']");
    btn.disabled = true; btn.textContent = "Submitting…";

    const { error: insErr } = await sb.from("applications").insert(payload);
    if(insErr){ console.error(insErr); EGR.toast("Submission failed."); btn.disabled=false; btn.textContent="Submit Application"; return; }

    form.reset();
    jobIdInput.value = job.id;
    roleTitleInput.value = job.title || "Role";
    document.getElementById("terms").checked = false;

    EGR.toast("Application submitted successfully. HR will review your request.");
    btn.disabled = false; btn.textContent = "Submit Application";
  });
})();