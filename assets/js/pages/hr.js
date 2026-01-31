import { initCommon, qs, toast } from "../app.js";
import { signIn, signOut, getSession, isHrUser } from "../supabaseClient.js";

await initCommon({ loadAnnouncement:false });

async function refresh(){
  const session = await getSession();
  const signedIn = !!session?.user;
  qs("#alreadySignedIn").classList.toggle("hidden", !signedIn);
  qs("#loginCard").classList.toggle("hidden", signedIn);

  if(signedIn){
    const ok = await isHrUser();
    qs("#signinEmail").textContent = session.user.email || "Signed in";
    qs("#hrStatus").textContent = ok ? "Authorised HR account ✅" : "Not authorised (no staff profile) ❌";
    qs("#goDashboard").classList.toggle("hidden", !ok);
  }
}

qs("#loginForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const email = qs("#email").value.trim();
  const password = qs("#password").value;

  const btn = qs("#loginBtn");
  const old = btn.textContent;
  btn.textContent = "Signing in...";
  btn.disabled = true;

  try{
    await signIn(email, password);
    toast("Signed in successfully.", "success");
    await refresh();
    const ok = await isHrUser();
    if(ok) location.href = "dashboard.html";
  }catch(err){
    console.error(err);
    toast(err.message || "Sign-in failed.", "error");
  }finally{
    btn.disabled = false;
    btn.textContent = old;
  }
});

qs("#signOutBtn").addEventListener("click", async ()=>{
  await signOut();
  toast("Signed out.", "success");
  await refresh();
});

await refresh();
