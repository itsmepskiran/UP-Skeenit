import { supabase } from './supabase-config.js';
import { backendUrl, handleResponse } from './backend-client.js';

// Helper: Generate a strong random password
function generateStrongPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Global notify helper
function notify(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// Main Registration Handler
export async function handleRegistrationSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const fd = new FormData(form);
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn?.textContent || 'Register';

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    }

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

    // Get password from form
    const password = fd.get('password');
    
    // 1. Create Supabase Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role,
          first_time_login: false, // Set to false since they set their own password
          password_updated: true,  // They've already set their password
          ...(role === 'recruiter' && company_name && { company_name })
        },
        emailRedirectTo: `${window.location.origin}/dashboard.html`  // Redirect to dashboard after email confirmation
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

    const response = await fetch(`${backendUrl()}/register`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    });

    const result = await handleResponse(response);
    if (!result?.ok) {
      // Clean up Supabase user if backend registration fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(result?.error || 'Registration failed');
    }

    // 3. Show success message and redirect to email confirmation
    const formEl = document.querySelector('.auth-body');
    if (formEl) {
      formEl.innerHTML = `
        <div class="text-center py-8">
          <div class="text-green-500 text-5xl mb-4">✓</div>
          <h2 class="text-2xl font-bold mb-2">Registration Successful!</h2>
          <p class="mb-4">Please check your email for a confirmation link.</p>
          <p class="text-sm text-gray-600">You'll be redirected to the login page shortly...</p>
        </div>
      `;

      setTimeout(() => {
        window.location.href = 'https://login.skreenit.com/confirm-email.html';
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
