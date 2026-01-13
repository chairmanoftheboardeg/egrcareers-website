(async function(){
  const cfgState = (window.EGR && EGR.getConfig) ? EGR.getConfig() : { ok:false };
  if(!cfgState.ok){ document.getElementById("configWarn")?.style.setProperty("display","block"); return; }
  const sb = EGR.supabase;
  if(!sb){ EGR.toast("Supabase client not initialised. Check config."); return; }

  const jobsGrid = document.getElementById("jobsGrid");
  const search = document.getElementById("jobSearch");
  const deptFilter = document.getElementById("deptFilter");
  const typeFilter = document.getElementById("typeFilter");
  const refreshBtn = document.getElementById("refreshBtn");

  let allJobs = [];

  function render(list){
    if(!list.length){
      jobsGrid.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="pad">
        <b>No roles found</b><p class="small">Adjust your filters or check back later.</p>
      </div></div>`;
      return;
    }
    jobsGrid.innerHTML = list.map(j => {
      const title = EGR.escape(j.title);
      const dept = EGR.escape(j.department);
      const type = EGR.escape(j.employment_type || "Staff");
      const descRaw = j.description || "";
      const desc = EGR.escape(descRaw.slice(0, 180)) + (descRaw.length > 180 ? "…" : "");
      return `
      <div class="card">
        <div class="pad">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start">
            <div>
              <b style="font-size:16px">${title}</b>
              <div class="small">${dept} • ${type}</div>
            </div>
            ${EGR.statusBadge(j.status || "open")}
          </div>
          <p class="small" style="margin-top:10px">${desc}</p>
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px">
            <a class="btn" href="/job.html?id=${encodeURIComponent(j.id)}">View details</a>
            <a class="btn primary" href="/apply.html?job_id=${encodeURIComponent(j.id)}">Apply</a>
          </div>
        </div>
      </div>`;
    }).join("");
  }

  function applyFilters(){
    const q = (search.value || "").trim().toLowerCase();
    const dept = deptFilter.value || "";
    const type = typeFilter.value || "";
    let list = allJobs.slice();

    if(dept) list = list.filter(j => (j.department || "") === dept);
    if(type) list = list.filter(j => (j.employment_type || "") === type);
    if(q){
      list = list.filter(j => {
        const blob = `${j.title||""} ${j.department||""} ${j.description||""} ${j.requirements||""} ${j.responsibilities||""}`.toLowerCase();
        return blob.includes(q);
      });
    }
    render(list);
  }

  async function loadJobs(){
    jobsGrid.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="pad">
      <b>Loading roles…</b><p class="small">Fetching open positions from our recruitment database.</p>
    </div></div>`;

    const { data, error } = await sb
      .from("jobs")
      .select("id,title,department,description,requirements,responsibilities,employment_type,status,created_at")
      .order("created_at", { ascending:false });

    if(error){
      console.error(error);
      jobsGrid.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="pad">
        <b>Unable to load roles</b><p class="small">Check config and database policies.</p>
      </div></div>`;
      return;
    }

    allJobs = (data || []).filter(j => (j.status || "open") === "open");
    const depts = Array.from(new Set(allJobs.map(j => j.department).filter(Boolean))).sort();
    deptFilter.innerHTML = `<option value="">All departments</option>` + depts.map(d => `<option value="${EGR.escape(d)}">${EGR.escape(d)}</option>`).join("");

    applyFilters();
  }

  search.addEventListener("input", applyFilters);
  deptFilter.addEventListener("change", applyFilters);
  typeFilter.addEventListener("change", applyFilters);
  refreshBtn.addEventListener("click", loadJobs);

  await loadJobs();
})();