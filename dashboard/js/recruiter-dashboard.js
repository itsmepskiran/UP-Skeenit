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
    const nameEl = document.getElementById('recruiterName');
    const avatarEl = document.getElementById('userAvatar');
    if(nameEl) nameEl.textContent = meta.full_name || email.split('@')[0];
}

async function updateUserInfo() {
  try {
    const res = await backendGet('/recruiter/profile');
    const data = await handleResponse(res);
    const profile = data.data || data; 
    if (profile && profile.contact_name) {
      const el = document.getElementById('recruiterName');
      if (el) el.textContent = profile.contact_name;
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
        const activeJobsCount = jobsList.filter(j => j.status === 'active').length;
        setText("statActiveJobs", activeJobsCount);

        // ✅ FIX: Actually Render the jobs list
        renderJobs(jobsList.slice(0, 5));

        // B. Fetch Applications
        let appsList = [];
        try {
            const appsRes = await backendGet(`/recruiter/applications`); 
            const appsData = await handleResponse(appsRes);
            appsList = appsData?.data || appsData || [];
        } catch (e) { console.warn("Apps fetch error", e); }

        if (Array.isArray(appsList)) {
            renderApplications(appsList.slice(0, 6)); 
            
            // Update Stats
            const totalCandidates = new Set(appsList.map(a => a.candidate_id)).size;
            const newAppsCount = appsList.filter(a => a.status === 'pending').length;
            
            setText("statTotalCandidates", totalCandidates);
            setText("statNewApplications", newAppsCount);
        }

    } catch (err) { console.error("Dashboard load error:", err); }
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

function renderApplications(apps) {
    const list = document.getElementById("recentAppsList"); 
    if(!list) return;

    if (!apps || !apps.length) { 
        list.innerHTML = "<p class='text-muted' style='padding:1rem'>No applications received yet.</p>"; 
        return; 
    }
    
    list.innerHTML = apps.map(app => `
        <div class="card" onclick="window.location.href='application-details.html?id=${app.id}'" style="cursor:pointer; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div class="card-body" style="padding: 1rem;">
                <h4 style="margin:0; font-size:1.05rem; color:#2d3748;">${app.candidate_name || 'Candidate'}</h4>
                <p style="margin:4px 0 8px; color:#718096; font-size:0.9rem;">
                    Applied for: <strong>${app.job_title}</strong>
                </p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="status-badge status-${(app.status || 'pending').toLowerCase()}" 
                          style="padding:4px 10px; border-radius:12px; font-size:0.75rem; font-weight:bold; background:#edf2f7; color:#4a5568;">
                        ${app.status || 'Pending'}
                    </span>
                    <small style="color:#a0aec0;">${new Date(app.applied_at).toLocaleDateString()}</small>
                </div>
            </div>
        </div>
    `).join("");
}

function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
}