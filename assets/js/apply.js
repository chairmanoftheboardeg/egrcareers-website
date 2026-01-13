(async function(){
  const warn = document.getElementById("configWarn");
  const st = (window.EGR && EGR.getConfig) ? EGR.getConfig() : { ok:false };
  const sb = EGR.supabase;
  if(!st.ok || !sb){
    if(warn) warn.style.display="block";
    return;
  }

  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  const roleBox = document.getElementById("selectedRole");
  const jobIdEl = document.getElementById("job_id");
  const roleTitleEl = document.getElementById("role_title");
  const form = document.getElementById("appForm");

  if(!id){
    if(roleBox) roleBox.innerHTML = "<b>No role selected.</b> Please return to Open Roles and apply from a specific role.";
    if(form) form.style.display = "none";
    return;
  }

  try{
    const { data, error } = await sb.from("jobs").select("id,title,department,location,employment_type,status").eq("id", id).maybeSingle();
    if(error) throw error;
    if(!data) throw new Error("Role not found");

    if((data.status || "open") !== "open"){
      EGR.toast("This role is not currently open.");
    }

    if(roleBox){
      roleBox.innerHTML = `
        <b>${EGR.escape(data.title || "Role")}</b>
        <div class="small" style="margin-top:6px">${EGR.escape(data.department||"")} • ${EGR.escape(data.location||"Online")} • ${EGR.escape(data.employment_type||"Direct Entry")}</div>`;
    }
    if(jobIdEl) jobIdEl.value = data.id;
    if(roleTitleEl) roleTitleEl.value = data.title || "Role";
  }catch(e){
    console.error(e);
    if(roleBox) roleBox.innerHTML = "<b>Unable to load role.</b> Please return to Open Roles and try again.";
    if(form) form.style.display = "none";
    return;
  }

  async function submitApplication(payload){
    // Inserts into applications table; relies on RLS policy allowing anon inserts.
    const { data, error } = await sb.from("applications").insert([payload]).select("id").single();
    if(error) throw error;
    return data;
  }

  if(form){
    form.addEventListener("submit", async (ev)=>{
      ev.preventDefault();
      const terms = document.getElementById("terms");
      if(terms && !terms.checked){
        EGR.toast("You must accept the legal terms.");
        return;
      }

      const fd = new FormData(form);
      const payload = {
        job_id: fd.get("job_id"),
        role_title: fd.get("role_title"),
        full_name: (fd.get("full_name")||"").toString().trim(),
        discord_username: (fd.get("discord_username")||"").toString().trim(),
        discord_id: (fd.get("discord_id")||"").toString().trim(),
        roblox_username: (fd.get("roblox_username")||"").toString().trim(),
        resume_link: (fd.get("resume_link")||"").toString().trim() || null,
        motivation: (fd.get("motivation")||"").toString().trim(),
        why_chosen: (fd.get("why_chosen")||"").toString().trim(),
        past_experience: (fd.get("past_experience")||"").toString().trim(),
        status: "pending",
        source: "careers_site"
      };

      const required = ["full_name","discord_username","discord_id","roblox_username","motivation","why_chosen","past_experience","job_id","role_title"];
      for(const k of required){
        if(!payload[k]){ EGR.toast("Please fill in all required fields."); return; }
      }

      try{
        form.querySelector("button[type=submit]").disabled = true;
        const res = await submitApplication(payload);
        EGR.toast("Application submitted successfully.");
        form.reset();
        // Keep role fields
        const jobIdEl2 = document.getElementById("job_id");
        const roleTitleEl2 = document.getElementById("role_title");
        if(jobIdEl2) jobIdEl2.value = payload.job_id;
        if(roleTitleEl2) roleTitleEl2.value = payload.role_title;

        // Optional: redirect to confirmation
        setTimeout(()=>{ location.href = "/thank-you.html"; }, 800);
      }catch(e){
        console.error(e);
        if(warn) warn.style.display = "block";
        EGR.toast("Submission failed. Check applications RLS policy.");
      }finally{
        const btn = form.querySelector("button[type=submit]");
        if(btn) btn.disabled = false;
      }
    });
  }
})();