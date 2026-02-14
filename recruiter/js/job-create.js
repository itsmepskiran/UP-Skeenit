import { supabase } from '@shared/js/supabase-config.js';
import { backendPost, backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

async function ensureRecruiter() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) { window.location.href = CONFIG.PAGES.LOGIN; return null; }
  if ((user.user_metadata?.role || "").toLowerCase() !== "recruiter") {
    window.location.href = CONFIG.PAGES.LOGIN; return null;
  }
  updateSidebarProfile(user.user_metadata, user.email);
  fetchLatestProfile();
  return user;
}

function updateSidebarProfile(meta, email) {
    const nameEl = document.getElementById('userName'); 
    const avatarEl = document.getElementById('userAvatar'); 
    if(nameEl) nameEl.textContent = meta.full_name || meta.contact_name || email.split('@')[0];
    if(avatarEl) {
        if (meta.avatar_url) avatarEl.innerHTML = `<img src="${meta.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
        else {
            const initials = (meta.full_name || email).match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = `<span>${text}</span>`;
            avatarEl.style.backgroundColor = "#e0e7ff"; avatarEl.style.color = "#3730a3"; 
            avatarEl.style.display = "flex"; avatarEl.style.alignItems = "center"; avatarEl.style.justifyContent = "center";
        }
    }
}

async function fetchLatestProfile() {
    try {
        const res = await backendGet('/recruiter/profile');
        const data = await handleResponse(res);
        if (data && data.data) {
            const profile = data.data;
            updateSidebarProfile({ full_name: profile.contact_name, avatar_url: profile.avatar_url, ...profile }, profile.email || "");
        }
    } catch (err) { console.warn("Background profile fetch failed:", err); }
}

async function handleJobCreate(event) {
  event.preventDefault();
  const submitBtn = event.target.querySelector("button[type='submit']");
  const originalText = submitBtn ? submitBtn.innerText : "Publish Job";
  
  try {
    if(submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Publishing..."; }
  
    const title = document.getElementById("job_title").value.trim();
    const location = document.getElementById("job_location").value.trim();
    const job_type = document.getElementById("job_type").value;
    const salary_range = document.getElementById("salary_range").value.trim(); 
    const description = document.getElementById("job_description").value.trim();
    const requirements = document.getElementById("requirements").value.trim();

    if (!title || !location || !job_type || !description || !requirements) {
      alert("Please fill all required fields."); throw new Error("Validation failed");
    }
    
    let salary_min = null;
    let salary_max = null;

    if (salary_range) {
        const parts = salary_range.split('-').map(s => s.trim());
        if(parts.length >= 2) {
             const min = parseInt(parts[0]);
             const max = parseInt(parts[1]);
             if (!isNaN(min)) salary_min = min;
             if (!isNaN(max)) salary_max = max;
             if (salary_max === 0) salary_max = null; 
        }
    }

    const payload = {
      title, location, job_type, salary_min, salary_max, description, requirements,
      currency: "INR", status: "active" 
    };

    const response = await backendPost('/recruiter/jobs', payload);
    await handleResponse(response);

    alert("Job created successfully!");
    window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;

  } catch (error) {
    console.error("Job create failed:", error);
    alert(`Error: ${error.message || 'Failed to create Job'}`);
  } finally {
    if(submitBtn) { submitBtn.disabled = false; submitBtn.innerText = originalText; }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await ensureRecruiter();
  const form = document.getElementById("createJobForm") || document.getElementById("jobForm");
  if(form) form.addEventListener("submit", handleJobCreate);

  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
      backBtn.addEventListener("click", () => {
          if (confirm("Changes made will be lost. Are you sure you want to leave?")) window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
      });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn) logoutBtn.addEventListener("click", async () => { await supabase.auth.signOut(); window.location.href = CONFIG.PAGES.LOGIN; });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => { if(item.dataset.section !== 'jobs') window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER; });
  });
});