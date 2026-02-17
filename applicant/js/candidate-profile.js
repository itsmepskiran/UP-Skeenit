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
    
    await updateSidebarProfile(session.user);
    loadProfile(session.user.id);
}

async function updateSidebarProfile(user) {
    const nameEl = document.getElementById("userName");
    const designationEl = document.getElementById("userDesignation");
    const avatarEl = document.getElementById("userAvatar"); 

    // 1. Set Name
    if(nameEl) nameEl.textContent = user.user_metadata.full_name || user.email.split('@')[0];

    // 2. Handle Designation (Latest Job Title or Fresher)
    if(designationEl) {
        designationEl.textContent = "Fresher"; // Default fallback
        
        try {
            const res = await backendGet('/applicant/profile');
            const json = await handleResponse(res);
            const profile = json.data || {};

            if (profile.experience && profile.experience.length > 0) {
                // Take the job_title from the first (latest) entry
                designationEl.textContent = profile.experience[0].job_title || "Fresher";
            }
        } catch (err) {
            console.warn("Could not fetch latest designation:", err);
            // Stays as "Fresher" if fetch fails
        }
    }

    // 3. Handle Avatar
    if(avatarEl) {
        if (user.user_metadata.avatar_url) {
            avatarEl.innerHTML = `<img src="${user.user_metadata.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
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
                border-radius: 50%;
            `;
        }
    }
}


async function loadProfile(userId) {
    try {
        const res = await backendGet('/applicant/profile');
        const data = await handleResponse(res);
        const profile = data.data || {};

        // 1. Header Basic Info
        setText("viewName", profile.full_name || "Candidate");
        setText("viewEmail", profile.contact_email || profile.email || "-");
        setText("viewPhone", profile.phone || "-");
        
        // Location Logic
        const locEl = document.getElementById("viewLocation");
        if(locEl) {
             // Handle the <span> inside the location element if it exists, or just set text
             const span = locEl.querySelector("span");
             if(span) span.textContent = profile.location || "Location not set";
             else locEl.textContent = profile.location || "Location not set";
        }

        setText("viewSummary", profile.bio || "No summary provided.");

        // 2. Role / Experience Logic (NEW)
        let roleText = "Fresher";
        if (profile.experience && profile.experience.length > 0) {
             // Priority: Find a job marked 'Present', otherwise take the first one
             const currentJob = profile.experience.find(e => (e.end_date || '').toLowerCase() === 'present');
             const latest = currentJob || profile.experience[0];
             
             if (latest) {
                 roleText = `${latest.title} at ${latest.company}`;
                 // Optional: Append years if you calculate them, e.g. " | 5 Yrs Exp"
             }
        }
        setText("viewRole", roleText);


        // 3. Avatar
        const avatarEl = document.getElementById("viewAvatar");
        if (profile.avatar_url) {
            avatarEl.innerHTML = `<img src="${profile.avatar_url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            const initials = (profile.full_name || "C").match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.textContent = text || "C";
        }

        // 4. Links
        const linkedin = document.getElementById("viewLinkedin");
        if(linkedin) {
            if(profile.linkedin_url) linkedin.innerHTML = `<a href="${profile.linkedin_url}" target="_blank" style="color:#667eea; text-decoration:none;">LinkedIn Profile <i class="fas fa-external-link-alt" style="font-size:0.8em"></i></a>`;
            else linkedin.innerHTML = `<span class="text-muted">-</span>`;
        }

        const portfolio = document.getElementById("viewPortfolio");
        if(portfolio) {
            if(profile.portfolio_url) portfolio.innerHTML = `<a href="${profile.portfolio_url}" target="_blank" style="color:#667eea; text-decoration:none;">Portfolio Link <i class="fas fa-external-link-alt" style="font-size:0.8em"></i></a>`;
            else portfolio.innerHTML = `<span class="text-muted">-</span>`;
        }

        // 5. Resume Link
        const resumeEl = document.getElementById("viewResume");
        if(resumeEl) {
            if(profile.resume_url) {
                resumeEl.innerHTML = `<span style="color:#2d3748; font-weight:500;"><i class="fas fa-file-pdf" style="color:#e53e3e"></i> Resume Uploaded</span>`;
            } else {
                resumeEl.innerHTML = `<span class="text-muted">No resume uploaded.</span>`;
            }
        }

        // 6. Experience List
        const expContainer = document.getElementById("viewExperience");
        if (expContainer) {
            if (profile.experience && profile.experience.length > 0) {
                expContainer.innerHTML = profile.experience.map(exp => `
                    <div class="list-group-item">
                        <span class="list-title">${exp.title}</span>
                        <span class="list-subtitle"><i class="fas fa-building"></i> ${exp.company} &nbsp;|&nbsp; <i class="far fa-calendar-alt"></i> ${exp.start_date || ''} - ${exp.end_date || 'Present'}</span>
                        <p style="margin-top:0.5rem; font-size:0.95rem; line-height:1.5; color:#4a5568;">${exp.description || ''}</p>
                    </div>
                `).join("");
            } else {
                expContainer.innerHTML = '<div class="text-muted">No experience details added.</div>';
            }
        }

        // 7. Education List
        const eduContainer = document.getElementById("viewEducation");
        if (eduContainer) {
            if (profile.education && profile.education.length > 0) {
                eduContainer.innerHTML = profile.education.map(edu => `
                    <div class="list-group-item">
                        <span class="list-title">${edu.degree}</span>
                        <span class="list-subtitle"><i class="fas fa-university"></i> ${edu.institution} &nbsp;|&nbsp; Class of ${edu.completion_year}</span>
                    </div>
                `).join("");
            } else {
                eduContainer.innerHTML = '<div class="text-muted">No education details added.</div>';
            }
        }

        // 8. Skills
        const skillsContainer = document.getElementById("viewSkills");
        if (skillsContainer) {
            if (profile.skills && profile.skills.length > 0) {
                skillsContainer.innerHTML = profile.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join("");
            } else {
                skillsContainer.innerHTML = '<div class="text-muted">No skills added.</div>';
            }
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
const editBtn = document.getElementById("editProfileBtn");
if(editBtn) editBtn.addEventListener("click", () => {
    window.location.href = "detailed-application-form.html";
});

const navDash = document.getElementById("navDashboard");
if(navDash) navDash.addEventListener("click", () => {
    window.location.href = "../dashboard/candidate-dashboard.html";
});

const navApps = document.getElementById("navApplications");
if(navApps) navApps.addEventListener("click", () => {
    window.location.href = "../dashboard/candidate-dashboard.html"; // Or my-applications.html if you have it
});

const logoutBtn = document.getElementById("logoutBtn");
if(logoutBtn) logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = CONFIG.PAGES.LOGIN;
});

document.addEventListener("DOMContentLoaded", checkAuth);