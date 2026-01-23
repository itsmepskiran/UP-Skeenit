// recruiter-profile.js
import { supabase } from './supabase-config.js';
import { backendFetch } from './backend-client.js';

document.addEventListener('DOMContentLoaded', () => {
  ensureRecruiter();
  loadProfile();
  bindForm();
});

function ensureRecruiter() {
  const role = localStorage.getItem('skreenit_role');
  if (role !== 'recruiter') {
    window.location.href = 'https://login.skreenit.com/login.html';
  }
}

async function loadProfile() {
  const nameEl = document.getElementById('full_name');
  const companyEl = document.getElementById('company_name');
  const websiteEl = document.getElementById('company_website');
  const aboutEl = document.getElementById('company_about');

  try {
    const token = localStorage.getItem('skreenit_token');
    const res = await backendFetch('/recruiter/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    const profile = data.profile || {};

    nameEl.value = profile.full_name || '';
    companyEl.value = profile.company_name || '';
    websiteEl.value = profile.company_website || '';
    aboutEl.value = profile.company_about || '';

  } catch (err) {
    console.error('Failed to load recruiter profile:', err);
    alert('Failed to load profile');
  }
}

function bindForm() {
  const form = document.getElementById('recruiterProfileForm');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      full_name: form.full_name.value.trim(),
      company_name: form.company_name.value.trim(),
      company_website: form.company_website.value.trim(),
      company_about: form.company_about.value.trim()
    };

    submitBtn.disabled = true;

    try {
      const token = localStorage.getItem('skreenit_token');
      const res = await backendFetch('/recruiter/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Update failed');

      alert('Profile updated successfully!');
      window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard.html';

    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      submitBtn.disabled = false;
    }
  });
}
