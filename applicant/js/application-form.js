import { supabase } from 'https://auth.skreenit.com/assets/js/supabase-config.js';
import { backendGet, backendPost, handleResponse } from 'https://auth.skreenit.com/assets/js/backend-client.js';

    const form = document.getElementById('detailedApplicationForm');
    const steps = Array.from(document.querySelectorAll('.form-step'));
    const progressFill = document.getElementById('progressFill');
    const stepIndicators = Array.from(document.querySelectorAll('.progress-steps .step'));

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const reviewBtn = document.getElementById('reviewBtn');
    const submitBtn = document.getElementById('submitBtn');

    const reviewContent = document.getElementById('reviewContent');
    const logoutBtn = document.getElementById('logoutBtn');
    const successModal = document.getElementById('successModal');
    const goToDashboardBtn = document.getElementById('goToDashboardBtn');

    const saveDraftButtons = Array.from(document.querySelectorAll('[data-save-draft]'));

    const educationContainer = document.getElementById('educationContainer');
    const certificationContainer = document.getElementById('certificationContainer');
    const experienceContainer = document.getElementById('experienceContainer');

    const addEducationBtn = document.getElementById('addEducationBtn');
    const addCertificationBtn = document.getElementById('addCertificationBtn');
    const addExperienceBtn = document.getElementById('addExperienceBtn');

    let currentStep = 1;
    let autoSaveIntervalId = null;

    // ---------- AUTH & ROLE CHECK ----------
    async function ensureCandidate() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        window.location.href = 'https://www.skreenit.com/login';
        return null;
      }
      const user = data.user;
      const role = user.user_metadata?.role;
      if (role !== 'candidate') {
        window.location.href = 'https://www.skreenit.com/recruiter';
        return null;
      }
      const emailEl = document.getElementById('email');
      if (emailEl && !emailEl.value && user.email) {
        emailEl.value = user.email;
      }
      return user;
    }

    // ---------- STEP NAVIGATION ----------
    function showStep(step) {
      currentStep = step;
      steps.forEach((s, idx) => {
        s.classList.toggle('active', idx + 1 === step);
      });

      stepIndicators.forEach((ind, idx) => {
        ind.classList.toggle('active', idx + 1 === step);
      });

      const pct = ((step - 1) / (steps.length - 1)) * 100;
      if (progressFill) progressFill.style.width = pct + '%';

      prevBtn.style.display = step > 1 ? 'inline-flex' : 'none';

      if (step < steps.length) {
        nextBtn.style.display = 'inline-flex';
        reviewBtn.style.display = 'none';
        submitBtn.style.display = 'none';
      } else {
        nextBtn.style.display = 'none';
        reviewBtn.style.display = 'inline-flex';
        submitBtn.style.display = 'inline-flex';
      }
    }

    function validateStep(step) {
      const stepEl = steps[step - 1];
      if (!stepEl) return true;
      const requiredFields = Array.from(stepEl.querySelectorAll('[required]'));
      let valid = true;
      requiredFields.forEach(field => {
        if (!field.checkValidity()) {
          valid = false;
          field.classList.add('field-error');
        } else {
          field.classList.remove('field-error');
        }
      });
      return valid;
    }

    function validateAllSteps() {
      let allValid = true;
      for (let i = 1; i <= steps.length; i++) {
        if (!validateStep(i)) allValid = false;
      }
      return allValid;
    }

    // ---------- DYNAMIC BLOCKS ----------
    function createEducationBlock(data = {}) {
      const wrapper = document.createElement('div');
      wrapper.className = 'dynamic-block';
      wrapper.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label>Degree *</label>
            <input type="text" name="educationDegree" required value="${data.degree || ''}">
          </div>
          <div class="form-group">
            <label>Institution *</label>
            <input type="text" name="educationInstitution" required value="${data.institution || ''}">
          </div>
          <div class="form-group">
            <label>Year of Completion</label>
            <input type="text" name="educationYear" value="${data.year || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Specialization</label>
          <input type="text" name="educationSpecialization" value="${data.specialization || ''}">
        </div>
        <button type="button" class="remove-btn"><i class="fas fa-trash"></i> Remove</button>
      `;
      wrapper.querySelector('.remove-btn').addEventListener('click', () => wrapper.remove());
      return wrapper;
    }

    function createCertificationBlock(data = {}) {
      const wrapper = document.createElement('div');
      wrapper.className = 'dynamic-block';
      wrapper.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label>Certification Name *</label>
            <input type="text" name="certName" required value="${data.name || ''}">
          </div>
          <div class="form-group">
            <label>Issuing Organization</label>
            <input type="text" name="certOrg" value="${data.organization || ''}">
          </div>
          <div class="form-group">
            <label>Year</label>
            <input type="text" name="certYear" value="${data.year || ''}">
          </div>
        </div>
        <button type="button" class="remove-btn"><i class="fas fa-trash"></i> Remove</button>
      `;
      wrapper.querySelector('.remove-btn').addEventListener('click', () => wrapper.remove());
      return wrapper;
    }

    function createExperienceBlock(data = {}) {
      const wrapper = document.createElement('div');
      wrapper.className = 'dynamic-block';
      wrapper.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label>Company *</label>
            <input type="text" name="expCompany" required value="${data.company || ''}">
          </div>
          <div class="form-group">
            <label>Role/Title *</label>
            <input type="text" name="expRole" required value="${data.role || ''}">
          </div>
          <div class="form-group">
            <label>Location</label>
            <input type="text" name="expLocation" value="${data.location || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Start Date</label>
            <input type="month" name="expStart" value="${data.start_date || ''}">
          </div>
          <div class="form-group">
            <label>End Date</label>
            <input type="month" name="expEnd" value="${data.end_date || ''}">
          </div>
        </div>
        <div class="form-group">
          <label>Responsibilities / Achievements</label>
          <textarea name="expDescription" rows="3">${data.description || ''}</textarea>
        </div>
        <button type="button" class="remove-btn"><i class="fas fa-trash"></i> Remove</button>
      `;
      wrapper.querySelector('.remove-btn').addEventListener('click', () => wrapper.remove());
      return wrapper;
    }

    addEducationBtn.addEventListener('click', () => {
      educationContainer.appendChild(createEducationBlock());
    });

    addCertificationBtn.addEventListener('click', () => {
      certificationContainer.appendChild(createCertificationBlock());
    });

    addExperienceBtn.addEventListener('click', () => {
      experienceContainer.appendChild(createExperienceBlock());
    });

    // ---------- ADDRESS SYNC ----------
    function setupAddressSync() {
      const cb = document.getElementById('sameAsPermanent');
      const current = document.getElementById('currentAddress');
      const perm = document.getElementById('permanentAddress');
      if (!cb || !current || !perm) return;

      function applySync() {
        if (cb.checked) {
          perm.value = current.value;
          perm.setAttribute('readonly', 'readonly');
        } else {
          perm.removeAttribute('readonly');
        }
      }

      cb.addEventListener('change', applySync);
      current.addEventListener('input', () => {
        if (cb.checked) perm.value = current.value;
      });

      applySync();
    }

    // ---------- DYNAMIC LOCATION ----------
    function setupDynamicLocation() {
      const countryInput = document.getElementById('country');
      const stateInput = document.getElementById('state');
      const cityInput = document.getElementById('city');
      const countryList = document.getElementById('countryList');
      const stateList = document.getElementById('stateList');
      const cityList = document.getElementById('cityList');
      if (!countryInput || !stateInput || !cityInput) return;

      const API_BASE = 'https://countriesnow.space/api/v0.1';
      const TTL_MS = 7 * 24 * 60 * 60 * 1000;

      function setOptions(listEl, items) {
        if (!listEl) return;
        listEl.innerHTML = (items || [])
          .map(v => `<option value="${(v || '').toString().replaceAll('"', '&quot;')}"></option>`)
          .join('');
      }

      function getCache(key) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          const obj = JSON.parse(raw);
          if (!obj || !obj.t || (Date.now() - obj.t) > TTL_MS) return null;
          return obj.v;
        } catch {
          return null;
        }
      }

      function setCache(key, value) {
        try {
          localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
        } catch {}
      }

      async function fetchCountries() {
        const cacheKey = 'cn_countries_names';
        const cached = getCache(cacheKey);
        if (cached) return cached;
        const res = await fetch(`${API_BASE}/countries/`).catch(() => null);
        const js = await res?.json().catch(() => null);
        const arr = js?.data?.map?.(x => x.country).filter(Boolean) || [];
        setCache(cacheKey, arr);
        return arr;
      }

      async function fetchStates(country) {
        const cacheKey = `cn_states_${country}`;
        const cached = getCache(cacheKey);
        if (cached) return cached;
        const res = await fetch(`${API_BASE}/countries/states`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country })
        }).catch(() => null);
        const js = await res?.json().catch(() => null);
        const arr = js?.data?.states?.map?.(s => s.name).filter(Boolean) || [];
        setCache(cacheKey, arr);
        return arr;
      }

      async function fetchCities(country, state) {
        const cacheKey = `cn_cities_${country}_${state}`;
        const cached = getCache(cacheKey);
        if (cached) return cached;
        const res = await fetch(`${API_BASE}/countries/state/cities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country, state })
        }).catch(() => null);
        const js = await res?.json().catch(() => null);
        const arr = js?.data || [];
        setCache(cacheKey, arr);
        return arr;
      }

      fetchCountries().then(countries => setOptions(countryList, countries)).catch(() => {});

      async function onCountryChange() {
        const c = countryInput.value;
        const states = c ? await fetchStates(c).catch(() => []) : [];
        setOptions(stateList, states);
        if (!states.includes(stateInput.value)) stateInput.value = '';
        setOptions(cityList, []);
        cityInput.value = '';
      }

      async function onStateChange() {
        const c = countryInput.value;
        const s = stateInput.value;
        const cities = (c && s) ? await fetchCities(c, s).catch(() => []) : [];
        setOptions(cityList, cities);
        if (!(cities || []).includes(cityInput.value)) cityInput.value = '';
      }

      countryInput.addEventListener('change', onCountryChange);
      stateInput.addEventListener('change', onStateChange);

      (async () => {
        await onCountryChange();
        await onStateChange();
      })();
    }

    // ---------- DATA SERIALIZATION ----------
    function collectFormData() {
      const data = {};

      data.personal = {
        first_name: document.getElementById('firstName').value || '',
        middle_name: document.getElementById('middleName').value || '',
        last_name: document.getElementById('lastName').value || '',
        date_of_birth: document.getElementById('dateOfBirth').value || '',
        gender: document.getElementById('gender').value || '',
        marital_status: document.getElementById('maritalStatus').value || '',
        nationality: document.getElementById('nationality').value || '',
        languages: document.getElementById('languages').value || ''
      };

      data.contact = {
        email: document.getElementById('email').value || '',
        phone: document.getElementById('phone').value || '',
        alternate_phone: document.getElementById('alternatePhone').value || '',
        current_address: document.getElementById('currentAddress').value || '',
        city: document.getElementById('city').value || '',
        state: document.getElementById('state').value || '',
        zip_code: document.getElementById('zipCode').value || '',
        country: document.getElementById('country').value || '',
        permanent_address: document.getElementById('permanentAddress').value || ''
      };

      data.education = Array.from(educationContainer.querySelectorAll('.dynamic-block')).map(block => ({
        degree: block.querySelector('input[name="educationDegree"]')?.value || '',
        institution: block.querySelector('input[name="educationInstitution"]')?.value || '',
        year: block.querySelector('input[name="educationYear"]')?.value || '',
        specialization: block.querySelector('input[name="educationSpecialization"]')?.value || ''
      }));

      data.certifications = Array.from(certificationContainer.querySelectorAll('.dynamic-block')).map(block => ({
        name: block.querySelector('input[name="certName"]')?.value || '',
        organization: block.querySelector('input[name="certOrg"]')?.value || '',
        year: block.querySelector('input[name="certYear"]')?.value || ''
      }));

      data.experience = Array.from(experienceContainer.querySelectorAll('.dynamic-block')).map(block => ({
        company: block.querySelector('input[name="expCompany"]')?.value || '',
        role: block.querySelector('input[name="expRole"]')?.value || '',
        location: block.querySelector('input[name="expLocation"]')?.value || '',
        start_date: block.querySelector('input[name="expStart"]')?.value || '',
        end_date: block.querySelector('input[name="expEnd"]')?.value || '',
        description: block.querySelector('textarea[name="expDescription"]')?.value || ''
      }));

      data.skills = {
        technical_skills: document.getElementById('technicalSkills').value || '',
        programming_languages: document.getElementById('programmingLanguages').value || '',
        frameworks: document.getElementById('frameworks').value || '',
        databases: document.getElementById('databases').value || '',
        tools: document.getElementById('tools').value || '',
        soft_skills: document.getElementById('softSkills').value || '',
        achievements: document.getElementById('achievements').value || '',
        projects: document.getElementById('projects').value || ''
      };

      data.documents_meta = {
        portfolio_links: (document.getElementById('portfolioLinks').value || '')
          .split('\n')
          .map(x => x.trim())
          .filter(Boolean)
      };

      data.additional = {
        additional_info: document.getElementById('additionalInfo').value || '',
        terms_accept: document.getElementById('termsAccept').checked,
        data_consent: document.getElementById('dataConsent').checked
      };

      return data;
    }

    // ---------- REVIEW RENDER ----------
    function renderReview() {
      const data = collectFormData();
      reviewContent.innerHTML = '';

      function addBlock(title, items) {
        const block = document.createElement('div');
        block.className = 'review-block';
        block.innerHTML = `<h4>${title}</h4>`;
        items.forEach(item => {
          const div = document.createElement('div');
          div.className = 'review-item';
          div.innerHTML = `<span class="review-label">${item.label}:</span> ${item.value || '<em>Not provided</em>'}`;
          block.appendChild(div);
        });
        reviewContent.appendChild(block);
      }

      addBlock('Personal Information', [
        { label: 'Name', value: `${data.personal.first_name} ${data.personal.middle_name} ${data.personal.last_name}`.trim() },
        { label: 'Date of Birth', value: data.personal.date_of_birth },
        { label: 'Gender', value: data.personal.gender },
        { label: 'Marital Status', value: data.personal.marital_status },
        { label: 'Nationality', value: data.personal.nationality },
        { label: 'Languages', value: data.personal.languages }
      ]);

      addBlock('Contact Information', [
        { label: 'Email', value: data.contact.email },
        { label: 'Phone', value: data.contact.phone },
        { label: 'Alternate Phone', value: data.contact.alternate_phone },
        { label: 'Current Address', value: data.contact.current_address },
        { label: 'City', value: data.contact.city },
        { label: 'State', value: data.contact.state },
        { label: 'ZIP', value: data.contact.zip_code },
        { label: 'Country', value: data.contact.country },
        { label: 'Permanent Address', value: data.contact.permanent_address }
      ]);

      if (data.education.length) {
        data.education.forEach((ed, idx) => {
          addBlock(`Education #${idx + 1}`, [
            { label: 'Degree', value: ed.degree },
            { label: 'Institution', value: ed.institution },
            { label: 'Year', value: ed.year },
            { label: 'Specialization', value: ed.specialization }
          ]);
        });
      }

      if (data.certifications.length) {
        data.certifications.forEach((c, idx) => {
          addBlock(`Certification #${idx + 1}`, [
            { label: 'Name', value: c.name },
            { label: 'Organization', value: c.organization },
            { label: 'Year', value: c.year }
          ]);
        });
      }

      if (data.experience.length) {
        data.experience.forEach((ex, idx) => {
          addBlock(`Experience #${idx + 1}`, [
            { label: 'Company', value: ex.company },
            { label: 'Role', value: ex.role },
            { label: 'Location', value: ex.location },
            { label: 'Start Date', value: ex.start_date },
            { label: 'End Date', value: ex.end_date },
            { label: 'Description', value: ex.description }
          ]);
        });
      }

      addBlock('Skills', [
        { label: 'Technical Skills', value: data.skills.technical_skills },
        { label: 'Programming Languages', value: data.skills.programming_languages },
        { label: 'Frameworks', value: data.skills.frameworks },
        { label: 'Databases', value: data.skills.databases },
        { label: 'Tools & Technologies', value: data.skills.tools },
        { label: 'Soft Skills', value: data.skills.soft_skills },
        { label: 'Achievements', value: data.skills.achievements },
        { label: 'Projects', value: data.skills.projects }
      ]);

      addBlock('Documents & Links', [
        { label: 'Portfolio / Links', value: data.documents_meta.portfolio_links.join(', ') }
      ]);

      addBlock('Additional Information', [
        { label: 'Additional Info', value: data.additional.additional_info },
        { label: 'Terms Accepted', value: data.additional.terms_accept ? 'Yes' : 'No' },
        { label: 'Data Consent', value: data.additional.data_consent ? 'Yes' : 'No' }
      ]);

      reviewContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---------- DRAFT SAVE / LOAD ----------
    async function saveDraft() {
      try {
        const payload = collectFormData();
        await backendPost('/api/v1/applicant/draft', payload);
      } catch (e) {
        console.warn('Draft save failed', e);
      }
    }

    async function loadDraftAndProfile() {
      try {
        const profileRes = await backendGet('/api/v1/applicant/detailed-form');
        const profileData = await handleResponse(profileRes).catch(() => null);

        if (profileData?.personal) {
          const p = profileData.personal;
          if (p.first_name) document.getElementById('firstName').value = p.first_name;
          if (p.middle_name) document.getElementById('middleName').value = p.middle_name;
          if (p.last_name) document.getElementById('lastName').value = p.last_name;
          if (p.date_of_birth) document.getElementById('dateOfBirth').value = p.date_of_birth;
          if (p.gender) document.getElementById('gender').value = p.gender;
          if (p.marital_status) document.getElementById('maritalStatus').value = p.marital_status;
          if (p.nationality) document.getElementById('nationality').value = p.nationality;
          if (p.languages) document.getElementById('languages').value = p.languages;
        }

        if (profileData?.contact) {
          const c = profileData.contact;
          if (c.email) document.getElementById('email').value = c.email;
          if (c.phone) document.getElementById('phone').value = c.phone;
          if (c.alternate_phone) document.getElementById('alternatePhone').value = c.alternate_phone;
          if (c.current_address) document.getElementById('currentAddress').value = c.current_address;
          if (c.city) document.getElementById('city').value = c.city;
          if (c.state) document.getElementById('state').value = c.state;
          if (c.zip_code) document.getElementById('zipCode').value = c.zip_code;
          if (c.country) document.getElementById('country').value = c.country;
          if (c.permanent_address) document.getElementById('permanentAddress').value = c.permanent_address;
        }

        if (Array.isArray(profileData?.education)) {
          profileData.education.forEach(ed => educationContainer.appendChild(createEducationBlock(ed)));
        }

        if (Array.isArray(profileData?.certifications)) {
          profileData.certifications.forEach(c => certificationContainer.appendChild(createCertificationBlock(c)));
        }

        if (Array.isArray(profileData?.experience)) {
          profileData.experience.forEach(ex => experienceContainer.appendChild(createExperienceBlock(ex)));
        }

        if (profileData?.skills) {
          const s = profileData.skills;
          if (s.technical_skills) document.getElementById('technicalSkills').value = s.technical_skills;
          if (s.programming_languages) document.getElementById('programmingLanguages').value = s.programming_languages;
          if (s.frameworks) document.getElementById('frameworks').value = s.frameworks;
          if (s.databases) document.getElementById('databases').value = s.databases;
          if (s.tools) document.getElementById('tools').value = s.tools;
          if (s.soft_skills) document.getElementById('softSkills').value = s.soft_skills;
          if (s.achievements) document.getElementById('achievements').value = s.achievements;
          if (s.projects) document.getElementById('projects').value = s.projects;
        }

        if (profileData?.documents_meta?.portfolio_links) {
          document.getElementById('portfolioLinks').value = profileData.documents_meta.portfolio_links.join('\n');
        }

        if (profileData?.additional) {
          const a = profileData.additional;
          if (a.additional_info) document.getElementById('additionalInfo').value = a.additional_info;
          if (a.terms_accept) document.getElementById('termsAccept').checked = true;
          if (a.data_consent) document.getElementById('dataConsent').checked = true;
        }
      } catch (e) {
        console.warn('Profile prefill failed', e);
      }

      try {
        const draftRes = await backendGet('/api/v1/applicant/draft');
        const draftData = await handleResponse(draftRes).catch(() => null);
        const draft = draftData?.data || {};

        if (draft.personal) {
          const p = draft.personal;
          if (p.first_name && !document.getElementById('firstName').value) document.getElementById('firstName').value = p.first_name;
          if (p.middle_name && !document.getElementById('middleName').value) document.getElementById('middleName').value = p.middle_name;
          if (p.last_name && !document.getElementById('lastName').value) document.getElementById('lastName').value = p.last_name;
          if (p.date_of_birth && !document.getElementById('dateOfBirth').value) document.getElementById('dateOfBirth').value = p.date_of_birth;
          if (p.gender && !document.getElementById('gender').value) document.getElementById('gender').value = p.gender;
          if (p.marital_status && !document.getElementById('maritalStatus').value) document.getElementById('maritalStatus').value = p.marital_status;
          if (p.nationality && !document.getElementById('nationality').value) document.getElementById('nationality').value = p.nationality;
          if (p.languages && !document.getElementById('languages').value) document.getElementById('languages').value = p.languages;
        }

        if (draft.contact) {
          const c = draft.contact;
          if (c.email && !document.getElementById('email').value) document.getElementById('email').value = c.email;
          if (c.phone && !document.getElementById('phone').value) document.getElementById('phone').value = c.phone;
          if (c.alternate_phone && !document.getElementById('alternatePhone').value) document.getElementById('alternatePhone').value = c.alternate_phone;
          if (c.current_address && !document.getElementById('currentAddress').value) document.getElementById('currentAddress').value = c.current_address;
          if (c.city && !document.getElementById('city').value) document.getElementById('city').value = c.city;
          if (c.state && !document.getElementById('state').value) document.getElementById('state').value = c.state;
          if (c.zip_code && !document.getElementById('zipCode').value) document.getElementById('zipCode').value = c.zip_code;
          if (c.country && !document.getElementById('country').value) document.getElementById('country').value = c.country;
          if (c.permanent_address && !document.getElementById('permanentAddress').value) document.getElementById('permanentAddress').value = c.permanent_address;
        }

        if (Array.isArray(draft.education) && !educationContainer.children.length) {
          draft.education.forEach(ed => educationContainer.appendChild(createEducationBlock(ed)));
        }

        if (Array.isArray(draft.certifications) && !certificationContainer.children.length) {
          draft.certifications.forEach(c => certificationContainer.appendChild(createCertificationBlock(c)));
        }

        if (Array.isArray(draft.experience) && !experienceContainer.children.length) {
          draft.experience.forEach(ex => experienceContainer.appendChild(createExperienceBlock(ex)));
        }

        if (draft.skills) {
          const s = draft.skills;
          if (s.technical_skills && !document.getElementById('technicalSkills').value) document.getElementById('technicalSkills').value = s.technical_skills;
          if (s.programming_languages && !document.getElementById('programmingLanguages').value) document.getElementById('programmingLanguages').value = s.programming_languages;
          if (s.frameworks && !document.getElementById('frameworks').value) document.getElementById('frameworks').value = s.frameworks;
          if (s.databases && !document.getElementById('databases').value) document.getElementById('databases').value = s.databases;
          if (s.tools && !document.getElementById('tools').value) document.getElementById('tools').value = s.tools;
          if (s.soft_skills && !document.getElementById('softSkills').value) document.getElementById('softSkills').value = s.soft_skills;
          if (s.achievements && !document.getElementById('achievements').value) document.getElementById('achievements').value = s.achievements;
          if (s.projects && !document.getElementById('projects').value) document.getElementById('projects').value = s.projects;
        }

        if (draft.documents_meta?.portfolio_links && !document.getElementById('portfolioLinks').value) {
          document.getElementById('portfolioLinks').value = draft.documents_meta.portfolio_links.join('\n');
        }

        if (draft.additional) {
          const a = draft.additional;
          if (a.additional_info && !document.getElementById('additionalInfo').value) document.getElementById('additionalInfo').value = a.additional_info;
          if (a.terms_accept) document.getElementById('termsAccept').checked = true;
          if (a.data_consent) document.getElementById('dataConsent').checked = true;
        }
      } catch (e) {
        console.warn('Draft prefill failed', e);
      }

      try {
        const emailEl = document.getElementById('email');
        if (emailEl && !emailEl.value) {
          const { data } = await supabase.auth.getUser();
          const u = data?.user;
          if (u?.email) emailEl.value = u.email;
        }
      } catch (e) {
        console.warn('Email prefill fallback failed', e);
      }
    }

    // ---------- FILE UPLOAD ----------
    async function uploadDocuments() {
      const resumeInput = document.getElementById('resume');
      if (!resumeInput?.files?.length) {
        throw new Error('Resume is required');
      }

      const formData = new FormData();
      formData.append('resume', resumeInput.files[0]);

      const coverLetterInput = document.getElementById('coverLetter');
      if (coverLetterInput?.files?.length) {
        formData.append('cover_letter', coverLetterInput.files[0]);
      }

      const portfolioInput = document.getElementById('portfolio');
      if (portfolioInput?.files?.length) {
        Array.from(portfolioInput.files).forEach((f, idx) => {
          formData.append(`portfolio_${idx}`, f);
        });
      }

      const certificatesInput = document.getElementById('certificates');
      if (certificatesInput?.files?.length) {
        Array.from(certificatesInput.files).forEach((f, idx) => {
          formData.append(`certificate_${idx}`, f);
        });
      }

      const res = await fetch('https://backend.skreenit.com/api/v1/applicant/resume', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Document upload failed');
      }
    }

    // ---------- SUBMIT ----------
    async function submitApplication(event) {
      event.preventDefault();

      const allValid = validateAllSteps();
      if (!allValid) {
        alert('Please fill all required fields before submitting.');
        return;
      }

      const resumeInput = document.getElementById('resume');
      if (!resumeInput?.files?.length) {
        alert('Please upload your resume before submitting.');
        showStep(5);
        return;
      }

      if (!document.getElementById('termsAccept').checked || !document.getElementById('dataConsent').checked) {
        alert('Please accept the terms and data consent before submitting.');
        showStep(6);
        return;
      }

      try {
        const payload = collectFormData();
        await backendPost('/api/v1/applicant/detailed-form', payload);
        await uploadDocuments();
        successModal.classList.add('show');
      } catch (e) {
        console.error('Submit failed', e);
        alert('Failed to submit application. Please try again.');
      }
    }

    // ---------- EVENT BINDINGS ----------
    nextBtn.addEventListener('click', async () => {
      if (!validateStep(currentStep)) return;
      await saveDraft();
      if (currentStep < steps.length) {
        showStep(currentStep + 1);
      }
    });

    prevBtn.addEventListener('click', async () => {
      await saveDraft();
      if (currentStep > 1) {
        showStep(currentStep - 1);
      }
    });

    reviewBtn.addEventListener('click', () => {
      const allValid = validateAllSteps();
      if (!allValid) {
        alert('Please fill all required fields before review.');
        return;
      }
      renderReview();
    });

    submitBtn.addEventListener('click', submitApplication);

    saveDraftButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        await saveDraft();
        alert('Draft saved.');
      });
    });

    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.href = 'https://www.skreenit.com/login';
    });

    goToDashboardBtn.addEventListener('click', () => {
      window.location.href = 'https://www.skreenit.com/applicant';
    });

    // Auto-save every 10 seconds
    function startAutoSave() {
      if (autoSaveIntervalId) clearInterval(autoSaveIntervalId);
      autoSaveIntervalId = setInterval(() => {
        saveDraft().catch(() => {});
      }, 10000);
    }

    // Auto-save on blur of inputs/textareas
    function setupBlurAutoSave() {
      const fields = Array.from(form.querySelectorAll('input, textarea, select'));
      fields.forEach(f => {
        f.addEventListener('blur', () => {
          saveDraft().catch(() => {});
        });
      });
    }

    // ---------- INIT ----------
    (async function init() {
      const user = await ensureCandidate();
      if (!user) return;

      setupAddressSync();
      setupDynamicLocation();
      await loadDraftAndProfile();
      setupBlurAutoSave();
      startAutoSave();
      showStep(1);
    })();