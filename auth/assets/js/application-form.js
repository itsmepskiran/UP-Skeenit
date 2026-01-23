// application-form.js
import { supabase } from './supabase-config.js';

const form = document.getElementById('detailedApplicationForm');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const progressFill = document.getElementById('progressFill');

let currentStep = 1;
const totalSteps = 6;

/* -------------------------------------------------------
   UI STEP LOGIC
------------------------------------------------------- */
function updateUI() {
  document.querySelectorAll('.form-step').forEach(step => {
    const s = Number(step.dataset.step);
    step.classList.toggle('active', s === currentStep);
    step.style.display = s === currentStep ? 'block' : 'none';
  });

  document.querySelectorAll('.step').forEach(el => {
    const s = Number(el.dataset.step);
    el.classList.toggle('active', s === currentStep);
  });

  prevBtn.style.display = currentStep > 1 ? 'inline-flex' : 'none';
  nextBtn.style.display = currentStep < totalSteps ? 'inline-flex' : 'none';
  submitBtn.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';

  progressFill.style.width = `${Math.round(((currentStep - 1) / (totalSteps - 1)) * 100)}%`;
}

function validateCurrentStep() {
  const stepEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
  if (!stepEl) return true;

  const required = stepEl.querySelectorAll('[required]');
  for (const input of required) {
    if (!input.value.trim()) {
      input.focus();
      return false;
    }
  }
  return true;
}

/* -------------------------------------------------------
   SERIALIZERS
------------------------------------------------------- */
function serializeEducation() {
  const container = document.getElementById('educationContainer');
  if (!container) return [];

  return [...container.querySelectorAll('[data-education]')].map(row => ({
    institution: row.querySelector('[data-field="institution"]')?.value || null,
    degree: row.querySelector('[data-field="degree"]')?.value || null,
    field_of_study: row.querySelector('[data-field="field_of_study"]')?.value || null,
    start_date: row.querySelector('[data-field="start_date"]')?.value || null,
    end_date: row.querySelector('[data-field="end_date"]')?.value || null,
  })).filter(x => x.institution && x.degree);
}

function serializeExperience() {
  const container = document.getElementById('experienceContainer');
  if (!container) return [];

  return [...container.querySelectorAll('[data-experience]')].map(row => ({
    company_name: row.querySelector('[data-field="company_name"]')?.value || null,
    position: row.querySelector('[data-field="position"]')?.value || null,
    description: row.querySelector('[data-field="description"]')?.value || null,
    start_date: row.querySelector('[data-field="start_date"]')?.value || null,
    end_date: row.querySelector('[data-field="end_date"]')?.value || null,
    is_current: row.querySelector('[data-field="is_current"]')?.checked || false,
  })).filter(x => x.company_name && x.position);
}

function serializeSkills() {
  const container = document.getElementById('skillsContainer');
  if (!container) return [];

  return [...container.querySelectorAll('[data-skill]')].map(row => ({
    skill_name: row.querySelector('[data-field="skill_name"]')?.value || null,
    proficiency_level: row.querySelector('[data-field="proficiency_level"]')?.value || null,
    years_experience: Number(row.querySelector('[data-field="years_experience"]')?.value || 0),
  })).filter(x => x.skill_name);
}

/* -------------------------------------------------------
   SUBMIT HANDLER
------------------------------------------------------- */
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return alert("Not authenticated");

  const profilePayload = {
    user_id: userId,
    location: document.getElementById('city')?.value || null,
    bio: document.getElementById('description')?.value || null,
  };

  const skills = serializeSkills();
  const experience = serializeExperience();
  const education = serializeEducation();

  try {
    // Save main profile
    await supabase.from('candidate_profiles').upsert(profilePayload);

    // Save skills
    await supabase.from('candidate_skills').delete().eq('candidate_id', userId);
    if (skills.length) {
      await supabase.from('candidate_skills').insert(
        skills.map(s => ({ ...s, candidate_id: userId }))
      );
    }

    // Save experience
    await supabase.from('candidate_experience').delete().eq('candidate_id', userId);
    if (experience.length) {
      await supabase.from('candidate_experience').insert(
        experience.map(e => ({ ...e, candidate_id: userId }))
      );
    }

    // Save education (if you create candidate_education table)
    // await supabase.from('candidate_education').delete().eq('candidate_id', userId);
    // await supabase.from('candidate_education').insert(...)

  } catch (err) {
    console.error("Profile save failed:", err);
  }

  const modal = document.getElementById('successModal');
  if (modal) {
    modal.style.display = 'block';
  } else {
    window.location.href = 'https://dashboards.skreenit.com/candidate-dashboard.html';
  }
});

/* -------------------------------------------------------
   DRAFT + LOGOUT
------------------------------------------------------- */
document.getElementById('saveDraftBtn')?.addEventListener('click', () => {
  const userId = localStorage.getItem('skreenit_user_id');
  const draft = {
    ts: Date.now(),
    step: currentStep,
  };
  localStorage.setItem(`skreenit_draft_${userId}`, JSON.stringify(draft));
  alert("Draft saved locally.");
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  localStorage.clear();
  window.location.href = 'https://login.skreenit.com/login.html';
});

updateUI();
