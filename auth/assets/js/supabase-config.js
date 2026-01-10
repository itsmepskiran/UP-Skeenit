// Supabase Configuration and Client Setup
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

// Get Supabase URL and Anon Key from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || window.SKREENIT_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || window.SKREENIT_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase URL or Anon Key. Please check your environment configuration.')
}

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Authentication functions
export const auth = {
    // Sign up new user
    async signUp(email, password, userData = {}) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: userData
            }
        })
        return { data, error }
    },

    // Sign in user
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        return { data, error }
    },

    // Sign out user
    async signOut() {
        const { error } = await supabase.auth.signOut()
        try {
            // Clear local storage keys used across subdomains
            localStorage.removeItem('skreenit_token')
            localStorage.removeItem('skreenit_refresh_token')
            localStorage.removeItem('skreenit_user_id')
            localStorage.removeItem('skreenit_role')
        } catch {}
        // Redirect to centralized login page
        try { window.location.href = 'https://login.skreenit.com/login.html' } catch {}
        return { error }
    },

    // Get current user
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser()
        return user
    },

    // Listen to auth changes
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback)
    }
}

// Database helper functions
export const db = {
    // Generic select function
    async select(table, columns = '*', filters = {}) {
        let query = supabase.from(table).select(columns)
        
        Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                query = query.in(key, value)
            } else if (typeof value === 'object' && value.operator) {
                query = query.filter(key, value.operator, value.value)
            } else {
                query = query.eq(key, value)
            }
        })
        
        const { data, error } = await query
        return { data, error }
    },

    // Generic insert function
    async insert(table, data) {
        const { data: result, error } = await supabase
            .from(table)
            .insert(data)
            .select()
        return { data: result, error }
    },

    // Generic update function
    async update(table, id, data) {
        const { data: result, error } = await supabase
            .from(table)
            .update(data)
            .eq('id', id)
            .select()
        return { data: result, error }
    },

    // Generic delete function
    async delete(table, id) {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id)
        return { error }
    },

    // Subscribe to real-time changes
    subscribe(table, callback, filters = {}) {
        let channel = supabase
            .channel(`${table}_changes`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: table,
                    ...filters
                }, 
                callback
            )
            .subscribe()
        
        return channel
    }
}

// File storage functions
export const storage = {
    // Upload file
    async uploadFile(bucket, path, file) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file)
        return { data, error }
    },

    // Get file URL
    getPublicUrl(bucket, path) {
        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(path)
        return data.publicUrl
    },

    // Delete file
    async deleteFile(bucket, paths) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .remove(paths)
        return { data, error }
    }
}
