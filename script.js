/* script.js — wiring for jobs, counters, map, discord and HR schedule
   IMPORTANT: set these placeholders below to your own values.
*/
const API_URL = 'https://script.google.com/macros/s/AKfycbzTwLSlOIXxDGVICcIlytL1PSbsaoBlf-TrUZLAYNWei1rqcEIot2O-Wk48QQamKUfq/exec'; // e.g. https://script.google.com/macros/s/XXX/exec
const DISCORD_INVITE = 'https://discord.com/invite/dZaJqdTyGd'; // replace with your invite
const DISCORD_WIDGET_ID = 'YOUR_DISCORD_WIDGET_ID_OR_SERVER_ID'; // optional

// Helper: query the Apps Script API for jobs and stats
async function fetchJobs(q='', status='') {
  try {
    const url = new URL(API_URL);
    url.searchParams.set('path','getJobs');
    if (q) url.searchParams.set('q', q);
    if (status) url.searchParams.set('status', status);
    const res = await fetch(url.toString());
    const json = await res.json();
    return json.jobs || [];
  } catch (e) {
    console.error('fetchJobs error', e);
    return [];
  }
}

async function fetchHRList() {
  try {
    const url = new URL(API_URL);
    url.searchParams.set('path', 'getHRList');
    const res = await fetch(url.toString());
    const j = await res.json();
    return j.hr || [];
  } catch (e) { return []; }
}

// Counters (Open positions, Applications, HR members)
async function updateCounters() {
  // Jobs count
  const jobs = await fetchJobs();
  const openJobs = jobs.filter(j => (j.status || '').toLowerCase() === 'open').length;
  document.getElementById('stat-open-positions').textContent = openJobs;

  // Applications count — we can call getApplications without job_id
  let appsCount = '—';
  try {
    const url = new URL(API_URL);
    url.searchParams.set('path','getApplications');
    const res = await fetch(url.toString());
    const json = await res.json();
    appsCount = (json.applications || []).length;
  } catch(e) { appsCount = '—'; }
  document.getElementById('stat-applications').textContent = appsCount;

  // HR members
  const hr = await fetchHRList();
  document.getElementById('stat-hr-members').textContent = hr.length || 0;
}

// Render jobs list into page
function renderJobs(jobs) {
  const container = document.getElementById('jobsList');
  if (!jobs || jobs.length === 0) {
    container.innerHTML = '<div class="job-card">No roles found.</div>'; return;
  }
  container.innerHTML = jobs.map(jobCardHtml).join('');
}

function jobCardHtml(j) {
  const summary = (j.summary || '').slice(0,240);
  return `
  <article class="job-card">
    <h3>${escapeHtml(j.title || 'Untitled')}</h3>
    <div class="job-meta">${escapeHtml(j.location || 'Virtual')} • ${escapeHtml(j.division || '')} • ${escapeHtml(j.status || '')}</div>
    <p>${escapeHtml(summary)}${(j.summary && j.summary.length>240)?'…':''}</p>
    <div class="job-actions">
      <button class="btn btn-primary" onclick="openApplyModal('${escapeJs(j.job_id)}','${escapeJs(j.title)}')">Apply</button>
      <a class="btn btn-outline" href="#employee-rights">Employee Rights</a>
    </div>
  </article>`;
}

// Simple escaping helpers to avoid injection when inserting data
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function escapeJs(s){ if(!s) return ''; return String(s).replace(/'/g,"\\'").replace(/\n/g,'\\n');}

/* APPLY MODAL — simple, inline modal creation */
function openApplyModal(jobId, title){
  // Minimal modal in DOM
  const existing = document.getElementById('applyModalOuter');
  if (existing) existing.remove();
  const outer = document.createElement('div');
  outer.id = 'applyModalOuter';
  outer.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:18px;z-index:9999';
  outer.innerHTML = `
    <div style="max-width:680px;background:#fff;padding:18px;border-radius:12px;box-shadow:0 18px 60px rgba(0,0,0,0.3)">
      <h3>Apply for ${escapeHtml(title)}</h3>
      <form id="applyFormInline" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <input type="hidden" name="job_id" value="${escapeHtml(jobId)}" />
        <div style="grid-column: span 1;"><label>First name</label><input name="first_name" required /></div>
        <div style="grid-column: span 1;"><label>Last name</label><input name="last_name" /></div>
        <div style="grid-column: span 1;"><label>Email</label><input name="email" type="email" required /></div>
        <div style="grid-column: span 1;"><label>Discord username</label><input name="discord_username" /></div>
        <div style="grid-column: span 1;"><label>Discord ID</label><input name="discord_id" /></div>
        <div style="grid-column: span 1;"><label>Roblox username</label><input name="roblox_username" /></div>
        <div style="grid-column: span 1;"><label>Age</label><input name="age" type="number" /></div>
        <div style="grid-column: span 1;"><label>Country</label><input name="country" /></div>
        <div style="grid-column: span 1;"><label>Region</label><input name="region" /></div>
        <div style="grid-column: 1 / -1;"><label>Why do you want this role?</label><textarea name="cover_letter" rows="4"></textarea></div>
        <div style="grid-column: 1 / -1;display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
          <button type="submit" class="btn btn-primary">Submit application</button>
          <button type="button" class="btn btn-outline" id="cancelApplyBtn">Cancel</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(outer);
  document.getElementById('cancelApplyBtn').addEventListener('click', ()=>outer.remove());
  document.getElementById('applyFormInline').addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const fm = new FormData(ev.target);
    const body = Object.fromEntries(fm.entries());
    try {
      const res = await fetch(API_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(Object.assign({action:'apply'}, body))
      });
      const j = await res.json();
      if (j.ok) {
        alert('Application submitted! Application ID: ' + j.application_id);
        outer.remove();
        updateCounters();
      } else {
        alert('Error: ' + (j.error || 'unknown'));
      }
    } catch (e) {
      console.error(e);
      alert('Network error while sending application.');
    }
  });
}

/* INITIALISATION */
async function initPage() {
  // set year
  document.getElementById('year').textContent = new Date().getFullYear();

  // wire quick action buttons
  document.getElementById('hrLoginBtn').addEventListener('click', ()=> {
    // Replace with your HR portal URL
    window.location.href = 'hr.html';
  });
  document.getElementById('applicantPortalBtn').addEventListener('click', ()=> {
    window.location.href = 'applicant.html';
  });

  // map embed
  const map = document.getElementById('mapEmbed');
  if (MAP_EMBED_SRC && MAP_EMBED_SRC.length>10) map.src = MAP_EMBED_SRC;
  else map.style.display='none';

  // Discord
  document.getElementById('discordInviteBtn').href = DISCORD_INVITE;
  // optionally insert a widget iframe if you have a widget url
  const widget = document.getElementById('discordWidget');
  if (DISCORD_WIDGET_ID && DISCORD_WIDGET_ID.length>4) {
    // Discord widget URL format: https://discord.com/widget?id=SERVER_ID&theme=dark
    widget.innerHTML = `<iframe src="https://discord.com/widget?id=${DISCORD_WIDGET_ID}&theme=dark" allowtransparency="true" frameborder="0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts" width="100%" height="300"></iframe>`;
  } else {
    // leave placeholder and invite button visible
  }

  // Jobs search
  document.getElementById('searchBtn').addEventListener('click', async ()=>{
    const q = document.getElementById('searchInput').value;
    const s = document.getElementById('filterStatus').value;
    document.getElementById('jobsList').innerHTML = '<div class="loading">Searching…</div>';
    const jobs = await fetchJobs(q, s);
    renderJobs(jobs);
  });

  // initial fetch
  const jobs = await fetchJobs();
  renderJobs(jobs);
  updateCounters();

  // time displays and HR status
  startClock();
  // employee terms content
  loadEmployeeTerms();
  // print / download buttons
  document.getElementById('printTermsBtn').addEventListener('click', ()=> window.print());
  document.getElementById('downloadTermsBtn').addEventListener('click', downloadTermsAsText);
}

/* TIME & HR SCHEDULE
   HR schedule (Dubai, Asia/Dubai timezone):
   Mon–Thu: 09:00–19:00
   Fri–Sun: 07:00–22:00
*/
function startClock() {
  function update() {
    const nowLocal = new Date();
    // user local time
    document.getElementById('localTime').textContent = nowLocal.toLocaleString(undefined, {hour:'2-digit',minute:'2-digit',weekday:'short',day:'numeric',month:'short'});

    // Dubai time using Intl with timeZone
    try {
      const dubai = new Date().toLocaleString('en-GB', {timeZone:'Asia/Dubai'});
      const dubaiDate = new Date(dubai);
      // Display compact
      document.getElementById('dubaiTime').textContent = dubaiDate.toLocaleString('en-GB', {hour:'2-digit',minute:'2-digit',weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Dubai'});
      // HR active check
      const day = dubaiDate.getUTCDay(); // careful — because dubaiDate created from toLocaleString isn't in UTC; instead create a real date by using Date.toLocaleString hack above
      // To avoid timezone pitfalls, create a Date using Intl API to get parts:
      const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Dubai',hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit', weekday:'short', day:'numeric', month:'short'}).formatToParts(new Date());
      // get hour/minute from parts
      let hour=0, minute=0, weekdayStr='';
      parts.forEach(p=>{
        if (p.type==='hour') hour = parseInt(p.value,10);
        if (p.type==='minute') minute = parseInt(p.value,10);
        if (p.type==='weekday') weekdayStr = p.value;
      });
      // Determine day-of-week number using mapping since formatToParts weekday yields names
      const wk = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      let dayIndex = wk.findIndex(w => weekdayStr.startsWith(w));
      if (dayIndex < 0) {
        // fallback: use dubaiDate.getDay()
        dayIndex = dubaiDate.getDay();
      }

      // Check ranges:
      let active=false;
      if (dayIndex>=1 && dayIndex<=4) { // Mon-Thu
        active = (hour >=9 && hour <19) || (hour===19 && minute===0); // allow until 19:00
      } else { // Fri-Sun
        active = (hour >=7 && hour <22) || (hour===22 && minute===0);
      }
      const el = document.getElementById('hrActive');
      if (active) {
        el.textContent = 'HR are currently: ACTIVE';
        el.style.color = 'var(--accent)';
        el.style.fontWeight = '700';
      } else {
        el.textContent = 'HR are currently: OFFLINE';
        el.style.color = '#777';
        el.style.fontWeight = '600';
      }
    } catch(e) {
      console.warn('Dubai time error', e);
    }
  }
  update();
  setInterval(update, 30_000); // update every 30s
}

/* EMPLOYEE TERMS text - long, understandable, printable.
   This is informative and not legal advice. For legally-binding policies consult a qualified lawyer.
*/
function loadEmployeeTerms() {
  const el = document.getElementById('employeeTerms');
  el.innerHTML = `
  <h3>Employee Rights & Terms (Summary)</h3>
  <p><strong>Effective:</strong> ${new Date().toLocaleDateString()}</p>

  <h4>1. Our Commitment</h4>
  <p>Emirates Group Roblox is committed to fair, open and respectful treatment of all applicants and employees. We operate as a remote organisation and follow modern HR best practices. This policy explains your rights, responsibilities and the standards expected from all workers and the employer.</p>

  <h4>2. Equal Opportunity</h4>
  <p>We recruit and promote without unlawful discrimination on grounds such as race, religion, sex, age, disability, sexual orientation, nationality or any other status protected by applicable law or platform rules.</p>

  <h4>3. Working Hours and Availability</h4>
  <p>Because we are primarily a volunteer community running across time zones, working hours are agreed by role. Official HR service hours are published on the careers site (Asia/Dubai timezone). Staff must communicate their availability and agree shift times with their manager. We respect reasonable requests for time off and will provide advance notice for scheduled activities where possible.</p>

  <h4>4. Remote Work and Conduct</h4>
  <p>Employees and contractors are expected to act professionally in all official communication and when representing the Group in public spaces. Any behaviour contrary to our Code of Conduct — harassment, bullying, impersonation, or irresponsible sharing of sensitive account information — may lead to disciplinary action, including suspension.</p>

  <h4>5. Recruitment & Application Process</h4>
  <p>Applications are handled confidentially by the HR team. We aim to provide status updates within a reasonable timeframe. HR may ask for additional information or a short interview. Acceptance is subject to meeting role requirements and passing any role-specific checks.</p>

  <h4>6. Data, Privacy & Records</h4>
  <p>We store applicant and staff records in a Google Sheet and secure platform storage. Personal information submitted during recruitment is used solely for recruitment and onboarding purposes, unless consent is expressly given. You may request deletion of your personal data by contacting our Support Centre.</p>

  <h4>7. Termination & Suspension</h4>
  <p>For volunteers and community staff, termination can occur for cause or by mutual agreement. For paid or contracted roles, termination follows the terms in the contract. Where appropriate, the HR team will issue warnings and an opportunity to respond before final action is taken.</p>

  <h4>8. Appeals & Grievances</h4>
  <p>If you disagree with a HR decision, you may file a grievance via the Support Centre or directly to the HR lead. The grievance will be reviewed by an impartial HR representative and a written response will be issued in a timely manner.</p>

  <h4>9. Health & Safety (Online)</h4>
  <p>We encourage good digital hygiene: protect account credentials, avoid sharing personal payment details on public channels and report suspicious activity to HR or Support immediately. If an in-game or platform safety incident occurs, file a report to platform moderators as well as our HR team.</p>

  <h4>10. Intellectual Property</h4>
  <p>Work produced while acting for Emirates Group Roblox (assets, code, guides) is subject to terms agreed at assignment. Unless otherwise specified in a contract, assets created for the Group are considered Group property for use in community projects.</p>

  <h4>11. Benefits & Recognition</h4>
  <p>Benefits for volunteers usually include recognition, leadership opportunities and priority access to training. Contracted roles may have agreed compensation and payment terms defined in a written agreement.</p>

  <h4>12. Amendments</h4>
  <p>These terms may be amended; any material changes will be published and notice provided via our careers page and Discord.</p>

  <hr/>
  <p style="font-size:90%;">This policy is a general statement intended for clarity in a community/virtual organisation. It is not a substitute for professional legal advice. If you require a legally binding contract, please obtain one from an authorised legal professional.</p>
  `;
}

/* Download employee terms as plain text file (simple) */
function downloadTermsAsText() {
  const el = document.getElementById('employeeTerms');
  const text = el.innerText || el.textContent || '';
  const blob = new Blob([text], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'EmiratesGroupRoblox_Employee_Rights.txt';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/* Utilities: escape html already defined above */

window.addEventListener('DOMContentLoaded', initPage);
