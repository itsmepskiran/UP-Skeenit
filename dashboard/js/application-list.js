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
    container.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const res = await backendGet('/recruiter/applications');
        const json = await handleResponse(res);
        
        allApplications = json.data || [];

        // 1. Populate Dropdown
        populateJobFilter(allApplications);

        // 2. CHECK URL PARAMETER (The Fix)
        const urlParams = new URLSearchParams(window.location.search);
        const targetJobId = urlParams.get('job_id');

        if (targetJobId) {
            console.log("Filtering for Job ID:", targetJobId);
            
            // STRICT FILTERING: Only keep apps with matching ID
            const filteredApps = allApplications.filter(app => app.job_id === targetJobId);
            
            // Update the Dropdown UI to match (if we found apps)
            if (filteredApps.length > 0) {
                const title = filteredApps[0].job_title;
                const dropdown = document.getElementById('jobFilter');
                if (dropdown) dropdown.value = title;
            }

            // Render the subset directly
            renderList(filteredApps);
        } else {
            // No ID in URL? Show everything.
            renderList(allApplications);
        }

    } catch (err) {
        console.error("Load failed:", err);
        container.innerHTML = `<p class="text-danger">Failed to load applications. ${err.message}</p>`;
    }
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

function filterApplications(searchTerm, jobFilter) {
    const term = (searchTerm || '').toLowerCase().trim();
    
    const filtered = allApplications.filter(app => {
        const nameMatch = (app.candidate_name || '').toLowerCase().includes(term);
        const emailMatch = (app.candidate_email || '').toLowerCase().includes(term);
        const jobMatch = jobFilter === 'all' || app.job_title === jobFilter;
        
        return (nameMatch || emailMatch) && jobMatch;
    });

    renderList(filtered);
}

function renderList(apps) {
    const container = document.getElementById('applicationListContainer');
    
    if (apps.length === 0) {
        container.innerHTML = `<p class="text-muted" style="grid-column: 1/-1; text-align:center;">No matching applications found.</p>`;
        return;
    }

container.innerHTML = apps.map(app => `
        <div class="app-item" onclick="window.location.href='application-details.html?id=${app.id}'">
            
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 35px; height: 35px; background: #e0e7ff; color: #4c51bf; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                    ${(app.candidate_name || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                    <h4 style="margin: 0; font-size: 0.95rem; color: #2d3748;">${app.candidate_name || 'Candidate'}</h4>
                    <span style="font-size: 0.8rem; color: #718096;">${app.candidate_email || ''}</span>
                </div>
            </div>

            <div style="font-size: 0.9rem; font-weight: 500; color: #4a5568;">
                ${app.job_title}
            </div>

            <div style="font-size: 0.85rem; color: #718096;">
                ${new Date(app.applied_at).toLocaleDateString()}
            </div>

            <div>
                <span class="status-badge status-${(app.status || 'pending').toLowerCase()}" 
                      style="font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; font-weight: 600;">
                    ${app.status || 'Pending'}
                </span>
            </div>

            <div style="text-align: right; color: #cbd5e0;">
                <i class="fas fa-chevron-right"></i>
            </div>
        </div>
    `).join('');
}