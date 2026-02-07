import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js?v=2';
// ✅ FIX: Import backendPut instead of backendPost
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

  // ✅ FIX: Auto-populate Contact Name & Email from Registration Data
  if (user) {
    const nameInput = document.getElementById("contact_name");
    const emailInput = document.getElementById("contact_email");

    // Only fill if empty (so we don't overwrite if user edits and reloads)
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

  // ✅ FIX: Enforce HTTPS on Website
  let website = document.getElementById("company_website").value.trim();
  if (website && !website.match(/^https?:\/\//)) {
    website = `https://${website}`;
  }

  const payload = {
    // Note: user_id is typically handled by backend from the token, 
    // but we can send it if the model requires it.
    company_name: document.getElementById("company_name").value.trim(),
    company_website: website || null,
    contact_name: document.getElementById("contact_name").value.trim(),
    contact_email: document.getElementById("contact_email").value.trim(),
    location: document.getElementById("location").value.trim() || null,
    about: document.getElementById("about").value.trim() || null,
  };

  try {
    // ✅ FIX: Changed backendPost to backendPut to match router @router.put("/profile")
    const res = await backendPut("/recruiter/profile", payload);
    await handleResponse(res);

    // Refresh user metadata to get updated onboarded status
    // The backend updates 'onboarded' to true upon success
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    // Force refresh session to get new metadata
    const { data: { session } } = await supabase.auth.refreshSession();
    
    if (session?.user?.user_metadata?.onboarded) {
        // Optional: Update local storage if your logic relies on it
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
      e.preventDefault(); // Extra safety
      await supabase.auth.signOut();
      window.location.href = "https://login.skreenit.com/login";
    });
  }
});