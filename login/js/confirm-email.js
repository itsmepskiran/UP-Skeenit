import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js';

    const messageEl = document.getElementById('message');

    const show = (msg, type = "") => {
        messageEl.textContent = msg;
        messageEl.className = type ? `message ${type}` : "message";
    };

    const redirectToLogin = () => {
        window.location.href = 'https://login.skreenit.com/login?confirmed=true';
    };

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            show("Confirming your email...", "loading");
            const { data, error } = await supabase.auth.getSessionFromUrl();

            if (error) {
                show("Invalid or expired confirmation link.", "error");
                return;
            }

            show("Email confirmed successfully! Redirecting...", "success");

            setTimeout(redirectToLogin, 1500);

            } 
            catch (err) {
            console.error("Confirmation error:", err);
            show("Something went wrong while confirming your email.", "error");
            }
    });
