// login/js/registration.js
import { backendPost, handleResponse } from '@shared/js/backend-client.js';
import { notify } from '@shared/js/auth-pages.js';
import { CONFIG } from '@shared/js/config.js';

// 1. Setup Dynamic Assets
const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';

const logoImg = document.getElementById('logoImg');
if (logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

const brandImg = document.getElementById('brandImg');
if (brandImg) brandImg.src = `${authBase}/assets/images/logobrand.png`;

document.getElementById('homeLink').href = CONFIG.PAGES.INDEX;
document.getElementById('loginLink').href = CONFIG.PAGES.LOGIN;
document.getElementById('termsLink').href = CONFIG.PAGES.TERMS;
document.getElementById('privacyLink').href = CONFIG.PAGES.PRIVACY;

// Password Toggle Helper
window.togglePassword = function(id) {
    const input = document.getElementById(id);
    const icon = input.nextElementSibling;
    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
};

// 2. Form Logic
// login/js/registration.js

// ... imports ...

async function handleRegistrationSubmit(event) {
    event.preventDefault();
    console.log("🚀 Starting Registration (FormData Mode)...");

    const form = event.target;
    // 1. Get raw data from the HTML form
    const rawFd = new FormData(form);
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Register';
    const errorBox = document.getElementById("formError");
    if (errorBox) errorBox.textContent = "";

    // Client-side Password Check
    if (rawFd.get("password") !== rawFd.get("confirmPassword")) {
        notify("Passwords do not match", "error");
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }

        // 2. Extract values for validation
        const full_name = rawFd.get('full_name')?.trim();
        const email = rawFd.get('email')?.trim().toLowerCase();
        const mobile = rawFd.get('mobile')?.trim();
        const location = rawFd.get('location')?.trim();
        const role = rawFd.get('role')?.trim();
        const password = rawFd.get('password')?.trim();

        if (!role) throw new Error('Please select a role');
        if (mobile.length < 10) throw new Error('Mobile number must be at least 10 digits');

        // 3. Create a NEW FormData object for the API
        // We do this to manually fix the fields (Role capitalization, etc.)
        const apiFormData = new FormData();
        
        apiFormData.append('full_name', full_name);
        apiFormData.append('email', email);
        apiFormData.append('password', password);
        apiFormData.append('location', location);
        
        // ✅ FIX 1: Send BOTH 'mobile' and 'phone' (Cover all bases)
        apiFormData.append('mobile', mobile);
        apiFormData.append('phone', mobile); 
        apiFormData.append('phone_number', mobile);

        // ✅ FIX 2: Capitalize Role (candidate -> Candidate)
        // This fixes the specific 400 Error from earlier
        const fixedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
        apiFormData.append('role', fixedRole);
        
        // ✅ FIX 3: Add Supabase Redirect URL
        const redirectUrl = window.location.origin + CONFIG.PAGES.CONFIRM_EMAIL;
        apiFormData.append('email_redirect_to', redirectUrl);

        console.log("🚀 Sending FormData...");

        // 4. Send as FormData (Backend expects this!)
        const response = await backendPost('/auth/register', apiFormData);
        const result = await handleResponse(response);

        console.log("✅ Success:", result);

        // Success UI
        const authBody = document.querySelector('.auth-body');
        if (authBody) {
            authBody.innerHTML = `
                <div class="text-center py-8">
                    <div style="color: #28a745; font-size: 3rem; margin-bottom: 1rem;">✓</div>
                    <h2 style="font-size: 1.5rem; font-weight: bold;">Registration Successful!</h2>
                    <p>Please check your email for a confirmation link.</p>
                </div>
            `;
        }

        setTimeout(() => {
            window.location.href = `${CONFIG.PAGES.LOGIN}?registered=true`;
        }, 3000);

    } catch (err) {
        console.error("❌ Error:", err);
        notify(err.message || 'Registration failed.', 'error');
        if (errorBox) errorBox.textContent = err.message;
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    }
}

// ---------------------------------------------------------
// ✅ ATTACH LISTENER (Copy this part exactly!)
// ---------------------------------------------------------
const regForm = document.getElementById("registrationForm");
if (regForm) {
    console.log("✅ Form listener attached.");
    regForm.addEventListener("submit", handleRegistrationSubmit);
} else {
    console.error("❌ form#registrationForm not found!");
}