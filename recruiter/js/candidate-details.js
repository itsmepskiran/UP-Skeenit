import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js';
import { backendGet, handleResponse } from 'https://auth.skreenit.com/assets/js/backend-client.js';

    /* -------------------------------------------------------
       ROLE CHECK
    ------------------------------------------------------- */
    async function ensureRecruiter() {
      const { data: { user } } = await supabase.auth.getUser();
      const role = user?.user_metadata?.role;

      if (role !== "recruiter") {
        window.location.href = "https://login.skreenit.com/login";
      }

      // Update sidebar user info
      document.querySelector(".user-name").textContent = user?.email || "Recruiter";
    }

    /* -------------------------------------------------------
       GET URL PARAMS
    ------------------------------------------------------- */
    function getIds() {
      const params = new URLSearchParams(window.location.search);
      return {
        candidateId: params.get("candidate_id"),
        jobId: params.get("job_id")
      };
    }

    /* -------------------------------------------------------
       FETCH CANDIDATE DETAILS
    ------------------------------------------------------- */
    async function fetchCandidateDetails(candidateId, jobId) {
      const query =
        `?candidate_id=${encodeURIComponent(candidateId)}` +
        (jobId ? `&job_id=${encodeURIComponent(jobId)}` : "");

      const res = await backendGet(`/recruiter/candidate-details${query}`);
      return await handleResponse(res);
    }

    /* -------------------------------------------------------
       RENDER CANDIDATE DETAILS
    ------------------------------------------------------- */
    function renderCandidateDetails(container, data) {
      const profile = data.profile || {};
      const app = data.application || {};
      const skills = data.skills || [];
      const experience = data.experience || [];

      const name = profile.full_name || "Unknown Candidate";
      const email = profile.email || "Not provided";
      const phone = profile.phone || "Not provided";
      const status = app.status || "In Review";
      const resumeUrl = profile.resume_url || null;

      container.innerHTML = `
        <div class="details-header">
          <div>
            <h2>${name}</h2>
            <p>${email} • ${phone}</p>
          </div>
          <div class="badge badge-soft-primary">${status}</div>
        </div>

        <div class="details-grid">
          <div class="details-section">
            <h3>Profile</h3>
            ${experience.length ? `<p><strong>Experience:</strong> ${experience.length} entries</p>` : ""}
            ${skills.length ? `<p><strong>Skills:</strong> ${skills.map(s => s.skill_name).join(", ")}</p>` : ""}
          </div>

          <div class="details-section">
            <h3>Application</h3>
            ${app.job_title ? `<p><strong>Applied For:</strong> ${app.job_title}</p>` : ""}
            ${app.applied_at ? `<p><strong>Submitted:</strong> ${new Date(app.applied_at).toLocaleString()}</p>` : ""}
          </div>
        </div>

        <div class="details-section">
          <h3>Resume</h3>
          ${
            resumeUrl
              ? `<a href="${resumeUrl}" class="btn btn-secondary" target="_blank" rel="noopener">View Resume</a>`
              : "<p>No resume uploaded.</p>"
          }
        </div>
      `;
    }

    /* -------------------------------------------------------
       INIT PAGE
    ------------------------------------------------------- */
    async function initCandidateDetails() {
      const container = document.getElementById("candidateDetails");
      const { candidateId, jobId } = getIds();

      if (!candidateId) {
        container.innerHTML = '<p class="error-message">Missing candidate ID.</p>';
        return;
      }

      container.innerHTML = '<div class="loading">Loading candidate details...</div>';

      try {
        const data = await fetchCandidateDetails(candidateId, jobId);
        renderCandidateDetails(container, data);
      } catch (err) {
        console.error("Failed to load candidate details:", err);
        container.innerHTML =
          '<p class="error-message">Failed to load candidate details. Please try again.</p>';
      }
    }

    /* -------------------------------------------------------
       LOGOUT
    ------------------------------------------------------- */
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "https://login.skreenit.com/login";
    });

    /* -------------------------------------------------------
       MAIN
    ------------------------------------------------------- */
    document.addEventListener("DOMContentLoaded", async () => {
      await ensureRecruiter();
      await initCandidateDetails();
    });
