// job-create.js
import { backendFetch } from './backend-client.js';

function ensureRecruiter() {
  const role = localStorage.getItem('skreenit_role');
  if (role !== 'recruiter') {
    window.location.href = 'https://login.skreenit.com/login.html';
  }
}

async function createJob(payload) {
  const token = localStorage.getItem('skreenit_token') || '';

  const res = await backendFetch('/recruiter/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Failed to create job (${res.status})`);
  }

  return res.json();
}

function initJobCreateForm() {
  const form = document.getElementById('createJobForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('job_title')?.value.trim();
    const location = document.getElementById('job_location')?.value.trim();
    const job_type = document.getElementById('job_type')?.value;
    const salary_range = document.getElementById('salary_range')?.value.trim() || null;
    const description = document.getElementById('job_description')?.value.trim();
    const requirements = document.getElementById('requirements')?.value.trim();
    const skillsRaw = document.getElementById('job_skills')?.value.trim() || '';

    if (!title || !location || !job_type || !description || !requirements) {
      alert('Please fill all required fields.');
      return;
    }

    const skills = skillsRaw
      ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const payload = {
      title,
      location,
      job_type,
      salary_range,
      description,
      requirements,
      skills
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      await createJob(payload);
      alert('Job created successfully!');
      window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard.html';
    } catch (err) {
      console.error('Job create failed:', err);
      alert('Failed to create job. Please try again.');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

(function main() {
  ensureRecruiter();
  initJobCreateForm();
})();
