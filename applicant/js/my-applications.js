import { supabase } from '../../auth/assets/js/supabase-config.js';
import { backendGet, handleResponse } from '../../auth/assets/js/backend-client.js';
import { CONFIG } from '../../auth/assets/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    setupNavigation();
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    updateSidebarProfile(session.user);
    loadApplications();
}

// --- SIDEBAR PROFILE ---
async function updateSidebarProfile(user) {
    const nameEl = document.getElementById("userName");
    const designationEl = document.getElementById("userDesignation");
    const avatarEl = document.getElementById("userAvatar"); 

    // Set Name
    if(nameEl) nameEl.textContent = user.user_metadata.full_name || user.email.split('@')[0];

    // Handle Designation
    if(designationEl) {
        designationEl.textContent = "Candidate"; // Default fallback
        try {
            const res = await backendGet('/applicant/profile');
            const json = await handleResponse(res);
            const profile = json.data || {};

            if (profile.experience && profile.experience.length > 0) {
                designationEl.textContent = profile.experience[0].job_title;
            } else if (profile.job_title) {
                designationEl.textContent = profile.job_title;
            }
        } catch (err) {
            // Silent fail
        }
    }

    // Handle Avatar
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

// --- LOAD APPLICATIONS ---
async function loadApplications() {
    const container = document.getElementById("applicationsList");
    // Show spinner while loading
    container.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>';

    try {
        const res = await backendGet(`/applicant/applications`); 
        const json = await handleResponse(res);
        const apps = json || []; // Backend returns list directly or inside data
        
        if(!apps.length) {
            container.innerHTML = "<div class='alert alert-info text-center'>You haven't applied to any jobs yet.</div>";
            return;
        }

        // Sort applications by date (newest first)
        apps.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));

        container.innerHTML = apps.map(app => {
            const rawStatus = (app.status || 'pending').toLowerCase();
            let displayStatus = app.status || 'Applied';
            let badgeColor = "background:#ebf8ff; color:#2b6cb0;"; // Default Blue

            // Status Badge Logic
            if (rawStatus === 'interviewing') {
                displayStatus = 'Pending Interview';
                badgeColor = "background:#fffaf0; color:#c05621;"; // Orange
            } 
            else if (rawStatus === 'interview_submitted' || rawStatus === 'completed') {
                displayStatus = 'Interview Submitted';
                badgeColor = "background:#e6fffa; color:#2c7a7b;"; // Teal
            }
            else if (rawStatus === 'hired') {
                displayStatus = 'Offer Received';
                badgeColor = "background:#f0fff4; color:#2f855a;"; // Green
            }
            else if (rawStatus === 'rejected') {
                displayStatus = 'Not Selected';
                badgeColor = "background:#fff5f5; color:#c53030;"; // Red
            }

            // Action Buttons Logic
            let actionButton = '';
            if (rawStatus === 'interviewing') {
                actionButton = `
                    <a href="../dashboard/interview-room.html?application_id=${app.id}" 
                       class="btn btn-sm btn-primary w-100 mt-2">
                        <i class="fas fa-video me-1"></i> Start Interview
                    </a>`;
            } 
            else if (rawStatus === 'interview_submitted' || rawStatus === 'completed') {
                // IMPORTANT: We use a class 'view-response-btn' and data-attribute for delegation
                actionButton = `
                    <button data-application-id="${app.id}" 
                            class="btn btn-sm btn-outline-primary view-response-btn w-100 mt-2">
                        <i class="fas fa-play-circle me-1"></i> Review My Responses
                    </button>`;
            }

            return `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100 shadow-sm border-0">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h5 class="card-title fw-bold text-dark mb-0">${app.job_title || 'Unknown Role'}</h5>
                                <span class="badge" style="${badgeColor} font-weight:600;">${displayStatus}</span>
                            </div>
                            <p class="card-text text-muted small mb-2">${app.company_name || 'Skreenit'}</p>
                            <small class="text-muted d-block mb-3">
                                <i class="far fa-clock me-1"></i> Applied: ${new Date(app.applied_at).toLocaleDateString()}
                            </small>
                            
                            ${actionButton}
                            
                            <a href="../dashboard/job-details.html?job_id=${app.job_id}" 
                               class="btn btn-sm btn-link text-decoration-none w-100 mt-1">
                               View Job Details
                            </a>
                        </div>
                    </div>
                </div>`;
        }).join("");
        
        // Ensure container is a row for grid layout
        if (!container.classList.contains('row')) container.classList.add('row');

    } catch (err) {
        console.error("Load failed", err);
        container.innerHTML = "<div class='alert alert-danger text-center'>Error loading applications. Please refresh.</div>";
    }
}

// --- VIDEO REVIEW LOGIC ---
async function viewMyResponse(applicationId) {
    const modalEl = document.getElementById('responseModal');
    const modalBody = document.getElementById('responseModalBody');
    const modal = new bootstrap.Modal(modalEl);
    
    modalBody.innerHTML = `
        <div class="text-center p-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Loading your interview videos...</p>
        </div>`;
    modal.show();

    try {
        const response = await backendGet(`/applicant/applications/${applicationId}/responses`);
        const data = await handleResponse(response);
        
        // Correctly handle the response key "responses"
        const videoList = data.responses || data.data || [];

        if (!videoList.length) {
            modalBody.innerHTML = '<div class="alert alert-warning text-center">No video responses found for this application.</div>';
            return;
        }

        modalBody.innerHTML = videoList.map((resp, i) => `
            <div class="card mb-3 border-0 bg-light">
                <div class="card-header bg-white border-bottom-0 pt-3">
                    <strong class="text-primary">Question ${i + 1}:</strong> ${resp.question || 'Interview Question'}
                    <div class="small text-muted float-end">${new Date(resp.recorded_at || Date.now()).toLocaleDateString()}</div>
                </div>
                <div class="card-body p-0">
                    <div class="ratio ratio-16x9">
                        <video controls style="background-color: #000;">
                            <source src="${resp.video_url}" type="video/webm">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error fetching interview responses:', error);
        modalBody.innerHTML = '<div class="alert alert-danger text-center">Failed to load videos. Please try again.</div>';
    }
}

// --- NAVIGATION & EVENT LISTENERS ---
function setupNavigation() {
    const navDashboard = document.getElementById("navDashboard");
    const navProfile = document.getElementById("navProfile");
    const navApplications = document.getElementById("navApplications"); // Current Page
    const logoutBtn = document.getElementById("logoutBtn");

    // Relative Paths (Moving from /applicant/ to /dashboard/)
    if (navDashboard) navDashboard.onclick = () => window.location.href = "../dashboard/candidate-dashboard.html";
    if (navProfile) navProfile.onclick = () => window.location.href = "candidate-profile.html";
    if (navApplications) navApplications.onclick = () => window.location.href = "my-applications.html";

    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await supabase.auth.signOut();
            window.location.href = '../../auth/index.html';
        };
    }

    // Event Delegation for "Review My Responses" buttons
    // This captures clicks on dynamically created buttons
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.view-response-btn');
        if (btn) {
            e.preventDefault();
            const appId = btn.dataset.applicationId;
            if (appId) {
                await viewMyResponse(appId);
            }
        }
    });
}