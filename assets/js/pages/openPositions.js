import { initCommon, qs, qsa, escapeHtml, getQueryParam, toast } from "../app.js";
import { supabase } from "../supabaseClient.js";

function renderJob(job){
  const deptName = job.department?.name || "General";
  const deptSlug = job.department?.slug || "";
  const badge = `<span class="badge">${escapeHtml(deptName)}</span>`;
  const url = `position.html?slug=${encodeURIComponent(job.slug)}`;
  return `
    <tr>
      <td>
        <div style="font-weight:900">${escapeHtml(job.title)}</div>
        <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap;">
          ${badge}
          <span class="badge">Position ID: ${escapeHtml(job.role_id)}</span>
        </div>
      </td>
      <td style="color:var(--muted)">${escapeHtml(job.summary || "View role details, responsibilities, and requirements.")}</td>
      <td style="white-space:nowrap">
        <a class="btn small" href="${url}">View role</a>
      </td>
    </tr>
  `;
}

async function loadDepartments(){
  const select = qs("#deptSelect");
  const filterLinks = qs("#deptChips");
  const { data, error } = await supabase
    .from("departments")
    .select("name,slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if(error) throw error;

  if(select){
    select.innerHTML = `<option value="">All departments</option>` + data.map(d=>`<option value="${d.slug}">${escapeHtml(d.name)}</option>`).join("");
  }

  if(filterLinks){
    const all = `<a class="btn small ghost" href="open-positions.html">All</a>`;
    const chips = data.slice(0, 8).map(d=>`<a class="btn small ghost" href="open-positions.html?dept=${encodeURIComponent(d.slug)}">${escapeHtml(d.name)}</a>`).join(" ");
    filterLinks.innerHTML = all + " " + chips;
  }
}

async function loadJobs(){
  const dept = getQueryParam("dept") || "";
  const search = (qs("#searchInput")?.value || "").trim().toLowerCase();

  const tbody = qs("#jobsTbody");
  const empty = qs("#emptyState");
  if(tbody) tbody.innerHTML = "";

  let query = supabase
    .from("jobs")
    .select("id,title,role_id,slug,summary,department:departments(name,slug)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if(dept){
    query = query.eq("department.slug", dept);
  }

  const { data, error } = await query;
  if(error) throw error;

  const filtered = !search ? data : data.filter(j=>{
    const hay = `${j.title} ${j.role_id} ${j.summary||""} ${(j.department?.name||"")}`.toLowerCase();
    return hay.includes(search);
  });

  if(!filtered.length){
    if(empty) empty.classList.remove("hidden");
    return;
  }
  if(empty) empty.classList.add("hidden");
  if(tbody) tbody.innerHTML = filtered.map(renderJob).join("");
}

function wire(){
  const select = qs("#deptSelect");
  const search = qs("#searchInput");

  const deptFromQuery = getQueryParam("dept") || "";
  if(select) select.value = deptFromQuery;

  select?.addEventListener("change", ()=>{
    const v = select.value;
    const url = v ? `open-positions.html?dept=${encodeURIComponent(v)}` : "open-positions.html";
    location.href = url;
  });

  search?.addEventListener("input", ()=> loadJobs().catch(console.warn));
}

await initCommon({ loadAnnouncement:false });

try{
  await loadDepartments();
  wire();
  await loadJobs();
}catch(err){
  console.error(err);
  toast("Could not load open positions. Please try again later.", "error");
}
