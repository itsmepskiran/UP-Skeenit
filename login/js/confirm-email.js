// login/js/confirm-email.js
import { CONFIG } from '@shared/js/config.js';

// Setup Assets
const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
document.getElementById('brandImg').src = `${authBase}/assets/images/logobrand.png`;

document.addEventListener("DOMContentLoaded", () => {
    const messageEl = document.getElementById("message");

    messageEl.textContent = "Your email has been successfully confirmed! Redirecting to login...";
    messageEl.className = "message success";

    setTimeout(() => {
        window.location.href = `${CONFIG.PAGES.LOGIN}?confirmed=true`;
    }, 3000);
});