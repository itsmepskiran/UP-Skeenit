document.addEventListener("DOMContentLoaded", () => {
    const messageEl = document.getElementById("message");

    messageEl.textContent = "Your email has been successfully confirmed! Redirecting to login...";
    messageEl.className = "message success";

    setTimeout(() => {
        window.location.href = "https://login.skreenit.com/login?confirmed=true";
    }, 3000);
});
