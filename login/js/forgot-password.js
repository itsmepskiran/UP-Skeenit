import { supabase } from '/auth/assets/js/supabase-config.js';

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

      const redirectUrl = "https://www.skreenit.com/update-password";

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