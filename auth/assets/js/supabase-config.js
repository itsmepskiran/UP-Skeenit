import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://lgmvbmbzxsqrcclaynuh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbXZibWJ6eHNxcmNjbGF5bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzgxODQsImV4cCI6MjA4NDcxNDE4NH0.F63Fe9zFBuYni-qxZXwIzJNgCvM-rDxAi5_gFDGrXAM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',   // Better for email confirmation
    storageKey: 'skreenit-auth-token',
    debug: true         // Enable debug logs for auth
  },
  global: {
    headers: {
      'x-client-info': 'skreenit-frontend'
    }
  }
})

// Keep session + user metadata in localStorage
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event)

  if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
    if (session?.access_token) {
      localStorage.setItem('skreenit_token', session.access_token)
    }

    if (session?.user) {
      localStorage.setItem('skreenit_user_id', session.user.id)
      if (session.user.user_metadata?.role) {
        localStorage.setItem('skreenit_role', session.user.user_metadata.role)
      }
    }
  }

  if (event === 'SIGNED_OUT') {
    localStorage.removeItem('skreenit_token')
    localStorage.removeItem('skreenit_user_id')
    localStorage.removeItem('skreenit_role')
  }
})

export const auth = {
  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...userData,
            created_at: new Date().toISOString()
          },
          emailRedirectTo: `${window.location.origin}/update-password.html`
        }
      })

      if (error) throw error

      if (data?.user) {
        localStorage.setItem('skreenit_user_id', data.user.id)
        if (userData.role) {
          localStorage.setItem('skreenit_role', userData.role)
        }
        if (data.session?.access_token) {
          localStorage.setItem('skreenit_token', data.session.access_token)
        }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Sign up error:', error)
      return { data: null, error }
    }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      if (data?.session) {
        localStorage.setItem('skreenit_token', data.session.access_token)
        localStorage.setItem('skreenit_user_id', data.user.id)
        if (data.user.user_metadata?.role) {
          localStorage.setItem('skreenit_role', data.user.user_metadata.role)
        }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error }
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Sign out error:', error)
      return { error }
    }
  },

  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      return { session: data?.session, error: null }
    } catch (error) {
      console.error('Get session error:', error)
      return { session: null, error }
    }
  },

  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return { user, error: null }
    } catch (error) {
      console.error('Get user error:', error)
      return { user: null, error }
    }
  },

  async updateProfile(updates) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Update profile error:', error)
      return { data: null, error }
    }
  },

  async resetPassword(email) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password.html`
      })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Password reset error:', error)
      return { data: null, error }
    }
  }
}

export default { supabase, auth }
