import { initCommon, qs, getQueryParam, toast, escapeHtml } from "../app.js";
import { supabase } from "../supabaseClient.js";

function show(el, on=true){
  if(!el) return;
  el.classList.toggle("hidden", !on);
}

await initCommon({ loadAnnouncement:false });

const slug = getQueryParam("slug");
if(!slug){
  qs("#applyWrap").innerHTML = `<div class="notice">Missing role in the URL. Please open a role and click Apply.</div>`;
}else{
  try{
    const { data: job, error } = await supabase
      .from("jobs")
      .select("id,title,role_id,slug,roblox_username_required,cv_link_allowed,department:departments(name)")
      .eq("status","published")
      .eq("slug", slug)
      .maybeSingle();

    if(error) throw error;
    if(!job){
      qs("#applyWrap").innerHTML = `<div class="notice">This role was not found or is no longer available.</div>`;
    }else{
      qs("#jobTitle").textContent = job.title;
      qs("#jobMeta").innerHTML = `
        <span class="badge">${escapeHtml(job.department?.name || "General")}</span>
        <span class="badge">Position ID: ${escapeHtml(job.role_id)}</span>
      `;

      qs("#position_name").value = job.title;
      qs("#position_id").value = job.role_id;
      qs("#job_id").value = job.id;

      // toggle optional fields
      const robloxRow = qs("#robloxRow");
      const robloxInput = qs("#roblox_username");
      show(robloxRow, true);
      if(job.roblox_username_required){
        qs("#robloxHint").textContent = "Required for this role.";
        robloxInput.setAttribute("required","required");
      }else{
        qs("#robloxHint").textContent = "Optional (depends on HR requirements for this role).";
        robloxInput.removeAttribute("required");
      }

      const cvRow = qs("#cvRow");
      show(cvRow, !!job.cv_link_allowed);

      qs("#applyForm").addEventListener("submit", async (e)=>{
        e.preventDefault();

        const payload = {
          job_id: qs("#job_id").value,
          position_name: qs("#position_name").value,
          position_id: qs("#position_id").value,

          full_name: qs("#full_name").value.trim(),
          email: qs("#email").value.trim(),
          discord_username: qs("#discord_username").value.trim(),
          discord_id: qs("#discord_id").value.trim(),

          roblox_username: qs("#roblox_username").value.trim() || null,
          cv_link: (qs("#cv_link").value.trim() || null),

          interest_org: qs("#interest_org").value.trim(),
          interest_position: qs("#interest_position").value.trim(),
          prior_experience: qs("#prior_experience").value.trim() || null,

          tos_agree: qs("#tos_agree").checked
        };

        if(!payload.tos_agree){
          toast("You must agree to our Terms and Compliance Regulations to apply.", "error");
          return;
        }

        // basic CV link validation
        if(payload.cv_link && !/^https?:\/\//i.test(payload.cv_link)){
          toast("CV link must start with http:// or https://", "error");
          return;
        }

        const btn = qs("#submitBtn");
        const old = btn.textContent;
        btn.textContent = "Submitting...";
        btn.disabled = true;

        const { error } = await supabase.from("applications").insert(payload);
        btn.disabled = false;
        btn.textContent = old;

        if(error){
          console.error(error);
          toast("Could not submit application. Please check your details and try again.", "error");
          return;
        }

        qs("#applyForm").reset();
        toast("Application submitted successfully. HR will review your application soon.", "success");
        show(qs("#successBox"), true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }catch(err){
    console.error(err);
    toast("Could not load this application form. Please try again later.", "error");
  }
}
