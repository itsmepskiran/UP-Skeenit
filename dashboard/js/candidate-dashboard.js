import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js';
import { backendGet, handleResponse } from 'https://auth.skreenit.com/assets/js/backend-client.js';
import { loadDashboard } from './recruiter-dashboard';
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