import { supabase } from '@shared/js/supabase-config.js';
import { backendGet, backendPost, handleResponse } from '@shared/js/backend-client.js';
import { CONFIG } from '@shared/js/config.js';

const isLocal = CONFIG.IS_LOCAL;
const authBase = isLocal ? '../../auth' : 'https://auth.skreenit.com';
const logoImg = document.getElementById('logoImg');
if(logoImg) logoImg.src = `${authBase}/assets/images/logo.png`;

// ✅ DEBUG: Log the ID immediately
const urlParams = new URLSearchParams(window.location.search);
const jobId = urlParams.get('job_id');
console.log("Current Job ID from URL:", jobId);

async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { window.location.href = CONFIG.PAGES.LOGIN; return; }

    if (!jobId || jobId === "null" || jobId === "undefined") { 
        alert("Invalid Job Link. Returning to Dashboard."); 
        window.location.href = "candidate-dashboard.html"; 
        return; 
    }

    try {
        console.log(`Fetching details for: /dashboard/jobs/${jobId}`);
        
        // 1. Get Job Details
        const res = await backendGet(`/dashboard/jobs/${jobId}`);
        const json = await handleResponse(res);
        
        if(!json.data) throw new Error("API returned no data");
        
        renderJob(json.data);

        // 2. Check Application Status
        try {
            const statusRes = await backendGet(`/applicant/check-status?job_id=${jobId}`);
            const statusJson = await handleResponse(statusRes);
            
            if (statusJson.applied) {
                markAsApplied();
            } else {
                const btn = document.getElementById("applyBtn");
                if(btn) {
                    btn.onclick = apply;
                    btn.textContent = "Apply Now";
                    btn.disabled = false;
                }
            }
        } catch(statErr) {
            console.warn("Status check failed (ignoring):", statErr);
        }

    } catch (err) {
        console.error("Critical Error:", err);
        document.querySelector(".dashboard-content").innerHTML = `
            <div style="text-align:center; padding:3rem; color:#4a5568;">
                <h2 style="color:#e53e3e">Job Not Found</h2>
                <p>Could not load job details. (ID: ${jobId})</p>
                <p style="font-size:0.8rem; color:#718096;">Error: ${err.message}</p>
                <button onclick="window.history.back()" class="btn btn-primary" style="margin-top:1rem;">Go Back</button>
            </div>`;
    }
}

function renderJob(job) {
    setText("jobTitle", job.title);
    setText("companyName", job.company_name || "Hiring Company");
    
    // Handle location icon
    const locEl = document.getElementById("jobLocation");
    if(locEl) locEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${job.location || 'Remote'}`;
    
    setText("jobType", job.job_type);
    setText("postedDate", new Date(job.created_at).toLocaleDateString());
    
    // Description
    const desc = document.getElementById("jobDescription");
    if(desc) desc.innerHTML = (job.description || "No description provided.").replace(/\n/g, "<br>");
    
    // Requirements
    const req = document.getElementById("jobRequirements");
    if(req) req.innerHTML = (job.requirements || "No specific requirements listed.").replace(/\n/g, "<br>");
}

async function apply() {
    const btn = document.getElementById("applyBtn");
    btn.disabled = true;
    btn.textContent = "Applying...";
    
    try {
        await backendPost('/applicant/apply', { job_id: jobId });
        alert("Application Sent Successfully!");
        markAsApplied();
    } catch (err) {
        alert("Application Failed: " + err.message);
        btn.disabled = false;
        btn.textContent = "Apply Now";
    }
}

function markAsApplied() {
    const btn = document.getElementById("applyBtn");
    if(btn) {
        btn.textContent = "Applied";
        btn.classList.remove("btn-primary");
        btn.style.backgroundColor = "#48bb78"; // Green
        btn.style.borderColor = "#48bb78";
        btn.style.color = "white";
        btn.disabled = true;
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if(el) el.textContent = val || "";
}

document.getElementById("backBtn").addEventListener("click", () => window.history.back());
document.addEventListener("DOMContentLoaded", init);