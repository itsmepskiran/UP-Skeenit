import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js';

export async function persistSessionToLocalStorage() {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user || null;
    const role = user?.user_metadata?.role;
    if (role) localStorage.setItem('skreenit_role', role);
  } catch (e) {
    console.warn('Failed to persist role to localStorage', e);
  }
}

export async function redirectByRole(defaultUrl = 'https://dashboard.skreenit.com/candidate-dashboard') {
  const role = localStorage.getItem('skreenit_role');
  try {
    if (role === 'recruiter') {
      window.location.href = 'https://dashboard.skreenit.com/recruiter-dashboard';
    } else if (role === 'candidate') {
      window.location.href = 'https://dashboard.skreenit.com/candidate-dashboard';
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