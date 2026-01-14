// supabase-client.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

// Use global config injected from HTML
const SUPABASE_URL = window.SKREENIT_SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SKREENIT_SUPABASE_ANON_KEY;

// Create a single shared Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
