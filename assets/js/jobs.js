(async function(){
  const warn = document.getElementById("configWarn");
  const st = (window.EGR && EGR.getConfig) ? EGR.getConfig() : { ok:false };
  if(!st.ok){
    if(warn) warn.style.display = "block";
    return;
  }
  const sb = EGR.supabase;
  if(!sb){
    if(warn) warn.style.display = "block";
    return;
  }

  const searchEl = document.getElementById("jobSearch");
  const deptEl = document.getElementById("deptFilter");
  const typeEl = document.getElementById("typeFilter");
  const grid = document.getElementById("jobsGrid");
  const refreshBtn = document.getElementById("refreshBtn");

  let allJobs = [];

  function card(job){
    const title = EGR.escape(job.title || "Untitled role");
    const dept = EGR.escape(job.department || "Department TBD");
    const loc  = EGR.escape(job.location || "Online");
    const type = EGR.escape(job.employment_type || "Direct Entry");
    const status = (job.status || "open").toLowerCase();

    return `
      <div class="card">
        <div class="pad">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px">
            <div>
              <b style="font-size:16px">${title}</b>
              <div class="small" style="margin-top:6px">${dept} • ${loc} • ${type}</div>
            </div>
            ${EGR.statusBadge(status)}
          </div>
          <div class="small" style="margin-top:10px; line-height:1.6">
            ${(job.description || "").slice(0, 220) ? EGR.escape((job.description||"").slice(0,220)) + (job.description.length>220?"…":"") : "View details to see role description."}
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px">
            <a class="btn primary" href="/job.html?id=${encodeURIComponent(job.id)}">View role</a>
            <a class="btn" href="/apply.html?id=${encodeURIComponent(job.id)}">Apply</a>
          </div>
        </div>
      </div>`;
  }

  function applyFilters(){
    const q = (searchEl?.value || "").trim().toLowerCase();
    const dept = deptEl?.value || "";
    const type = typeEl?.value || "";

    const filtered = allJobs.filter(j => (j.status || "open") === "open").filter(j => {
      if(dept && (j.department || "") !== dept) return false;
      if(type && (j.employment_type || "") !== type) return false;
      if(!q) return true;

      const hay = [
        j.title, j.department, j.location, j.employment_type,
        j.description, j.requirements, j.responsibilities
      ].filter(Boolean).join(" ").toLowerCase();

      return hay.includes(q);
    });

    if(grid){
      grid.innerHTML = filtered.length ? filtered.map(card).join("") : `
        <div class="card"><div class="pad">
          <b>No roles found</b>
          <div class="small" style="margin-top:8px">Try changing filters, or check again later if hiring is paused.</div>
        </div></div>`;
    }
  }

  function fillDepartments(jobs){
    const depts = [...new Set(jobs.map(j => j.department).filter(Boolean))].sort();
    if(!deptEl) return;
    deptEl.innerHTML = `<option value="">All departments</option>` + depts.map(d => `<option value="${EGR.escape(d)}">${EGR.escape(d)}</option>`).join("");
  }

  async function load(){
    try{
      const { data, error } = await sb
        .from("jobs")
        .select("id,title,department,location,employment_type,description,requirements,responsibilities,status,created_at")
        .order("created_at", { ascending:false });

      if(error) throw error;
      allJobs = data || [];
      fillDepartments(allJobs);
      applyFilters();
    }catch(e){
      console.error(e);
      if(warn) warn.style.display = "block";
      EGR.toast("Jobs could not be loaded. Check database + RLS policies.");
    }
  }

  if(searchEl) searchEl.addEventListener("input", applyFilters);
  if(deptEl) deptEl.addEventListener("change", applyFilters);
  if(typeEl) typeEl.addEventListener("change", applyFilters);
  if(refreshBtn) refreshBtn.addEventListener("click", load);

  await load();
})();