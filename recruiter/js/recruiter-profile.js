import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js?v=2';
import { backendPost, handleResponse } from 'https://auth.skreenit.com/assets/js/backend-client.js?v=2';

    /* -------------------------------------------------------
       ROLE CHECK
    ------------------------------------------------------- */
    async function ensureRecruiter() {
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.user_metadata?.role;

      if (role !== "recruiter") {
        window.location.href = "https://login.skreenit.com/login";
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

      const payload = {
        user_id: user.id,
        company_name: document.getElementById("company_name").value.trim(),
        company_website: document.getElementById("company_website").value.trim() || null,
        contact_name: document.getElementById("contact_name").value.trim(),
        contact_email: document.getElementById("contact_email").value.trim(),
        location: document.getElementById("location").value.trim() || null,
        about: document.getElementById("about").value.trim() || null,
      };

      try {
        const res = await backendPost("/recruiter/profile", payload);
        await handleResponse(res);

        // Refresh user metadata to get updated onboarded status
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for backend update
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        if (updatedUser?.user_metadata?.onboarded) {
            localStorage.setItem("onboarded", "true");
        }

        alert("Profile saved! Redirecting to Recruiter Dashboard...");
        window.location.href = "https://dashboard.skreenit.com/recruiter-dashboard";

      } catch (err) {
        console.error("Profile save failed:", err);
        alert("Failed to save profile. Please try again.");
      }
    }

    /* -------------------------------------------------------
       MAIN
    ------------------------------------------------------- */
    document.addEventListener("DOMContentLoaded", async () => {
      await ensureRecruiter();

      document
        .getElementById("recruiterProfileForm")
        .addEventListener("submit", handleProfileSubmit);
    });