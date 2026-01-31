import { supabase } from '/auth/assets/js/supabase-config.js';
import { backendGet, backendPost, handleResponse } from '/auth/assets/js/backend-client.js';

const jobBox = document.getElementById("jobDetails");
const applyBtn = document.getElementById("applyBtn");

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

  if (role !== "candidate") {
    window.location.href = "https://dashboard.skreenit.com/recruiter-dashboard";
    return;
  }

  loadJobDetails();
}

// ---------------------------
// GET JOB ID FROM URL
// ---------------------------
function getJobId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("job_id");
}

// ---------------------------
// LOAD JOB DETAILS
// ---------------------------
async function loadJobDetails() {
  const jobId = getJobId();

  if (!jobId) {
    jobBox.innerHTML = "<p>Invalid job ID.</p>";
    return;
  }

  try {
    const response = await backendGet(`/api/v1/jobs/${jobId}`);
    const job = await handleResponse(response);

    renderJob(job);

  } catch (error) {
    console.error("Error loading job:", error);
    jobBox.innerHTML = "<p>Error loading job details.</p>";
  }
}

// ---------------------------
// RENDER JOB DETAILS
// ---------------------------
function renderJob(job) {
  jobBox.innerHTML = `
    <h2>${job.title}</h2>

    <div class="details-row">
      <div class="details-label">Company</div>
      <div class="details-value">${job.company_name}</div>
    </div>

    <div class="details-row">
      <div class="details-label">Location</div>
      <div class="details-value">${job.location}</div>
    </div>

    <div class="details-row">
      <div class="details-label">Job Type</div>
      <div class="details-value">${job.job_type}</div>
    </div>

    <h3 class="section-title">Description</h3>
    <p>${job.description}</p>

    <h3 class="section-title">Requirements</h3>
    <ul>
      ${job.requirements?.map(req => `<li>${req}</li>`).join("") || "<li>No requirements listed</li>"}
    </ul>
  `;
}

// ---------------------------
// APPLY TO JOB
// ---------------------------
applyBtn.addEventListener("click", async () => {
  const jobId = getJobId();

  try {
    applyBtn.disabled = true;
    applyBtn.textContent = "Applying...";

    const response = await backendPost(`/api/v1/applicant/apply/${jobId}`);
    const result = await handleResponse(response);

    if (result.ok) {
      alert("Application submitted successfully!");
      window.location.href = "https://dashboard.skreenit.com/candidate-dashboard";
    } else {
      alert(result.error || "Failed to apply.");
    }

  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    applyBtn.disabled = false;
    applyBtn.textContent = "Apply Now";
  }
});

// ---------------------------
// LOGOUT
// ---------------------------
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "https://login.skreenit.com/login";
});

// INIT
checkAuth();