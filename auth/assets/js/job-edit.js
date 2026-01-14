// job-edit.js
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

function getJobId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('job_id');
}

async function fetchJob(jobId) {
  const token = getToken();

  const res = await backendFetch(`/recruiter/jobs/${encodeURIComponent(jobId)}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to load job (${res.status})`);
  }

  return res.json();
}

async function updateJob(jobId, payload) {
  const token = getToken();

  const res = await backendFetch(`/recruiter/jobs/${encodeURIComponent(jobId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to update job (${res.status})`);
  }

  return res.json();
}

async function deleteJob(jobId) {
  const token = getToken();

  const res = await backendFetch(`/recruiter/jobs/${encodeURIComponent(jobId)}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to delete job (${res.status})`);
  }
}

async function initJobEditForm() {
  const form = document.getElementById('editJobForm');
  const deleteBtn = document.getElementById('deleteJobBtn');
  if (!form) return;

  const jobId = getJobId();
  if (!jobId) {
    alert('Missing job ID.');
    window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard.html';
    return;
  }

  const titleEl = document.getElementById('job_title');
  const locationEl = document.getElementById('job_location');
  const typeEl = document.getElementById('job_type');
  const salaryEl = document.getElementById('salary_range');
  const descEl = document.getElementById('job_description');
  const reqEl = document.getElementById('requirements');

  try {
    // Load existing job
    const data = await fetchJob(jobId);
    const job = data.job || data; // flexibly handle shape

    if (titleEl) titleEl.value = job.title || '';
    if (locationEl) locationEl.value = job.location || '';
    if (typeEl) typeEl.value = job.job_type || '';
    if (salaryEl) salaryEl.value = job.salary_range || '';
    if (descEl) descEl.value = job.description || '';
    if (reqEl) reqEl.value = job.requirements || '';
  } catch (err) {
    console.error('Failed to load job:', err);
    alert('Failed to load job details.');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

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
      await updateJob(jobId, payload);
      alert('Job updated successfully!');
      window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard.html';
    } catch (err) {
      console.error('Job update failed:', err);
      alert('Failed to update job. Please try again.');
    } finally {
      form.querySelector('button[type="submit"]').disabled = false;
    }
  });

  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this job?')) return;
      try {
        deleteBtn.disabled = true;
        await deleteJob(jobId);
        alert('Job deleted.');
        window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard.html';
      } catch (err) {
        console.error('Job delete failed:', err);
        alert('Failed to delete job. Please try again.');
      } finally {
        deleteBtn.disabled = false;
      }
    });
  }
}

(function main() {
  ensureRecruiter();
  initJobEditForm();
})();
