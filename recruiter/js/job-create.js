import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js?v=2';
import { backendPost, handleResponse } from 'https://auth.skreenit.com/assets/js/backend-client.js?v=2';
    /* -------------------------------------------------------
       ROLE CHECK
    ------------------------------------------------------- */
    async function ensureRecruiter() {
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.user_metadata?.role;

      if (role !== "recruiter") {
        window.location.href = "https://login.skreenit.com/login.html";
      }

      // Update sidebar user info
      document.querySelector(".user-name").textContent = user?.email || "Recruiter";
    }

    /* -------------------------------------------------------
       SUBMIT HANDLER
    ------------------------------------------------------- */
    async function handleJobCreate(event) {
      event.preventDefault();

      const title = document.getElementById("job_title").value.trim();
      const location = document.getElementById("job_location").value.trim();
      const job_type = document.getElementById("job_type").value;
      const salary_range = document.getElementById("salary_range").value.trim() || null;
      const description = document.getElementById("job_description").value.trim();
      const requirements = document.getElementById("requirements").value.trim();

      if (!title || !location || !job_type || !description || !requirements) {
        alert("Please fill all required fields.");
        return;
      }

      const payload = {
        title,
        location,
        job_type,
        salary_range,
        description,
        requirements,
        skills: [] // You can add a skills field later if needed
      };

      const submitBtn = event.target.querySelector("button[type='submit']");
      submitBtn.disabled = true;

      try {
        const res = await backendPost("/recruiter/jobs", payload);
        await handleResponse(res);

        alert("Job created successfully!");
        window.location.href = "https://dashboard.skreenit.com/job-details.html";

      } catch (err) {
        console.error("Job create failed:", err);
        alert("Failed to create job. Please try again.");
      } finally {
        submitBtn.disabled = false;
      }
    }

    /* -------------------------------------------------------
       LOGOUT
    ------------------------------------------------------- */
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "https://login.skreenit.com/login.html";
    });

    /* -------------------------------------------------------
       MAIN
    ------------------------------------------------------- */
    document.addEventListener("DOMContentLoaded", async () => {
      await ensureRecruiter();
      document.getElementById("createJobForm").addEventListener("submit", handleJobCreate);
    });