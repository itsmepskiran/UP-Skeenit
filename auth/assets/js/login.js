// login.js
import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const formError = document.getElementById('formError');
  const roleInput = document.getElementById('role');
  const roleOptions = document.querySelectorAll('.role-option');
  const recruiterBox = document.getElementById('recruiterBox');
  const submitButton = form.querySelector('button[type="submit"]');
  const buttonText = submitButton.querySelector('.button-text');

  const withAuthHash = (targetUrl, session, user, role) => {
    try {
      const at = session?.access_token;
      const rt = session?.refresh_token;
      const uid = user?.id;
      if (!at || !rt) return targetUrl;

      const params = new URLSearchParams();
      params.set('access_token', at);
      params.set('refresh_token', rt);
      if (uid) params.set('user_id', uid);
      if (role) params.set('role', role);

      return `${targetUrl}#${params.toString()}`;
    } catch {
      return targetUrl;
    }
  };

  /* -------------------------------------------------------
     ROLE SELECTION
  ------------------------------------------------------- */
  roleOptions.forEach(option => {
    option.addEventListener('click', () => {
      const selectedRole = option.dataset.role;

      roleOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');

      roleInput.value = selectedRole;

      if (recruiterBox) {
        recruiterBox.style.display = selectedRole === 'recruiter' ? 'block' : 'none';
        const companyIdInput = recruiterBox.querySelector('input');
        if (companyIdInput) {
          companyIdInput.required = selectedRole === 'recruiter';
        }
      }
    });
  });

  /* -------------------------------------------------------
     FORM SUBMISSION
  ------------------------------------------------------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    formError.style.display = 'none';
    formError.textContent = '';
    
    if (!roleInput.value) {
      return showError('Please select your role');
    }

    submitButton.disabled = true;
    buttonText.textContent = 'Signing in...';

    try {
      const formData = new FormData(form);
      const roleInput = formData.get('role');
      const email = formData.get('email');
      const password = formData.get('password');
      const companyId = formData.get('company_id');

      if (roleInput === 'recruiter' && !companyId) {
        throw new Error('Company ID is required for recruiter login');
      }

      /* -------------------------------------------------------
         SUPABASE SIGN-IN
      ------------------------------------------------------- */
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const user = data.user;
      const metadata = user?.user_metadata || {};

      /* -------------------------------------------------------
         ROLE VALIDATION
      ------------------------------------------------------- */
      if (!metadata.role) {
        await supabase.auth.signOut();
        throw new Error('Your account does not have a role assigned. Contact support.');
      }

      if (metadata.role !== role) {
        await supabase.auth.signOut();
        throw new Error(
          metadata.role === 'recruiter'
            ? 'Your account is registered as a Recruiter. Please select Recruiter.'
            : 'Your account is registered as a Candidate. Please select Candidate.'
        );
      }

      /* -------------------------------------------------------
         STORE SESSION TOKENS FOR BACKEND
      ------------------------------------------------------- */
      const session = data.session;
      if (session) {
        localStorage.setItem('skreenit_token', session.access_token);
        localStorage.setItem('skreenit_refresh_token', session.refresh_token);
        localStorage.setItem('skreenit_user_id', user.id);
        localStorage.setItem('skreenit_role', role);
      }

      /* -------------------------------------------------------
         FIRST-TIME LOGIN LOGIC
      ------------------------------------------------------- */
      const role = data.user.user_metadata?.role || 'candidate';
        if (role === 'recruiter') {
            window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard';
        } else {
            window.location.href = 'https://dashboard.skreenit.com/candidate-dashboard';
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Login failed. Please try again.');
    }
    finally {
      submitButton.disabled = false;
      buttonText.textContent = 'Sign In';
    }
  });

  /* -------------------------------------------------------
     ERROR DISPLAY
  ------------------------------------------------------- */
  function showError(message) {
    formError.textContent = message;
    formError.style.display = 'block';
    formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* -------------------------------------------------------
     PASSWORD VISIBILITY TOGGLE
  ------------------------------------------------------- */
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    passwordInput.parentNode.insertBefore(wrapper, passwordInput);
    wrapper.appendChild(passwordInput);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.innerHTML = '<i class="fas fa-eye"></i>';
    Object.assign(toggle.style, {
      position: 'absolute',
      right: '1rem',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--text-light)'
    });

    wrapper.appendChild(toggle);

    toggle.addEventListener('click', () => {
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
      toggle.innerHTML = type === 'password'
        ? '<i class="fas fa-eye"></i>'
        : '<i class="fas fa-eye-slash"></i>';
    });
  }
});
