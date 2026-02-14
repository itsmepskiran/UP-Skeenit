// login/js/update-password.js
import { supabase } from '@shared/js/supabase-config.js';
import { CONFIG } from '@shared/js/config.js';

// Setup Assets
const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
document.getElementById('logoImg').src = `${authBase}/assets/images/logo.png`;
document.getElementById('brandImg').src = `${authBase}/assets/images/logobrand.png`;
document.getElementById('homeLink').href = CONFIG.PAGES.INDEX;
document.getElementById('loginLink').href = CONFIG.PAGES.LOGIN;
document.getElementById('termsLink').href = CONFIG.PAGES.TERMS;
document.getElementById('privacyLink').href = CONFIG.PAGES.PRIVACY;

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("passwordForm");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const submitBtn = document.getElementById("submitBtn");

  const errorElement = document.getElementById("error-message");
  const errorText = document.getElementById("error-text");
  const successElement = document.getElementById("success-message");
  const successText = document.getElementById("success-text");

  function showError(message) {
    errorText.textContent = message;
    errorElement.style.display = "block";
  }

  function showSuccess(message) {
    successText.textContent = message;
    successElement.style.display = "block";
  }

  // Extract tokens from URL hash
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  // Clean URL
  if (window.location.hash) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (!accessToken || !refreshToken) {
    showError("Invalid or expired link. Please use the latest email link.");
    form.style.display = "none";
    return;
  }

  // Password strength checker
  function checkPasswordStrength(password) {
    const strength = {
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    return {
      score: Object.values(strength).filter(Boolean).length * 20,
      strength,
      isStrong: Object.values(strength).every(Boolean)
    };
  }

  function updatePasswordStrength(password) {
    const strength = checkPasswordStrength(password);
    const strengthFill = document.getElementById("password-strength-fill");
    const requirements = {
      "req-length": strength.strength.hasMinLength,
      "req-uppercase": strength.strength.hasUppercase,
      "req-lowercase": strength.strength.hasLowercase,
      "req-number": strength.strength.hasNumber,
      "req-special": strength.strength.hasSpecialChar
    };

    Object.entries(requirements).forEach(([id, isValid]) => {
      document.getElementById(id).classList.toggle("valid", isValid);
    });

    let color = "#ef4444";
    if (strength.score >= 80) color = "#10B981";
    else if (strength.score >= 60) color = "#F59E0B";
    else if (strength.score >= 40) color = "#3B82F6";

    strengthFill.style.width = `${strength.score}%`;
    strengthFill.style.backgroundColor = color;
  }

  passwordInput.addEventListener("input", (e) => updatePasswordStrength(e.target.value));

  // Toggle password visibility
  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", function () {
      const input = this.previousElementSibling;
      input.type = input.type === "password" ? "text" : "password";
      this.querySelector("i").classList.toggle("fa-eye");
      this.querySelector("i").classList.toggle("fa-eye-slash");
    });
  });

  // Submit handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorElement.style.display = "none";
    successElement.style.display = "none";

    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    const strength = checkPasswordStrength(password);
    if (!strength.isStrong) {
      showError("Please ensure your password meets all requirements.");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.classList.add("loading");
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

      // Set session from reset link tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (sessionError) throw sessionError;

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      showSuccess("Password updated successfully! Redirecting to login...");
      setTimeout(() => {
        window.location.href = `${CONFIG.PAGES.LOGIN}?reset=success`;
      }, 2000);

    } catch (err) {
      showError(err.message || "An error occurred. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove("loading");
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Set Password';
    }
  });
});