// Supabase Configuration and Client Setup
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

// Directly use Supabase URL and Anon Key
const SUPABASE_URL = 'https://lgmvbmbzxsqrcclaynuh.supabase.co' // Replace with your actual Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnbXZibWJ6eHNxcmNjbGF5bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMzgxODQsImV4cCI6MjA4NDcxNDE4NH0.F63Fe9zFBuYni-qxZXwIzJNgCvM-rDxAi5_gFDGrXAM' //your-supabase-anon-key' // Replace with your actual Supabase Anon Key

// Create Supabase client with enhanced configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        debug: import.meta.env.DEV, // Enable debug in development
        storageKey: 'skreenit-auth-token' // Custom storage key
    }
})

// Auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event)
    if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        // Store the latest session
        if (session?.access_token) {
            localStorage.setItem('skreenit_token', session.access_token)
        }
    } else if (event === 'SIGNED_OUT') {
        // Clear local storage on sign out
        localStorage.removeItem('skreenit_token')
        localStorage.removeItem('skreenit_user_id')
        localStorage.removeItem('skreenit_role')
    }
})

// Authentication functions
export const auth = {
    // Sign up new user with email and additional metadata
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
            
            // Store user ID and role in localStorage for first-time login flow
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

    // Sign in with email and password
    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) throw error

            // Store session data
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

    // Sign out
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

    // Get current user session
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

    // Get current user
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

    // Update user profile
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

    // Password reset
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

// Export the Supabase client and auth functions
export default {
    supabase,
    auth
}