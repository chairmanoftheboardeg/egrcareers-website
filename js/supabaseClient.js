<script>
  // Your project values (anon key is OK in browser because we use RLS)
  const SUPABASE_URL  = 'https://whujzazokxignhvynqfp.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodWp6YXpva3hpZ25odnlucWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMTI0NzUsImV4cCI6MjA3NDU4ODQ3NX0.X9JvoKv9OKLMei7vHNDYW5mx-EPG_dUGj_XoH429-Yw';

  window.supabase = window.supabase || supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
</script>

