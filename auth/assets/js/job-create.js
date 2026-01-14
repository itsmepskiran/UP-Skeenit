// job-create.js
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

async function createJob(payload) {
  const token = getToken();

  const res = await backendFetch('/recruiter/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create job (${res.status})`);
  }

  return res.json();
}

function initJobCreateForm() {
  const form = document.getElementById('createJobForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titleEl = document.getElementById('job_title');
    const locationEl = document.getElementById('job_location');
    const typeEl = document.getElementById('job_type');
    const salaryEl = document.getElementById('salary_range');
    const descEl = document.getElementById('job_description');
    const reqEl = document.getElementById('requirements');

    if (!titleEl || !locationEl || !typeEl || !descEl || !reqEl) return;

    const payload = {
      title: titleEl.value.trim(),
      location: locationEl.value.trim(),
      job_type: typeEl.value,
      salary_range: salaryEl?.value?.trim() || null,
      description: descEl.value.trim(),
      requirements: reqEl.value.trim()
    };

    if (!payload.title || !payload.location || !payload.job_type || !payload.description || !payload.requirements) {
      alert('Please fill all required fields.');
      return;
    }

    try {
      form.querySelector('button[type="submit"]').disabled = true;
      await createJob(payload);
      alert('Job created successfully!');
      window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard.html';
    } catch (err) {
      console.error('Job create failed:', err);
      alert('Failed to create job. Please try again.');
    } finally {
      form.querySelector('button[type="submit"]').disabled = false;
    }
  });
}

(function main() {
  ensureRecruiter();
  initJobCreateForm();
})();
