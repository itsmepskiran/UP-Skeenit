import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

// Store applied job IDs globally to filter them out of the feed
let appliedJobIds = new Set();

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { window.location.href = CONFIG.PAGES.LOGIN; return; }
    
    updateSidebarProfile(session.user);
    loadData(session.user.id);
    setupSearch();
}

function updateSidebarProfile(user) {
    const nameEl = document.getElementById("userName");
    const avatarEl = document.getElementById("userAvatar"); 
    if(nameEl) nameEl.textContent = user.user_metadata.full_name || user.email.split('@')[0];
    if(avatarEl) {
        if (user.user_metadata.avatar_url) {
            avatarEl.innerHTML = `<img src="${user.user_metadata.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            const initials = (user.user_metadata.full_name || user.email).match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = `<span>${text}</span>`;
            avatarEl.style.backgroundColor = "#e0e7ff"; avatarEl.style.color = "#3730a3"; 
            avatarEl.style.display = "flex"; avatarEl.style.alignItems = "center"; avatarEl.style.justifyContent = "center";
        }
    }
}

async function loadData(userId) {
    try {
        // 1. Load Applications FIRST (to get IDs)
        const appsRes = await backendGet(`/applicant/applications`); 
        let apps = [];
        try { 
            const json = await handleResponse(appsRes);
            apps = json.data || [];
        } catch(e) { console.warn("Apps fetch error", e); }
        
        // Save IDs for filtering
        appliedJobIds = new Set(apps.map(a => a.job_id));
        
        // Render Applications
        renderApplications(apps);
        document.getElementById("totalApplications").textContent = apps.length || 0;

        // 2. Load Jobs (and exclude applied ones)
        await fetchJobs();

    } catch (err) {
        console.error("Load failed", err);
    }
}

async function fetchJobs(query = '') {
    const container = document.getElementById("recommendedJobsList");
    container.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const url = query 
            ? `/dashboard/jobs?q=${encodeURIComponent(query)}` 
            : `/dashboard/jobs`;
            
        const jobsRes = await backendGet(url);
        const json = await handleResponse(jobsRes);
        let jobs = json.data || [];
        
        // ✅ FILTER: Remove jobs that are already in the applied list
        const filteredJobs = jobs.filter(job => !appliedJobIds.has(job.id));
        
        renderJobs(filteredJobs);
        document.getElementById("activeJobs").textContent = filteredJobs.length || 0;
        
    } catch(e) {
        console.warn("Jobs fetch error", e);
        container.innerHTML = `<p class="text-muted">Failed to load jobs.</p>`;
    }
}

function renderApplications(apps) {
    const container = document.getElementById("myApplicationsList");
    
    if(!apps || !apps.length) {
        container.innerHTML = "<p class='text-muted'>You haven't applied to any jobs yet.</p>";
        return;
    }

    container.innerHTML = apps.map(app => {
        // 1. formatting logic
        const rawStatus = (app.status || 'pending').toLowerCase();
        let displayStatus = app.status || 'Applied';
        let badgeColor = "background:#ebf8ff; color:#2b6cb0;"; // Default Blue

        // Custom Labels & Colors
        if (rawStatus === 'interviewing') {
            displayStatus = 'Pending Interview'; 
            badgeColor = "background:#fffaf0; color:#c05621; border:1px solid #fbd38d;"; // Orange
        } else if (rawStatus === 'hired') {
            displayStatus = 'Offer Received';
            badgeColor = "background:#f0fff4; color:#2f855a;"; // Green
        } else if (rawStatus === 'rejected') {
            displayStatus = 'Not Selected';
            badgeColor = "background:#fff5f5; color:#c53030;"; // Red
        }

        // 2. Action Button Logic (The Entry Point to Questions)
        let actionButton = '';
        if (rawStatus === 'interviewing') {
            // This links to the page where they will see questions & record video
            actionButton = `
                <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                    <a href="interview-room.html?application_id=${app.id}" class="btn btn-sm btn-primary" style="width:100%; display:block; text-align:center;">
                        <i class="fas fa-video"></i> Start Video Interview
                    </a>
                </div>
            `;
        }

        return `
        <div class="card" style="margin-bottom: 15px; border: 1px solid #eee;">
            <div class="card-body">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <h3 style="margin:0; font-size:1.1rem;">${app.job_title || 'Unknown Role'}</h3>
                        <p class="text-muted" style="margin:5px 0 10px;">${app.company_name || 'Skreenit'}</p>
                    </div>
                    <span class="status-badge" style="${badgeColor} padding:5px 10px; border-radius:15px; font-size:0.75rem; font-weight:700; text-transform:uppercase;">
                        ${displayStatus}
                    </span>
                </div>
                
                <small class="text-muted" style="display:block; margin-top:5px;">
                    <i class="far fa-clock"></i> Applied: ${new Date(app.applied_at).toLocaleDateString()}
                </small>

                ${actionButton}
            </div>
        </div>
        `;
    }).join("");
}
function renderJobs(jobs) {
    // ⚠️ Target the Correct ID
    const container = document.getElementById("recommendedJobsList");
    
    if(!jobs || !jobs.length) {
        container.innerHTML = "<p class='text-muted'>No new jobs found.</p>";
        return;
    }
    container.innerHTML = jobs.map(job => `
        <div class="card job-card">
            <div class="card-body">
                <h3>${job.title}</h3>
                <p class="text-muted" style="margin-bottom:0.5rem; font-weight:500;">${job.company_name || 'Hiring Company'}</p>
                <p><i class="fas fa-map-marker-alt" style="color:#718096"></i> ${job.location}</p>
                <div style="margin-top:10px; display:flex; gap:5px; flex-wrap:wrap;">
                    <span class="badge badge-light" style="background:#edf2f7; color:#4a5568; padding:2px 8px; border-radius:4px; font-size:0.85em;">${job.job_type}</span>
                </div>
                <a href="job-details.html?job_id=${job.id}" class="btn btn-primary btn-sm" style="margin-top:15px; display:inline-block; width:100%; text-align:center;">View Details</a>
            </div>
        </div>
    `).join("");
}

function setupSearch() {
    const btn = document.getElementById("jobSearchBtn");
    const input = document.getElementById("jobSearchInput");
    if(btn && input) {
        btn.addEventListener("click", () => fetchJobs(input.value.trim()));
        input.addEventListener("keypress", (e) => {
            if(e.key === 'Enter') fetchJobs(input.value.trim());
        });
    }
}

// Events
document.getElementById("navProfile").addEventListener("click", () => window.location.href = "../applicant/candidate-profile.html");
document.getElementById("navApplications").addEventListener("click", () => window.location.href = "../applicant/my-applications.html");
document.getElementById("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = CONFIG.PAGES.LOGIN;
});

document.addEventListener("DOMContentLoaded", checkAuth);