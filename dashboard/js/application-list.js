import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

// Global state for filtering
let allApplications = [];

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session || !session.user) { 
        window.location.href = CONFIG.PAGES.LOGIN; 
        return; 
    }
    
    // Role Check
    const role = (session.user.user_metadata?.role || '').toLowerCase();
    if (role !== 'recruiter') {
        window.location.href = CONFIG.PAGES.DASHBOARD_CANDIDATE;
        return;
    }

    document.getElementById('recruiterName').textContent = session.user.user_metadata.full_name || "Recruiter";
    loadApplications();
}

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = CONFIG.PAGES.LOGIN;
    });

    // Search Input Listener
    document.getElementById('appSearch').addEventListener('input', (e) => {
        filterApplications(e.target.value, document.getElementById('jobFilter').value);
    });

    // Job Filter Listener
    document.getElementById('jobFilter').addEventListener('change', (e) => {
        filterApplications(document.getElementById('appSearch').value, e.target.value);
    });
}

async function loadApplications() {
    const container = document.getElementById('applicationListContainer');
    if (container) container.innerHTML = '<div style="padding:2rem; text-align:center;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';

    try {
        // 1. Fetch Data First
        const urlParams = new URLSearchParams(window.location.search);
        const targetJobId = urlParams.get('job_id');
        
        let endpoint = '/recruiter/applications';
        if (targetJobId) endpoint += `?job_id=${targetJobId}`;

        const res = await backendGet(endpoint);
        const json = await handleResponse(res);
        
        // 2. Assign to global variable
        allApplications = json.data || [];

        // 3. Populate the dropdown
        populateJobFilter(allApplications);

        // 4. Update Header Title if we came from a specific job
        if (targetJobId && allApplications.length > 0) {
            const title = allApplications[0].job_title;
            const header = document.getElementById('pageHeaderTitle');
            if (header) header.textContent = `Applications for ${title}`;
            
            const dropdown = document.getElementById('jobFilter');
            if (dropdown) dropdown.value = title;
        }

        // 5. Finally, Render
        renderList(allApplications);

    } catch (err) {
        console.error("Load failed:", err);
        if (container) container.innerHTML = `<p style="color:red; padding:20px;">Error loading data.</p>`;
    }
}

function renderList(apps) {
    const container = document.getElementById('applicationListContainer');
    if (!container) return;

    if (apps.length === 0) {
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: #64748b;">No applications found.</div>`;
        return;
    }

    // This matches the .app-row grid in your HTML
    container.innerHTML = apps.map(app => {
        const status = (app.status || 'pending').toLowerCase();
        const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
        
        const name = app.candidate_name || 'Candidate';
        const dateStr = new Date(app.applied_at).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        return `
        <div class="app-row app-item-row" onclick="window.location.href='application-details.html?id=${app.id}'">
            <div class="candidate-box">
                <div class="avatar-sm">${name.charAt(0).toUpperCase()}</div>
                <div>
                    <div style="font-weight: 600; color: #1e293b; font-size: 0.9rem;">${name}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">${app.candidate_email || ''}</div>
                </div>
            </div>
            <div style="font-weight: 500; color: #334155; font-size: 0.9rem;">${app.job_title || 'N/A'}</div>
            <div style="color: #64748b; font-size: 0.85rem;">${dateStr}</div>
            <div>
                <span class="status-pill status-${status}">${displayStatus}</span>
            </div>
            <div style="text-align: right; color: #cbd5e0;">
                <i class="fas fa-chevron-right"></i>
            </div>
        </div>
        `;
    }).join('');
}
function populateJobFilter(apps) {
    const jobTitles = [...new Set(apps.map(a => a.job_title))];
    const select = document.getElementById('jobFilter');
    
    // Clear existing (except first)
    select.innerHTML = '<option value="all">All Jobs</option>';
    
    jobTitles.sort().forEach(title => {
        const option = document.createElement('option');
        option.value = title;
        option.textContent = title;
        select.appendChild(option);
    });
}

//Manual Filter Function
function filterApplications(searchTerm, jobFilter) {
    const term = (searchTerm || '').toLowerCase().trim();
    
    // ✅ UPDATE HEADER TITLE DYNAMICALLY
    const header = document.getElementById('pageHeaderTitle');
    if (header) {
        if (jobFilter === 'all') {
            header.textContent = "Received Applications"; // Default Text
        } else {
            header.textContent = `Applications for ${jobFilter}`;
        }
    }

    const filtered = allApplications.filter(app => {
        const nameMatch = (app.candidate_name || '').toLowerCase().includes(term);
        const emailMatch = (app.candidate_email || '').toLowerCase().includes(term);
        const jobMatch = jobFilter === 'all' || app.job_title === jobFilter;
        
        return (nameMatch || emailMatch) && jobMatch;
    });

    renderList(filtered);
}