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
  event.preventDefault()
  const form = event.target
  const submitBtn = form.querySelector('button[type="submit"]')
  const originalText = submitBtn?.textContent || 'Register'
  if (submitBtn) { submitBtn.textContent = 'Registering...'; submitBtn.disabled = true }

  try {
    const fd = new FormData(form)
    const full_name = (fd.get('full_name') || '').trim()
    const email = (fd.get('email') || '').trim()
    const mobile = (fd.get('mobile') || '').trim()
    const location = (fd.get('location') || '').trim()
    const role = (fd.get('role') || '').trim()
    const company_name = (fd.get('company_name') || '').trim()
    const resume = fd.get('resume')

    if (!role || !['candidate', 'recruiter'].includes(role)) {
      throw new Error('Please select a valid role (Candidate or Recruiter)')
    }
    if (!full_name || !email || !mobile || !location) {
      throw new Error('Please fill in all required fields')
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    if (!emailOk) throw new Error('Please enter a valid email address')
    if (mobile.length < 7) throw new Error('Please enter a valid mobile number')

    if (role === 'recruiter' && !company_name) throw new Error('Company name is required for recruiters')

    const bfd = new FormData()
    bfd.append('full_name', full_name)
    bfd.append('email', email)
    bfd.append('mobile', mobile)
    bfd.append('location', location)
    bfd.append('role', role)
    if (company_name) bfd.append('company_name', company_name)
    if (resume && resume.size > 0) bfd.append('resume', resume)

    const resp = await backendUploadFile('/auth/register', bfd)
    const result = await handleResponse(resp)
    if (!result || result.ok === false) throw new Error(result?.error || 'Registration failed')

    const formEl = document.querySelector('.auth-body')
    if (formEl) {
      formEl.innerHTML = `
        <div id="thankYou" class="thank-you-message">
          <i class="fas fa-check-circle success-icon"></i>
          <h2>Thank You for registering with us!</h2>
          <p>Please check your email for the verification link and further instructions.</p>
          <a href="https://login.skreenit.com/login.html" class="btn btn-primary">Go to Login</a>
        </div>
      `
    }

    return true
  } catch (err) {
    console.error('Registration error:', err)
    notify(err.message || 'Registration failed. Please try again.', 'error')
    return false
  } finally {
    if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false }
  }
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
function notify(message, type = 'info') {
  // Check if a notify container exists, otherwise use alert/log
  const container = document.getElementById('notification-container');
  if (container) {
     const notif = document.createElement('div');
     notif.className = `notification ${type}`;
     notif.innerText = message;
     container.appendChild(notif);
     setTimeout(() => notif.remove(), 4000);
  } else {
     if (type === 'error') alert(message);
     else console.log(message);
  }
}