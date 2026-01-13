(function(){
  const logoSrc = "/image/logo.png";
  const navHtml = `
  <div class="nav">
    <div class="nav-inner">
      <a class="brand" href="/">
        <img src="${logoSrc}" alt="EGR Logo" onerror="this.src='/images/logo.png'">
        <div>
          <b>Emirates Group Roblox</b>
          <div class="small">Careers • Vision 2026</div>
        </div>
      </a>
      <div class="nav-links">
        <a href="/jobs.html">Open Roles</a>
        <a href="/why-work-with-us.html">Why Work With Us</a>
        <a href="/departments.html">Departments</a>
        <a href="/process.html">Hiring Process</a>
        <a href="/hr-team.html">HR Team</a>
      </div>
      <div class="nav-cta">
        <a class="btn" href="/jobs.html">Browse Jobs</a>
        <a class="btn primary" href="/jobs.html#apply">Apply</a>
      </div>
    </div>
  </div>`;

  const footerHtml = `
  <div class="footer">
    <div class="container">
      <div class="grid cols-3">
        <div>
          <b>Emirates Group Roblox Careers</b>
          <p class="small">A structured recruitment portal supporting EGR’s multi-divisional operating model under Vision 2026.</p>
        </div>
        <div>
          <b>Quick Links</b>
          <div class="small" style="display:grid; gap:8px; margin-top:8px">
            <a href="/jobs.html">Open Roles</a>
            <a href="/why-work-with-us.html">Why Work With Us</a>
            <a href="/departments.html">Departments</a>
            <a href="/process.html">Hiring Process</a>
            <a href="/hr-team.html">HR Team</a>
          </div>
        </div>
        <div>
          <b>HR Portal</b>
          <p class="small">Restricted area for authorised HR staff only.</p>
          <div style="display:flex; gap:10px; margin-top:8px; flex-wrap:wrap">
            <a class="btn" href="/hr/login.html">HR Login</a>
            <a class="btn" href="/hr/dashboard.html">Dashboard</a>
          </div>
        </div>
      </div>
      <div class="small" style="margin-top:14px; border-top:1px solid rgba(255,255,255,.10); padding-top:14px">
        Independent community-based organisation operating online (Discord/Roblox). Trademarks belong to their respective owners.
      </div>
    </div>
  </div>`;

  function mount(){
    const header = document.getElementById("egr-header");
    const footer = document.getElementById("egr-footer");
    if(header) header.innerHTML = navHtml;
    if(footer) footer.innerHTML = footerHtml;
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();