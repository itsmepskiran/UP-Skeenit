import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

let appliedJobIds = new Set(); // Track applied job IDs

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    setupEventListeners();
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    updateSidebarProfile(session.user);
    await loadData(session.user.id);
}

// --- DATA LOADING ---
async function loadData(userId) {
    try {
        // 1. Load Applications to get Stats and Status
        const appsRes = await backendGet('/applicant/applications');
        const apps = (await handleResponse(appsRes)) || [];
        
        appliedJobIds = new Set(apps.map(a => a.job_id));
        
        // Update Stats
        const totalApps = apps.length;
        if(document.getElementById("totalApplications")) {
            document.getElementById("totalApplications").textContent = totalApps;
        }
        if(document.getElementById("appsSentCount")) {
            document.getElementById("appsSentCount").textContent = totalApps;
        }

        renderApplications(apps);

        // 2. Load Recommended Jobs (excluding applied)
        await fetchJobs();

    } catch (err) {
        console.error("Load failed", err);
        const appList = document.getElementById("myApplicationsList");
        if(appList) appList.innerHTML = "<p class='text-danger'>Error loading data. Please refresh.</p>";
    }
}

async function fetchJobs(query = '') {
    const container = document.getElementById("recommendedJobsList");
    if (!container) return;

    try {
        // Use relative path for dashboard jobs endpoint
        const url = query ? `/dashboard/jobs?q=${encodeURIComponent(query)}` : '/dashboard/jobs';
        const jobsRes = await backendGet(url);
        const jobs = (await handleResponse(jobsRes)) || [];
        
        // Filter out jobs already applied to
        const filteredJobs = jobs.filter(job => !appliedJobIds.has(job.id));
        
        renderJobs(filteredJobs);
        
        if(document.getElementById("activeJobs")) {
            document.getElementById("activeJobs").textContent = filteredJobs.length;
        }
        if(document.getElementById("activeJobsCount")) {
            document.getElementById("activeJobsCount").textContent = filteredJobs.length;
        }

    } catch (err) {
        console.error("Jobs fetch error", err);
        container.innerHTML = "<p class='text-muted'>Error loading jobs.</p>";
    }
}

// --- RENDERING UI ---
function renderApplications(apps) {
    const container = document.getElementById("myApplicationsList");
    if (!container) return;

    if (!apps.length) {
        container.innerHTML = "<p class='text-muted text-center py-3'>You haven't applied to any jobs yet.</p>";
        return;
    }

    // Sort by most recent
    const sortedApps = apps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));

    container.innerHTML = sortedApps.map(app => {
        const status = (app.status || 'pending').toLowerCase();
        let displayStatus = app.status || 'Applied';
        let badgeColor = "background:#ebf8ff; color:#2b6cb0;"; // Default Blue

        // Status Styling
        if (status === 'interviewing') {
            displayStatus = 'Pending Interview';
            badgeColor = "background:#fffaf0; color:#c05621;"; // Orange
        } 
        else if (status === 'interview_submitted' || status === 'completed') {
            displayStatus = 'Interview Submitted';
            badgeColor = "background:#e6fffa; color:#2c7a7b;"; // Teal
        }
        else if (status === 'hired') {
            displayStatus = 'Offer Received';
            badgeColor = "background:#f0fff4; color:#2f855a;"; // Green
        }
        else if (status === 'rejected') {
            displayStatus = 'Not Selected';
            badgeColor = "background:#fff5f5; color:#c53030;"; // Red
        }

        // Action Buttons
        let actionButton = '';
        if (status === 'interviewing') {
            actionButton = `
                <a href="interview-room.html?application_id=${app.id}" 
                   class="btn btn-sm btn-primary w-100 mt-2">
                   <i class="fas fa-video me-1"></i> Start Interview
                </a>`;
        } 
        else if (status === 'interview_submitted' || status === 'completed') {
            actionButton = `
                <button data-application-id="${app.id}" 
                        class="btn btn-sm btn-outline-primary view-response-btn w-100 mt-2">
                    <i class="fas fa-play-circle me-1"></i> Review My Responses
                </button>`;
        }

        return `
            <div class="card mb-3 shadow-sm border-0">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="mb-1 fw-bold">${app.job_title || 'Unknown Role'}</h5>
                            <p class="text-muted small mb-2">${app.company_name || 'Skreenit'}</p>
                        </div>
                        <span class="badge" style="${badgeColor} font-weight:600;">
                            ${displayStatus}
                        </span>
                    </div>
                    <small class="text-muted d-block mb-2">
                        <i class="far fa-clock me-1"></i> Applied: ${new Date(app.applied_at).toLocaleDateString()}
                    </small>
                    ${actionButton}
                </div>
            </div>`;
    }).join('');
}

function renderJobs(jobs) {
    const container = document.getElementById("recommendedJobsList");
    if (!container) return;

    if (!jobs.length) {
        container.innerHTML = "<div class='text-center py-3 text-muted'>No new jobs found matching your criteria.</div>";
        return;
    }

    container.innerHTML = jobs.map(job => `
        <div class="card mb-3 shadow-sm border-0">
            <div class="card-body">
                <h5 class="card-title fw-bold">${job.title}</h5>
                <h6 class="card-subtitle mb-2 text-muted">${job.company_name || 'Hiring Company'}</h6>
                <p class="card-text small text-muted mb-2">
                    <i class="fas fa-map-marker-alt me-1"></i> ${job.location || 'Remote'}
                    <span class="mx-2">|</span>
                    <span class="badge bg-light text-dark border">${job.job_type}</span>
                </p>
                <a href="job-details.html?job_id=${job.id}" class="btn btn-primary btn-sm w-100 mt-2">
                    View Details
                </a>
            </div>
        </div>
    `).join('');
}

// --- VIDEO REVIEW LOGIC ---
async function viewMyResponse(applicationId) {
    try {
        const modalEl = document.getElementById('responseModal');
        const modalBody = document.getElementById('responseModalBody');
        const modal = new bootstrap.Modal(modalEl);
        
        modalBody.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="mt-2 text-muted">Loading your interview videos...</p>
            </div>`;
        modal.show();

        const response = await backendGet(`/applicant/applications/${applicationId}/responses`);
        const data = await handleResponse(response);
        
        // Handle backend response format {"responses": [...]}
        const responsesList = data.responses || data.data || [];

        if (!responsesList.length) {
            modalBody.innerHTML = `<div class="alert alert-info text-center">No video responses recorded for this application.</div>`;
            return;
        }

        modalBody.innerHTML = responsesList.map((r, i) => `
            <div class="card mb-3 border-0 bg-light">
                <div class="card-header bg-white border-bottom-0 pt-3">
                    <strong class="text-primary">Question ${i + 1}:</strong> ${r.question || 'Interview Question'}
                    <div class="small text-muted float-end">${new Date(r.recorded_at || Date.now()).toLocaleDateString()}</div>
                </div>
                <div class="card-body p-0">
                    <div class="ratio ratio-16x9">
                        <video controls style="background:#000;">
                            <source src="${r.video_url}" type="video/webm">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Modal Error:', error);
        const body = document.getElementById('responseModalBody');
        if(body) body.innerHTML = `<div class="alert alert-danger">Failed to load videos. Please try again.</div>`;
    }
}

// --- SIDEBAR PROFILE ---
async function updateSidebarProfile(user) {
    const nameEl = document.getElementById("userName");
    const designationEl = document.getElementById("userDesignation");
    const avatarEl = document.getElementById("userAvatar"); 

    if(nameEl) nameEl.textContent = user.user_metadata.full_name || user.email.split('@')[0];
    
    if(designationEl) {
        designationEl.textContent = "Candidate"; // Default
        try {
            const res = await backendGet('/applicant/profile');
            const json = await handleResponse(res);
            const profile = json.data || {};
            // If profile exists and has experience, show latest title
            if (profile.experience && profile.experience.length > 0) {
                designationEl.textContent = profile.experience[0].job_title;
            } else if (profile.job_title) {
                designationEl.textContent = profile.job_title;
            }
        } catch (err) {
            // Silent fail, keep default
        }
    }

    if(avatarEl) {
        if (user.user_metadata.avatar_url) {
            avatarEl.innerHTML = `<img src="${user.user_metadata.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            const initials = (user.user_metadata.full_name || user.email).match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = `<span>${text}</span>`;
            avatarEl.style.cssText = `
                background-color: #e0e7ff; 
                color: #3730a3; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-weight: 600;
                width: 100%; height: 100%;
            `;
        }
    }
}

// --- EVENT LISTENERS (NAVIGATION) ---
function setupEventListeners() {
    const navDashboard = document.getElementById('navDashboard');
    const navProfile = document.getElementById('navProfile');
    const navApplications = document.getElementById('navApplications');

    // 1. Sidebar Navigation (Relative Paths)
    // We are in /dashboard/, need to go up to /applicant/
    if (navApplications) {
        navApplications.onclick = () => window.location.href = '../applicant/my-applications.html';
    }
    if (navProfile) {
        navProfile.onclick = () => window.location.href = '../applicant/candidate-profile.html';
    }
    // We are already in /dashboard/
    if (navDashboard) {
        navDashboard.onclick = () => window.location.href = 'candidate-dashboard.html';
    }

    // 2. Dashboard Cards Navigation
    // Support for both ID and Class for the "Applications Sent" card
    const appsSentCard = document.getElementById('appsSentCard') || document.querySelector('.card-apps-sent');
    if (appsSentCard) {
        appsSentCard.style.cursor = 'pointer';
        appsSentCard.onclick = () => window.location.href = '../applicant/my-applications.html';
    }

    // 3. Search Functionality
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => fetchJobs(searchInput.value));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') fetchJobs(searchInput.value);
        });
    }

    // 4. View Response Button Click Delegation
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.view-response-btn');
        if (btn) {
            e.preventDefault(); // Prevent default if it's inside a form or link
            const appId = btn.dataset.applicationId;
            if (appId) await viewMyResponse(appId);
        }
    });
}