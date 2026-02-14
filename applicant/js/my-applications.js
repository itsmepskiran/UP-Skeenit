import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { window.location.href = CONFIG.PAGES.LOGIN; return; }
    
    updateSidebarProfile(session.user);
    loadApplications();
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

async function loadApplications() {
    const container = document.getElementById("applicationsList");
    try {
        const res = await backendGet(`/applicant/applications`); 
        const json = await handleResponse(res);
        const apps = json.data || [];
        
        if(!apps.length) {
            container.innerHTML = "<p class='text-muted'>You haven't applied to any jobs yet.</p>";
            return;
        }

        container.innerHTML = apps.map(app => `
            <div class="card">
                <div class="card-body">
                    <h3>${app.job_title || 'Unknown Role'}</h3>
                    <p class="text-muted">${app.company_name || 'Unknown Company'}</p>
                    <div style="margin: 10px 0;">
                        <span class="status-badge status-${(app.status||'pending').toLowerCase()}" 
                              style="background:#ebf8ff; color:#2b6cb0; padding:5px 10px; border-radius:15px; font-size:0.85rem; font-weight:600;">
                            ${app.status || 'Applied'}
                        </span>
                    </div>
                    <small class="text-muted">Applied: ${new Date(app.applied_at).toLocaleDateString()}</small>
                    <a href="../dashboard/job-details.html?job_id=${app.job_id}" class="btn btn-sm btn-outline-primary" style="display:block; margin-top:10px; text-align:center;">View Job</a>
                </div>
            </div>
        `).join("");

    } catch (err) {
        console.error("Load failed", err);
        container.innerHTML = "<p>Error loading applications.</p>";
    }
}

// Navigation Events
document.getElementById("navDashboard").addEventListener("click", () => window.location.href = "../dashboard/candidate-dashboard.html");
document.getElementById("navProfile").addEventListener("click", () => window.location.href = "candidate-profile.html");
document.getElementById("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = CONFIG.PAGES.LOGIN;
});

document.addEventListener("DOMContentLoaded", checkAuth);