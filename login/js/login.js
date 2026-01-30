import { supabase } from "https://auth.skreenit.com/assets/js/supabase-config.js";
import { persistSessionToLocalStorage, redirectByRole} from "https://auth.skreenit.com/assets/js/auth-shared.js";

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // ⭐ REQUIRED: Write cookie for all subdomains
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });

    // ⭐ Store role
    await persistSessionToLocalStorage();

    // ⭐ Redirect based on role
    await redirectByRole();

  } catch (err) {
    console.error("Login error:", err);
    showError(err.message || "Login failed. Please try again.");
  } finally {
    btnText.style.display = "inline-block";
    btnLoader.style.display = "none";
    submitBtn.disabled = false;
  }
});