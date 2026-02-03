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

export async function redirectByRole(defaultUrl = 'https://dashboard.skreenit.com/candidate-dashboard.html') {
  const role = localStorage.getItem('skreenit_role');
  try {
    if (role === 'recruiter') {
      window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard.html';
    } else if (role === 'candidate') {
      window.location.href = 'https://dashboard.skreenit.com/candidate-dashboard.html';
    } else {
      window.location.href = defaultUrl;
    }
  } catch {
    window.location.href = defaultUrl;
  }
}

export function notify(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}