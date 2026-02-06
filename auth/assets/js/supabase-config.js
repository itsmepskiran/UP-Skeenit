import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://lgmvbmbzxsqrcclaynuh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbXZibWJ6eHNxcmNjbGF5bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzgxODQsImV4cCI6MjA4NDcxNDE4NH0.F63Fe9zFBuYni-qxZXwIzJNgCvM-rDxAi5_gFDGrXAM'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,     // Required for PKCE
    flowType: 'pkce',             // Required for cookie-based auth
    // Shared cookie across ALL Skreenit subdomains
    cookieOptions: {
      name: 'sb-auth-token',

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