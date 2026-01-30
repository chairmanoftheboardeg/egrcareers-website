import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { qs, toast } from "./app.js";

export const SUPABASE_URL = "https://zboyabxzhptnxnmofvcz.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpib3lhYnh6aHB0bnhubW9mdmN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NjU3MTgsImV4cCI6MjA4NTM0MTcxOH0.2et1T3bQqr-ZzZgx-VWaq3kR0FJDprcAbbWBby6oRys";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Announcement bar: public read
export async function loadAnnouncementBar(){
  const wrap = qs("#announcementWrap");
  if(!wrap) return;

  const { data, error } = await supabase
    .from("announcement_bar")
    .select("message,is_active,updated_at")
    .eq("id", 1)
    .maybeSingle();

  if(error){
    // Don't spam toasts on public pages for minor outages
    console.warn("Announcement load failed:", error.message);
    return;
  }

  if(!data || !data.is_active || !String(data.message||"").trim()) {
    wrap.classList.add("hidden");
    return;
  }

  const msgEl = qs("#announcementMessage");
  if(msgEl) msgEl.textContent = data.message;

  wrap.classList.remove("hidden");
}

// Auth helpers
export async function getSession(){
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email, password){
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) throw error;
  return data;
}

export async function signOut(){
  const { error } = await supabase.auth.signOut();
  if(error) throw error;
}

export async function isHrUser(){
  const session = await getSession();
  if(!session?.user?.id) return false;

  const { data, error } = await supabase
    .from("staff_profiles")
    .select("user_id,display_name,role,is_active")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if(error) {
    console.warn("HR check error:", error.message);
    return false;
  }
  return !!(data && data.is_active);
}

export async function requireHrOrRedirect(){
  const ok = await isHrUser();
  if(!ok){
    toast("Access denied. Please sign in with an authorised HR account.", "error");
    setTimeout(()=> location.href = "hr.html", 900);
    return false;
  }
  return true;
}
