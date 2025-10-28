// script.js - site wiring (jobs + clocks + hr status + employee rights content)
// --- CONFIG: replace placeholders below ---
const API_URL = 'https://script.google.com/macros/s/AKfycbzTwLSlOIXxDGVICcIlytL1PSbsaoBlf-TrUZLAYNWei1rqcEIot2O-Wk48QQamKUfq/exec'; // e.g. https://script.google.com/macros/s/xxx/exec
const DISCORD_INVITE = 'https://discord.com/invite/dZaJqdTyGd'; // replace
const DISCORD_WIDGET_ID = ''; // optional
const MAP_EMBED_SRC = ''; // set a Google Maps embed URL or leave blank
// --- END CONFIG ---

// simple helpers
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

// Escape HTML to avoid injection when rendering data from API
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function escapeJs(s){ if(!s) return ''; return String(s).replace(/'/g,"\\'").replace(/\n/g,'\\n');}

// Jobs API fetch (GET getJobs)
async function fetchJobs(q='', status='') {
  if (!API_URL || API_URL.includes('PASTE_YOUR')) {
    // For local dev if no API configured, return sample data
    return [
      { job_id: 'JOB-0001', title:'Virtual Customer Service Agent', status:'Open', division:'Customer Service', location:'Remote', summary:'Assist passengers, answer enquiries.'},
      { job_id: 'JOB-0002', title:'Ground Operations Assistant', status:'Open', division:'Ground Operations', location:'Virtual Hub', summary:'Support ramp and ground ops in-game.'}
    ];
  }
  try {
    const url = new URL(API_URL);
    url.searchParams.set('path','getJobs');
    if (q) url.searchParams.set('q', q);
    if (status) url.searchParams.set('status', status);
    const res = await fetch(url.toString());
    return (await res.json()).jobs || [];
  } catch (e) {
    console.error('fetchJobs', e);
    return [];
  }
}

// get applications count from API (if available)
async function fetchApplicationsCount() {
  if (!API_URL || API_URL.includes('PASTE_YOUR')) return 0;
  try {
    const url = new URL(API_URL);
    url.searchParams.set('path','getApplications');
    const res = await fetch(url.toString());
    const j = await res.json();
    return (j.applications || []).length;
  } catch(e){ return 0; }
}

// get HR list
async function fetchHRList() {
  if (!API_URL || API_URL.includes('PASTE_YOUR')) return [{email:'hr@example.com', full_name:'William Alexander Cross'}];
  try {
    const url = new URL(API_URL);
    url.searchParams.set('path','getHRList');
    const res = await fetch(url.toString());
    const j = await res.json();
    return j.hr || [];
  } catch(e){ return []; }
}

// render jobs
function renderJobs(jobs) {
  const container = document.getElementById('jobsList');
  if (!jobs || jobs.length === 0) {
    container.innerHTML = '<div class="job-card">No roles found.</div>'; return;
  }
  container.innerHTML = jobs.map(j => jobCard(j)).join('');
}
function jobCard(j){
  return `<article class="job-card">
    <h3>${escapeHtml(j.title || 'Untitled')}</h3>
    <div class="job-meta">${escapeHtml(j.location || 'Virtual')} • ${escapeHtml(j.division || '')} • ${escapeHtml(j.status || '')}</div>
    <p>${escapeHtml((j.summary||'').slice(0,260))}${(j.summary && j.summary.length>260)?'…':''}</p>
    <div class="job-actions">
      <button class="btn btn-primary" onclick="openApplyModal('${escapeJs(j.job_id)}','${escapeJs(j.title)}')">Apply</button>
      <a class="btn btn-outline" href="employee-rights.html">Employee Rights</a>
    </div>
  </article>`;
}

// apply modal (basic)
function openApplyModal(jobId, title){
  const existing = document.getElementById('applyModalOuter'); if (existing) existing.remove();
  const outer = document.createElement('div'); outer.id = 'applyModalOuter';
  outer.style = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:18px;z-index:9999';
  outer.innerHTML = `
    <div style="max-width:720px;background:#fff;padding:18px;border-radius:12px;box-shadow:0 18px 60px rgba(0,0,0,0.3)">
      <h3>Apply for ${escapeHtml(title)}</h3>
      <form id="applyFormInline" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
        <input type="hidden" name="job_id" value="${escapeHtml(jobId)}" />
        <div><label>First name</label><input name="first_name" required /></div>
        <div><label>Last name</label><input name="last_name" /></div>
        <div><label>Email</label><input name="email" type="email" required /></div>
        <div><label>Discord username</label><input name="discord_username" /></div>
        <div><label>Discord ID</label><input name="discord_id" /></div>
        <div><label>Roblox username</label><input name="roblox_username" /></div>
        <div><label>Age</label><input name="age" type="number" /></div>
        <div><label>Country</label><input name="country" /></div>
        <div style="grid-column:1 / -1"><label>Why do you want this role?</label><textarea name="cover_letter" rows="4"></textarea></div>
        <div style="grid-column:1 / -1;display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
          <button type="submit" class="btn btn-primary">Submit application</button>
          <button type="button" class="btn btn-outline" id="cancelApplyBtn">Cancel</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(outer);
  document.getElementById('cancelApplyBtn').addEventListener('click', ()=>outer.remove());
  document.getElementById('applyFormInline').addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const fm = new FormData(ev.target); const body = Object.fromEntries(fm.entries());
    if (!API_URL || API_URL.includes('PASTE_YOUR')) {
      alert('No API configured — application simulated (dev).');
      outer.remove();
      return;
    }
    try {
      const res = await fetch(API_URL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(Object.assign({action:'apply'}, body))
      });
      const j = await res.json();
      if (j.ok) {
        alert('Application submitted — ID: ' + j.application_id);
        outer.remove();
        updateCounters();
      } else {
        alert('Error: ' + (j.error || 'unknown'));
      }
    } catch(e) {
      console.error(e);
      alert('Network error when sending application.');
    }
  });
}

// update counters
async function updateCounters(){
  const jobs = await fetchJobs();
  document.getElementById('stat-open-positions').textContent = jobs.filter(j => (j.status||'').toLowerCase()==='open').length;
  const apps = await fetchApplicationsCount();
  document.getElementById('stat-applications').textContent = apps;
  const hr = await fetchHRList();
  document.getElementById('stat-hr-members').textContent = hr.length || 0;
}

// TIME & HR ACTIVE LOGIC
function startClocks(){
  // update every second for smooth same-second display
  function update(){
    const nowLocal = new Date();
    // Local time display (readable)
    const localStr = nowLocal.toLocaleString(undefined, {weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', hour12:false});
    const elLocal = document.getElementById('localTime'); if (elLocal) elLocal.textContent = localStr;

    // Dubai time via Intl API
    try {
      // Get formatted parts in Asia/Dubai timezone
      const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Dubai', hour12:false, weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}).formatToParts(new Date());
      let weekday='', hour=0, minute=0;
      parts.forEach(p=>{
        if (p.type==='weekday') weekday = p.value;
        if (p.type==='hour') hour = parseInt(p.value,10);
        if (p.type==='minute') minute = parseInt(p.value,10);
      });
      const dubaiStr = `${weekday} ${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}`;
      const elDubai = document.getElementById('dubaiTime'); if (elDubai) elDubai.textContent = dubaiStr;

      // Map weekday text to index: Sun (0) .. Sat (6)
      const wk = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      let dayIndex = wk.findIndex(w => weekday.startsWith(w));
      if (dayIndex < 0) {
        // fallback: compute using a dubai Date object parsed from parts
        const dubaiDate = new Date(new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Dubai'}).format());
        dayIndex = dubaiDate.getDay();
      }

      // HR hours:
      let active = false;
      // Mon (1) - Thu (4): 09:00 - 19:00
      if (dayIndex >= 1 && dayIndex <= 4) {
        active = (hour > 9 && hour < 19) || (hour === 9 && minute >= 0) || (hour === 19 && minute === 0);
        // simpler: active = hour >= 9 && hour < 19;
        active = (hour >= 9 && hour < 19) || (hour === 19 && minute === 0);
      } else {
        // Fri-Sun: 07:00 - 22:00
        active = (hour >= 7 && hour < 22) || (hour === 22 && minute === 0);
      }
      const elHR = document.getElementById('hrActive');
      if (elHR) {
        if (active) { elHR.textContent = 'HR are currently: ACTIVE'; elHR.style.color = 'var(--accent)'; elHR.style.fontWeight = '700'; }
        else { elHR.textContent = 'HR are currently: OFFLINE'; elHR.style.color = '#777'; elHR.style.fontWeight = '600'; }
      }
    } catch(e) {
      console.warn('Clock error', e);
    }
  }
  update();
  setInterval(update, 1000);
}

// Employee terms content injection and download/print handler
function loadEmployeeRightsShort(){
  const el = document.getElementById('employeeTerms');
  if (el) {
    el.innerHTML = `<h3>Employee Rights — Summary</h3>
      <p>The full Employee Rights & Terms document is available at the dedicated page. For quick reference: the organisation provides equal opportunity, clear recruitment practice, remote work rules, data protection, grievance procedures and termination guidelines. For the full legally-styled document click <a href="employee-rights.html">Employee Rights</a>.</p>`;
  }
}

function loadEmployeeRightsLong(){
  const el = document.getElementById('employeeTermsLong');
  if (!el) return;
  // Very long content (concise but long enough for realistic policy). You can expand further.
  el.innerHTML = `
<h2>Employee Rights & Terms — Emirates Group Roblox</h2>
<p><em>Effective date:</em> ${new Date().toLocaleDateString()}</p>

<h3>1. Introduction</h3>
<p>Emirates Group Roblox ("the Group") is a community-run virtual organisation. This document sets out Employee Rights, standards of conduct, recruitment and employment procedures, grievance and appeal mechanisms, data protection and other legal / procedural provisions relevant to staff and applicants. It exists to ensure transparency and fairness for all members, volunteers and any contractors engaged by the Group.</p>

<h3>2. Scope & Definitions</h3>
<p>This policy applies to all individuals engaged by the Group: volunteers, contractors, moderators, and paid staff where applicable. "Employee" for the purposes of this document includes any person carrying out duties on behalf of Emirates Group Roblox, whether remunerated or volunteer.</p>

<h3>3. Equal Opportunity & Non-Discrimination</h3>
<p>The Group prohibits unlawful discrimination and promotes equal opportunity. Employment decisions are based on merit and role suitability. Discrimination on grounds of race, colour, religion, sex, sexual orientation, gender identity, national origin, age, disability, or any other protected characteristic is prohibited.</p>

<h3>4. Recruitment Principles</h3>
<ul>
  <li>Vacancies will be advertised openly on the careers site and Discord where appropriate.</li>
  <li>Selection will be made on objective criteria aligned to job descriptions.</li>
  <li>Applications are handled confidentially. HR may request further information or interviews.</li>
</ul>

<h3>5. Remote Work & Availability</h3>
<p>As a remote organisation, expected working hours for roles are agreed in each role description. The Group recognises time zone differences and expects staff to coordinate with managers for shift patterns. HR office hours are published on the careers page and should be treated as the primary times for official HR contact.</p>

<h3>6. Code of Conduct</h3>
<p>All staff must adhere to high standards of behaviour in public and private channels when representing the Group. Harassment, hate speech, bullying, doxxing, impersonation, or any abusive behaviour is not permitted and may lead to disciplinary action, including suspension or removal.</p>

<h3>7. Confidentiality & Data Protection</h3>
<p>The Group collects personal data necessary to process applications and manage staff records. Personal data will be stored securely and used only for recruitment, HR administration, and legal compliance. Individuals may request deletion of their personal data via Support, subject to retention obligations for audit or legal reasons.</p>

<h3>8. Grievance & Disciplinary Procedures</h3>
<p>Concerns or complaints should be raised to HR in writing or via the Support Centre. Reports will be acknowledged and investigated impartially. Where disciplinary action is required the person subject to action will be given an opportunity to respond. Appeals may be made to an independent HR contact where available.</p>

<h3>9. Intellectual Property</h3>
<p>Unless otherwise agreed in writing, digital assets or code produced as part of Group duties are assigned to the Group for use in community projects and operations. If separate agreements exist for contracted work, those contract terms apply.</p>

<h3>10. Health & Safety (Online)</h3>
<p>Staff are expected to follow good digital hygiene. If you experience any safety incident (harassment, scam attempts, threats), report it to HR and the platform moderators immediately.</p>

<h3>11. Termination & Suspension</h3>
<p>Termination or suspension will follow a proportionate procedure. Volunteers may be suspended pending investigation; paid staff will be managed according to the terms of their agreement. Where appropriate, warnings will be issued prior to termination.</p>

<h3>12. Remuneration & Volunteer Recognition</h3>
<p>Volunteer roles are not automatically remunerated. Contracted roles will have remuneration agreed in writing. Volunteers may receive recognition, role privileges, or tokens of appreciation as agreed by leadership.</p>

<h3>13. Legal Compliance</h3>
<p>The Group will seek to comply with applicable laws and platform rules. This document should not be taken as professional legal advice. Where formal, legally binding agreements are required the Group will use written contracts and may seek legal counsel.</p>

<h3>14. Dispute Resolution</h3>
<p>Where disputes cannot be resolved informally, parties may request formal review by an independent HR representative. If the issue concerns platform rules or criminal matters, the relevant platform and authorities should be contacted.</p>

<h3>15. Changes to this Policy</h3>
<p>The Group may update this policy. Material changes will be published on the careers page and announced on official channels.</p>

<hr/>
<p style="font-size:90%;">Note: This Employee Rights document is intended to set expectations and procedures for a volunteer / community environment and to protect both participants and the Group. It is not a substitute for legal contracts or professional legal advice. For binding employment contracts or jurisdiction-specific obligations seek professional legal counsel.</p>
  `;
}

// Download full terms as text file
function downloadText(elId, filename='Employee_Rights.txt'){
  const el = document.getElementById(elId);
  if (!el) return;
  const text = el.innerText || el.textContent || '';
  const blob = new Blob([text], {type:'text/plain'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}

// UI wiring on DOMContentLoaded
window.addEventListener('DOMContentLoaded', async ()=>{
  document.getElementById('year').textContent = new Date().getFullYear();
  const y2 = document.getElementById('year2'); if (y2) y2.textContent = new Date().getFullYear();

  // Quick nav buttons
  const hrBtn = document.getElementById('hrLoginBtn'); if (hrBtn) hrBtn.addEventListener('click', ()=> location.href='hr.html');
  const appBtn = document.getElementById('applicantPortalBtn'); if (appBtn) appBtn.addEventListener('click', ()=> location.href='applicant.html');
  const hrBtn2 = document.getElementById('hrLoginBtn2'); if (hrBtn2) hrBtn2.addEventListener('click', ()=> location.href='hr.html');
  const appBtn2 = document.getElementById('applicantPortalBtn2'); if (appBtn2) appBtn2.addEventListener('click', ()=> location.href='applicant.html');

  // Map embed
  const map = document.getElementById('mapEmbed');
  if (map) {
    if (MAP_EMBED_SRC && MAP_EMBED_SRC.length>8) map.src = MAP_EMBED_SRC;
    else map.style.display = 'none';
  }

  // Discord
  const inv = document.getElementById('discordInviteBtn'); if (inv) inv.href = DISCORD_INVITE || '#';
  const widget = document.getElementById('discordWidget');
  if (widget && DISCORD_WIDGET_ID) {
    widget.innerHTML = `<iframe src="https://discord.com/widget?id=${DISCORD_WIDGET_ID}&theme=dark" width="100%" height="300" allowtransparency="true" frameborder="0"></iframe>`;
  }

  // Load short employee terms on index; long terms on full page
  loadEmployeeRightsShort();
  loadEmployeeRightsLong();

  // Jobs and counters
  const jobs = await fetchJobs();
  renderJobs(jobs);
  updateCounters();

  // Search button
  const sb = document.getElementById('searchBtn'); if (sb) sb.addEventListener('click', async ()=>{
    const q = (document.getElementById('searchInput')||{}).value || '';
    const s = (document.getElementById('filterStatus')||{}).value || '';
    document.getElementById('jobsList').innerHTML = '<div class="loading">Searching…</div>';
    const jobs2 = await fetchJobs(q, s);
    renderJobs(jobs2);
  });

  // clocks
  startClocks();

  // print & download handlers
  const dBtn = document.getElementById('downloadTermsBtn'); if (dBtn) dBtn.addEventListener('click', ()=> downloadText('employeeTerms', 'Employee_Rights_Summary.txt'));
  const pBtn = document.getElementById('printTermsBtn'); if (pBtn) pBtn.addEventListener('click', ()=> window.print());

  const dBtnFull = document.getElementById('downloadTermsBtnFull'); if (dBtnFull) dBtnFull.addEventListener('click', ()=> downloadText('employeeTermsLong','Employee_Rights_Full.txt'));
  const pBtnFull = document.getElementById('printTermsBtnFull'); if (pBtnFull) pBtnFull.addEventListener('click', ()=> window.print());
});
