// 1. Import only what we need. 
// Note: We added '?v=2' to force the browser to re-download the new versions.
import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js?v=2';
import { redirectByRole } from 'https://auth.skreenit.com/assets/js/auth-pages.js?v=2';

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

    // ---------------------------------------------------------
    // STEP 1: LOGIN
    // The new 'supabase-config.js' will automatically capture 
    // the session and save it to a Shared Cookie (.skreenit.com)
    // ---------------------------------------------------------
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) throw error;

    console.log("✅ Login successful. Session established in cookies.");

    // ---------------------------------------------------------
    // STEP 2: WAIT (Safety Buffer)
    // We wait 1 second to ensure the cookie is fully written 
    // and available to the dashboard subdomain.
    // ---------------------------------------------------------
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ---------------------------------------------------------
    // STEP 3: REDIRECT
    // This function checks the Cookie, finds the role, 
    // and sends the user to the correct Dashboard.
    // ---------------------------------------------------------
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