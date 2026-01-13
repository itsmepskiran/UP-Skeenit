// auth/assets/js/auth-pages.js

import { supabase } from './supabase-config.js'
import { backendUploadFile, handleResponse, backendUrl, backendClient } from './backend-client.js'

// -------- Auth State Handling --------

// Listen for authentication events (e.g., after email confirmation)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN') {
    await persistSessionToLocalStorage();
    console.log('User signed in, session persisted.');
  } else if (event === 'PASSWORD_RECOVERY') {
    console.log('Password recovery session started.');
  }
});

// -------- Utilities --------

// Persist session and user info for use across subdomains/pages
async function persistSessionToLocalStorage() {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const { data: userData } = await supabase.auth.getUser()
    const access_token = sessionData?.session?.access_token || ''
    const refresh_token = sessionData?.session?.refresh_token || ''
    const user = userData?.user || null

    if (access_token) localStorage.setItem('skreenit_token', access_token)
    if (refresh_token) localStorage.setItem('skreenit_refresh_token', refresh_token)
    if (user?.id) localStorage.setItem('skreenit_user_id', user.id)
    const role = user?.user_metadata?.role
    if (role) localStorage.setItem('skreenit_role', role)
  } catch (e) {
    console.warn('Failed to persist session to localStorage', e)
  }
}

// Role-based redirect after login with first-time login handling
async function redirectByRole(defaultUrl = 'https://dashboard.skreenit.com/candidate-dashboard.html') {
  const role = localStorage.getItem('skreenit_role')
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const isFirstTimeLogin = user?.user_metadata?.first_time_login === true
    // Logic: if password_updated is true, they have finished onboarding
    const hasUpdatedPassword = user?.user_metadata?.password_updated === true
    
    // Recruiter Logic
    if (role === 'recruiter') {
      if (!hasUpdatedPassword && isFirstTimeLogin) {
         window.location.href = 'https://recruiter.skreenit.com/recruiter-profile.html'
      } else {
         window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard.html'
      }
    } 
    // Candidate Logic
    else if (role === 'candidate') {
      if (!hasUpdatedPassword && isFirstTimeLogin) {
         window.location.href = 'https://applicant.skreenit.com/detailed-application-form.html'
      } else {
         window.location.href = 'https://dashboard.skreenit.com/candidate-dashboard.html'
      }
    } 
    // Fallback
    else {
      window.location.href = defaultUrl
    }
  } catch (error) {
    console.error('Error checking first-time login:', error)
    if (role === 'recruiter') {
      window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard.html'
    } else {
      window.location.href = 'https://dashboard.skreenit.com/candidate-dashboard.html'
    }
  }
}

// -------- Handlers --------
// Registration Handler
export async function handleRegistrationSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn?.textContent || 'Register';

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';
    }

    const fd = new FormData(form);
    const full_name = (fd.get('full_name') || '').trim();
    const email = (fd.get('email') || '').trim().toLowerCase();
    const mobile = (fd.get('mobile') || '').trim();
    const location = (fd.get('location') || '').trim();
    const role = (fd.get('role') || '').trim();
    const company_name = (fd.get('company_name') || '').trim();
    const resume = fd.get('resume');

    // Validation
    if (!role || !['candidate', 'recruiter'].includes(role)) {
      throw new Error('Please select a valid role (Candidate or Recruiter)');
    }
    if (!full_name || !email || !mobile || !location) {
      throw new Error('Please fill in all required fields');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Please enter a valid email address');
    }
    if (mobile.length < 7) {
      throw new Error('Please enter a valid mobile number');
    }
    if (role === 'recruiter' && !company_name) {
      throw new Error('Company name is required for recruiters');
    }

    // In auth-pages.js, update the signUp call:
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: generateStrongPassword(),
      options: {
        data: {
          full_name,
          role,
          first_time_login: true,
          password_updated: false,
          ...(role === 'recruiter' && company_name && { company_name })
    },
    emailRedirectTo: `${window.location.origin}/update-password.html` // Redirect to update password page 
  }
});

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('Failed to create user account');

    // 2. Send additional user data to backend
    const formData = new FormData();
    formData.append('user_id', authData.user.id);
    formData.append('full_name', full_name);
    formData.append('email', email);
    formData.append('mobile', mobile);
    formData.append('location', location);
    formData.append('role', role);
    if (company_name) formData.append('company_name', company_name);
    if (resume) formData.append('resume', resume);

    const response = await fetch(`${backendUrl()}/auth/register`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    });

    const result = await handleResponse(response);
    if (!result?.ok) {
      // Clean up auth user if backend registration fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(result?.error || 'Registration failed');
    }

    // Show success message
    const formEl = document.querySelector('.auth-body');
  if (formEl) {
    formEl.innerHTML = `
        <div class="text-center py-8">
            <div class="text-green-500 text-5xl mb-4">✓</div>
            <h2 class="text-2xl font-bold mb-2">Registration Successful!</h2>
            <p class="mb-6">You'll be redirected to login shortly...</p>
        </div>
    `;
    
    // Redirect to login after 3 seconds
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 3000);
  }
  return true;
  } catch (err) {
    console.error('Registration error:', err);
    notify(err.message || 'Registration failed. Please try again.', 'error');
    return false;
  } finally {
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
}

// Add this helper function at the top of your file
function generateStrongPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Update Password Handler (Fixed)
export async function handleUpdatePasswordSubmit(event) {
  event.preventDefault()
  const form = event.target
  const submitBtn = form.querySelector('button[type="submit"]')
  const originalText = submitBtn?.textContent || 'Update Password'
  if (submitBtn) { submitBtn.textContent = 'Updating...'; submitBtn.disabled = true }

  try {
    const fd = new FormData(form)
    const new_password = (fd.get('new_password') || '').trim()
    const confirm_password = (fd.get('confirm_password') || '').trim()
    
    if (new_password.length < 8) throw new Error('Password must be at least 8 characters.')
    if (new_password !== confirm_password) throw new Error('Passwords do not match.')

    // 1. Get Token from Hash
    let token = '';
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
       // Remove the leading '#'
       const params = new URLSearchParams(hash.substring(1)); 
       token = params.get('access_token');
    }
    
    // Fallback: Check query params
    if (!token) {
        const urlParams = new URLSearchParams(window.location.search);
        token = urlParams.get('token');
    }

    if (!token) throw new Error('Missing access token. Please use the link from your email.')

    // 2. Notify Backend to update password (and metadata)
    // We send the token in the Authorization header so backend knows WHO we are
    const formData = new FormData();
    formData.append('new_password', new_password);

    const response = await fetch(`${backendUrl()}/auth/update-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await handleResponse(response);
    if (!result || result.ok === false) throw new Error(result?.error || 'Failed to update password.');

    notify('Password updated successfully! Redirecting to login...', 'success')
    setTimeout(() => {
      window.location.href = 'https://login.skreenit.com/login.html'
    }, 3000)

  } catch (err) {
    console.error('Update password error:', err)
    notify(err.message || 'Failed to update password. Please try again.', 'error')
  } finally {
    if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false }
  }
}

// Login Handler
export async function handleLoginSubmit(event) {
  event.preventDefault()
  const form = event.target
  const submitBtn = form.querySelector('button[type="submit"]')
  const originalText = submitBtn?.textContent || 'Login'
  if (submitBtn) { submitBtn.textContent = 'Signing in...'; submitBtn.disabled = true }

  try {
    const fd = new FormData(form)
    const email = (fd.get('email') || '').trim()
    const password = (fd.get('password') || '').trim()

    if (!email || !password) throw new Error('Email and password are required.')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)

    await persistSessionToLocalStorage()
    redirectByRole()
  } catch (err) {
    console.error('Login error:', err)
    notify(err.message || 'Login failed. Please try again.', 'error')
  } finally {
    if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false }
  }
}

// Global Notify Helper
export function notify(message, type = 'info') {
  // Implementation of notify function
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 5000)
}