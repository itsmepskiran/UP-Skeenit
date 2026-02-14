import { supabase } from '@shared/js/supabase-config.js';
import { backendPut, backendGet, handleResponse } from '@shared/js/backend-client.js'; 
import { CONFIG } from '@shared/js/config.js';

// Setup Assets
const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

// Store original data to revert if user clicks Cancel
let originalProfileData = {};

async function ensureRecruiter() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || (user.user_metadata?.role || "").toLowerCase() !== "recruiter") {
    window.location.href = CONFIG.PAGES.LOGIN;
    return null;
  }

  // Update Sidebar Info
  updateSidebarProfile(user.user_metadata, user.email);

  // Fetch Full Profile Data
  await fetchProfileData(user);
  return user;
}

function updateSidebarProfile(meta, email) {
    const nameEl = document.getElementById("userName");
    const avatarEl = document.getElementById("userAvatar"); 
    
    if(nameEl) nameEl.textContent = meta.full_name || meta.contact_name || email.split('@')[0];
    
    if(avatarEl) {
        if (meta.avatar_url) {
            avatarEl.innerHTML = `<img src="${meta.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            const initials = (meta.full_name || email).match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = `<span>${text}</span>`;
            avatarEl.style.backgroundColor = "#e0e7ff"; avatarEl.style.color = "#3730a3"; 
            avatarEl.style.display = "flex"; avatarEl.style.alignItems = "center"; avatarEl.style.justifyContent = "center";
        }
    }
}

async function fetchProfileData(user) {
  try {
    const res = await backendGet('/recruiter/profile');
    const result = await handleResponse(res);
    
    if (result && result.data) {
        originalProfileData = result.data; // Cache for cancel
        populateForm(originalProfileData);
    } else {
        // Fallback for new users
        if (user) {
            document.getElementById("contact_name").value = user.user_metadata?.full_name || "";
            document.getElementById("contact_email").value = user.email || "";
        }
    }
  } catch (err) {
    console.warn("Profile fetch error:", err);
  }
}

function populateForm(data) {
    if(!data) return;
    setValue("company_name", data.company_name);
    setValue("company_website", data.company_website);
    setValue("contact_name", data.contact_name);
    setValue("contact_email", data.contact_email);
    setValue("location", data.location);
    setValue("about", data.about_company); 
    
    const idEl = document.getElementById("company_id");
    if(idEl) idEl.value = data.company_display_id || "Pending (Save Profile First)";
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if(el) el.value = val || "";
}

/* -------------------------------------------------------
   EDIT MODE LOGIC
------------------------------------------------------- */
function toggleEditMode(enable) {
    const form = document.getElementById("recruiterProfileForm");
    const inputs = form.querySelectorAll("input, textarea");
    const editBtn = document.getElementById("editBtn");
    const editActions = document.getElementById("editActions");

    inputs.forEach(input => {
        // Company ID is ALWAYS read-only
        if (input.id !== "company_id") {
            input.disabled = !enable;
        }
    });

    if (enable) {
        editBtn.classList.add("d-none"); // Hide Edit
        editActions.classList.remove("d-none"); // Show Save/Cancel
    } else {
        editBtn.classList.remove("d-none"); // Show Edit
        editActions.classList.add("d-none"); // Hide Save/Cancel
    }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const btn = document.getElementById("saveBtn");
  const originalText = btn.innerText;
  btn.innerText = "Saving..."; btn.disabled = true;

  const { data: { user } } = await supabase.auth.getUser();

  let website = document.getElementById("company_website").value.trim();
  if (website && !website.match(/^https?:\/\//)) website = `https://${website}`;

  const payload = {
    user_id: user.id,
    company_name: document.getElementById("company_name").value.trim(),
    company_website: website || null,
    contact_name: document.getElementById("contact_name").value.trim(),
    contact_email: document.getElementById("contact_email").value.trim(),
    location: document.getElementById("location").value.trim() || null,
    about: document.getElementById("about").value.trim() || null,
  };

  try {
    const res = await backendPut("/recruiter/profile", payload);
    await handleResponse(res);
    
    await supabase.auth.refreshSession();
    alert("Profile updated successfully!");
    
    // Update cache and lock form
    originalProfileData = { ...originalProfileData, ...payload, about_company: payload.about }; 
    toggleEditMode(false);

  } catch (err) {
    console.error("Save failed:", err);
    alert(`Failed to save: ${err.message}`);
  } finally {
    btn.innerText = originalText; btn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await ensureRecruiter();

  // Navigation Logic
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if(item.dataset.section !== 'profile') window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER;
    });
  });

  // Button Listeners
  const editBtn = document.getElementById("editBtn");
  if(editBtn) editBtn.addEventListener("click", () => toggleEditMode(true));

  const cancelBtn = document.getElementById("cancelBtn");
  if(cancelBtn) cancelBtn.addEventListener("click", () => {
      populateForm(originalProfileData); // Revert changes
      toggleEditMode(false);
  });

  const form = document.getElementById("recruiterProfileForm");
  if (form) form.addEventListener("submit", handleProfileSubmit);

  const backBtn = document.getElementById("backBtn");
  if(backBtn) backBtn.addEventListener("click", () => window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER);

  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn) logoutBtn.addEventListener("click", async () => { 
      await supabase.auth.signOut(); 
      window.location.href = CONFIG.PAGES.LOGIN; 
  });
});