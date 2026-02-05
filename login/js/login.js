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
    if (error) {
      throw error;
    }
    // 3. Fetch metadata (this is the missing piece)
    const { data: {user} } = await supabase.auth.getUser();
    
    if(user){
      // 4. Store metadata manually
      localStorage.setItem("skreenit_role", user.user_metadata.role);
      localStorage.setItem("user_id", user.id);
      localStorage.setItem("onboarded", user.user_metadata.onboarded.toString());
    }
    
    // ⭐ Store role
    await persistSessionToLocalStorage(); // ✅ Store role in localStorage - Refer auth-pages.js

    // ⭐ Wait a moment for session to be fully established
    await new Promise(resolve => setTimeout(resolve, 1000));

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