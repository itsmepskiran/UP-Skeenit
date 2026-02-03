import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js';
import { persistSessionToLocalStorage, redirectByRole} from 'https://auth.skreenit.com/assets/js/auth-pages.js';

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

  btnText.style.display = "none";
  btnLoader.style.display = "inline-block";
  submitBtn.disabled = true;

  try {
    const fd = new FormData(form);
    const email = fd.get("email").trim();
    const password = fd.get("password").trim();

    // 1. Login with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // 2. Set session cookie
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });

    // 3. Fetch metadata (this is the missing piece)
    const { data: userData } = await supabase.auth.getUser();
    const metadata = userData.user.user_metadata;

    // 4. Store metadata manually
    localStorage.setItem("skreenit_role", metadata.role);
    localStorage.setItem("user_id", userData.user.id);
    localStorage.setItem("onboarded", metadata.onboarded);
    
    // ⭐ Store role
    await persistSessionToLocalStorage(); // ✅ Store role in localStorage - Refer auth-pages.js

    // ⭐ Redirect based on role 
    await redirectByRole(); // ✅ Redirect to appropriate dashboard - Refer auth-pages.js

  } catch (err) {
    console.error("Login error:", err);
    showError(err.message || "Login failed. Please try again.");
  } finally {
    btnText.style.display = "inline-block";
    btnLoader.style.display = "none";
    submitBtn.disabled = false;
  }
});