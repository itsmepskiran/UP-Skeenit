import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, backendDelete, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

let allJobs = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) { window.location.href = CONFIG.PAGES.LOGIN; return; }
    
    // Role Check
    const role = (session.user.user_metadata?.role || '').toLowerCase();
    if (role !== 'recruiter') {
        window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
        return;
    }

    // Update Profile Info
    document.getElementById('recruiterName').textContent = session.user.user_metadata.full_name || "Recruiter";
    
    // Load Data
    loadJobs(session.user.id);
}

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = CONFIG.PAGES.LOGIN;
    });

    document.getElementById('jobSearch').addEventListener('input', (e) => {
        filterJobs(e.target.value);
    });
}

async function loadJobs(userId) {
    const container = document.getElementById('myJobsList');
    container.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const res = await backendGet(`/recruiter/jobs?user_id=${userId}`);
        const json = await handleResponse(res);
        
        // Handle response wrapper (sometimes {data: {jobs: []}} sometimes {data: []})
        allJobs = json.data?.jobs || json.data || [];
        if(!Array.isArray(allJobs)) allJobs = [];

        // Update Counter
        const activeCount = allJobs.filter(j => j.status === 'active').length;
        document.getElementById('activeJobCount').textContent = activeCount;

        renderJobs(allJobs);

    } catch (err) {
        console.error("Load failed:", err);
        container.innerHTML = `<p class="text-danger">Failed to load jobs. ${err.message}</p>`;
    }
}

function filterJobs(searchTerm) {
    const term = searchTerm.toLowerCase();
    const filtered = allJobs.filter(job => 
        job.title.toLowerCase().includes(term) || 
        (job.location || '').toLowerCase().includes(term)
    );
    renderJobs(filtered);
}

function renderJobs(jobs) {
    const container = document.getElementById('myJobsList');
    
    if (jobs.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: white; border-radius: 8px;">
                <p class="text-muted">You haven't posted any jobs yet.</p>
                <button class="btn btn-primary" onclick="window.location.href='job-create.html'" style="margin-top:10px;">Post Your First Job</button>
            </div>`;
        return;
    }

    container.innerHTML = jobs.map(job => `
        <div class="job-card">
            <div class="card-body">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <span class="status-badge status-${(job.status || 'active').toLowerCase()}" style="font-size: 0.7rem; padding: 2px 8px;">
                        ${job.status || 'Active'}
                    </span>
                    <small class="text-muted" style="font-size: 0.75rem;">${new Date(job.created_at).toLocaleDateString()}</small>
                </div>
                
                <h3 style="margin: 0 0 5px 0; font-size: 1.1rem; line-height: 1.3; color: #2d3748; min-height: 2.6rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${job.title}
                </h3>
                
                <p class="text-muted" style="font-size: 0.85rem; margin-bottom: 15px;">
                    <i class="fas fa-map-marker-alt" style="color:#a0aec0; width:15px;"></i> ${job.location || 'Remote'}
                </p>

                <div class="job-actions">
                    <a href="job-details.html?job_id=${job.id}" class="btn btn-sm btn-outline-primary" style="display:flex; align-items:center; justify-content:center; gap:5px;">
                        <i class="far fa-eye"></i> View
                    </a>
                    
                    <a href="job-edit.html?job_id=${job.id}" class="btn btn-sm btn-outline-secondary" style="display:flex; align-items:center; justify-content:center; gap:5px;">
                        <i class="fas fa-edit"></i> Edit
                    </a>
                    
                    <button onclick="deleteJob('${job.id}')" class="btn btn-sm btn-outline-danger" title="Delete" style="display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>

                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #f7fafc; text-align: center;">
                    <a href="application-list.html?job_id=${job.id}" style="color: #4a5568; font-size: 0.8rem; text-decoration: none; font-weight: 600; display: block;">
                        <i class="fas fa-users" style="color: #3182ce;"></i> View Applicants
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

// ... (Keep deleteJob function) ...
// Expose delete function to window so the HTML button can call it
window.deleteJob = async function(jobId) {
    if(!confirm("Are you sure you want to delete this job? This action cannot be undone.")) return;

    try {
        await backendDelete(`/recruiter/jobs/${jobId}`);
        // Remove from local list and re-render
        allJobs = allJobs.filter(j => j.id !== jobId);
        
        // Update Counter
        const activeCount = allJobs.filter(j => j.status === 'active').length;
        document.getElementById('activeJobCount').textContent = activeCount;
        
        renderJobs(allJobs);
        alert("Job deleted successfully.");
    } catch (err) {
        alert("Failed to delete job: " + err.message);
    }
};