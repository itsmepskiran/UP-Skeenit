import { supabase } from '@shared/js/supabase-config.js';
import { backendPut, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

// State
let currentStep = 1;
const totalSteps = 5;
let experienceCount = 0;
let educationCount = 0;
let skills = [];

// Define variables
let form, nextBtn, prevBtn, submitBtn, steps, sections, successModal, logoutBtn, goToDashboardBtn;
let resumeInput, skillInput, addSkillBtn, skillsContainer;
let addExpBtn, addEduBtn;

/* -------------------------------------------------------
   MAIN INITIALIZATION
------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    form = document.getElementById('applicationForm');
    nextBtn = document.getElementById('nextBtn');
    prevBtn = document.getElementById('prevBtn');
    submitBtn = document.getElementById('submitBtn');
    steps = document.querySelectorAll('.step-item'); 
    sections = document.querySelectorAll('.form-section');
    successModal = document.getElementById('successModal');
    logoutBtn = document.getElementById('logoutBtn');
    goToDashboardBtn = document.getElementById('goToDashboardBtn');
    
    resumeInput = document.getElementById('resumeFile');
    skillInput = document.getElementById('skillInput');
    addSkillBtn = document.getElementById('addSkillBtn');
    skillsContainer = document.getElementById('skillsContainer');
    addExpBtn = document.getElementById('addExperience');
    addEduBtn = document.getElementById('addEducation');

    setupEventListeners();
    checkAuth();
    updateUI();
});

/* -------------------------------------------------------
   AUTH & SIDEBAR
------------------------------------------------------- */
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) { window.location.href = CONFIG.PAGES.LOGIN; return; }
  
  const user = session.user;
  if ((user.user_metadata?.role || '').toLowerCase() !== 'candidate') {
    window.location.href = CONFIG.PAGES.DASHBOARD_RECRUITER; return;
  }
  
  updateSidebarProfile(user);

  if(form) {
      setVal('full_name', user.user_metadata.full_name || '');
      setVal('email', user.email || '');
      if (user.user_metadata.mobile) setVal('phone', user.user_metadata.mobile);
      if (user.user_metadata.location) setVal('location', user.user_metadata.location);
  }
}

function updateSidebarProfile(user) {
    const nameEl = document.getElementById("userName");
    const avatarEl = document.getElementById("userAvatar"); 
    if(nameEl) nameEl.textContent = user.user_metadata.full_name || user.email.split('@')[0];
    if(avatarEl) {
        if (user.user_metadata.avatar_url) {
            avatarEl.innerHTML = `<img src="${user.user_metadata.avatar_url}" style="width:100%; height:100%; object-fit:cover;">`;
        } else {
            const initials = (user.user_metadata.full_name || user.email).match(/\b\w/g) || [];
            const text = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
            avatarEl.innerHTML = `<span>${text}</span>`;
            avatarEl.style.backgroundColor = "#e0e7ff"; avatarEl.style.color = "#3730a3"; 
            avatarEl.style.display = "flex"; avatarEl.style.alignItems = "center"; avatarEl.style.justifyContent = "center";
        }
    }
}

function setVal(name, val) {
    const el = document.querySelector(`[name="${name}"]`);
    if(el) el.value = val;
}

/* -------------------------------------------------------
   UI & NAVIGATION
------------------------------------------------------- */
function updateUI() {
  if(steps) {
      steps.forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        if (stepNum === currentStep) { step.classList.add('active'); step.classList.remove('completed'); } 
        else if (stepNum < currentStep) { step.classList.add('completed'); step.classList.remove('active'); } 
        else { step.classList.remove('active', 'completed'); }
      });
  }
  if(sections) {
      sections.forEach(section => {
        if(section.id === `step${currentStep}`) section.classList.add('active');
        else section.classList.remove('active');
      });
  }
  if (prevBtn) prevBtn.style.visibility = (currentStep === 1) ? 'hidden' : 'visible';
  
  if (currentStep === totalSteps) {
    if(nextBtn) nextBtn.style.display = 'none';
    if(submitBtn) submitBtn.style.display = 'block';
  } else {
    if(nextBtn) nextBtn.style.display = 'block';
    if(submitBtn) submitBtn.style.display = 'none';
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupEventListeners() {
    if(nextBtn) nextBtn.addEventListener('click', () => { if (validateStep(currentStep)) { currentStep++; updateUI(); } });
    if(prevBtn) prevBtn.addEventListener('click', () => { if(currentStep > 1) { currentStep--; updateUI(); } });
    if(addExpBtn) addExpBtn.addEventListener('click', addExperienceField);
    if(addEduBtn) addEduBtn.addEventListener('click', addEducationField);
    if(addSkillBtn) addSkillBtn.addEventListener('click', () => addSkill(skillInput?.value.trim()));
    if(skillInput) skillInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput.value.trim()); } });
    if(resumeInput) resumeInput.addEventListener('change', (e) => { if (e.target.files[0]) document.getElementById('resumeFileName').textContent = e.target.files[0].name; });
    if(form) form.addEventListener('submit', handleFormSubmit);
    if(logoutBtn) logoutBtn.addEventListener('click', async () => { await supabase.auth.signOut(); window.location.href = CONFIG.PAGES.LOGIN; });
    if(goToDashboardBtn) goToDashboardBtn.addEventListener('click', () => { window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; });
    document.querySelectorAll('.nav-item').forEach(item => { item.addEventListener('click', () => { if(item.textContent.trim().toLowerCase().includes('dashboard')) window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE; }); });
}

function validateStep(step) {
  const currentSection = document.getElementById(`step${step}`);
  if(!currentSection) return true;
  const inputs = currentSection.querySelectorAll('input[required], textarea[required]');
  let isValid = true;
  inputs.forEach(input => {
    if (!input.value.trim()) { isValid = false; input.style.borderColor = "#e53e3e"; } 
    else { input.style.borderColor = ""; }
  });
  if (!isValid) alert('Please fill in all required fields.');
  return isValid;
}

/* -------------------------------------------------------
   DYNAMIC CONTENT
------------------------------------------------------- */
function addExperienceField() {
    experienceCount++;
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.style.cssText = "background:#f8fafc; padding:1rem; border-radius:8px; margin-bottom:1rem; border:1px solid #e2e8f0;";
    div.innerHTML = `<div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;"><h4>Experience ${experienceCount}</h4><button type="button" class="btn-remove" style="color:#e53e3e; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;"><div class="form-group"><label>Title*</label><input type="text" name="exp_title_${experienceCount}" required></div><div class="form-group"><label>Company*</label><input type="text" name="exp_company_${experienceCount}" required></div><div class="form-group"><label>Start*</label><input type="date" name="exp_start_${experienceCount}" required></div><div class="form-group"><label>End</label><input type="date" name="exp_end_${experienceCount}"></div><div class="form-group" style="grid-column:span 2;"><label>Desc</label><textarea name="exp_desc_${experienceCount}"></textarea></div></div>`;
    div.querySelector('.btn-remove').onclick = () => div.remove();
    document.getElementById('experienceContainer').appendChild(div);
}

function addEducationField() {
    educationCount++;
    const div = document.createElement('div');
    div.className = 'dynamic-item';
    div.style.cssText = "background:#f8fafc; padding:1rem; border-radius:8px; margin-bottom:1rem; border:1px solid #e2e8f0;";
    div.innerHTML = `<div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;"><h4>Education ${educationCount}</h4><button type="button" class="btn-remove" style="color:#e53e3e; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button></div><div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem;"><div class="form-group"><label>Degree*</label><input type="text" name="edu_degree_${educationCount}" required></div><div class="form-group"><label>Institution*</label><input type="text" name="edu_school_${educationCount}" required></div><div class="form-group"><label>Year*</label><input type="number" name="edu_year_${educationCount}" required></div></div>`;
    div.querySelector('.btn-remove').onclick = () => div.remove();
    document.getElementById('educationContainer').appendChild(div);
}

function addSkill(skill) {
  if (skill && !skills.includes(skill)) { skills.push(skill); renderSkills(); }
  if(skillInput) skillInput.value = '';
}
function renderSkills() {
  if(!skillsContainer) return;
  skillsContainer.innerHTML = skills.map(s => `<span class="skill-tag" style="background:#edf2f7; padding:0.25rem 0.75rem; border-radius:15px; margin-right:5px; display:inline-block; margin-bottom:5px;">${s} <i class="fas fa-times" onclick="window.removeSkill('${s}')" style="cursor:pointer; margin-left:5px; color:#e53e3e;"></i></span>`).join('');
}
window.removeSkill = (s) => { skills = skills.filter(k => k !== s); renderSkills(); };

/* -------------------------------------------------------
   SUBMISSION (FIXED)
------------------------------------------------------- */
async function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateStep(currentStep)) return;
  if (resumeInput && !resumeInput.files[0]) { alert("Please upload your resume."); return; }

  submitBtn.disabled = true; submitBtn.textContent = "Submitting...";

  try {
    const fd = new FormData(form);
    
    // 1. Collect Experience
    let experience = [];
    document.querySelectorAll('#experienceContainer .dynamic-item').forEach(item => {
        const inputs = item.querySelectorAll('input, textarea');
        let exp = {};
        inputs.forEach(i => {
            if(i.name.includes('title')) exp.title = i.value;
            if(i.name.includes('company')) exp.company = i.value;
            if(i.name.includes('start')) exp.start_date = i.value;
            if(i.name.includes('end')) exp.end_date = i.value;
            if(i.name.includes('desc')) exp.description = i.value;
        });
        experience.push(exp);
    });

    // 2. Collect Education (✅ Added this missing part)
    let education = [];
    document.querySelectorAll('#educationContainer .dynamic-item').forEach(item => {
        const inputs = item.querySelectorAll('input');
        let edu = {};
        inputs.forEach(i => {
            if(i.name.includes('degree')) edu.degree = i.value;
            if(i.name.includes('school')) edu.institution = i.value;
            if(i.name.includes('year')) edu.completion_year = i.value;
        });
        education.push(edu);
    });

    const payload = new FormData();
    payload.append('full_name', fd.get('full_name'));
    payload.append('phone', fd.get('phone') || '');
    payload.append('location', fd.get('location') || '');
    payload.append('summary', fd.get('summary') || '');
    payload.append('linkedin_url', fd.get('linkedin_url') || '');
    payload.append('portfolio_url', fd.get('portfolio_url') || '');
    payload.append('skills', JSON.stringify(skills));
    payload.append('experience', JSON.stringify(experience));
    payload.append('education', JSON.stringify(education)); // ✅ Send Education
    if(resumeInput.files[0]) payload.append('resume', resumeInput.files[0]);

    const response = await backendPut('/applicant/profile', payload);
    await handleResponse(response);
    
    await supabase.auth.updateUser({ data: { onboarded: true } });

    if(successModal) successModal.style.display = 'flex';
  } catch (err) {
    console.error(err); alert(`Submission failed: ${err.message}`);
    submitBtn.disabled = false; submitBtn.textContent = "Submit Application";
  }
}