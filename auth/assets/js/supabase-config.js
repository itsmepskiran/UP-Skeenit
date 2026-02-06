import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://lgmvbmbzxsqrcclaynuh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbXZibWJ6eHNxcmNjbGF5bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzgxODQsImV4cCI6MjA4NDcxNDE4NH0.F63Fe9zFBuYni-qxZXwIzJNgCvM-rDxAi5_gFDGrXAM'

// Custom storage that works across subdomains
const storage = {
  getItem: (key) => {
    // First try localStorage
    let value = localStorage.getItem(key);
    if (value) return value;
    
    // If not found, try cookie
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [cookieKey, cookieValue] = cookie.trim().split('=');
      if (cookieKey === key) {
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  },
  setItem: (key, value) => {
    // Set in localStorage
    localStorage.setItem(key, value);
    
    // Also set as cookie for cross-subdomain access
    const expires = new Date();
    expires.setTime(expires.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days
    document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; domain=.skreenit.com; path=/; sameSite=lax; secure`;
  },
  removeItem: (key) => {
    // Remove from localStorage
    localStorage.removeItem(key);
    
    // Also remove cookie
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.skreenit.com; path=/; sameSite=lax; secure`;
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,     // Required for PKCE
    flowType: 'pkce',             // Required for cookie-based auth
    storage: storage,
    // Shared cookie across ALL Skreenit subdomains
    cookieOptions: {
      name: 'sb-lgmvbmbzxsqrcclaynuh-auth-token',
      lifetime: 60*60*24*7, // 7 days
      domain: '.skreenit.com',
      path: '/',
      sameSite: 'lax',
      secure: true
    }
  }
})

// Keep track of auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state change:', event, session)
})