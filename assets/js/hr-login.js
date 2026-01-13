(function(){
  const form = document.getElementById("hrLoginForm");
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const pass = document.getElementById("hrPass").value.trim();
    if(pass.length < 8){ EGR.toast("Password too short (min 8 chars)."); return; }
    sessionStorage.setItem("EGR_HR_PASSWORD", pass);
    location.href = "/hr/dashboard.html";
  });
})();