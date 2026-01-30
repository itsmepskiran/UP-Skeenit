// auth/assets/js/auth-pages.js

import { supabase } from './supabase-config.js';
import { backendUrl, handleResponse } from './backend-client.js';

/* -------------------------------------------------------
   AUTH STATE LISTENER
------------------------------------------------------- */
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN') {
    await persistSessionToLocalStorage();
    console.log('User signed in, session persisted.');
  } else if (event === 'PASSWORD_RECOVERY') {
    console.log('Password recovery session started.');
  }
});

/* -------------------------------------------------------
   SESSION PERSISTENCE
------------------------------------------------------- */
async function persistSessionToLocalStorage() {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user || null;

    const role = user?.user_metadata?.role;
    if (role) localStorage.setItem('skreenit_role', role);

  } catch (e) {
    console.warn('Failed to persist role to localStorage', e);
  }
}

/* -------------------------------------------------------
   EMAIL CONFIRMATION (Option 2 — Supabase handles everything)
------------------------------------------------------- */
async function handleEmailConfirmation() {
  const messageEl = document.getElementById("message");

  const show = (text, type = "") => {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = type ? `message ${type}` : "message";
  };

  try {
    show("Confirming your email...");

    // Supabase automatically:
    // - extracts token
    // - extracts email
    // - verifies OTP
    // - confirms the user
    // - creates a session
    const { data, error } = await supabase.auth.getSessionFromUrl();

    if (error) {
      show("Invalid or expired confirmation link", "error");
      return;
    }

    show("Email confirmed successfully! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "https://login.skreenit.com/login?confirmed=true";
    }, 1500);

  } catch (err) {
    console.error("Email confirmation error:", err);
    show("Something went wrong while confirming your email", "error");
  }
}

document.addEventListener("DOMContentLoaded", handleEmailConfirmation);

/* -------------------------------------------------------
   ROLE-BASED REDIRECT
------------------------------------------------------- */
export async function redirectByRole(defaultUrl = 'https://dashboard.skreenit.com/candidate-dashboard') {
  const role = localStorage.getItem('skreenit_role');

  try {
    if (role === 'recruiter') {
      window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard';
    } else if (role === 'candidate') {
      window.location.href = 'https://dashboard.skreenit.com/candidate-dashboard';
    } else {
      window.location.href = defaultUrl;
    }
  } catch (error) {
    console.error('Error during role-based redirect:', error);
    window.location.href = defaultUrl;
  }
}

/* -------------------------------------------------------
   LOGIN HANDLER
------------------------------------------------------- */
export async function handleLoginSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn?.textContent || 'Login';

  if (submitBtn) {
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;
  }

  try {
    const fd = new FormData(form);
    const email = (fd.get('email') || '').trim();
    const password = (fd.get('password') || '').trim();

    if (!email || !password) throw new Error('Email and password are required');

    // 1️⃣ Login
    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw new Error(error.message);

    // 2️⃣ ⭐ Write shared cookie session for ALL subdomains
    await supabase.auth.setSession({
      access_token: loginData.session.access_token,
      refresh_token: loginData.session.refresh_token
    });

    // 3️⃣ Store role only
    await persistSessionToLocalStorage();

    // 4️⃣ Redirect
    await redirectByRole();

  } catch (err) {
    console.error('Login error:', err);
    notify(err.message || 'Login failed. Please try again.', 'error');

  } finally {
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
}

/* -------------------------------------------------------
   UPDATE PASSWORD HANDLER
------------------------------------------------------- */
export async function handleUpdatePasswordSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn?.textContent || 'Update Password';

  if (submitBtn) {
    submitBtn.textContent = 'Updating...';
    submitBtn.disabled = true;
  }

  try {
    const fd = new FormData(form);
    const new_password = (fd.get('new_password') || '').trim();
    const confirm_password = (fd.get('confirm_password') || '').trim();

    if (new_password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (new_password !== confirm_password) throw new Error('Passwords do not match.');

    let token = '';
    const hash = window.location.hash;

    if (hash && hash.length > 1) {
      const params = new URLSearchParams(hash.substring(1));
      token = params.get('access_token');
    }

    if (!token) {
      const urlParams = new URLSearchParams(window.location.search);
      token = urlParams.get('token');
    }

    if (!token) throw new Error('Missing access token. Please use the link from your email.');

    const formData = new FormData();
    formData.append('new_password', new_password);

    const response = await fetch(`${backendUrl()}/auth/update-password`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    const result = await handleResponse(response);
    if (!result || result.ok === false) throw new Error(result?.error || 'Failed to update password.');

    notify('Password updated successfully! Redirecting to login...', 'success');
    setTimeout(() => {
      window.location.href = 'https://login.skreenit.com/login';
    }, 3000);

  } catch (err) {
    console.error('Update password error:', err);
    notify(err.message || 'Failed to update password. Please try again.', 'error');

  } finally {
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
}

/* -------------------------------------------------------
   NOTIFY HELPER
------------------------------------------------------- */
export function notify(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}