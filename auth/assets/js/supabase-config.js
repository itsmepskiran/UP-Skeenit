import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://lgmvbmbzxsqrcclaynuh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbXZibWJ6eHNxcmNjbGF5bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzgxODQsImV4cCI6MjA4NDcxNDE4NH0.F63Fe9zFBuYni-qxZXwIzJNgCvM-rDxAi5_gFDGrXAM'
const storage = {
  getitem: (key) => {
    const value = localStorage.getItem(key);
    console.log('getItem', key, value);
    return value;
  },
  setitem: (key, value) => {
    console.log('setItem', key, value);
    localStorage.setItem(key, value);
  },
  removeitem: (key) => {
    console.log('removeItem', key);
    localStorage.removeItem(key);
  }
}
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,     // Required for PKCE
    flowType: 'pkce',             // Required for cookie-based auth
    storage: storage,
    // ⭐ Shared cookie across ALL Skreenit subdomains
    cookieOptions: {
      name: 'sb-access-token',
      lifetime: 60*60*24*7, // 7 days
      domain: '.skreenit.com',
      path: '/',
      sameSite: 'lax'
    }
  }
})

// Keep only role in localStorage
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state change:', event, session)
})
// test the storage methos
// Test the storage methods
console.log('Testing storage methods...');
storage.setItem('test_key', 'test_value');
const value = storage.getItem('test_key');
storage.removeItem('test_key');
console.log('Storage test complete', { value });