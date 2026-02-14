// login/js/forgot-password.js
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

const form = document.getElementById("forgotPasswordForm");
const messageBox = document.getElementById("message");

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `info-message ${type}`;
  messageBox.style.display = "block";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const submitBtn = form.querySelector("button[type='submit']");
  const btnText = submitBtn.querySelector(".btn-text");
  const btnLoader = submitBtn.querySelector(".btn-loader");

  try {
    submitBtn.disabled = true;
    submitBtn.classList.add("btn-loading");
    btnText.style.display = "none";
    btnLoader.style.display = "inline-flex";

    // ✅ DYNAMIC REDIRECT LINK
    const redirectUrl = window.location.origin + CONFIG.PAGES.UPDATE_PASSWORD;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    if (error) throw error;

    showMessage("Reset link sent! Please check your inbox.", "success");

  } catch (err) {
    showMessage("Error: " + err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("btn-loading");
    btnText.style.display = "inline";
    btnLoader.style.display = "none";
  }
});