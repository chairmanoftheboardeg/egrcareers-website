(async function(){
  const st = (window.EGR && EGR.getConfig) ? EGR.getConfig() : { ok:false };
  if(!st.ok) return;
  const sb = EGR.supabase;
  if(!sb) return;
  try{
    const { data, error } = await sb.from("jobs").select("id,department,status");
    if(error) throw error;
    const open = (data || []).filter(j => (j.status || "open") === "open");
    const depts = new Set(open.map(j => j.department).filter(Boolean));
    const openEl = document.getElementById("statOpenRoles");
    const deptEl = document.getElementById("statDepartments");
    if(openEl) openEl.textContent = String(open.length);
    if(deptEl) deptEl.textContent = String(depts.size);
  }catch(e){
    console.warn("Home stats unavailable:", e);
  }
})();