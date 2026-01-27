// auth/assets/js/auth-pages.js

import { supabase } from './supabase-config.js';
import { backendUrl, handleResponse } from './backend-client.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.js';

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

/* -------------------------------------------------------
   ROLE-BASED REDIRECT
   Updated: Removed first-time login check as password and role are now set during registration
------------------------------------------------------- */
export async function redirectByRole(defaultUrl = 'https://dashboard.skreenit.com/candidate-dashboard') {
  const role = localStorage.getItem('skreenit_role');

  const withAuthHash = async (targetUrl) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: userData } = await supabase.auth.getUser();

      const session = sessionData?.session;
      const user = userData?.user;

      const at = session?.access_token;
      const rt = session?.refresh_token;
      const uid = user?.id;
      const r = user?.user_metadata?.role || localStorage.getItem('skreenit_role');

      if (!at || !rt) return targetUrl;

      const params = new URLSearchParams();
      params.set('access_token', at);
      params.set('refresh_token', rt);
      if (uid) params.set('user_id', uid);
      if (r) params.set('role', r);

      return `${targetUrl}#${params.toString()}`;
    } catch {
      return targetUrl;
    }
  };

  try {
    if (role === 'recruiter') {
      window.location.href = await withAuthHash('https://recruiter.skreenit.com/dashboard');
    } else if (role === 'candidate') {
      window.location.href = await withAuthHash('https://applicant.skreenit.com/dashboard');
    } else {
      window.location.href = await withAuthHash(defaultUrl);
    }
  } catch (error) {
    console.error('Error during role-based redirect:', error);
    window.location.href = await withAuthHash(defaultUrl);
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
    redirectByRole();

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
      window.location.href = 'https://login.skreenit.com/login.html';
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
