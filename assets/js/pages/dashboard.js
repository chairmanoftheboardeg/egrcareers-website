import { initCommon, qs, qsa, toast, slugify, escapeHtml } from "../app.js";
import { supabase, requireHrOrRedirect, signOut } from "../supabaseClient.js";

function setLoading(id, on=true){
  const el = qs(id);
  if(!el) return;
  el.classList.toggle("hidden", !on);
}

function optionize(depts){
  return depts.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("");
}

let departments = [];
let editingJobId = null;

async function loadDepartments(){
  const { data, error } = await supabase
    .from("departments")
    .select("id,name,slug,sort_order,is_active")
    .order("sort_order", { ascending: true });

  if(error) throw error;
  departments = data || [];
  const select = qs("#job_department_id");
  if(select){
    select.innerHTML = `<option value="">(No department)</option>` + optionize(departments.filter(d=>d.is_active));
  }
}

async function loadAnnouncement(){
  const { data, error } = await supabase
    .from("announcement_bar")
    .select("message,is_active")
    .eq("id",1)
    .maybeSingle();
  if(error) throw error;
  qs("#ann_message").value = data?.message ?? "";
  qs("#ann_active").checked = !!data?.is_active;
}

async function saveAnnouncement(){
  const message = qs("#ann_message").value;
  const is_active = qs("#ann_active").checked;

  const { error } = await supabase
    .from("announcement_bar")
    .update({ message, is_active })
    .eq("id",1);

  if(error) throw error;
}

function renderJobRow(j){
  const deptName = j.department?.name || "—";
  const status = j.status;
  const pill = `<span class="badge">${escapeHtml(status)}</span>`;
  const share = `<a class="btn small ghost" href="../position.html?slug=${encodeURIComponent(j.slug)}" target="_blank">Public link</a>`;
  return `
    <tr>
      <td>
        <div style="font-weight:900">${escapeHtml(j.title)}</div>
        <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap;">
          <span class="badge">${escapeHtml(deptName)}</span>
          <span class="badge">ID: ${escapeHtml(j.role_id)}</span>
          ${pill}
        </div>
      </td>
      <td style="color:var(--muted)">${escapeHtml(j.slug)}</td>
      <td style="white-space:nowrap; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn small" data-act="edit" data-id="${j.id}">Edit</button>
        <button class="btn small" data-act="publish" data-id="${j.id}">${status==="published" ? "Unpublish" : "Publish"}</button>
        <button class="btn small" data-act="close" data-id="${j.id}">Close</button>
        <button class="btn small danger" data-act="delete" data-id="${j.id}">Delete</button>
        ${share}
      </td>
    </tr>
  `;
}

async function loadJobs(){
  const { data, error } = await supabase
    .from("jobs")
    .select("id,title,role_id,slug,status,published_at,department:departments(name)")
    .order("created_at", { ascending: false });

  if(error) throw error;
  const tbody = qs("#jobsTbody");
  tbody.innerHTML = (data||[]).map(renderJobRow).join("") || `<tr><td colspan="3" style="color:var(--muted)">No jobs yet.</td></tr>`;

  // wire actions
  qsa('[data-act="edit"]').forEach(btn => btn.addEventListener("click", ()=> startEditJob(btn.dataset.id)));
  qsa('[data-act="publish"]').forEach(btn => btn.addEventListener("click", ()=> togglePublish(btn.dataset.id)));
  qsa('[data-act="close"]').forEach(btn => btn.addEventListener("click", ()=> closeJob(btn.dataset.id)));
  qsa('[data-act="delete"]').forEach(btn => btn.addEventListener("click", ()=> deleteJob(btn.dataset.id)));
}

async function startEditJob(id){
  const { data, error } = await supabase
    .from("jobs")
    .select("id,title,role_id,slug,status,volunteer_basis,roblox_username_required,cv_link_allowed,summary,description,responsibilities,requirements,department_id")
    .eq("id", id)
    .maybeSingle();
  if(error) throw error;
  if(!data) return;

  editingJobId = data.id;
  qs("#jobFormTitle").textContent = "Edit Position";
  qs("#job_submit").textContent = "Save changes";
  qs("#job_cancel").classList.remove("hidden");

  qs("#job_title").value = data.title ?? "";
  qs("#job_role_id").value = data.role_id ?? "";
  qs("#job_slug").value = data.slug ?? "";
  qs("#job_status").value = data.status ?? "draft";
  qs("#job_department_id").value = data.department_id ?? "";
  qs("#job_volunteer").checked = !!data.volunteer_basis;
  qs("#job_roblox_req").checked = !!data.roblox_username_required;
  qs("#job_cv_allowed").checked = !!data.cv_link_allowed;
  qs("#job_summary").value = data.summary ?? "";
  qs("#job_description").value = data.description ?? "";
  qs("#job_responsibilities").value = data.responsibilities ?? "";
  qs("#job_requirements").value = data.requirements ?? "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetJobForm(){
  editingJobId = null;
  qs("#jobFormTitle").textContent = "Create New Position";
  qs("#job_submit").textContent = "Create position";
  qs("#job_cancel").classList.add("hidden");
  qs("#jobForm").reset();
}

async function upsertJob(){
  const title = qs("#job_title").value.trim();
  const role_id = qs("#job_role_id").value.trim();
  let slug = qs("#job_slug").value.trim();
  const status = qs("#job_status").value;
  const department_id = qs("#job_department_id").value || null;

  if(!slug) slug = slugify(title);
  qs("#job_slug").value = slug;

  const payload = {
    title,
    role_id,
    slug,
    status,
    department_id,
    volunteer_basis: qs("#job_volunteer").checked,
    roblox_username_required: qs("#job_roblox_req").checked,
    cv_link_allowed: qs("#job_cv_allowed").checked,
    summary: qs("#job_summary").value.trim() || null,
    description: qs("#job_description").value.trim() || null,
    responsibilities: qs("#job_responsibilities").value.trim() || null,
    requirements: qs("#job_requirements").value.trim() || null,
  };

  // set published_at if publishing now
  if(status === "published"){
    payload.published_at = new Date().toISOString();
  }

  const btn = qs("#job_submit");
  const old = btn.textContent;
  btn.textContent = editingJobId ? "Saving..." : "Creating...";
  btn.disabled = true;

  try{
    let res;
    if(editingJobId){
      res = await supabase.from("jobs").update(payload).eq("id", editingJobId);
    }else{
      res = await supabase.from("jobs").insert(payload);
    }
    if(res.error) throw res.error;

    toast(editingJobId ? "Position updated." : "Position created.", "success");
    resetJobForm();
    await loadJobs();
  }catch(err){
    console.error(err);
    toast(err.message || "Could not save position. Ensure Role ID + Slug are unique.", "error");
  }finally{
    btn.disabled = false;
    btn.textContent = old;
  }
}

async function togglePublish(id){
  const { data, error } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if(error) return toast("Could not read job status.", "error");

  const next = data?.status === "published" ? "draft" : "published";
  const payload = {
    status: next,
    published_at: next === "published" ? new Date().toISOString() : null
  };
  const { error: e2 } = await supabase.from("jobs").update(payload).eq("id", id);
  if(e2) return toast("Could not update status.", "error");

  toast(next === "published" ? "Published." : "Unpublished.", "success");
  await loadJobs();
}

async function closeJob(id){
  const { error } = await supabase.from("jobs").update({ status: "closed" }).eq("id", id);
  if(error) return toast("Could not close job.", "error");
  toast("Job closed.", "success");
  await loadJobs();
}

async function deleteJob(id){
  if(!confirm("Delete this job? This will also delete its applications.")) return;
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if(error) return toast("Could not delete job.", "error");
  toast("Job deleted.", "success");
  await loadJobs();
  await loadApplications();
}

function renderAppRow(a){
  const badges = [
    `<span class="badge">Status: ${escapeHtml(a.status)}</span>`,
    `<span class="badge">${escapeHtml(a.position_id)}</span>`,
  ].join(" ");
  const cv = a.cv_link ? `<a href="${escapeHtml(a.cv_link)}" target="_blank">CV link</a>` : "—";
  const roblox = a.roblox_username ? escapeHtml(a.roblox_username) : "—";

  return `
    <tr>
      <td>
        <div style="font-weight:900">${escapeHtml(a.full_name)}</div>
        <div style="color:var(--muted); margin-top:4px;">${escapeHtml(a.email)} · ${escapeHtml(a.discord_username)} (${escapeHtml(a.discord_id)})</div>
        <div style="margin-top:6px; display:flex; gap:8px; flex-wrap:wrap;">${badges}</div>
      </td>
      <td style="color:var(--muted)">
        <div style="font-weight:800; color:var(--text)">${escapeHtml(a.position_name)}</div>
        <div style="margin-top:6px;"><b>Roblox:</b> ${roblox}</div>
        <div style="margin-top:6px;"><b>CV:</b> ${cv}</div>
        <div style="margin-top:10px; white-space:pre-wrap;"><b>Why EGR:</b> ${escapeHtml(a.interest_org)}</div>
        <div style="margin-top:10px; white-space:pre-wrap;"><b>Why this role:</b> ${escapeHtml(a.interest_position)}</div>
        ${a.prior_experience ? `<div style="margin-top:10px; white-space:pre-wrap;"><b>Experience:</b> ${escapeHtml(a.prior_experience)}</div>` : ``}
      </td>
      <td style="white-space:nowrap">
        <select class="input" data-app-status="${a.id}">
          ${["new","reviewing","accepted","rejected","withdrawn"].map(s=>`<option value="${s}" ${a.status===s?"selected":""}>${s}</option>`).join("")}
        </select>
        <textarea class="input" style="margin-top:10px; min-height:86px" placeholder="Internal notes (HR only)..." data-app-notes="${a.id}">${escapeHtml(a.internal_notes||"")}</textarea>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
          <button class="btn small" data-app-save="${a.id}">Save</button>
          <button class="btn small danger" data-app-del="${a.id}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

async function loadApplications(){
  const status = qs("#appFilter").value || "";
  let query = supabase
    .from("applications")
    .select("id,full_name,email,discord_username,discord_id,roblox_username,cv_link,interest_org,interest_position,prior_experience,position_name,position_id,status,internal_notes,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if(status) query = query.eq("status", status);

  const { data, error } = await query;
  if(error) throw error;

  const tbody = qs("#appsTbody");
  tbody.innerHTML = (data||[]).map(renderAppRow).join("") || `<tr><td colspan="3" style="color:var(--muted)">No applications found.</td></tr>`;

  // wire saves
  qsa("[data-app-save]").forEach(btn => btn.addEventListener("click", ()=> saveApplication(btn.dataset.appSave)));
  qsa("[data-app-del]").forEach(btn => btn.addEventListener("click", ()=> deleteApplication(btn.dataset.appDel)));
}

async function saveApplication(id){
  const status = qs(`[data-app-status="${id}"]`).value;
  const notes = qs(`[data-app-notes="${id}"]`).value;

  const { error } = await supabase
    .from("applications")
    .update({ status, internal_notes: notes })
    .eq("id", id);

  if(error) return toast("Could not save application.", "error");
  toast("Application updated.", "success");
}

async function deleteApplication(id){
  if(!confirm("Delete this application?")) return;
  const { error } = await supabase.from("applications").delete().eq("id", id);
  if(error) return toast("Could not delete application.", "error");
  toast("Application deleted.", "success");
  await loadApplications();
}

async function main(){
  await initCommon({ loadAnnouncement:false });

  const ok = await requireHrOrRedirect();
  if(!ok) return;

  // Wire
  qs("#signOut").addEventListener("click", async ()=>{
    await signOut();
    location.href = "hr.html";
  });

  qs("#annSave").addEventListener("click", async ()=>{
    try{
      await saveAnnouncement();
      toast("Announcement updated.", "success");
    }catch(err){
      console.error(err);
      toast("Could not update announcement.", "error");
    }
  });

  qs("#job_title").addEventListener("input", ()=>{
    if(editingJobId) return;
    const slugEl = qs("#job_slug");
    if(!slugEl.value.trim()){
      slugEl.value = slugify(qs("#job_title").value);
    }
  });

  qs("#jobForm").addEventListener("submit", async (e)=>{
    e.preventDefault();
    await upsertJob();
  });

  qs("#job_cancel").addEventListener("click", (e)=>{
    e.preventDefault();
    resetJobForm();
  });

  qs("#appsRefresh").addEventListener("click", ()=> loadApplications().catch(console.error));
  qs("#appFilter").addEventListener("change", ()=> loadApplications().catch(console.error));

  // Load data
  setLoading("#dashLoading", true);
  try{
    await loadDepartments();
    await loadAnnouncement();
    await loadJobs();
    await loadApplications();
  }catch(err){
    console.error(err);
    toast(err.message || "Dashboard failed to load.", "error");
  }finally{
    setLoading("#dashLoading", false);
  }
}

await main();
