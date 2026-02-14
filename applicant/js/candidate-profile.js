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
    
    // Safety check role
    if ((session.user.user_metadata?.role || '').toLowerCase() !== 'candidate') {
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER; return;
    }
    
    updateSidebarProfile(session.user);
    loadProfile(session.user.id);
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

async function loadProfile(userId) {
    try {
        const res = await backendGet('/applicant/profile');
        const data = await handleResponse(res);
        const profile = data.data || {};

        // Header
        setText("viewName", profile.full_name || "Candidate");
        setText("viewEmail", profile.contact_email || profile.email || "-");
        setText("viewPhone", profile.phone || "-");
        document.getElementById("viewLocation").querySelector("span").textContent = profile.location || "Location not set";
        setText("viewSummary", profile.bio || "No summary provided.");

        // Avatar
        const avatarEl = document.getElementById("viewAvatar");
        if (profile.avatar_url) {
            avatarEl.innerHTML = `<img src="${profile.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            const initials = (profile.full_name || "C").match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.textContent = text || "C";
        }

        // Links
        const linkedin = document.getElementById("viewLinkedin");
        if(profile.linkedin_url) linkedin.innerHTML = `<a href="${profile.linkedin_url}" target="_blank" style="color:#667eea; text-decoration:none;">LinkedIn Profile <i class="fas fa-external-link-alt" style="font-size:0.8em"></i></a>`;
        else linkedin.innerHTML = `<span class="text-muted">-</span>`;

        const portfolio = document.getElementById("viewPortfolio");
        if(profile.portfolio_url) portfolio.innerHTML = `<a href="${profile.portfolio_url}" target="_blank" style="color:#667eea; text-decoration:none;">Portfolio Link <i class="fas fa-external-link-alt" style="font-size:0.8em"></i></a>`;
        else portfolio.innerHTML = `<span class="text-muted">-</span>`;

        // Resume Link
        const resumeEl = document.getElementById("viewResume");
        if(profile.resume_url) {
            // Note: Since we are using Private Buckets, you might need a signed URL logic here later.
            // For now, we display "Resume Uploaded"
            resumeEl.innerHTML = `<span style="color:#2d3748; font-weight:500;"><i class="fas fa-file-pdf" style="color:#e53e3e"></i> Resume Uploaded</span>`;
        } 

        // Experience
        const expContainer = document.getElementById("viewExperience");
        if (profile.experience && profile.experience.length > 0) {
            expContainer.innerHTML = profile.experience.map(exp => `
                <div class="list-group-item">
                    <span class="list-title">${exp.title}</span>
                    <span class="list-subtitle"><i class="fas fa-building"></i> ${exp.company} &nbsp;|&nbsp; <i class="far fa-calendar-alt"></i> ${exp.start_date || ''} - ${exp.end_date || 'Present'}</span>
                    <p style="margin-top:0.5rem; font-size:0.95rem; line-height:1.5; color:#4a5568;">${exp.description || ''}</p>
                </div>
            `).join("");
        }

        // Education
        const eduContainer = document.getElementById("viewEducation");
        if (profile.education && profile.education.length > 0) {
            eduContainer.innerHTML = profile.education.map(edu => `
                <div class="list-group-item">
                    <span class="list-title">${edu.degree}</span>
                    <span class="list-subtitle"><i class="fas fa-university"></i> ${edu.institution} &nbsp;|&nbsp; Class of ${edu.completion_year}</span>
                </div>
            `).join("");
        }

        // Skills
        const skillsContainer = document.getElementById("viewSkills");
        if (profile.skills && profile.skills.length > 0) {
            skillsContainer.innerHTML = profile.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join("");
        }

    } catch (err) {
        console.warn("Profile load error", err);
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
}

// Navigation Events
document.getElementById("editProfileBtn").addEventListener("click", () => {
    // Navigates to the Wizard we built earlier
    window.location.href = "detailed-application-form.html";
});

document.getElementById("navDashboard").addEventListener("click", () => {
    // Correct path back to dashboard
    window.location.href = "../dashboard/candidate-dashboard.html";
});

document.getElementById("navApplications").addEventListener("click", () => {
     // For now, back to dashboard or specific apps page
    window.location.href = "../dashboard/candidate-dashboard.html";
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = CONFIG.PAGES.LOGIN;
});

document.addEventListener("DOMContentLoaded", checkAuth);