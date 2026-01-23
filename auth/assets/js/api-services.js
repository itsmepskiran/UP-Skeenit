// api-services.js
import { supabase } from './supabase-config.js';

/* -------------------------------------------------------
   AUTH HELPERS
------------------------------------------------------- */
async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

/* -------------------------------------------------------
   JOB SERVICES
------------------------------------------------------- */
export const jobService = {
  async getJobs(filters = {}) {
    let query = supabase
      .from('jobs')
      .select(`
        *,
        companies (name, logo_url),
        job_skills (*)
      `)
      .order('created_at', { ascending: false });

    if (filters.status) query.eq('status', filters.status);
    if (filters.recruiter_id) query.eq('recruiter_id', filters.recruiter_id);
    if (filters.search) {
      query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    return await query;
  },

  async getJobById(id) {
    return await supabase
      .from('jobs')
      .select(`
        *,
        companies (*),
        job_skills (*)
      `)
      .eq('id', id)
      .single();
  },

  async createJob(jobData) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const job = {
      ...jobData,
      recruiter_id: userId
    };

    const { data, error } = await supabase
      .from('jobs')
      .insert(job)
      .select()
      .single();

    return { data, error };
  },

  async updateJob(id, updates) {
    return await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  },

  async deleteJob(id) {
    return await supabase
      .from('jobs')
      .delete()
      .eq('id', id);
  }
};

/* -------------------------------------------------------
   APPLICATION SERVICES
------------------------------------------------------- */
export const applicationService = {
  async getApplicationsByJob(jobId) {
    return await supabase
      .from('job_applications')
      .select(`
        *,
        candidate_profiles (*),
        jobs (title, location)
      `)
      .eq('job_id', jobId)
      .order('applied_at', { ascending: false });
  },

  async getCandidateApplications() {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    return await supabase
      .from('job_applications')
      .select(`
        *,
        jobs (title, location)
      `)
      .eq('candidate_id', userId)
      .order('applied_at', { ascending: false });
  },

  async submitApplication(applicationData) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    const payload = {
      ...applicationData,
      candidate_id: userId
    };

    return await supabase
      .from('job_applications')
      .insert(payload)
      .select()
      .single();
  }
};

/* -------------------------------------------------------
   CANDIDATE PROFILE SERVICES
------------------------------------------------------- */
export const candidateService = {
  async getProfile() {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    return await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
  },

  async updateProfile(profileData) {
    const userId = await getCurrentUserId();
    if (!userId) return { error: 'Not authenticated' };

    return await supabase
      .from('candidate_profiles')
      .upsert({
        user_id: userId,
        ...profileData
      })
      .select()
      .single();
  }
};

/* -------------------------------------------------------
   REALTIME SERVICES
------------------------------------------------------- */
export const realtimeService = {
  subscribeToJobApplications(jobId, callback) {
    return supabase
      .channel(`job_applications_${jobId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_applications', filter: `job_id=eq.${jobId}` },
        callback
      )
      .subscribe();
  }
};
