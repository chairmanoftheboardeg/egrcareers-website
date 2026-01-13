(function(){
  const form = document.getElementById("hrLoginForm");
  const passEl = document.getElementById("hrPass");

  function setPass(p){
    sessionStorage.setItem("EGR_HR_PASS", p);
  }
  function getPass(){
    return sessionStorage.getItem("EGR_HR_PASS") || "";
  }

  if(getPass()){
    // already signed in
    // do nothing; user can go to dashboard directly
  }

  if(form){
    form.addEventListener("submit", (e)=>{
      e.preventDefault();
      const p = (passEl?.value || "").trim();
      if(!p){ EGR.toast("Enter HR password."); return; }
      setPass(p);
      location.href = "/hr/dashboard.html";
    });
  }
})();