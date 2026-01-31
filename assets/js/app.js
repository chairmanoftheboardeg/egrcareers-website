/* Common UI + helpers */
export const SUPPORTED_THEMES = ["dark","light"];

export function qs(sel, root=document){ return root.querySelector(sel); }
export function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

export function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, (m)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

export function slugify(text){
  return String(text ?? "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/-+/g,"-")
    .replace(/^-|-$/g,"");
}

export function getTheme(){
  const saved = localStorage.getItem("egr_theme");
  if(saved && SUPPORTED_THEMES.includes(saved)) return saved;
  return "dark";
}

export function setTheme(theme){
  const t = SUPPORTED_THEMES.includes(theme) ? theme : "dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("egr_theme", t);
  const label = qs("#themeLabel");
  const dot = qs("#themeDot");
  if(label) label.textContent = t === "light" ? "Light" : "Dark";
  if(dot) dot.style.background = "var(--brand-red)";
}

export function toggleTheme(){
  const current = getTheme();
  setTheme(current === "dark" ? "light" : "dark");
}

export function setActiveNav(){
  const path = location.pathname.split("/").pop() || "index.html";
  qsa(".navlinks a").forEach(a=>{
    const href = (a.getAttribute("href")||"").split("/").pop();
    if(href === path) a.classList.add("active");
  });
  qsa(".mobilemenu a").forEach(a=>{
    const href = (a.getAttribute("href")||"").split("/").pop();
    if(href === path) a.style.fontWeight = "800";
  });
}

export function toast(message, type="info"){
  let t = qs("#toast");
  if(!t){
    t = document.createElement("div");
    t.id = "toast";
    t.style.position = "fixed";
    t.style.right = "18px";
    t.style.bottom = "18px";
    t.style.zIndex = "9999";
    t.style.maxWidth = "440px";
    document.body.appendChild(t);
  }
  const item = document.createElement("div");
  item.style.marginTop = "10px";
  item.style.padding = "12px 14px";
  item.style.borderRadius = "16px";
  item.style.border = "1px solid var(--border)";
  item.style.background = "rgba(0,0,0,.35)";
  item.style.color = "var(--text)";
  item.style.boxShadow = "var(--shadow-soft)";
  if(document.documentElement.getAttribute("data-theme")==="light"){
    item.style.background = "rgba(255,255,255,.88)";
  }
  if(type==="success"){
    item.style.borderColor = "rgba(46, 204, 113, .35)";
  }else if(type==="error"){
    item.style.borderColor = "rgba(224,26,43,.45)";
  }
  item.textContent = message;
  t.appendChild(item);
  setTimeout(()=> item.remove(), 4200);
}

export function initMobileMenu(){
  const btn = qs("#hamburger");
  const menu = qs("#mobilemenu");
  if(!btn || !menu) return;
  btn.addEventListener("click", ()=>{
    menu.classList.toggle("open");
  });
}

export function setFooterYear(){
  const y = qs("#year");
  if(y) y.textContent = new Date().getFullYear();
}

export async function initCommon({loadAnnouncement} = {loadAnnouncement:true}){
  setTheme(getTheme());
  initMobileMenu();
  setActiveNav();
  setFooterYear();

  const themeBtn = qs("#themeToggle");
  if(themeBtn){
    themeBtn.addEventListener("click", toggleTheme);
  }

  if(loadAnnouncement){
    const {loadAnnouncementBar} = await import("./supabaseClient.js");
    await loadAnnouncementBar();
  }
}

export function getQueryParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}
