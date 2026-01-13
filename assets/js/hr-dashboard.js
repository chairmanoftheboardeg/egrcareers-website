(async function(){
  const cfg = window.EGR_CONFIG || {};
  const PASS = sessionStorage.getItem("EGR_HR_PASS") || "";
  const baseUrl = cfg.FUNCTIONS_BASE || "";
  const headerName = cfg.HR_HEADER_NAME || "X-HR-PASSWORD";

  const logoutBtn = document.getElementById("logoutBtn");
  const reloadBtn = document.getElementById("reloadBtn");
  const jobsTable = document.getElementById("jobsTable");
  const appsTable = document.getElementById("appsTable");
  const newJobBtn = document.getElementById("newJobBtn");
  const appStatusFilter = document.getElementById("appStatusFilter");

  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");

  if(!PASS){
    location.href = "/hr/login.html";
    return;
  }

  function openModal(title, innerHtml){
    if(modalTitle) modalTitle.textContent = title;
    if(modalBody) modalBody.innerHTML = innerHtml;
    if(modal) modal.style.display = "block";
  }
  function closeModal(){
    if(modal) modal.style.display = "none";
  }
  if(modalClose) modalClose.addEventListener("click", closeModal);
  if(modal) modal.addEventListener("click", (e)=>{ if(e.target===modal) closeModal(); });

  async function api(path, options={}){
    if(!baseUrl) throw new Error("Missing FUNCTIONS_BASE in config.js");
    const url = `${baseUrl}/${path}`;
    const headers = Object.assign({
      "Content-Type": "application/json",
      [headerName]: PASS
    }, options.headers || {});

    const res = await fetch(url, { ...options, headers });
    if(!res.ok){
      const txt = await res.text();
      throw new Error(`API ${path} failed: ${res.status} ${txt}`);
    }
    const ct = res.headers.get("content-type") || "";
    if(ct.includes("application/json")) return res.json();
    return res.text();
  }

  function jobRow(j){
    const status = (j.status || "open").toLowerCase();
    return `
      <tr>
        <td class="mono">${EGR.escape(j.id)}</td>
        <td><b>${EGR.escape(j.title||"")}</b><div class="small">${EGR.escape(j.department||"")} • ${EGR.escape(j.location||"")}</div></td>
        <td>${EGR.escape(j.employment_type||"")}</td>
        <td>${EGR.statusBadge(status)}</td>
        <td style="white-space:nowrap">
          <button class="btn" data-act="edit" data-id="${EGR.escape(j.id)}" type="button">Edit</button>
          <button class="btn warn" data-act="toggle" data-id="${EGR.escape(j.id)}" type="button">${status==="open"?"Pause":"Open"}</button>
          <button class="btn danger" data-act="delete" data-id="${EGR.escape(j.id)}" type="button">Delete</button>
        </td>
      </tr>`;
  }

  function appsRow(a){
    return `
      <tr>
        <td class="mono">${EGR.escape(a.id)}</td>
        <td>
          <b>${EGR.escape(a.full_name||"")}</b>
          <div class="small">${EGR.escape(a.discord_username||"")} • ${EGR.escape(a.discord_id||"")}</div>
          <div class="small">${EGR.escape(a.roblox_username||"")}</div>
        </td>
        <td><b>${EGR.escape(a.role_title||"")}</b><div class="small mono">${EGR.escape(a.job_id||"")}</div></td>
        <td>${EGR.statusBadge((a.status||"pending").toLowerCase())}</td>
        <td style="white-space:nowrap">
          <button class="btn ok" data-act="accept" data-id="${EGR.escape(a.id)}" type="button">Accept</button>
          <button class="btn danger" data-act="reject" data-id="${EGR.escape(a.id)}" type="button">Reject</button>
          <button class="btn" data-act="view" data-id="${EGR.escape(a.id)}" type="button">View</button>
        </td>
      </tr>`;
  }

  function jobForm(job={}){
    return `
      <form class="form" id="jobForm">
        <input class="input" name="title" placeholder="Role title" value="${EGR.escape(job.title||"")}" required>
        <div class="row">
          <input class="input" name="department" placeholder="Department (e.g., Flight Ops)" value="${EGR.escape(job.department||"")}" required>
          <input class="input" name="location" placeholder="Location (e.g., Online / DXB Hub)" value="${EGR.escape(job.location||"Online")}" required>
        </div>
        <div class="row">
          <select class="input" name="employment_type" required>
            ${["Direct Entry","Training","Internship","Volunteer"].map(t => `<option ${job.employment_type===t?"selected":""} value="${t}">${t}</option>`).join("")}
          </select>
          <select class="input" name="status" required>
            ${["open","paused","closed"].map(s => `<option ${((job.status||"open")===s)?"selected":""} value="${s}">${s}</option>`).join("")}
          </select>
        </div>
        <textarea class="input" name="description" placeholder="Description (use new lines for paragraphs)">${EGR.escape(job.description||"")}</textarea>
        <textarea class="input" name="responsibilities" placeholder="Responsibilities (one per line)">${EGR.escape(job.responsibilities||"")}</textarea>
        <textarea class="input" name="requirements" placeholder="Requirements (one per line)">${EGR.escape(job.requirements||"")}</textarea>
        <button class="btn primary" type="submit">Save</button>
        ${job.id ? `<div class="small mono">Job ID: ${EGR.escape(job.id)}</div>` : `<div class="small">A new ID will be generated.</div>`}
      </form>`;
  }

  async function loadJobs(){
    const res = await api("hr-jobs", { method:"GET" });
    const jobs = res.jobs || [];
    if(jobsTable){
      jobsTable.innerHTML = `
        <thead><tr>
          <th>ID</th><th>Role</th><th>Type</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>${jobs.map(jobRow).join("")}</tbody>`;
    }
    return jobs;
  }

  async function loadApps(){
    const qs = appStatusFilter?.value ? `?status=${encodeURIComponent(appStatusFilter.value)}` : "";
    const res = await api("hr-applications"+qs, { method:"GET" });
    const apps = res.applications || [];
    if(appsTable){
      appsTable.innerHTML = `
        <thead><tr>
          <th>ID</th><th>Applicant</th><th>Role</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>${apps.map(appsRow).join("")}</tbody>`;
    }
    return apps;
  }

  async function reloadAll(){
    try{
      await Promise.all([loadJobs(), loadApps()]);
      EGR.toast("Dashboard loaded.");
    }catch(e){
      console.error(e);
      EGR.toast("Dashboard failed to load. Check Edge Functions + env vars.");
    }
  }

  async function createOrUpdateJob(id, payload){
    const method = id ? "PUT" : "POST";
    const body = JSON.stringify({ id, ...payload });
    return api("hr-jobs", { method, body });
  }

  async function toggleJob(id){
    return api("hr-jobs", { method:"PATCH", body: JSON.stringify({ id }) });
  }

  async function deleteJob(id){
    return api("hr-jobs", { method:"DELETE", body: JSON.stringify({ id }) });
  }

  async function setAppStatus(id, status){
    return api("hr-applications", { method:"PATCH", body: JSON.stringify({ id, status }) });
  }

  async function viewApplication(id){
    const res = await api("hr-applications?id="+encodeURIComponent(id), { method:"GET" });
    return res.application;
  }

  function bindTableActions(){
    if(jobsTable){
      jobsTable.addEventListener("click", async (e)=>{
        const btn = e.target.closest("button");
        if(!btn) return;
        const act = btn.getAttribute("data-act");
        const id = btn.getAttribute("data-id");
        try{
          if(act==="edit"){
            const res = await api("hr-jobs?id="+encodeURIComponent(id), { method:"GET" });
            openModal("Edit Job", jobForm(res.job || {}));
            const f = document.getElementById("jobForm");
            if(f){
              f.addEventListener("submit", async (ev)=>{
                ev.preventDefault();
                const fd = new FormData(f);
                const payload = Object.fromEntries(fd.entries());
                await createOrUpdateJob(id, payload);
                closeModal();
                await loadJobs();
                EGR.toast("Job saved.");
              });
            }
          }else if(act==="toggle"){
            await toggleJob(id);
            await loadJobs();
            EGR.toast("Job status updated.");
          }else if(act==="delete"){
            if(!confirm("Delete this job?")) return;
            await deleteJob(id);
            await loadJobs();
            EGR.toast("Job deleted.");
          }
        }catch(err){
          console.error(err);
          EGR.toast("Action failed. Check server logs.");
        }
      });
    }

    if(appsTable){
      appsTable.addEventListener("click", async (e)=>{
        const btn = e.target.closest("button");
        if(!btn) return;
        const act = btn.getAttribute("data-act");
        const id = btn.getAttribute("data-id");
        try{
          if(act==="accept"){
            await setAppStatus(id, "accepted");
            await loadApps();
            EGR.toast("Application accepted.");
          }else if(act==="reject"){
            await setAppStatus(id, "rejected");
            await loadApps();
            EGR.toast("Application rejected.");
          }else if(act==="view"){
            const a = await viewApplication(id);
            openModal("Application Details", `
              <div class="small" style="display:grid; gap:10px; line-height:1.7">
                <div><b>Applicant</b><div>${EGR.escape(a.full_name||"")}</div></div>
                <div><b>Discord</b><div>${EGR.escape(a.discord_username||"")} • <span class="mono">${EGR.escape(a.discord_id||"")}</span></div></div>
                <div><b>Roblox</b><div>${EGR.escape(a.roblox_username||"")}</div></div>
                <div><b>Role</b><div>${EGR.escape(a.role_title||"")} • <span class="mono">${EGR.escape(a.job_id||"")}</span></div></div>
                <div><b>Resume link</b><div>${a.resume_link ? `<a href="${EGR.escape(a.resume_link)}" target="_blank" rel="noreferrer">${EGR.escape(a.resume_link)}</a>` : "—"}</div></div>
                <div><b>Motivation</b><div>${EGR.escape(a.motivation||"")}</div></div>
                <div><b>Why chosen</b><div>${EGR.escape(a.why_chosen||"")}</div></div>
                <div><b>Past experience</b><div>${EGR.escape(a.past_experience||"")}</div></div>
                <div><b>Status</b><div>${EGR.statusBadge((a.status||"pending").toLowerCase())}</div></div>
              </div>
            `);
          }
        }catch(err){
          console.error(err);
          EGR.toast("Action failed. Check server logs.");
        }
      });
    }
  }

  if(newJobBtn){
    newJobBtn.addEventListener("click", ()=>{
      openModal("Add Job", jobForm({ status:"open", employment_type:"Direct Entry", location:"Online" }));
      const f = document.getElementById("jobForm");
      if(f){
        f.addEventListener("submit", async (ev)=>{
          ev.preventDefault();
          try{
            const fd = new FormData(f);
            const payload = Object.fromEntries(fd.entries());
            await createOrUpdateJob(null, payload);
            closeModal();
            await loadJobs();
            EGR.toast("Job created.");
          }catch(err){
            console.error(err);
            EGR.toast("Create failed. Check server logs.");
          }
        });
      }
    });
  }

  if(appStatusFilter) appStatusFilter.addEventListener("change", loadApps);

  if(logoutBtn){
    logoutBtn.addEventListener("click", ()=>{
      sessionStorage.removeItem("EGR_HR_PASS");
      location.href = "/hr/login.html";
    });
  }
  if(reloadBtn) reloadBtn.addEventListener("click", reloadAll);

  bindTableActions();
  await reloadAll();
})();