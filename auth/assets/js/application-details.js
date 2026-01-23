// application-details.js
import { backendFetch } from 'https://auth.skreenit.com/assets/js/backend-client.js';

function getToken() {
  return localStorage.getItem('skreenit_token') || '';
}

function ensureCandidate() {
  const role = localStorage.getItem('skreenit_role');
  if (role !== 'candidate') {
    window.location.href = 'https://login.skreenit.com/login.html';
  }
}

function getApplicationId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('application_id');
}

async function fetchApplicationDetails(applicationId) {
  const token = getToken();

  const res = await backendFetch(`/applications/${encodeURIComponent(applicationId)}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to load application (${res.status})`);
  }

  return res.json();
}

function renderTimeline(timeline = []) {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return '<p>No timeline events yet.</p>';
  }

  return `
    <ul class="timeline">
      ${timeline
        .map(
          (t) => `
          <li class="timeline-item">
            <div class="timeline-date">${t.date ? new Date(t.date).toLocaleString() : ''}</div>
            <div class="timeline-content">
              <strong>${t.title || 'Update'}</strong>
              ${t.description ? `<p>${t.description}</p>` : ''}
            </div>
          </li>
        `
        )
        .join('')}
    </ul>
  `;
}

function renderApplicationDetails(container, data) {
  const app = data;
  const job = data.job || {};

  const status = app.status || 'In Review';
  const jobTitle = job.title || 'Job';
  const company = job.company_name || job.company || 'Company';
  const appliedAt = app.applied_at ? new Date(app.applied_at).toLocaleString() : 'Not available';
  const timelineHtml = renderTimeline(app.timeline || []);

  container.innerHTML = `
    <div class="details-header">
      <div>
        <h2>${jobTitle}</h2>
        <p>${company}</p>
      </div>
      <div class="badge badge-soft-primary">${status}</div>
    </div>

    <div class="details-grid">
      <div class="details-section">
        <h3>Application Summary</h3>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Applied on:</strong> ${appliedAt}</p>
      </div>
    </div>

    <div class="details-section">
      <h3>Timeline</h3>
      ${timelineHtml}
    </div>
  `;
}

async function initApplicationDetails() {
  const applicationId = getApplicationId();
  const container = document.getElementById('applicationDetails');
  if (!container) return;

  if (!applicationId) {
    container.innerHTML = '<p class="error-message">Missing application ID.</p>';
    return;
  }

  container.innerHTML = '<div class="loading">Loading application details...</div>';

  try {
    const data = await fetchApplicationDetails(applicationId);
    renderApplicationDetails(container, data);
  } catch (err) {
    console.error('Failed to load application details:', err);
    container.innerHTML = '<p class="error-message">Failed to load application details. Please try again.</p>';
  }
}

(function main() {
  ensureCandidate();
  initApplicationDetails();
})();
