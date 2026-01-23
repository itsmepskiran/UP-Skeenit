// update-password.js
import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('updatePasswordForm');
  const errorBox = document.getElementById('formError');
  const submitBtn = form.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('.button-text');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    errorBox.style.display = 'none';
    errorBox.textContent = '';

    const newPassword = form.querySelector('#new_password').value.trim();
    const confirmPassword = form.querySelector('#confirm_password').value.trim();

    if (!newPassword || !confirmPassword) {
      return showError('Please fill all fields');
    }

    if (newPassword !== confirmPassword) {
      return showError('Passwords do not match');
    }

    submitBtn.disabled = true;
    btnText.textContent = 'Updating...';

    try {
      // Update password
      const { error: pwError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { password_updated: true }
      });

      if (pwError) throw pwError;

      // Get session to determine role
      const { data: sessionData } = await supabase.auth.getSession();
      const role = sessionData?.session?.user?.user_metadata?.role;

      if (!role) throw new Error('Missing role information');

      // Redirect based on role
      if (role === 'recruiter') {
        window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard.html';
      } else {
        window.location.href = 'https://dashboard.skreenit.com/candidate-dashboard.html';
      }

    } catch (err) {
      showError(err.message || 'Failed to update password');
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = 'Update Password';
    }
  });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }
});
