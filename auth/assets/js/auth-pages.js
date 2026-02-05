import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js';

export async function persistSessionToLocalStorage() {
  try {
    const { data: {session}, error } = await supabase.auth.getSession();
    if(error || !session?.user){
      console.warn("No active session found");
      return;
    }

    const user = session.user;
    const role = user.user_metadata?.role;
    const onboarded = user.user_metadata?.onboarded;
    if (role) {
      localStorage.setItem("skreenit_role", role);
      localStorage.setItem("onboarded", onboarded?.toString() || "false");
      localStorage.setItem("user_id", user.id);
    }
  } catch (e) {
    console.warn("Failed to persist role to localStorage", e);
  }
}

export async function redirectByRole() {
  try{
    //First check if we have a valid session
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) {
      console.log("No active session found, redirecting to login");
      window.location.href = `https://login.skreenit.com/login?redirectTo=${encodeURIComponent(window.location.href)}`;
      return;
    }
  const role = session.user.user_metadata?.role|| localStorage.getItem("skreenit_role");
  const onboarded = session.user.user_metadata?.onboarded !== undefined
  ? session.user.user_metadata.onboarded 
  : localStorage.getItem("onboarded") === "true";
  if (session.user.user_metadata?.role) {
    localStorage.setItem("skreenit_role", session.user.user_metadata.role);
    localStorage.setItem("onboarded", session.user.user_metadata.onboarded?.toString() || "false");
    }
  if (role === "candidate") {
      window.location.href = onboarded
      ? "https://dashboard.skreenit.com/candidate-dashboard"
      : "https://applicant.skreenit.com/detailed-application-form";
    }
    else if (role === "recruiter") {
    window.location.href = onboarded
      ? "https://dashboard.skreenit.com/recruiter-dashboard"
      : "https://recruiter.skreenit.com/recruiter-profile";
    }
    else{
      console.warn("User role not found, redirecting to login");
      window.location.href = "https://login.skreenit.com/login";
    }
  } catch(error) {
    console.error("Error in redirectByRole", error);
    window.location.href = "https://login.skreenit.com/login";
  }
}

export function notify(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}