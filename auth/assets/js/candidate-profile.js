// candidate-profile.js
import { supabase } from './supabase-config.js';
import { backendFetch } from './backend-client.js';

document.addEventListener('DOMContentLoaded', () => {
  ensureCandidate();
  loadProfile();
  bindProfileForm();
  bindResumeUpload();
});

function ensureCandidate() {
  const role = localStorage.getItem('skreenit_role');
  if (role !== 'candidate') {
    window.location.href = 'https://login.skreenit.com/login.html';
  }
}

async function loadProfile() {
  const nameEl = document.getElementById('full_name');
  const phoneEl = document.getElementById('phone');
  const locationEl = document.getElementById('location');

  try {
    const { data, error } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', localStorage.getItem('skreenit_user_id'))
      .single();

    if (error) throw error;

    nameEl.value = data.full_name || '';
    phoneEl.value = data.phone || '';
    locationEl.value = data.location || '';

  } catch (err) {
    console.error('Failed to load candidate profile:', err);
    alert('Failed to load profile');
  }
}

function bindProfileForm() {
  const form = document.getElementById('candidateProfileForm');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      full_name: form.full_name.value.trim(),
      phone: form.phone.value.trim(),
      location: form.location.value.trim()
    };

    submitBtn.disabled = true;

    try {
      const { error } = await supabase
        .from('candidate_profiles')
        .update(payload)
        .eq('user_id', localStorage.getItem('skreenit_user_id'));

      if (error) throw error;

      alert('Profile updated successfully!');
      window.location.href = 'https://dashboard.skreenit.com/candidate-dashboard.html';

    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function bindResumeUpload() {
  const form = document.getElementById('resumeUploadForm');
  const fileInput = document.getElementById('resumeFile');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = fileInput.files?.[0];
    if (!file) return alert('Please select a file');

    const fd = new FormData();
    fd.append('resume', file);

    try {
      const token = localStorage.getItem('skreenit_token');
      const res = await backendFetch('/candidate/resume', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });

      if (!res.ok) throw new Error('Upload failed');

      alert('Resume uploaded successfully!');

    } catch (err) {
      alert(err.message || 'Failed to upload resume');
    }
  });
}
