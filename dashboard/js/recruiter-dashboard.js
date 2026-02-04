import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js';
import { backendGet, handleResponse } from 'https://auth.skreenit.com/assets/js/backend-client.js';

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
            try {

            // Current user session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            // If no user session, redirect to login
            if (sessionError || !session?.user) {
                console.error("No active session, redirecting to login");
                window.location.href = `https://login.skreenit.com/login.html?redirectTo=${encodeURIComponent(window.location.href)}`;
                return;
            }
            // Get user data
            const user = session.user;
            const role = user.user_metadata?.role || localStorage.getItem("skreenit_role");
            const onboarded = user.user_metadata?.onboarded !== undefined
            ? user.user_metadata.onboarded
            : localStorage.getItem("onboarded") === "true";

            //Store in local storage
            if(user.user_metadata?.role){
                localStorage.setItem("skreenit_role", user.user_metadata.role);
                localStorage.setItem("onboarded", user.user_metadata.onboarded?.toString());
                localStorage.setItem("user_id", user.id);
            }

            // Check role
            const expectedRole = 'candidate';
            if (role !== expectedRole) {
                console.log(`Wrong role selected, redirecting to ${expectedRole}`);
                window.location.href = `https://dashboard.skreenit.com/${expectedRole}-dashboard.html`;
                return;
            }
            // Check if onboarded
            if (onboarded === false || onboarded === "false") {
                console.log('User is not onboarded, redirecting to onboarding form');
                const redirectURL = expectedRole === 'candidate'
                ? 'https://applicant.skreenit.com/detailed-application-form.html'
                : 'https://recruiter.skreenit.com/recruiter-profile.html';
                window.location.href = redirectURL;
                return;
            }
            //Authentication Successful
            console.log('Authentication successful, loading dashboard');
            loadDashboard();
            } catch (error) {
            console.error('Authentication failed:', error);
            window.location.href = `https://login.skreenit.com/login.html?redirectTo=${encodeURIComponent(window.location.href)}`;
            }
        }
        // ---------------------------
        // LOAD DASHBOARD DATA
        // ---------------------------
        export async function loadDashboard() {
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
            window.location.href = "https://login.skreenit.com/login.html";
        });
        // INIT
        checkAuth();