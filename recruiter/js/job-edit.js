import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js';
import {
      backendGet,
      backendPut,
      backendDelete,
      handleResponse
} from 'https://auth.skreenit.com/assets/js/backend-client.js';

    // --- Role check ---
    async function ensureRecruiter() {
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.user_metadata?.role;

      if (role !== "recruiter") {
        window.location.href = "https://login.skreenit.com/login.html";
        return;
      }

      const nameEl = document.querySelector(".user-name");
      if (nameEl) nameEl.textContent = user?.email || "Recruiter";
    }

    // --- Get job_id from URL ---
    function getJobId() {
      const params = new URLSearchParams(window.location.search);
      return params.get("job_id");
    }

    // --- API helpers ---
    async function loadJob(jobId) {
      const res = await backendGet(`/recruiter/jobs/${encodeURIComponent(jobId)}`);
      return await handleResponse(res);
    }

    async function updateJob(jobId, payload) {
      const res = await backendPut(`/recruiter/jobs/${encodeURIComponent(jobId)}`, payload);
      return await handleResponse(res);
    }

    async function deleteJob(jobId) {
      const res = await backendDelete(`/recruiter/jobs/${encodeURIComponent(jobId)}`);
      return await handleResponse(res);
    }

    // --- Init form ---
    async function initJobEditForm() {
      const form = document.getElementById("editJobForm");
      const deleteBtn = document.getElementById("deleteJobBtn");
      if (!form) return;

      const jobId = getJobId();
      if (!jobId) {
        alert("Missing job ID.");
        window.location.href = "https://recruiter.skreenit.com/job-create.html";
        return;
      }

      const titleEl = document.getElementById("job_title");
      const locationEl = document.getElementById("job_location");
      const typeEl = document.getElementById("job_type");
      const salaryEl = document.getElementById("salary_range");
      const descEl = document.getElementById("job_description");
      const reqEl = document.getElementById("requirements");

      // Load existing job
      try {
        const job = await loadJob(jobId);

        if (titleEl) titleEl.value = job.title || "";
        if (locationEl) locationEl.value = job.location || "";
        if (typeEl) typeEl.value = job.job_type || "";
        if (salaryEl) salaryEl.value = job.salary_range || "";
        if (descEl) descEl.value = job.description || "";
        if (reqEl) reqEl.value = job.requirements || "";
      } catch (err) {
        console.error("Failed to load job:", err);
        alert("Failed to load job details.");
      }

      // Submit handler
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
          title: titleEl.value.trim(),
          location: locationEl.value.trim(),
          job_type: typeEl.value,
          salary_range: salaryEl.value.trim() || null,
          description: descEl.value.trim(),
          requirements: reqEl.value.trim(),
          skills: [] // optional, not in UI
        };

        if (!payload.title || !payload.location || !payload.job_type || !payload.description || !payload.requirements) {
          alert("Please fill all required fields.");
          return;
        }

        const submitBtn = form.querySelector("button[type='submit']");
        submitBtn.disabled = true;

        try {
          await updateJob(jobId, payload);
          alert("Job updated successfully!");
          window.location.href = "https://dashboard.skreenit.com/recruiter-dashboard.html";
        } catch (err) {
          console.error("Job update failed:", err);
          alert("Failed to update job. Please try again.");
        } finally {
          submitBtn.disabled = false;
        }
      });

      // Delete handler
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          if (!confirm("Are you sure you want to delete this job?")) return;

          deleteBtn.disabled = true;

          try {
            await deleteJob(jobId);
            alert("Job deleted.");
            window.location.href = "https://dashboard.skreenit.com/recruiter-dashboard.html";
          } catch (err) {
            console.error("Job delete failed:", err);
            alert("Failed to delete job. Please try again.");
          } finally {
            deleteBtn.disabled = false;
          }
        });
      }
    }

    // --- Logout ---
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "https://login.skreenit.com/login.html";
      });
    }

    // --- Main ---
    document.addEventListener("DOMContentLoaded", async () => {
      await ensureRecruiter();
      await initJobEditForm();
    });