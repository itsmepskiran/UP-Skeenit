import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://lgmvbmbzxsqrcclaynuh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbXZibWJ6eHNxcmNjbGF5bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzgxODQsImV4cCI6MjA4NDcxNDE4NH0.F63Fe9zFBuYni-qxZXwIzJNgCvM-rDxAi5_gFDGrXAM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,     // Required for PKCE
    flowType: 'pkce',             // Required for cookie-based auth

    // ⭐ Shared cookie across ALL Skreenit subdomains
    cookieOptions: {
      domain: '.skreenit.com',
      sameSite: 'lax',
      secure: true
    },

    storageKey: 'skreenit-auth',
    debug: false
  },
  global: {
    headers: {
      'x-client-info': 'skreenit-frontend'
    }
  }
});

// Keep only role in localStorage
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    const role = session?.user?.user_metadata?.role;
    if (role) {
      localStorage.setItem('skreenit_role', role);
    }
  }

  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('skreenit_role');
  }
});
