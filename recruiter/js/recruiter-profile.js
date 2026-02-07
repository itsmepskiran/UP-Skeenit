import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js?v=2';
// ✅ FIX 1: Import backendPut
import { backendPut, handleResponse } from 'https://auth.skreenit.com/assets/js/backend-client.js?v=2';

/* -------------------------------------------------------
   ROLE CHECK & AUTO-POPULATE
------------------------------------------------------- */
async function ensureRecruiter() {
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role;

  if (role !== "recruiter") {
    window.location.href = "https://login.skreenit.com/login";
    return null;
  }

  // ✅ FIX 2: Auto-populate Contact Name & Email from Registration Data
  if (user) {
    const nameInput = document.getElementById("contact_name");
    const emailInput = document.getElementById("contact_email");

    // Only fill if empty (so we don't overwrite if user edits)
    if (user.user_metadata?.full_name && !nameInput.value) {
      nameInput.value = user.user_metadata.full_name;
    }
    if (user.email && !emailInput.value) {
      emailInput.value = user.email;
    }
  }

  return user;
}

/* -------------------------------------------------------
   SUBMIT HANDLER
------------------------------------------------------- */
async function handleProfileSubmit(event) {
  event.preventDefault();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Session expired. Please login again.");
    window.location.href = "https://login.skreenit.com/login";
    return;
  }

  // ✅ FIX 3: Enforce HTTPS on Website
  let website = document.getElementById("company_website").value.trim();
  if (website && !website.match(/^https?:\/\//)) {
    website = `https://${website}`;
  }

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
    // ✅ FIX 4: Use backendPut to match @router.put("/profile")
    const res = await backendPut("/recruiter/profile", payload);
    await handleResponse(res);

    // Refresh user metadata to get updated onboarded status
    await new Promise(resolve => setTimeout(resolve, 500)); 
    const { data: { session } } = await supabase.auth.refreshSession();
    
    if (session?.user?.user_metadata?.onboarded) {
        localStorage.setItem("onboarded", "true");
    }

    alert("Profile saved! Redirecting to Recruiter Dashboard...");
    window.location.href = "https://dashboard.skreenit.com/recruiter-dashboard";

  } catch (err) {
    console.error("Profile save failed:", err);
    alert(`Failed to save profile: ${err.message}`);
  }
}

/* -------------------------------------------------------
   MAIN
------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  await ensureRecruiter();

  const form = document.getElementById("recruiterProfileForm");
  if (form) {
    form.addEventListener("submit", handleProfileSubmit);
  }

  // Logout Logic
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = "https://login.skreenit.com/login";
    });
  }
});