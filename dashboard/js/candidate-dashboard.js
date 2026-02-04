import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js';
import { backendGet, handleResponse } from 'https://auth.skreenit.com/assets/js/backend-client.js';
        const statApplied = document.getElementById("statApplied");
        const statPending = document.getElementById("statPending");
        const statInterview = document.getElementById("statInterview");
        const statAvailable = document.getElementById("statAvailable");

        const applicationsList = document.getElementById("applicationsList");
        const jobsList = document.getElementById("jobsList");

        // ---------------------------
        // AUTH CHECK
        // ---------------------------
        async function checkAuth() {
            try {
        // First check localStorage for role and onboarded status
        const storedRole = localStorage.getItem("skreenit_role");
        const storedOnboarded = localStorage.getItem("onboarded") === "true";
        
        const { data: { user }, error } = await supabase.auth.getUser();

          if (error ||!user) {
            console.log('No active session, redirecting to login');
            window.location.href = "https://login.skreenit.com/login.html";
            return;
            }

        const role = user.user_metadata?.role || storedRole;
        const onboarded = user.user_metadata?.onboarded || storedOnboarded;

        // Wrong role → send to correct dashboard
        if (user.user_metadata.role?.role) {
            localStorage.setItem("skreenit_role", user.user_metadata.role.role);
            localStorage.setItem("onboarded", user.user_metadata.onboarded);
        }
        //Chek role
        if(role !== "candidate") {
            console.log('Wrong role, redirecting to recruiter dashboard');
            window.location.href = "https://dashboard.skreenit.com/recruiter-dashboard.html";
            return;
        }

        // Not onboarded → send to onboarding form
        if (!onboarded) {
            console.log('Not onboarded, redirecting to onboarding form');
            window.location.href = "https://applicant.skreenit.com/detailed-application-form.html";
            return;
        }

        console.log('Onboarding Successful, loading dashboard');
        loadDashboard();
        } catch (error) {
            console.error('Error checking authentication:', error);
            window.location.href = "https://login.skreenit.com/login.html";
        }
        }
        // ---------------------------
        // LOAD DASHBOARD DATA
        // ---------------------------
        async function loadDashboard() {
            try {
                const response = await backendGet("/api/v1/applicant/dashboard");
                const data = await handleResponse(response);

                statApplied.textContent = data.applied_jobs;
                statPending.textContent = data.pending_jobs;
                statInterview.textContent = data.interview_pending;
                statAvailable.textContent = data.available_jobs;

                renderApplications(data.recent_applications);
                renderJobs(data.recent_jobs);

            } catch (error) {
                console.error("Dashboard load error:", error);
                applicationsList.innerHTML = "<p>Error loading applications.</p>";
                jobsList.innerHTML = "<p>Error loading jobs.</p>";
            }
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
                <div class="list-item">
                    <div class="item-title">${app.job_title}</div>
                    <div class="item-meta">Status: ${app.status}</div>
                    <a href="application-details.html?app_id=${app.id}" class="btn-primary">View Application</a>
                </div>
            `).join("");
        }

        // ---------------------------
        // RENDER JOBS
        // ---------------------------
        function renderJobs(jobs) {
            if (!jobs || jobs.length === 0) {
                jobsList.innerHTML = "<p>No recent jobs.</p>";
                return;
            }

            jobsList.innerHTML = jobs.map(job => `
                <div class="list-item">
                    <div class="item-title">${job.title}</div>
                    <div class="item-meta">${job.location} • ${job.job_type}</div>
                    <a href="job-details.html?job_id=${job.id}" class="btn-primary">View Job</a>
                </div>
            `).join("");
        }

        // ---------------------------
        // LOGOUT
        // ---------------------------
        document.getElementById("logoutBtn").addEventListener("click", async () => {
            await supabase.auth.signOut();
            window.location.href = "https://login.skreenit.com/login.html";
        });

        // INIT
        checkAuth();