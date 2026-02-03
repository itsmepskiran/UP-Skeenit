import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js';

export async function persistSessionToLocalStorage() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    const role = user?.user_metadata?.role;

    if (role) {
      localStorage.setItem("skreenit_role", role);
    }
  } catch (e) {
    console.warn("Failed to persist role to localStorage", e);
  }
}

export async function redirectByRole() {
  const role = localStorage.getItem("skreenit_role");
  const onboarded = localStorage.getItem("onboarded") === "true";
  
  if (role === "recruiter") {

    // Not onboarded → go to recruiter onboarding
    if (!onboarded) {
      window.location.href = "https://recruiter.skreenit.com/recruiter-profile.html";
      return;
    }

    // Fully onboarded → go to dashboard
    window.location.href = "https://dashboard.skreenit.com/recruiter-dashboard.html";
    return;
  }

  if (role === "candidate") {

    // Not onboarded → go to candidate onboarding
    if (!onboarded) {
      window.location.href = "https://applicant.skreenit.com/detailed-application-form.html";
      return;
    }

    // Fully onboarded → go to dashboard
    window.location.href = "https://dashboard.skreenit.com/candidate-dashboard.html";
    return;
  }

  // fallback
  window.location.href = "https://login.skreenit.com/login.html";
}

export function notify(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}