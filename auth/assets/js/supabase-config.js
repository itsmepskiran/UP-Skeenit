import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://lgmvbmbzxsqrcclaynuh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbXVibWJ6eHNxcmNjbGF5bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzgxODQsImV4cCI6MjA4NDcxNDE4NH0.F63Fe9zFBuYni-qxZXwIzJNgCvM-rDxAi5_gFDGrXAM'

// --- Helper to get the correct domain ---
function getCookieDomain() {
  const hostname = window.location.hostname;
  // If we are on localhost or an IP, no domain attribute (uses current host)
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;
  // If we are on production, use the root domain with a leading dot
  if (hostname.includes('skreenit.com')) return '.skreenit.com';
  return null;
}

// --- Custom Cookie Storage ---
const CookieStorage = {
  getItem: (key) => {
    const cookies = document.cookie.split('; ');
    const cookie = cookies.find(row => row.startsWith(`${key}=`));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
  },
  setItem: (key, value) => {
    const domain = getCookieDomain();
    const domainPart = domain ? `; domain=${domain}` : '';
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    
    // Set the cookie
    document.cookie = `${key}=${encodeURIComponent(value)}${domainPart}; path=/; expires=${expires}; SameSite=Lax; Secure`;
    
    console.log(`🍪 [CookieStorage] Saved ${key} to domain ${domain || 'current host'}`);
  },
  removeItem: (key) => {
    const domain = getCookieDomain();
    const domainPart = domain ? `; domain=${domain}` : '';
    document.cookie = `${key}=${domainPart}; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
    console.log(`🗑️ [CookieStorage] Removed ${key}`);
  }
};

// --- Initialize Supabase ---
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    
    // ✅ CRITICAL: Force Supabase to use our CookieStorage
    storage: CookieStorage, 
  }
})