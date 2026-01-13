/* global supabase */
(function(){
  const st = (window.EGR && EGR.getConfig) ? EGR.getConfig() : { ok:false, cfg:window.EGR_CONFIG||{} };
  window.EGR = window.EGR || {};
  EGR.supabase = null;
  function init(){
    if(!st.ok){ console.warn("Missing config in assets/js/config.js"); return; }
    if(!window.supabase?.createClient){ console.error("Supabase client missing"); return; }
    EGR.supabase = window.supabase.createClient(st.cfg.SUPABASE_URL, st.cfg.SUPABASE_ANON_KEY);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();