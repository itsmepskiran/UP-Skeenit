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
        console.log('🔍 checkAuth started');
        try {
            console.log('📡 Calling supabase.auth.getSession()...');
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
            console.log('📊 Session result:', { 
            hasSession: !!session, 
            hasUser: !!session?.user, 
            error: sessionError?.message || 'none'
         });

            if (sessionError) {
            console.error('❌ Session error:', sessionError);
            window.location.href = `https://login.skreenit.com/login?redirectTo=${encodeURIComponent(window.location.href)}`;
            return;
            }

            if (!session) {
            console.error('❌ No session object found');
            window.location.href = `https://login.skreenit.com/login?redirectTo=${encodeURIComponent(window.location.href)}`;
            return;
            }

            if (!session.user) {
            console.error('❌ Session exists but no user found');
            window.location.href = `https://login.skreenit.com/login?redirectTo=${encodeURIComponent(window.location.href)}`;
            return;
            }

            console.log('✅ Session found, user ID:', session.user.id);
            const user = session.user;
        
            console.log('📋 User metadata:', user.user_metadata);
        
            const role = user.user_metadata?.role || localStorage.getItem("skreenit_role");
            const onboarded = user.user_metadata?.onboarded !== undefined 
            ? user.user_metadata.onboarded 
            : localStorage.getItem("onboarded") === "true";

            console.log('🎭 Role determined:', role);
            console.log('✔️ Onboarded status:', onboarded);

            // Update localStorage
            if (user.user_metadata?.role) {
            console.log('💾 Updating localStorage with fresh data');
            localStorage.setItem("skreenit_role", user.user_metadata.role);
            localStorage.setItem("onboarded", user.user_metadata.onboarded?.toString() || 'false');
            localStorage.setItem("user_id", user.id);
        }

            // Check role
            const expectedRole = 'recruiter';
            console.log(`🔐 Checking role: expected="${expectedRole}", actual="${role}"`);
        
            if (role !== expectedRole) {
            console.log(`⚠️ Wrong role! Redirecting to correct dashboard`);
            window.location.href = "https://dashboard.skreenit.com/candidate-dashboard";
            return;
            }

            // Check if onboarded
            console.log('🔍 Checking onboarded status:', onboarded);
            if (onboarded === false || onboarded === "false") {
            console.log('⚠️ Not onboarded! Redirecting to onboarding form');
            const redirectURL = 'https://recruiter.skreenit.com/recruiter-profile';

            window.location.href = redirectURL;
            return;
            }

            console.log('🎉 All checks passed! Loading dashboard...');
            loadDashboard();
        
        } catch (error) {
            console.error('💥 CRITICAL ERROR in checkAuth:', error);
            console.error('Stack trace:', error.stack);
            window.location.href = `https://login.skreenit.com/login?redirectTo=${encodeURIComponent(window.location.href)}`;
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
                    <a href="https://dashboard.skreenit.com/application-details?app_id=${app.id}" class="btn-primary">View Application</a>
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