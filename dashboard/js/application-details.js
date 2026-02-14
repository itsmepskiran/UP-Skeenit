import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Back Button Logic
    document.getElementById('backBtn').addEventListener('click', () => {
        // Try to go back, if not possible (direct link), go to list
        if(window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'application-list.html';
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = CONFIG.PAGES.LOGIN;
    });
});

async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) { window.location.href = CONFIG.PAGES.LOGIN; return; }
    
    document.getElementById('recruiterName').textContent = session.user.user_metadata.full_name || "Recruiter";
    
    // Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const appId = urlParams.get('id');
    
    if(!appId) {
        alert("Invalid Application ID");
        window.location.href = 'application-list.html';
        return;
    }

    loadApplicationDetails(appId);
}

async function loadApplicationDetails(appId) {
    try {
        // Use the new endpoint we created in step 1
        const res = await backendGet(`/recruiter/applications/${appId}`);
        const json = await handleResponse(res);
        const app = json.data || json;

        if (!app) throw new Error("Application not found");

        renderDetails(app);
        setupStatusUpdate(appId);

    } catch (err) {
        console.error("Load failed:", err);
        document.getElementById('loadingState').innerHTML = `<p class="text-danger">Failed to load details. ${err.message}</p>`;
    }
}

function renderDetails(app) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('detailsContent').style.display = 'block';

    // Header Info
    const name = app.candidate_name || "Candidate";
    document.getElementById('candidateName').textContent = name;
    document.getElementById('avatarInitials').textContent = name.charAt(0).toUpperCase();
    document.getElementById('jobTitle').textContent = app.job_title || "Unknown Job";
    
    // Status Dropdown
    document.getElementById('statusSelect').value = (app.status || 'pending').toLowerCase();

    // Sidebar Info
    document.getElementById('candidateEmail').textContent = app.candidate_email || "-";
    document.getElementById('appliedDate').textContent = new Date(app.applied_at).toLocaleDateString();

    // Resume Logic
    const resumeBtn = document.getElementById('resumeLink');
    if (app.resume_link) {
        resumeBtn.href = app.resume_link;
    } else {
        resumeBtn.style.display = 'none';
        document.getElementById('noResume').style.display = 'block';
    }

    // Skills
    const skillsContainer = document.getElementById('skillsContainer');
    if (app.skills && app.skills.length > 0) {
        skillsContainer.innerHTML = app.skills.map(s => `<span class="skill-tag">${s}</span>`).join(' ');
    } else {
        skillsContainer.innerHTML = '<span class="text-muted" style="font-size:0.85rem;">No specific skills listed.</span>';
    }

    // LinkedIn
    if (app.linkedin) {
        document.getElementById('linkedinGroup').style.display = 'block';
        document.getElementById('linkedinLink').href = app.linkedin;
    }

    // Cover Letter
    if (app.cover_letter) {
        document.getElementById('coverLetter').textContent = app.cover_letter;
    }
}

function setupStatusUpdate(appId) {
    const updateBtn = document.getElementById('updateStatusBtn');
    const statusSelect = document.getElementById('statusSelect');
    
    // Modal Elements
    const modal = document.getElementById('interviewModal');
    const container = document.getElementById('modalQuestionsContainer');
    const addBtn = document.getElementById('addQuestionBtn');
    const confirmBtn = document.getElementById('confirmInterviewBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');

    // 1. Listen for "Update Status" Click
    updateBtn.addEventListener('click', async () => {
        const newStatus = statusSelect.value;

        if (newStatus === 'interviewing') {
            // Open Modal to Ask for Questions
            openInterviewModal();
        } else {
            // Normal Status Update (No questions needed)
            performStatusUpdate(appId, newStatus, null);
        }
    });

    // 2. Open Modal Logic
    function openInterviewModal() {
        container.innerHTML = ''; // Clear previous
        addQuestionInput(); // Add one empty input by default
        modal.style.display = 'flex';
    }

    // 3. Add Dynamic Input Field
    function addQuestionInput(value = "") {
        const div = document.createElement('div');
        div.style.cssText = "display:flex; gap:10px; margin-bottom:10px;";
        
        div.innerHTML = `
            <input type="text" class="question-input form-control" placeholder="Type question here..." value="${value}" style="flex:1; padding:8px; border:1px solid #cbd5e0; border-radius:4px;">
            <button class="btn-sm btn-outline-danger" onclick="this.parentElement.remove()" style="border:1px solid #e53e3e; color:#e53e3e; background:white; border-radius:4px; cursor:pointer;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(div);
    }

    // 4. Modal Event Listeners
    addBtn.onclick = () => addQuestionInput();

    cancelBtn.onclick = () => {
        modal.style.display = 'none';
        statusSelect.value = 'pending'; // Reset dropdown to previous state if needed
    };

    confirmBtn.onclick = () => {
        // Collect all inputs
        const inputs = document.querySelectorAll('.question-input');
        const questions = Array.from(inputs)
            .map(input => input.value.trim())
            .filter(val => val !== ""); // Remove empty ones

        if (questions.length === 0) {
            alert("Please add at least one question.");
            return;
        }

        modal.style.display = 'none';
        // Send Status + Questions
        performStatusUpdate(appId, 'interviewing', questions);
    };
}

// 5. Shared API Call
async function performStatusUpdate(appId, newStatus, questions) {
    const btn = document.getElementById('updateStatusBtn');
    btn.disabled = true;
    btn.textContent = "Updating...";

    const payload = { 
        status: newStatus,
        questions: questions // Can be null or an array
    };

    try {
        await backendPost(`/recruiter/applications/${appId}/status`, payload);
        alert("Status updated successfully!");
        location.reload(); 
    } catch (err) {
        console.error("Update failed", err);
        alert("Failed to update status.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Update Status";
    }
}