import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, backendPut, backendDelete, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

async function ensureRecruiter() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) { window.location.href = CONFIG.PAGES.LOGIN; return; }
  if ((user.user_metadata?.role || "").toLowerCase() !== "recruiter") { window.location.href = CONFIG.PAGES.LOGIN; return; }
  updateSidebarProfile(user.user_metadata, user.email);
}

function updateSidebarProfile(meta, email) {
    const nameEl = document.getElementById("userName");
    const avatarEl = document.getElementById("userAvatar"); 
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

function getJobId() { return new URLSearchParams(window.location.search).get("job_id"); }

async function initJobEditForm() {
  const jobId = getJobId();
  if (!jobId) { alert("No Job ID found."); window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER; return; }

  try {
    const res = await backendGet(`/recruiter/jobs/${jobId}`);
    const data = await handleResponse(res);
    const job = data.data || data; 

    if (job) {
        document.getElementById("job_title").value = job.title || "";
        document.getElementById("job_location").value = job.location || "";
        if(job.job_type) document.getElementById("job_type").value = job.job_type.toLowerCase();

        let salaryStr = "";
        if (job.salary_min !== null) {
            salaryStr = `${job.salary_min}`;
            if (job.salary_max !== null) salaryStr += ` - ${job.salary_max}`;
        }
        document.getElementById("salary_range").value = salaryStr;
        document.getElementById("job_description").value = job.description || "";
        document.getElementById("requirements").value = job.requirements || "";
    }
  } catch (err) { console.error("Error loading job:", err); alert("Could not load job details."); }

  const form = document.getElementById("editJobForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const salaryInput = document.getElementById("salary_range").value.trim();
    let salary_min = null;
    let salary_max = null;

    if (salaryInput) {
        const parts = salaryInput.split('-').map(s => s.trim());
        if(parts.length >= 2) {
             const min = parseInt(parts[0]); const max = parseInt(parts[1]);
             if (!isNaN(min)) salary_min = min; if (!isNaN(max)) salary_max = max;
             if (salary_max === 0) salary_max = null; 
        } else if (parts.length === 1 && !isNaN(parseInt(parts[0]))) { salary_min = parseInt(parts[0]); }
    }

    const payload = {
      title: document.getElementById("job_title").value.trim(),
      location: document.getElementById("job_location").value.trim(),
      job_type: document.getElementById("job_type").value,
      salary_min, salary_max,
      description: document.getElementById("job_description").value.trim(),
      requirements: document.getElementById("requirements").value.trim()
    };

    const btn = form.querySelector("button[type='submit']");
    const originalText = btn.innerText; btn.innerText = "Updating..."; btn.disabled = true;

    try {
        const res = await backendPut(`/recruiter/jobs/${jobId}`, payload);
        await handleResponse(res);
        alert("Job updated successfully!");
        window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
    } catch (err) { alert(`Update failed: ${err.message}`); } 
    finally { btn.innerText = originalText; btn.disabled = false; }
  });

  const deleteBtn = document.getElementById("deleteJobBtn");
  if(deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if(!confirm("Are you sure? This cannot be undone.")) return;
        try {
            const res = await backendDelete(`/recruiter/jobs/${jobId}`);
            await handleResponse(res);
            alert("Job deleted.");
            window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
        } catch(err) { alert(`Delete failed: ${err.message}`); }
      });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await ensureRecruiter();
  await initJobEditForm();

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