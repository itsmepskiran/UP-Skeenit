import { backendPost, handleResponse } from 'https://auth.skreenit.com/assets/js/backend-client.js';
import { notify } from 'https://auth.skreenit.com/assets/js/auth-shared.js';

    async function handleRegistrationSubmit(event) {
      event.preventDefault();

      const form = event.target;
      const fd = new FormData(form);
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn?.textContent || 'Register';

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

        const full_name = fd.get('full_name').trim();
        const email = fd.get('email').trim().toLowerCase();
        const mobile = fd.get('mobile').trim();
        const location = fd.get('location').trim();
        const role = fd.get('role').trim();
        const company_name = fd.get('company_name')?.trim();
        const resume = fd.get('resume');
        const password = fd.get('password').trim();

        if (!role || !['candidate', 'recruiter'].includes(role)) {
          throw new Error('Please select a valid role');
        }
        if (!full_name || !email || !mobile || !location) {
          throw new Error('Please fill in all required fields');
        }
        if (mobile.length < 10) {
          throw new Error('Please enter a valid mobile number');
        }

        const formData = new FormData();
        formData.append('full_name', full_name);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('mobile', mobile);
        formData.append('location', location);
        formData.append('role', role);
        formData.append('email_redirect_to', 'https://login.skreenit.com/confirm-email');
        
        const response = await backendPost('/auth/register', formData);
        const result = await handleResponse(response);

        if (!result?.ok) {
          throw new Error(result?.error || 'Registration failed');
        }

        document.querySelector('.auth-body').innerHTML = `
          <div class="text-center py-8">
            <div class="text-green-500 text-5xl mb-4">✓</div>
            <h2 class="text-2xl font-bold mb-2">Registration Successful!</h2>
            <p class="mb-4">Please check your email for a confirmation link.</p>
            <p class="text-sm text-gray-600">You'll be redirected to the login page shortly...</p>
          </div>
        `;

        setTimeout(() => {
          window.location.href = 'https://login.skreenit.com/login?registered=true';
        }, 3000);

      } catch (err) {
        notify(err.message || 'Registration failed. Please try again.', 'error');
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    }

    const form = document.getElementById("registrationForm");
    form.addEventListener("submit", handleRegistrationSubmit);
