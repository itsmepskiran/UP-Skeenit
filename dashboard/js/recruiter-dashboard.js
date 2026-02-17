import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) { window.location.href = CONFIG.PAGES.LOGIN; return; }
    
    const user = session.user;
    // Role Guard
    if ((user.user_metadata?.role || '').toLowerCase() !== 'recruiter') {
        window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; 
        return;
    }

    updateSidebarProfile(user.user_metadata, user.email);
    updateUserInfo(); 
    loadDashboardData(user.id);
}

function updateSidebarProfile(meta, email) {
    // 1. Update Name
    const nameEl = document.getElementById('recruiterName');
    if(nameEl) nameEl.textContent = meta.full_name || email.split('@')[0];

    // 2. Update Role (Company Name)
    // We try to find the element with class 'user-role'
    const roleEl = document.querySelector('.user-role');
    if(roleEl) {
        // Use company name if available in metadata, otherwise default to "Recruiter"
        roleEl.textContent = meta.company_name || 'Recruiter';
    }
}

async function updateUserInfo() {
  try {
    const res = await backendGet('/recruiter/profile');
    const data = await handleResponse(res);
    const profile = data.data || data; 
    
    if (profile) {
        // Update Name if contact_name exists
        if (profile.contact_name) {
            const el = document.getElementById('recruiterName');
            if (el) el.textContent = profile.contact_name;
        }

        // Update Role with Company Name from DB
        // This overwrites the "Recruiter" default once data loads
        if (profile.company_name) {
            const roleEl = document.querySelector('.user-role');
            if (roleEl) roleEl.textContent = profile.company_name;
        }
    }
  } catch (error) { console.warn('Error loading user info:', error); }
}

function setupEventListeners() {
    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", async () => { 
        await supabase.auth.signOut(); 
        window.location.href = CONFIG.PAGES.LOGIN; 
    });

    // --- BANNER CLICK EVENTS ---
    // ✅ FIX: These should point to LIST pages, not details pages
    const btnJobs = document.getElementById('btnActiveJobs');
    if(btnJobs) btnJobs.addEventListener('click', () => window.location.href = 'my-jobs.html');

    const btnCands = document.getElementById('btnCandidates');
    if(btnCands) btnCands.addEventListener('click', () => window.location.href = 'application-list.html');

    const btnApps = document.getElementById('btnNewApps');
    if(btnApps) btnApps.addEventListener('click', () => window.location.href = 'application-list.html');
}

async function loadDashboardData(userId) {
    try {
        // A. Fetch Jobs
        const jobsRes = await backendGet(`/recruiter/jobs?user_id=${userId}`);
        const jobsData = await handleResponse(jobsRes);
        let jobsList = jobsData?.data?.jobs || jobsData?.data || [];
        if(!Array.isArray(jobsList)) jobsList = [];
        
        // Update Stats
        // FIX: Handle 'Active', 'active', etc.
        const activeJobsCount = jobsList.filter(j => (j.status || '').toLowerCase() === 'active').length;
        setText("statActiveJobs", activeJobsCount);

        renderJobs(jobsList.slice(0, 5));

        // B. Fetch Applications
        let appsList = [];
        try {
            // This endpoint must return ALL applications for the recruiter's jobs
            const appsRes = await backendGet(`/recruiter/applications`); 
            const appsData = await handleResponse(appsRes);
            appsList = appsData?.data || appsData || [];
        } catch (e) { console.warn("Apps fetch error", e); }

        if (Array.isArray(appsList)) {
            renderApplications(appsList.slice(0, 6)); 
            
            // Update Stats
            const totalCandidates = new Set(appsList.map(a => a.candidate_id)).size;
            
            // FIX: Check for multiple "New" statuses and ignore case
            const newStatuses = ['pending', 'applied', 'submitted', 'new'];
            const newAppsCount = appsList.filter(a => 
                newStatuses.includes((a.status || '').toLowerCase())
            ).length;
            
            setText("statTotalCandidates", totalCandidates);
            setText("statNewApplications", newAppsCount);
        }

    } catch (err) { console.error("Dashboard load error:", err); }
}

function renderApplications(apps) {
    const list = document.getElementById("recentAppsList"); 
    if(!list) return;

    if (!apps || !apps.length) { 
        list.innerHTML = "<p class='text-muted' style='padding:1rem'>No applications received yet.</p>"; 
        return; 
    }
    
    list.innerHTML = apps.map(app => `
        <div class="card" onclick="window.location.href='application-details.html?id=${app.id}'" style="cursor:pointer; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; border-radius: 8px;">
            <div class="card-body" style="padding: 1rem;">
                <h4 style="margin:0; font-size:1.05rem; color:#2d3748;">${app.candidate_name || 'Candidate'}</h4>
                <p style="margin:4px 0 8px; color:#718096; font-size:0.9rem;">
                    Applied for: <strong>${app.job_title || 'Unknown Job'}</strong>
                </p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="status-badge status-${(app.status || 'pending').toLowerCase()}" 
                          style="padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold; background:#edf2f7; color:#4a5568;">
                        ${app.status || 'Pending'}
                    </span>
                    <small style="color:#a0aec0;">${new Date(app.applied_at || Date.now()).toLocaleDateString()}</small>
                </div>
            </div>
        </div>
    `).join("");
}
// ✅ NEW FUNCTION: Missing in your original code
function renderJobs(jobs) {
    const list = document.getElementById("recentJobsList");
    if(!list) return;

    if (!jobs || !jobs.length) { 
        list.innerHTML = "<p class='text-muted' style='padding:1rem'>No active jobs posted.</p>"; 
        return; 
    }
    
    list.innerHTML = jobs.map(job => `
        <div class="job-item" style="padding: 10px; border-bottom: 1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
            <div class="job-info">
                <h4 style="margin:0; font-size:1rem;">${job.title}</h4>
                <p style="margin:0; color:#718096; font-size:0.85rem;">
                    <i class="fas fa-map-marker-alt"></i> ${job.location || 'Remote'} &bull; ${new Date(job.created_at).toLocaleDateString()}
                </p>
            </div>
            <a href="job-details.html?job_id=${job.id}" class="btn-sm btn-outline-primary" style="font-size:0.8rem;">View</a>
        </div>
    `).join("");
}

function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
}