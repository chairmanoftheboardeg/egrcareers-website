import { initCommon, qs, toast } from "../app.js";
import { supabase } from "../supabaseClient.js";

async function loadStats(){
  const openRoles = qs("#statOpenRoles");
  const depts = qs("#statDepartments");

  try{
    const { count: jobsCount, error: e1 } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");
    if(e1) throw e1;

    const { count: deptCount, error: e2 } = await supabase
      .from("departments")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    if(e2) throw e2;

    if(openRoles) openRoles.textContent = jobsCount ?? 0;
    if(depts) depts.textContent = deptCount ?? 0;
  }catch(err){
    console.warn(err);
    // keep graceful defaults
    if(openRoles) openRoles.textContent = "—";
    if(depts) depts.textContent = "—";
  }
}

await initCommon({ loadAnnouncement:true });
await loadStats();
