/* ====== HOME enhancements ====== */

// Dual clocks: local + Dubai
function startDualClocks(){
  const elLocal = document.getElementById('timeLocal');
  const elDubai = document.getElementById('timeDubai');
  const elOpen  = document.getElementById('timeOpenRoles');
  const fmtLocal = () => new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  const fmtDubai = () => new Intl.DateTimeFormat([], { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Dubai' }).format(new Date());

  const tick = async () => {
    if (elLocal) elLocal.textContent = fmtLocal();
    if (elDubai) elDubai.textContent = fmtDubai();

    // open roles count (cheap head request)
    if (elOpen && elOpen.textContent === '—') {
      const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status','open');
      elOpen.textContent = (count ?? 0);
      const kpi = document.getElementById('kpiOpen');
      if (kpi) kpi.setAttribute('data-count', String(count ?? 0));
    }
  };
  tick(); setInterval(tick, 15_000);
}

// Animated counters
function animateCounters(){
  const counters = [...document.querySelectorAll('.kpi')];
  if (!counters.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.getAttribute('data-count') || '0', 10);
      const start = 0;
      const dur = 1200; // ms
      const t0 = performance.now();
      const step = (t)=>{
        const p = Math.min(1, (t - t0)/dur);
        const val = Math.floor(start + (target - start) * (0.5 - Math.cos(p*Math.PI)/2)); // ease
        el.textContent = val;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      io.unobserve(el);
    });
  }, { threshold: .4 });
  counters.forEach(c => io.observe(c));
}

// Latest roles carousel
async function loadLatestRoles(){
  const wrap = document.getElementById('latestRoles');
  if (!wrap) return;
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id,title,division,posted_at,status,is_paid')
    .eq('status','open')
    .order('posted_at', { ascending:false })
    .limit(8);

  if (error){ wrap.innerHTML = `<div class="slide">Failed to load: ${error.message}</div>`; return; }
  if (!jobs?.length){ wrap.innerHTML = `<div class="slide">No open roles right now.</div>`; return; }

  wrap.innerHTML = jobs.map(j=>`
    <article class="slide">
      <div class="row">
        <span class="badge status-open">open</span>
        <span class="badge">${j.is_paid ? 'paid' : 'unpaid'}</span>
      </div>
      <h3 style="margin:.2rem 0">${j.title}</h3>
      <div class="meta">${j.division || 'EGR'} · Posted ${j.posted_at}</div>
      <div class="row">
        <a class="btn" href="/job.html?id=${j.id}">View</a>
        <a class="btn primary" href="/apply.html?id=${j.id}">Apply</a>
      </div>
    </article>
  `).join('');

  // gentle auto-scroll
  let auto = setInterval(()=>{
    wrap.scrollBy({ left: wrap.clientWidth * 0.9, behavior: 'smooth' });
    if (wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 4) {
      wrap.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, 5000);
  wrap.addEventListener('pointerdown', ()=>clearInterval(auto), { once:true });
}

// Neon system ticker
function startSystemTicker(){
  const el = document.getElementById('systemTicker');
  if (!el) return;
  const msgs = [
    "System nominal · Recruiting across all divisions · Hello Tomorrow",
    "Tip: Create an account to track your application status in real time",
    "Dubai HQ online · OCC monitoring schedules · Safety first",
    "Careers at EGR: Operations · Cabin · Ground · IT · University"
  ];
  let i=0; el.textContent = msgs[0];
  setInterval(()=>{ i=(i+1)%msgs.length; el.textContent = msgs[i]; }, 6000);
}

// Expose one function to init all home widgets
async function initHomePageEnhancements(){
  startDualClocks();
  animateCounters();
  loadLatestRoles();
  startSystemTicker();
}

CAREERS.initHomePageEnhancements = initHomePageEnhancements;

/* ====== Replace the old rotator with IMG-based one if not already done ====== */
function startHeroRotator() {
  const section = document.querySelector('.hero');
  const imgEl = document.getElementById('heroImg');
  if (!section || !imgEl) return;

  const base = section.getAttribute('data-hero-path') || '';
  const names = (section.getAttribute('data-hero-images') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (!names.length) { console.warn('No hero images set'); return; }

  const urls = names.map(name => {
    const enc = name.split('/').map(encodeURIComponent).join('/');
    return `${base}${enc}?v=${Date.now()}`;
  });

  urls.forEach(u => {
    const p = new Image();
    p.onload = () => console.log('Loaded:', u);
    p.onerror = () => console.error('404/Load fail:', u);
    p.src = u;
  });

  let i = 0;
  imgEl.src = urls[0];
  setInterval(() => { i = (i + 1) % urls.length; imgEl.src = urls[i]; }, 7000);
}

// Keep bootCommon calling startHeroRotator() (already in your file)
