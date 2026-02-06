import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js?v=2';
import { backendGet, handleResponse } from 'https://auth.skreenit.com/assets/js/backend-client.js?v=2';
        const detailsBox = document.getElementById("applicationDetails");

        // ---------------------------
        // AUTH CHECK
        // ---------------------------
        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                window.location.href = "https://login.skreenit.com/login.html";
                return;
            }

            const role = user.user_metadata?.role;

            if (role !== "candidate") {
                window.location.href = "https://dashboard.skreenit.com/recruiter-dashboard.html";
                return;
            }

            loadApplicationDetails();
        }

        // ---------------------------
        // GET APPLICATION ID FROM URL
        // ---------------------------
        function getApplicationId() {
            const params = new URLSearchParams(window.location.search);
            return params.get("app_id");
        }

        // ---------------------------
        // LOAD APPLICATION DETAILS
        // ---------------------------
        async function loadApplicationDetails() {
            const appId = getApplicationId();

            if (!appId) {
                detailsBox.innerHTML = "<p>Invalid application ID.</p>";
                return;
            }

            try {
                const response = await backendGet(`/applicant/application/${appId}`);
                const data = await handleResponse(response);

                renderDetails(data);

            } catch (error) {
                console.error("Error loading application:", error);
                detailsBox.innerHTML = "<p>Error loading application details.</p>";
            }
        }

        // ---------------------------
        // RENDER DETAILS
        // ---------------------------
        function renderDetails(app) {
            detailsBox.innerHTML = `
                <div class="details-row">
                    <div class="details-label">Job Title</div>
                    <div class="details-value">${app.job_title}</div>
                </div>

                <div class="details-row">
                    <div class="details-label">Company</div>
                    <div class="details-value">${app.company_name}</div>
                </div>

                <div class="details-row">
                    <div class="details-label">Status</div>
                    <div class="details-value">${app.status}</div>
                </div>

                <h3 class="section-title">Timeline</h3>
                <div class="timeline-box">
                    ${app.timeline && app.timeline.length > 0
                        ? app.timeline.map(item => `
                            <div class="timeline-item">
                                <strong>${item.date}</strong> – ${item.description}
                            </div>
                          `).join("")
                        : "<p>No timeline updates yet.</p>"
                    }
                </div>

                <h3 class="section-title">Interview</h3>
                <div class="details-row">
                    <div class="details-label">Interview Date</div>
                    <div class="details-value">${app.interview_date || "Not scheduled"}</div>
                </div>

                <div class="details-row">
                    <div class="details-label">Notes</div>
                    <div class="details-value">${app.notes || "No notes available"}</div>
                </div>

                <a href="https://dashboard.skreenit.com/candidate-dashboard.html" class="btn-primary">Back to Dashboard</a>
            `;
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