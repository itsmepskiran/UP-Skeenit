import { supabase } from './supabase-config.js'
import { backendUploadFile, handleResponse, backendUrl } from './backend-client.js'

// -------- Auth State Handling --------
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN') {
    await persistSessionToLocalStorage();
  }
});

// -------- Utilities --------
async function persistSessionToLocalStorage() {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const { data: userData } = await supabase.auth.getUser()
    const access_token = sessionData?.session?.access_token || ''
    const user = userData?.user || null

    if (access_token) localStorage.setItem('skreenit_token', access_token)
    if (user?.id) localStorage.setItem('skreenit_user_id', user.id)
    const role = user?.user_metadata?.role
    if (role) localStorage.setItem('skreenit_role', role)
  } catch (e) { console.warn('Persistence error', e) }
}

async function redirectByRole(defaultUrl = 'https://dashboard.skreenit.com/candidate-dashboard.html') {
  const role = localStorage.getItem('skreenit_role')
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const isFirstTimeLogin = user?.user_metadata?.first_time_login === true
    const hasOnboarded = user?.user_metadata?.onboarded === true
    
    if (role === 'recruiter') {
        window.location.href = hasOnboarded ? 'https://dashboard.skreenit.com/recruiter-dashboard.html' : 'https://recruiter.skreenit.com/recruiter-profile.html'
    } else if (role === 'candidate') {
        window.location.href = hasOnboarded ? 'https://dashboard.skreenit.com/candidate-dashboard.html' : 'https://applicant.skreenit.com/detailed-application-form.html'
    } else {
        window.location.href = defaultUrl
    }
  } catch (error) {
    // Fallback
    window.location.href = role === 'recruiter' ? 'https://dashboard.skreenit.com/recruiter-dashboard.html' : defaultUrl
  }
}

// -------- Handlers --------

export async function handleRegistrationSubmit(event) {
  event.preventDefault()
  const form = event.target
  const submitBtn = form.querySelector('button[type="submit"]')
  const originalText = submitBtn?.textContent || 'Register'
  if (submitBtn) { submitBtn.textContent = 'Registering...'; submitBtn.disabled = true }

  try {
    const fd = new FormData(form)
    
    // Validate required fields
    const required = ['full_name', 'email', 'password', 'mobile', 'location', 'role']
    for (const field of required) {
        if (!fd.get(field)) throw new Error(`Please fill in ${field.replace('_', ' ')}`)
    }
    
    // Validate password length
    if (fd.get('password').length < 6) throw new Error("Password must be at least 6 characters")
    
    if (fd.get('role') === 'recruiter' && !fd.get('company_name')) {
        throw new Error('Company name is required for recruiters')
    }

    // Send to backend
    const resp = await backendUploadFile('/auth/register', fd)
    const result = await handleResponse(resp)
    
    if (!result || result.ok === false) throw new Error(result?.error || 'Registration failed')

    // Show Success Message & Countdown
    const formEl = document.querySelector('.auth-body') || form.parentElement
    if (formEl) {
      formEl.innerHTML = `
        <div class="thank-you-message" style="text-align: center; padding: 2rem;">
          <i class="fas fa-check-circle" style="color: green; font-size: 3rem; margin-bottom: 1rem;"></i>
          <h2>Registration Successful!</h2>
          <p>Please check your email to confirm your account.</p>
          <p style="margin-top: 1rem; color: #666;">Redirecting to login in <span id="countdown">5</span> seconds...</p>
        </div>
      `
      
      let seconds = 5
      const timer = setInterval(() => {
          seconds--
          const el = document.getElementById('countdown')
          if (el) el.textContent = seconds
          if (seconds <= 0) {
              clearInterval(timer)
              window.location.href = 'https://login.skreenit.com/login.html'
          }
      }, 1000)
    }
    return true
  } catch (err) {
    console.error('Registration error:', err)
    alert(err.message || 'Registration failed')
    return false
  } finally {
    if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false }
  }
}

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

    // Direct Supabase Login
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
        if (error.message.includes("Email not confirmed")) {
            throw new Error("Please check your email and confirm your account before logging in.")
        }
        throw new Error(error.message)
    }

    await persistSessionToLocalStorage()
    redirectByRole()
  } catch (err) {
    console.error('Login error:', err)
    alert(err.message || 'Login failed')
  } finally {
    if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false }
  }
}

// Update Password Handler (Only needed for Forgot Password flow now)
export async function handleUpdatePasswordSubmit(event) {
  event.preventDefault()
  // ... (Keep existing logic if you support Forgot Password, otherwise this is less critical)
  // Standard logic: get token from hash -> supabase.auth.updateUser -> notify backend
}