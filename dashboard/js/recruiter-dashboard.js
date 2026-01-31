import { supabase } from '/auth/assets/js/supabase-config.js';
import { backendGet, handleResponse } from '/auth/assets/js/backend-client.js';

        const jobsList = document.getElementById("jobsList");
        const applicationsList = document.getElementById("applicationsList");

        const statTotalJobs = document.getElementById("statTotalJobs");
        const statTotalApplications = document.getElementById("statTotalApplications");
        const statShortlisted = document.getElementById("statShortlisted");
        const statPending = document.getElementById("statPending");

        // ---------------------------
        // AUTH CHECK
        // ---------------------------
        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                window.location.href = "https://login.skreenit.com/login";
                return;
            }

            const role = user.user_metadata?.role;

            if (role !== "recruiter") {
                window.location.href = "https://dashboard.skreenit.com/candidate-dashboard";
                return;
            }

            loadDashboard();
        }

        // ---------------------------
        // LOAD DASHBOARD DATA
        // ---------------------------
        async function loadDashboard() {
            try {
                const response = await backendGet("/api/v1/recruiter/dashboard");
                const data = await handleResponse(response);

                // Stats
                statTotalJobs.textContent = data.total_jobs;
                statTotalApplications.textContent = data.total_applications;
                statShortlisted.textContent = data.shortlisted;
                statPending.textContent = data.pending_review;

                // Jobs
                renderJobs(data.recent_jobs);

                // Applications
                renderApplications(data.recent_applications);

            } catch (error) {
                console.error("Dashboard load error:", error);
                jobsList.innerHTML = "<p>Error loading dashboard.</p>";
                applicationsList.innerHTML = "<p>Error loading dashboard.</p>";
            }
        }

        // ---------------------------
        // RENDER JOBS
        // ---------------------------
        function renderJobs(jobs) {
            if (!jobs || jobs.length === 0) {
                jobsList.innerHTML = "<p>No jobs posted yet.</p>";
                return;
            }

            jobsList.innerHTML = jobs.map(job => `
                <div class="job-item">
                    <div class="job-title">${job.title}</div>
                    <div class="job-meta">${job.location} • ${job.job_type}</div>
                    <a href="job-details?job_id=${job.id}" class="btn-primary">View Job</a>
                </div>
            `).join("");
        }

        // ---------------------------
        // RENDER APPLICATIONS
        // ---------------------------
        function renderApplications(apps) {
            if (!apps || apps.length === 0) {
                applicationsList.innerHTML = "<p>No recent applications.</p>";
                return;
            }

            applicationsList.innerHTML = apps.map(app => `
                <div class="application-item">
                    <div class="job-title">${app.candidate_name}</div>
                    <div class="job-meta">Applied for: ${app.job_title}</div>
                    <a href="application-details.html?app_id=${app.id}" class="btn-primary">View Application</a>
                </div>
            `).join("");
        }

        // ---------------------------
        // LOGOUT
        // ---------------------------
        document.getElementById("logoutBtn").addEventListener("click", async () => {
            await supabase.auth.signOut();
            window.location.href = "https://login.skreenit.com/login";
        });

        // INIT
        checkAuth();
