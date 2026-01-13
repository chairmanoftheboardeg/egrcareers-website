(async function(){
  const cfgState = (window.EGR && EGR.getConfig) ? EGR.getConfig() : { ok:false, cfg:{} };
  if(!cfgState.ok){ EGR.toast("Missing config."); location.href="/hr/login.html"; return; }
  const cfg = cfgState.cfg;
  const hrPass = sessionStorage.getItem("EGR_HR_PASSWORD");
  if(!hrPass){ location.href="/hr/login.html"; return; }

  const jobsTable = document.getElementById("jobsTable");
  const appsTable = document.getElementById("appsTable");
  const statusFilter = document.getElementById("appStatusFilter");
  const logoutBtn = document.getElementById("logoutBtn");
  const reloadBtn = document.getElementById("reloadBtn");
  const newJobBtn = document.getElementById("newJobBtn");

  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");

  function openModal(title, html){ modalTitle.textContent = title; modalBody.innerHTML = html; modal.style.display="block"; }
  function closeModal(){ modal.style.display="none"; modalBody.innerHTML=""; }
  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e)=>{ if(e.target === modal) closeModal(); });

  logoutBtn.addEventListener("click", ()=>{ sessionStorage.removeItem("EGR_HR_PASSWORD"); location.href="/hr/login.html"; });
  reloadBtn.addEventListener("click", ()=> loadAll());

  function hrFetch(path, options={}){
    const headers = Object.assign({}, options.headers || {});
    headers[cfg.HR_HEADER_NAME || "X-HR-PASSWORD"] = hrPass;
    headers["Content-Type"] = "application/json";
    return fetch(`${cfg.FUNCTIONS_BASE}/${path}`, Object.assign({}, options, { headers }));
  }

  async function loadJobs(){
    const res = await hrFetch("hr-jobs", { method:"GET" });
    const out = await res.json();
    if(!res.ok){ console.error(out); EGR.toast(out.error || "Failed to load jobs."); return []; }
    return out.jobs || [];
  }
  async function loadApps(){
    const qs = statusFilter.value ? `?status=${encodeURIComponent(statusFilter.value)}` : "";
    const res = await hrFetch("hr-applications"+qs, { method:"GET" });
    const out = await res.json();
    if(!res.ok){ console.error(out); EGR.toast(out.error || "Failed to load applications."); return []; }
    return out.applications || [];
  }

  function renderJobs(jobs){
    jobsTable.innerHTML = `
      <thead><tr><th>Title</th><th>Department</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${jobs.map(j=>`
          <tr>
            <td><b>${EGR.escape(j.title)}</b><div class="small mono">${EGR.escape(j.id)}</div></td>
            <td>${EGR.escape(j.department)}</td>
            <td>${EGR.escape(j.employment_type || "")}</td>
            <td>${EGR.statusBadge(j.status)}</td>
            <td style="white-space:nowrap">
              <button class="btn" data-act="edit" data-id="${j.id}">Edit</button>
              <button class="btn" data-act="toggle" data-id="${j.id}">${j.status==="paused" ? "Reopen" : "Pause"}</button>
              <button class="btn danger" data-act="close" data-id="${j.id}">Close</button>
              <button class="btn danger" data-act="delete" data-id="${j.id}">Delete</button>
            </td>
          </tr>
        `).join("")}
      </tbody>`;
    jobsTable.querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("click", ()=> onJobAction(btn.dataset.act, btn.dataset.id, jobs));
    });
  }

  function renderApps(apps){
    appsTable.innerHTML = `
      <thead><tr><th>Applicant</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${apps.map(a=>`
          <tr>
            <td>
              <b>${EGR.escape(a.full_name)}</b>
              <div class="small">Discord: ${EGR.escape(a.discord_username)} • <span class="mono">${EGR.escape(a.discord_id)}</span></div>
              <div class="small">Roblox: ${EGR.escape(a.roblox_username)}${a.resume_link ? ` • <a href="${EGR.escape(a.resume_link)}" target="_blank" rel="noreferrer">Resume</a>` : ""}</div>
            </td>
            <td><b>${EGR.escape(a.role_title)}</b><div class="small mono">${EGR.escape(a.job_id||"")}</div></td>
            <td>${EGR.statusBadge(a.status)}</td>
            <td style="white-space:nowrap">
              <button class="btn" data-act="view" data-id="${a.id}">View</button>
              ${a.status==="pending" ? `
                <button class="btn ok" data-act="accept" data-id="${a.id}">Accept</button>
                <button class="btn danger" data-act="reject" data-id="${a.id}">Reject</button>
              ` : ""}
            </td>
          </tr>
        `).join("")}
      </tbody>`;
    appsTable.querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("click", ()=> onAppAction(btn.dataset.act, btn.dataset.id, apps));
    });
  }

  async function onJobAction(action, id, jobs){
    const job = jobs.find(j=>j.id===id);
    if(!job) return;

    if(action==="edit"){
      openModal("Edit job", `
        <form class="form" id="jobForm">
          <input class="input" name="title" value="${EGR.escape(job.title)}" required>
          <div class="row">
            <input class="input" name="department" value="${EGR.escape(job.department)}" required>
            <input class="input" name="employment_type" value="${EGR.escape(job.employment_type||"Direct Entry")}" required>
          </div>
          <textarea class="input" name="description" required>${EGR.escape(job.description||"")}</textarea>
          <textarea class="input" name="responsibilities" required>${EGR.escape(job.responsibilities||"")}</textarea>
          <textarea class="input" name="requirements" required>${EGR.escape(job.requirements||"")}</textarea>
          <div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap">
            <button class="btn" type="button" id="cancel">Cancel</button>
            <button class="btn primary" type="submit">Save</button>
          </div>
        </form>
      `);
      document.getElementById("cancel").addEventListener("click", closeModal);
      document.getElementById("jobForm").addEventListener("submit", async (e)=>{
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
          id: job.id,
          title: fd.get("title"),
          department: fd.get("department"),
          employment_type: fd.get("employment_type"),
          description: fd.get("description"),
          responsibilities: fd.get("responsibilities"),
          requirements: fd.get("requirements")
        };
        const res = await hrFetch("hr-jobs", { method:"PATCH", body: JSON.stringify(payload) });
        const out = await res.json();
        if(!res.ok){ EGR.toast(out.error || "Update failed."); return; }
        EGR.toast("Job updated."); closeModal(); await loadAll();
      });
      return;
    }

    if(action==="toggle"){
      const next = job.status==="paused" ? "open" : "paused";
      const res = await hrFetch("hr-jobs", { method:"PATCH", body: JSON.stringify({ id: job.id, status: next }) });
      const out = await res.json();
      if(!res.ok){ EGR.toast(out.error || "Update failed."); return; }
      EGR.toast(`Job set to ${next}.`); await loadAll(); return;
    }

    if(action==="close"){
      if(!confirm("Close this job? It will disappear from public listings.")) return;
      const res = await hrFetch("hr-jobs", { method:"PATCH", body: JSON.stringify({ id: job.id, status: "closed" }) });
      const out = await res.json();
      if(!res.ok){ EGR.toast(out.error || "Update failed."); return; }
      EGR.toast("Job closed."); await loadAll(); return;
    }

    if(action==="delete"){
      if(!confirm("Delete this job permanently? This removes associated applications.")) return;
      const res = await hrFetch(`hr-jobs?id=${encodeURIComponent(job.id)}`, { method:"DELETE" });
      const out = await res.json();
      if(!res.ok){ EGR.toast(out.error || "Delete failed."); return; }
      EGR.toast("Job deleted."); await loadAll(); return;
    }
  }

  async function onAppAction(action, id, apps){
    const app = apps.find(a=>a.id===id);
    if(!app) return;

    if(action==="view"){
      openModal("Application details", `
        <div class="grid" style="gap:10px">
          <div class="kpi"><b>Role</b><span>${EGR.escape(app.role_title)} • <span class="mono">${EGR.escape(app.job_id||"")}</span></span></div>
          <div class="kpi"><b>Applicant</b><span>${EGR.escape(app.full_name)} • Discord <span class="mono">${EGR.escape(app.discord_id)}</span></span></div>
          <div class="kpi"><b>Status</b><span>${EGR.escape(app.status)}</span></div>
          <div class="card" style="box-shadow:none"><div class="pad"><b>Why join</b><div class="small" style="margin-top:6px">${EGR.escape(app.motivation||"")}</div></div></div>
          <div class="card" style="box-shadow:none"><div class="pad"><b>Why chosen</b><div class="small" style="margin-top:6px">${EGR.escape(app.why_chosen||"")}</div></div></div>
          <div class="card" style="box-shadow:none"><div class="pad"><b>Past experience</b><div class="small" style="margin-top:6px">${EGR.escape(app.past_experience||"")}</div></div></div>
          ${app.resume_link ? `<div class="kpi"><b>Resume</b><span><a href="${EGR.escape(app.resume_link)}" target="_blank" rel="noreferrer">Open link</a></span></div>` : ""}
          <div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap">
            <button class="btn" type="button" id="closeView">Close</button>
          </div>
        </div>
      `);
      document.getElementById("closeView").addEventListener("click", closeModal);
      return;
    }

    if(action==="accept"){
      if(!confirm("Accept this applicant and trigger Discord onboarding?")) return;
      const res = await hrFetch("hr-applications", { method:"PATCH", body: JSON.stringify({ id: app.id, status: "accepted" }) });
      const out = await res.json();
      if(!res.ok){ EGR.toast(out.error || "Accept failed."); return; }
      EGR.toast(out.message || "Accepted. Onboarding attempted.");
      if(out.warning) console.warn(out.warning);
      await loadAll(); return;
    }

    if(action==="reject"){
      if(!confirm("Reject this applicant?")) return;
      const res = await hrFetch("hr-applications", { method:"PATCH", body: JSON.stringify({ id: app.id, status: "rejected" }) });
      const out = await res.json();
      if(!res.ok){ EGR.toast(out.error || "Reject failed."); return; }
      EGR.toast("Rejected."); await loadAll(); return;
    }
  }

  function addJobModal(){
    openModal("Add job", `
      <form class="form" id="newJobForm">
        <input class="input" name="title" placeholder="Job title" required>
        <div class="row">
          <input class="input" name="department" placeholder="Department" required>
          <select class="input" name="employment_type" required>
            <option>Direct Entry</option>
            <option>Training</option>
            <option>Internship</option>
            <option>Volunteer</option>
          </select>
        </div>
        <textarea class="input" name="description" placeholder="Description" required></textarea>
        <textarea class="input" name="responsibilities" placeholder="Responsibilities" required></textarea>
        <textarea class="input" name="requirements" placeholder="Requirements" required></textarea>
        <div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap">
          <button class="btn" type="button" id="cancelNew">Cancel</button>
          <button class="btn primary" type="submit">Create</button>
        </div>
      </form>
    `);
    document.getElementById("cancelNew").addEventListener("click", closeModal);
    document.getElementById("newJobForm").addEventListener("submit", async (e)=>{
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        title: fd.get("title"),
        department: fd.get("department"),
        employment_type: fd.get("employment_type"),
        description: fd.get("description"),
        responsibilities: fd.get("responsibilities"),
        requirements: fd.get("requirements"),
        status: "open"
      };
      const res = await hrFetch("hr-jobs", { method:"POST", body: JSON.stringify(payload) });
      const out = await res.json();
      if(!res.ok){ EGR.toast(out.error || "Create failed."); return; }
      EGR.toast("Job created."); closeModal(); await loadAll();
    });
  }

  newJobBtn.addEventListener("click", addJobModal);
  statusFilter.addEventListener("change", ()=> loadAll());

  async function loadAll(){
    const [jobs, apps] = await Promise.all([loadJobs(), loadApps()]);
    renderJobs(jobs); renderApps(apps);
  }

  await loadAll();
})();