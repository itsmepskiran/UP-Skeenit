//// 1. Import
//import { ApiService } from '@shared/js/api-services.js';

// 2. Use
//await ApiService.Recruiter.createJob(payload);




import { 
    backendGet, 
    backendPost, 
    backendPut, 
    backendDelete, 
    handleResponse 
} from './backend-client.js';

export const ApiService = {
    
    // ============================================================
    // RECRUITER SERVICES
    // ============================================================
    Recruiter: {
        async getProfile() {
            const res = await backendGet('/recruiter/profile');
            return handleResponse(res);
        },

        async updateProfile(payload) {
            const res = await backendPut('/recruiter/profile', payload);
            return handleResponse(res);
        },

        async getDashboardStats() {
            const res = await backendGet('/recruiter/stats'); // Ensure this endpoint exists in backend
            return handleResponse(res);
        },

        async getJobs(filters = {}) {
            // Convert filters object to query string if needed
            const query = new URLSearchParams(filters).toString();
            const res = await backendGet(`/recruiter/jobs?${query}`);
            return handleResponse(res);
        },

        async getJobById(jobId) {
            const res = await backendGet(`/recruiter/jobs/${jobId}`);
            return handleResponse(res);
        },

        async createJob(payload) {
            const res = await backendPost('/recruiter/jobs', payload);
            return handleResponse(res);
        },

        async updateJob(jobId, payload) {
            const res = await backendPut(`/recruiter/jobs/${jobId}`, payload);
            return handleResponse(res);
        },

        async deleteJob(jobId) {
            const res = await backendDelete(`/recruiter/jobs/${jobId}`);
            return handleResponse(res);
        },

        async getCandidateDetails(candidateId, jobId = null) {
            let url = `/recruiter/candidate-details?candidate_id=${candidateId}`;
            if (jobId) url += `&job_id=${jobId}`;
            const res = await backendGet(url);
            return handleResponse(res);
        }
    },

    // ============================================================
    // CANDIDATE SERVICES
    // ============================================================
    Candidate: {
        async getProfile() {
            const res = await backendGet('/applicant/profile');
            return handleResponse(res);
        },

        async createOrUpdateProfile(payload) {
            const res = await backendPost('/applicant/detailed-form', payload);
            return handleResponse(res);
        },

        async uploadResume(formData) {
            // formData must contain 'resume' file
            const res = await backendPost('/applicant/resume', formData);
            return handleResponse(res);
        },

        async getApplications() {
            const res = await backendGet('/applicant/applications');
            return handleResponse(res);
        },

        async applyForJob(jobId) {
            const res = await backendPost('/applicant/apply', { job_id: jobId });
            return handleResponse(res);
        },

        async checkApplicationStatus(jobId) {
            const res = await backendGet(`/applicant/check-status?job_id=${jobId}`);
            return handleResponse(res);
        }
    },

    // ============================================================
    // SHARED / PUBLIC SERVICES
    // ============================================================
    Shared: {
        async getPublicJobs(filters = {}) {
            const query = new URLSearchParams(filters).toString();
            const res = await backendGet(`/dashboard/jobs?${query}`);
            return handleResponse(res);
        },

        async getJobDetails(jobId) {
            const res = await backendGet(`/dashboard/jobs/${jobId}`);
            return handleResponse(res);
        }
    }
};