window.EGR = window.EGR || {};
EGR.toast = function(message){
  const el = document.getElementById("toast");
  if(!el) return alert(message);
  el.textContent = message;
  el.style.display = "block";
  clearTimeout(el._t);
  el._t = setTimeout(()=>{el.style.display="none";}, 4200);
};
EGR.statusBadge = function(status){
  const s = (status || "open").toLowerCase();
  const map = { open:"Open", paused:"Paused", closed:"Closed", pending:"Pending", accepted:"Accepted", rejected:"Rejected" };
  const label = map[s] || status;
  return `<span class="badge ${s}">${label}</span>`;
};
EGR.escape = function(str){
  return (str ?? "").toString()
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
};
EGR.getConfig = function(){
  const cfg = window.EGR_CONFIG || {};
  if(!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return { ok:false, cfg };
  return { ok:true, cfg };
};