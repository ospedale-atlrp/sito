/* Client condiviso Supabase: usa soltanto la chiave pubblica e le policy del database. */
(function () {
  if (!window.supabase || !window.PM_SUPABASE_URL || !window.PM_SUPABASE_PUBLISHABLE_KEY) {
    console.error("Supabase non è stato inizializzato.");
    return;
  }
  window.PM_DB = window.supabase.createClient(
    window.PM_SUPABASE_URL,
    window.PM_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
})();
