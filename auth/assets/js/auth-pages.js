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
    const { data: sessionData } = await supabase.auth.getSession();
    const { data: userData } = await supabase.auth.getUser();

    const access_token = sessionData?.session?.access_token || '';
    const refresh_token = sessionData?.session?.refresh_token || '';
    const user = userData?.user || null;

    if (access_token) localStorage.setItem('skreenit_token', access_token);
    if (refresh_token) localStorage.setItem('skreenit_refresh_token', refresh_token);
    if (user?.id) localStorage.setItem('skreenit_user_id', user.id);

    const role = user?.user_metadata?.role;
    if (role) localStorage.setItem('skreenit_role', role);

  } catch (e) {
    console.warn('Failed to persist session to localStorage', e);
  }
}
// Check for email confirmation token in URL
async function handleEmailConfirmation() {
    const fragment = window.location.hash.substring(1);
    const params = new URLSearchParams(fragment);

    const token = params.get("access_token");
    const email = decodeURIComponent(params.get("email") || "");
    const type = params.get("type") || "email";  // Supabase uses "email"

    if (!token || !email) {
        alert("Invalid confirmation link: Missing token or email");
        return;
    }

    try {
        const response = await fetch("https://backend.skreenit.com/api/v1/auth/confirm-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, email, type })
        });

        const result = await response.json();

        if (!response.ok || result.ok === false) {
            throw new Error(result.detail || "Failed to confirm email");
        }

        alert("Email confirmed successfully! Please log in.");
        window.location.href = "https://login.skreenit.com/login?confirmed=true";

    } catch (error) {
        console.error("Email confirmation error:", error);
        alert("Error confirming email: " + error.message);
    }
}

document.addEventListener("DOMContentLoaded", handleEmailConfirmation);

/* -------------------------------------------------------
   ROLE-BASED REDIRECT
   Updated: Removed first-time login check as password and role are now set during registration
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

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    await persistSessionToLocalStorage();
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

    // Extract token from hash or query
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
