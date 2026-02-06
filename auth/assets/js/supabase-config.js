import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://lgmvbmbzxsqrcclaynuh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbXVibWJ6eHNxcmNjbGF5bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzgxODQsImV4cCI6MjA4NDcxNDE4NH0.F63Fe9zFBuYni-qxZXwIzJNgCvM-rDxAi5_gFDGrXAM'

// --- Custom Storage to enable Cross-Subdomain Auth ---
const CookieStorage = {
  getItem: (key) => {
    const cookies = document.cookie.split('; ');
    const cookie = cookies.find(row => row.startsWith(`${key}=`));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
  },
  setItem: (key, value) => {
    // This '.skreenit.com' domain allows all subdomains to access the session
    const domain = '.skreenit.com';
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    
    // We use Lax/Secure for best production compatibility
    document.cookie = `${key}=${encodeURIComponent(value)}; domain=${domain}; path=/; expires=${expires}; SameSite=Lax; Secure`;
  },
  removeItem: (key) => {
    const domain = '.skreenit.com';
    document.cookie = `${key}=; domain=${domain}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    
    // This tells Supabase to use our shared-cookie logic instead of default LocalStorage
    storage: CookieStorage, 
  }
})