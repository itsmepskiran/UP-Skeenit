// login/js/login.js
import { supabase } from '@shared/js/supabase-config.js';
import { redirectByRole } from '@shared/js/auth-pages.js';
import { CONFIG } from '@shared/js/config.js';

// 1. Setup Dynamic Assets (Images & Links)
const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';

// Set Images
document.getElementById('logoImg').src = `${authBase}/assets/images/logo.png`;
document.getElementById('brandImg').src = `${authBase}/assets/images/logobrand.png`;

// Set Links
document.getElementById('homeLink').href = CONFIG.PAGES.INDEX;
document.getElementById('registerLink').href = CONFIG.PAGES.REGISTER;
document.getElementById('forgotLink').href = CONFIG.PAGES.FORGOT_PASSWORD;
document.getElementById('termsLink').href = CONFIG.PAGES.TERMS;
document.getElementById('privacyLink').href = CONFIG.PAGES.PRIVACY;

// 2. Form Logic
const form = document.getElementById("loginForm");
const errorBox = document.getElementById("errorBox");

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = "block";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.style.display = "none";

  const submitBtn = form.querySelector("button");
  const btnText = submitBtn.querySelector(".btn-text");
  const btnLoader = submitBtn.querySelector(".btn-loader");

  // Show Loader
  btnText.style.display = "none";
  btnLoader.style.display = "inline-block";
  submitBtn.disabled = true;

  try {
    const fd = new FormData(form);
    const email = fd.get("email").trim();
    const password = fd.get("password").trim();

    // Sign In
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) throw error;

    console.log("✅ Login successful.");

    // Wait for cookie/session propagation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Redirect using the shared helper
    await redirectByRole(); 

  } catch (err) {
    console.error("Login error:", err);
    showError(err.message || "Login failed. Please try again.");
  } finally {
    // Reset Button
    btnText.style.display = "inline-block";
    btnLoader.style.display = "none";
    submitBtn.disabled = false;
  }
});