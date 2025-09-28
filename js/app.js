/* ========= Utilities ========= */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const app = $('#app');
const authModal = $('#authModal');
const authBtn = $('#authBtn');
const clock = $('#clock');

let sessionUser = null;
let userProfile = null;

/* ========= Hero background rotator ========= */
const heroImages = [
  "/assets/hero/hq-1.jpg",
  "/assets/hero/hq-2.jpg",
  "/assets/hero/hq-3.jpg",
  "/assets/hero/hq-4.jpg",
  "/assets/hero/hq-5.jpg",
  "/assets/hero/hq-6.jpg",
];

function startHeroRotator(){
  const bg = document.getElementById('heroBg');
  if (!bg) return;
  // preload
  heroImages.forEach(src => { const i = new Image(); i.src = src; });
  let i = 0;
  const swap = () => {
    const a = bg; // we’ll use ::before and ::after
    a.style.setProperty('--imgA', `url("${heroImages[i % heroImages.length]}")`);
    a.style.setProperty('--imgB', `url("${heroImages[(i+1) % heroImages.length]}")`);
    // set backgrounds by toggling a class
    a.classList.toggle('flip');
    i++;
  };
  // initial paint
  const first = heroImages[0], second = heroImages[1] || heroImages[0];
  bg.style.setProperty('--imgA', `url("${first}")`);
  bg.style.setProperty('--imgB', `url("${second}")`);
  // bind CSS vars to pseudo elements
  const style = document.createElement('style');
  style.textContent = `
    #heroBg::before{ background-image: var(--imgA); }
    #heroBg::after { background-image: var(--imgB); }
    #heroBg.flip::before{ opacity:0; transform: scale(1.04); }
    #heroBg.flip::after { opacity:1; transform: scale(1.02); }
  `;
  document.head.appendChild(style);

  // start cycling every 7s
  setInterval(swap, 7000);
}


/* ========= Live local time ========= */
function startClock(){
  const upd = () => {
    const d = new Date();
    clock.textContent = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  };
  upd(); setInterval(upd, 15_000);
}

/* ========= Typewriter ticker ========= */
const rolesTicker = [
  "Cabin Crew — Fly Dubai",
  "Ground Services — EGR HQ",
  "Operations — Emirates Airlines",
  "University Trainee — EGR Aviation University",
  "Engineering — Falcon LTD"
];
function startTicker(){
  const node = $('#typeTicker');
  let i=0;
  const tick = () => {
    const text = rolesTicker[i % rolesTicker.length];
    node.style.width = '0ch';
    node.textContent = text;
    const ch = text.length;
    node.animate([{width:'0ch'},{width:`${ch}ch`}], {duration: 800, fill:'forwards', easing:'steps(28, end)'});
    i++;
  };
  tick(); setInterval(tick, 3000);
}

/* ========= On-scroll animation ========= */
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('a-in'); });
},{threshold:.2});
function armAnimations(){ $$('.a-fade').forEach(el=>io.observe(el)); }

/* ========= Auth ========= */
async function loadSession(){
  const { data: { user } } = await supabase.auth.getUser();
  sessionUser = user || null;
  if (user){
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    userProfile = data || null;
    authBtn.textContent = 'Sign Out';
  } else {
    userProfile = null;
    authBtn.textContent = 'Sign In';
  }
}

supabase.auth.onAuthStateChange(async ()=>{
  await loadSession();
  router();
});

document.addEventListener('DOMContentLoaded', async ()=>{
  startClock();
  startTicker();
  await loadSession();
  router();
  armAnimations();
  updateOpenRolesStat();
});

/* ========= Auth modal handlers ========= */
authBtn.addEventListener('click', async ()=>{
  if (sessionUser){ await supabase.auth.signOut(); return; }
  authModal.showModal();
});

$('#loginBtn').addEventListener('click', async (e)=>{
  e.preventDefault();
  const email = $('#authEmail').value.trim();
  const pass  = $('#authPass').value.trim();
  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  $('#authMsg').textContent = error ? error.message : 'Signed in!';
  if (!error) authModal.close();
});

$('#signupBtn').addEventListener('click', async (e)=>{
  e.preventDefault();
  const email = $('#authEmail').value.trim();
  const pass  = $('#authPass').value.trim();
  const { error } = await supabase.auth.signUp({ email, password: pass });
  $('#authMsg').textContent = error ? error.message : 'Account created. You can sign in now.';
});

/* ========= Simple router ========= */
window.addEventListener('hashchange', router);
function router(){
  const r = location.hash.replace('#','') || '/jobs';
  if (r.startsWith('/jobs')) return viewJobs();
  if (r.startsWith('/job/')) return viewJob(r.split('/')[2]);
  if (r.startsWith('/apply/')) return viewApply(r.split('/')[2]);
  if (r.startsWith('/dashboard')) return viewDashboard();
  if (r.startsWith('/hr')) return viewHR();
  return viewJobs();
}

/* ========= Helper UIs ========= */
function skel(h=60){ return `<div class="skel" style="height:${h}px"></div>`; }
function chips(job){
  const chips = [];
  chips.push(`<span class="badge">${job.departments?.name || 'General'}</span>`);
  chips.push(`<span class="badge ${job.status==='open'?'status-open':'status-closed'}">${job.status}</span>`);
  chips.push(`<span class="badge">${job.is_paid ? 'Paid' : 'Unpaid'}</span>`);
  return chips.join('');
}

/* ========= Stats: open roles count ========= */
async function updateOpenRolesStat(){
  const { data, error } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status','open');
  const n = (data===null && !error && typeof arguments[0]==='number') ? arguments[0] : (error ? '—' : (supabase.getPagination?.count || ''));
  // simpler: query again with count
  const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status','open');
  $('#stat-open').textContent = (count ?? '—');
}

/* ========= Views ========= */
async function viewJobs(){
  app.innerHTML = `
    <section class="grid two a-fade">
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center">
          <h2 style="margin:.2rem 0">Open Positions</h2>
          <div class="row">
            <input id="q" placeholder="Search title / division" style="min-width:220px">
            <select id="fDept"><option value="">All Departments</option></select>
            <select id="fPaid"><option value="">Paid & Unpaid</option><option value="true">Paid</option><option value="false">Unpaid</option></select>
          </div>
        </div>
        <div id="jobsList" class="list" aria-busy="true">
          ${skel(64)}${skel(64)}${skel(64)}
        </div>
      </div>
      <aside class="card">
        <h3>Why EGR?</h3>
        <p class="meta">Professional standards, structured growth, and a friendly community. Save time with your account and track application status in real time.</p>
        <hr style="border-color:rgba(255,255,255,.12)">
        <h3>Divisions</h3>
        <p class="meta">Emirates Airlines · Fly Dubai · EGR HQ · University · Falcon LTD</p>
      </aside>
    </section>`;

  // load departments for filter
  const { data: depts } = await supabase.from('departments').select('id,name').order('name');
  $('#fDept').innerHTML = `<option value="">All Departments</option>` + (depts||[]).map(d=>`<option value="${d.id}">${d.name}</option>`).join('');

  async function fetchAndRender(){
    const q = $('#q').value.trim();
    const dept = $('#fDept').value;
    const paid = $('#fPaid').value;

    let req = supabase.from('jobs').select('id,title,division,location,is_paid,posted_at,close_date,status,departments(name)')
      .order('posted_at', { ascending:false });

    if (q) req = req.ilike('title', `%${q}%`);
    if (dept) req = req.eq('department_id', dept);
    if (paid) req = req.eq('is_paid', paid === 'true');

    // Non-HR: only open jobs are readable (policy), HR: can see all
    const { data: jobs, error } = await req;
    const list = $('#jobsList');
    list.setAttribute('aria-busy','false');

    list.innerHTML = (jobs||[]).length ? (jobs||[]).map(j => `
      <article class="item a-fade">
        <div class="row">${chips(j)}</div>
        <h3 style="margin:.2rem 0">${j.title}</h3>
        <div class="meta">${j.division || 'EGR'} · ${j.location || 'Remote/Varies'} · Posted ${j.posted_at}</div>
        <div class="row">
          <a class="btn" href="#/job/${j.id}">View</a>
          <a class="btn primary" href="#/apply/${j.id}">Apply</a>
          <button class="btn ghost" data-save="${j.id}">Save</button>
        </div>
      </article>
    `).join('') : `<p class="meta">No roles match your filters.</p>`;

    armAnimations();

    // simple saved-jobs via localStorage
    list.addEventListener('click', (e)=>{
      const id = e.target.dataset.save;
      if (!id) return;
      const saved = JSON.parse(localStorage.getItem('saved_jobs')||'[]');
      if (!saved.includes(id)) saved.push(id);
      localStorage.setItem('saved_jobs', JSON.stringify(saved));
      e.target.textContent = 'Saved';
    });
  }

  $('#q').addEventListener('input', debounce(fetchAndRender, 250));
  $('#fDept').addEventListener('change', fetchAndRender);
  $('#fPaid').addEventListener('change', fetchAndRender);

  fetchAndRender();
}

async function viewJob(id){
  app.innerHTML = `<section class="grid a-fade"><div class="card">${skel(200)}</div></section>`;
  const { data: job } = await supabase.from('jobs').select('*, departments(name)').eq('id', id).maybeSingle();
  if (!job){ app.innerHTML = `<div class="card">Job not found.</div>`; return; }

  app.innerHTML = `
    <section class="grid a-fade">
      <article class="card">
        <div class="row">
          <span class="badge">${job.departments?.name || 'General'}</span>
          <span class="badge ${job.status==='open'?'status-open':'status-closed'}">${job.status}</span>
          <span class="badge">${job.is_paid ? 'Paid' : 'Unpaid'}</span>
        </div>
        <h2 style="margin:.3rem 0">${job.title}</h2>
        <div class="meta">${job.division || 'EGR'} · ${job.location || 'Remote/Varies'} · Posted ${job.posted_at}</div>
        <h3>Description</h3>
        <p>${(job.description||'').replaceAll('\n','<br>')}</p>
        <h3>Requirements</h3>
        <p>${(job.requirements||'').replaceAll('\n','<br>')}</p>
        <div class="row">
          ${job.status==='open' ? `<a class="btn primary" href="#/apply/${job.id}">Apply Now</a>` : ''}
          <a class="btn ghost" href="#/jobs">Back to Jobs</a>
        </div>
      </article>
    </section>`;
  armAnimations();
}

async function viewApply(jobId){
  if (!sessionUser){ authModal.showModal(); return; }
  const { data: job } = await supabase.from('jobs').select('id,title,status').eq('id', jobId).maybeSingle();
  if (!job){ app.innerHTML = '<div class="card">Job not found.</div>'; return; }

  app.innerHTML = `
    <section class="grid a-fade">
      <form class="card" id="applyForm">
        <h2>Apply — ${job.title}</h2>
        <p class="meta">Your details are private and only visible to our HR team.</p>
        <label>Full Name</label>
        <input id="fullName" placeholder="Your name" value="${userProfile?.full_name || ''}">
        <label>Cover Letter</label>
        <textarea id="cover" placeholder="Brief message..."></textarea>
        <label>Resume (PDF)</label>
        <input id="resume" type="file" accept="application/pdf">
        <div class="row">
          <button class="btn primary" type="submit" ${job.status!=='open'?'disabled':''}>Submit Application</button>
          <a class="btn ghost" href="#/job/${job.id}">Cancel</a>
        </div>
        <p id="applyMsg" class="msg"></p>
      </form>
    </section>`;
  armAnimations();

  $('#applyForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fullName = $('#fullName').value.trim();
    const cover = $('#cover').value.trim();
    const file = $('#resume').files[0];

    if (fullName && sessionUser){
      await supabase.from('profiles').upsert({ user_id: sessionUser.id, full_name: fullName }).select();
    }

    let resume_path = null;
    if (file){
      const path = `${sessionUser.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('resumes').upload(path, file, { contentType: file.type });
      if (upErr){ $('#applyMsg').textContent = upErr.message; return; }
      resume_path = path;
    }

    const { error } = await supabase.from('applications').insert({
      job_id: job.id,
      applicant_id: sessionUser.id,
      cover_letter: cover,
      resume_path
    });
    $('#applyMsg').textContent = error ? error.message : 'Application submitted!';
    if (!error) location.hash = '#/dashboard';
  });
}

async function viewDashboard(){
  if (!sessionUser){ authModal.showModal(); return; }
  const { data: apps } = await supabase
    .from('applications')
    .select('id,status,created_at, jobs(title)')
    .eq('applicant_id', sessionUser.id)
    .order('created_at', { ascending:false });

  const saved = JSON.parse(localStorage.getItem('saved_jobs')||'[]');

  app.innerHTML = `
    <section class="grid two a-fade">
      <div class="card">
        <h2>My Applications</h2>
        <div class="list">
          ${(apps||[]).map(a => `
            <div class="item">
              <h3 style="margin:.2rem 0">${a.jobs?.title || 'Position'}</h3>
              <div class="meta">Submitted ${new Date(a.created_at).toLocaleString()} · Status: ${a.status}</div>
            </div>
          `).join('') || '<p class="meta">No applications yet.</p>'}
        </div>
      </div>
      <aside class="card">
        <h3>Saved Roles</h3>
        <div id="savedList" class="list"><p class="meta">${saved.length? 'Loading…':'No saved roles yet.'}</p></div>
      </aside>
    </section>`;
  armAnimations();

  if (saved.length){
    const { data: jobs } = await supabase.from('jobs').select('id,title,division').in('id', saved);
    $('#savedList').innerHTML = (jobs||[]).map(j=>`
      <div class="item">
        <h4 style="margin:.2rem 0">${j.title}</h4>
        <div class="meta">${j.division || 'EGR'}</div>
        <div class="row">
          <a class="btn" href="#/job/${j.id}">View</a>
          <a class="btn primary" href="#/apply/${j.id}">Apply</a>
        </div>
      </div>
    `).join('');
  }
}

async function viewHR(){
  if (!sessionUser){ authModal.showModal(); return; }
  if (userProfile?.role !== 'hr'){ app.innerHTML = '<div class="card a-fade">HR access required.</div>'; return; }

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id,title,status,posted_at,close_date,departments(name)')
    .order('posted_at', { ascending:false });

  app.innerHTML = `
    <section class="grid two a-fade">
      <div class="card">
        <h2>HR — Jobs</h2>
        <div class="row">
          <button class="btn primary" id="newJobBtn">New Position</button>
        </div>
        <div class="list" id="jobList">
          ${(jobs||[]).map(j => `
            <div class="item">
              <h3 style="margin:.2rem 0">${j.title}</h3>
              <div class="meta">${j.departments?.name || 'General'} · ${j.status} · Posted ${j.posted_at}</div>
              <div class="row">
                <button class="btn" data-edit="${j.id}">Edit</button>
                <button class="btn" data-viewapps="${j.id}">Applications</button>
                <button class="btn" data-toggle="${j.id}">${j.status==='open'?'Close':'Open'}</button>
                <button class="btn red" data-del="${j.id}">Delete</button>
              </div>
            </div>
          `).join('') || '<p class="meta">No jobs yet.</p>'}
        </div>
      </div>

      <form class="card" id="jobForm">
        <h2 id="jobFormTitle">Create Position</h2>
        <input type="hidden" id="jobId">
        <label>Title</label><input id="title" required>
        <label>Department</label><select id="dept"></select>
        <label>Division</label><input id="division" placeholder="Emirates Airlines / Fly Dubai / EGR HQ / University / Falcon LTD">
        <label>Location</label><input id="location" placeholder="Remote / Varies">
        <label>Paid Role?</label><select id="paid"><option value="false">Unpaid</option><option value="true">Paid</option></select>
        <label>Email to apply (optional)</label><input id="emailToApply" type="email" placeholder="hr@...">
        <label>Close Date (optional)</label><input id="closeDate" type="date">
        <label>Description</label><textarea id="desc"></textarea>
        <label>Requirements</label><textarea id="reqs"></textarea>
        <div class="row">
          <button class="btn primary" type="submit">Save</button>
          <button class="btn ghost" type="reset" id="resetJob">Reset</button>
        </div>
        <p id="jobMsg" class="msg"></p>
      </form>
    </section>`;
  armAnimations();

  // load departments
  const { data: depts } = await supabase.from('departments').select('id,name').order('name');
  $('#dept').innerHTML = (depts||[]).map(d=>`<option value="${d.id}">${d.name}</option>`).join('');

  // events
  $('#newJobBtn').addEventListener('click', () => resetJobForm());
  $('#jobForm').addEventListener('submit', saveJob);
  $('#resetJob').addEventListener('click', () => resetJobForm());

  $('#jobList').addEventListener('click', async (e)=>{
    const id = e.target.dataset.edit || e.target.dataset.del || e.target.dataset.toggle || e.target.dataset.viewapps;
    if (!id) return;

    if (e.target.dataset.edit) loadJob(id);
    if (e.target.dataset.del){
      if (confirm('Delete this job?')){
        await supabase.from('jobs').delete().eq('id', id);
        viewHR();
      }
    }
    if (e.target.dataset.toggle){
      const { data: j } = await supabase.from('jobs').select('status').eq('id', id).maybeSingle();
      const next = j.status === 'open' ? 'closed' : 'open';
      await supabase.from('jobs').update({ status: next }).eq('id', id);
      viewHR();
    }
    if (e.target.dataset.viewapps){
      const { data: apps } = await supabase
        .from('applications')
        .select('id,status,created_at,cover_letter,resume_path, profiles(full_name), jobs(title)')
        .eq('job_id', e.target.dataset.viewapps)
        .order('created_at', { ascending:false });

      // Build with signed URLs (private bucket)
      const rows = await Promise.all((apps||[]).map(async a=>{
        let link = '';
        if (a.resume_path){
          const { data } = await supabase.storage.from('resumes').createSignedUrl(a.resume_path, 3600);
          if (data?.signedUrl) link = `<a class="btn" href="${data.signedUrl}" target="_blank">View Resume</a>`;
        }
        return `
          <div class="item">
            <h4 style="margin:.2rem 0">${a.profiles?.full_name || 'Applicant'} — ${a.jobs?.title || ''}</h4>
            <div class="meta">${new Date(a.created_at).toLocaleString()} · Status: ${a.status}</div>
            <p>${(a.cover_letter||'').replaceAll('\n','<br>')}</p>
            <div class="row">
              ${link}
              <button class="btn" data-status="under_review" data-app="${a.id}">Under review</button>
              <button class="btn" data-status="shortlisted" data-app="${a.id}">Shortlist</button>
              <button class="btn" data-status="rejected" data-app="${a.id}">Reject</button>
              <button class="btn" data-status="hired" data-app="${a.id}">Hire</button>
            </div>
          </div>`;
      }));

      $('#jobList').insertAdjacentHTML('afterend', `<div class="card"><h3>Applications</h3>${rows.join('') || '<p class="meta">No applications yet.</p>'}</div>`);

      // status changes
      app.querySelectorAll('[data-status]').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          await supabase.from('applications').update({ status: btn.dataset.status }).eq('id', btn.dataset.app);
          viewHR();
        });
      });
    }
  });
}

/* ========= HR helpers ========= */
function resetJobForm(){
  $('#jobFormTitle').textContent = 'Create Position';
  $('#jobId').value = '';
  $('#title').value = '';
  $('#division').value = '';
  $('#location').value = '';
  $('#paid').value = 'false';
  $('#emailToApply').value = '';
  $('#closeDate').value = '';
  $('#desc').value = '';
  $('#reqs').value = '';
  $('#jobMsg').textContent = '';
}

async function loadJob(id){
  const { data: j } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle();
  if (!j) return;
  $('#jobFormTitle').textContent = 'Edit Position';
  $('#jobId').value = j.id;
  $('#title').value = j.title || '';
  $('#division').value = j.division || '';
  $('#location').value = j.location || '';
  $('#paid').value = String(j.is_paid);
  $('#emailToApply').value = j.email_to_apply || '';
  $('#closeDate').value = j.close_date || '';
  $('#desc').value = j.description || '';
  $('#reqs').value = j.requirements || '';
  if (j.department_id) $('#dept').value = j.department_id;
}

async function saveJob(e){
  e.preventDefault();
  const payload = {
    title: $('#title').value.trim(),
    department_id: $('#dept').value || null,
    division: $('#division').value.trim() || null,
    location: $('#location').value.trim() || null,
    is_paid: $('#paid').value === 'true',
    email_to_apply: $('#emailToApply').value.trim() || null,
    close_date: $('#closeDate').value || null,
    description: $('#desc').value.trim() || null,
    requirements: $('#reqs').value.trim() || null
  };
  const id = $('#jobId').value;
  let res;
  if (id){
    res = await supabase.from('jobs').update(payload).eq('id', id).select('id').maybeSingle();
  } else {
    payload.created_by = sessionUser.id;
    res = await supabase.from('jobs').insert(payload).select('id').maybeSingle();
  }
  $('#jobMsg').textContent = res.error ? res.error.message : 'Saved!';
  if (!res.error) viewHR();
}

/* ========= little helpers ========= */
function debounce(fn, ms=300){
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
}
