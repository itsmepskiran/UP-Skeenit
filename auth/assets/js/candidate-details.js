// candidate-details.js
import { backendFetch } from 'https://auth.skreenit.com/assets/js/backend-client.js';

function getToken() {
  return localStorage.getItem('skreenit_token') || '';
}

function ensureRecruiter() {
  const role = localStorage.getItem('skreenit_role');
  if (role !== 'recruiter') {
    window.location.href = 'https://login.skreenit.com/login.html';
  }
}

function getIds() {
  const params = new URLSearchParams(window.location.search);
  return {
    candidateId: params.get('candidate_id'),
    jobId: params.get('job_id')
  };
}

async function fetchCandidateDetails(candidateId, jobId) {
  const token = getToken();
  const query = jobId ? `?job_id=${encodeURIComponent(jobId)}` : '';
  const res = await backendFetch(`/recruiter/candidates/${encodeURIComponent(candidateId)}${query}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to load candidate (${res.status})`);
  }

  return res.json();
}

function renderCandidateDetails(container, data) {
  const c = data.candidate || data;
  const app = data.application || {};

  const name = c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown Candidate';
  const email = c.email || 'Not provided';
  const phone = c.phone || 'Not provided';
  const status = app.status || 'In Review';
  const resumeUrl = app.resume_url || c.resume_url || null;
  const skills = Array.isArray(c.skills) ? c.skills.join(', ') : (c.skills || '');
  const experience = c.total_experience || app.total_experience || 'Not specified';

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
        <p><strong>Experience:</strong> ${experience}</p>
        ${skills ? `<p><strong>Skills:</strong> ${skills}</p>` : ''}
      </div>

      <div class="details-section">
        <h3>Application</h3>
        ${app.applied_for ? `<p><strong>Applied For:</strong> ${app.applied_for}</p>` : ''}
        ${app.submitted_at ? `<p><strong>Submitted:</strong> ${new Date(app.submitted_at).toLocaleString()}</p>` : ''}
      </div>
    </div>

    <div class="details-section">
      <h3>Resume</h3>
      ${
        resumeUrl
          ? `<a href="${resumeUrl}" class="btn btn-secondary" target="_blank" rel="noopener">View Resume</a>`
          : '<p>No resume uploaded.</p>'
      }
    </div>
  `;
}

async function initCandidateDetails() {
  const { candidateId, jobId } = getIds();
  const container = document.getElementById('candidateDetails');
  if (!container) return;

  if (!candidateId) {
    container.innerHTML = '<p class="error-message">Missing candidate ID.</p>';
    return;
  }

  container.innerHTML = '<div class="loading">Loading candidate details...</div>';

  try {
    const data = await fetchCandidateDetails(candidateId, jobId);
    renderCandidateDetails(container, data);
  } catch (err) {
    console.error('Failed to load candidate details:', err);
    container.innerHTML = '<p class="error-message">Failed to load candidate details. Please try again.</p>';
  }
}

(function main() {
  ensureRecruiter();
  initCandidateDetails();
})();
