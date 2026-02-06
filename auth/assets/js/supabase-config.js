import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://lgmvbmbzxsqrcclaynuh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbXVibWJ6eHNxcmNjbGF5bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzgxODQsImV4cCI6MjA4NDcxNDE4NH0.F63Fe9zFBuYni-qxZXwIzJNgCvM-rDxAi5_gFDGrXAM'

// --- 1. Define Custom Cookie Storage with Domain Support ---
const CookieStorage = {
  getItem: (key) => {
    const cookies = document.cookie.split('; ');
    const cookie = cookies.find(row => row.startsWith(`${key}=`));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
  },
  setItem: (key, value) => {
    // CRITICAL: Set domain to .skreenit.com so all subdomains can read it
    const domain = '.skreenit.com'; 
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString(); // 7 days
    document.cookie = `${key}=${encodeURIComponent(value)}; domain=${domain}; path=/; expires=${expires}; SameSite=Lax; Secure`;
  },
  removeItem: (key) => {
    const domain = '.skreenit.com';
    document.cookie = `${key}=; domain=${domain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
  }
};

// --- 2. Initialize Supabase with Custom Storage ---
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    
    // Explicitly tell Supabase to use our CookieStorage
    storage: CookieStorage, 
    
    // (Optional) Match the key name to your preference, though standard is fine
    storageKey: 'sb-lgmvbmbzxsqrcclaynuh-auth-token',

    // Note: The 'cookieOptions' object you had before is often ignored 
    // by the default adapter, so we implemented the logic in CookieStorage above.
  }
})

// Keep track of auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state change:', event, session)
})