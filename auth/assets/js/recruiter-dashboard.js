// recruiter-dashboard.js
import { supabase } from './supabase-config.js';
import { backendFetch } from './backend-client.js';

let currentUser = null;
let dashboardSummary = null;

/* -------------------------------------------------------
   BOOTSTRAP SESSION FROM URL HASH (CROSS-SUBDOMAIN)
------------------------------------------------------- */
(async function bootstrapSessionFromHash() {
  try {
    const hash = window.location.hash ? window.location.hash.substring(1) : '';
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const at = params.get('access_token');
    const rt = params.get('refresh_token');
    const uid = params.get('user_id');
    const role = params.get('role');

    if (uid) localStorage.setItem('skreenit_user_id', uid);
    if (role) localStorage.setItem('skreenit_role', role);
    if (at) localStorage.setItem('skreenit_token', at);

    if (at && rt) {
      try {
        await supabase.auth.setSession({ access_token: at, refresh_token: rt });
      } catch {}
    }

    history.replaceState(null, document.title, window.location.pathname + window.location.search);
  } catch {}
})();

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */
function qs(sel) { return document.querySelector(sel); }
function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

async function checkAuth() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    window.location.href = 'https://login.skreenit.com/login.html';
    throw new Error('Not authenticated');
  }

  const user = data.user;
  if (user?.user_metadata?.role !== 'recruiter') {
    window.location.href = 'https://login.skreenit.com/login.html';
    throw new Error('Wrong role');
  }

  currentUser = user;
  localStorage.setItem('skreenit_user_id', user.id);
  localStorage.setItem('skreenit_role', 'recruiter');

  const nameEl = document.querySelector('.user-name');
  if (nameEl) nameEl.textContent = user.user_metadata?.full_name || 'Recruiter';

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (token) localStorage.setItem('skreenit_token', token);
  } catch {}
}

/* -------------------------------------------------------
   BACKEND SUMMARY
------------------------------------------------------- */
async function fetchDashboardSummary() {
  const token = localStorage.getItem('skreenit_token');
  const res = await backendFetch('/recruiter/dashboard', {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Failed to load dashboard (${res.status})`);
  }
  return res.json();
}

/* -------------------------------------------------------
   MOUNT + NAV HELPERS
------------------------------------------------------- */
function mountContent(node) {
  const main = qs('.main-content');
  if (!main) return;
  main.innerHTML = '';
  main.appendChild(node);
}

function setActiveNav(hash) {
  const items = document.querySelectorAll('.nav-menu .nav-item');
  items.forEach(li => {
    const section = li.getAttribute('data-section');
    if ('#' + section === hash) li.classList.add('active');
    else li.classList.remove('active');
  });
}

/* -------------------------------------------------------
   OVERVIEW WIDGETS
------------------------------------------------------- */
function renderOverview(summary) {
  const jobsCount = summary?.jobs?.length || 0;
  const recentApps = summary?.recent_applications || [];
  const analytics = summary?.analytics || {};

  const node = el(`
    <section id="overviewSection" class="dashboard-section">
      <div class="section-header" style="display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;">
        <h1 style="margin:0;">Dashboard Overview</h1>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
          <a class="btn btn-secondary" href="recruiter-profile.html">Edit Profile</a>
          <a class="btn btn-primary" href="job-create.html"><i class="fas fa-plus"></i> Create Job</a>
        </div>
      </div>

      <div class="stats-grid" style="display:flex;gap:.75rem;margin:1rem 0;">
        <div class="stat-card"><div class="stat-info"><span class="stat-number">${jobsCount}</span><span class="stat-label">Open Jobs</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-number">${analytics.applications || 0}</span><span class="stat-label">Applications</span></div></div>
        <div class="stat-card"><div class="stat-info"><span class="stat-number">${analytics.shortlisted || 0}</span><span class="stat-label">Shortlisted</span></div></div>
      </div>

      <div class="card" style="margin-bottom:1rem;">
        <h3 style="margin-top:0;"><i class="fas fa-list"></i> Recent Applications</h3>
        <div id="recentAppsHost">
          ${recentApps.length ? recentApps.map(a => `
            <div class="app-row" style="padding:.5rem;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:600;">${a.candidate_name || 'Candidate'}</div>
                <div style="font-size:.9rem;color:#4a5568;">${a.job_title || ''} • ${a.status || ''}</div>
              </div>
              <div style="display:flex;gap:.5rem;">
                <a class="btn btn-secondary" href="candidate-details.html?candidate_id=${encodeURIComponent(a.candidate_id)}&job_id=${encodeURIComponent(a.job_id)}">View</a>
                <button class="btn btn-success approve-btn" data-app-id="${a.id}">Approve</button>
              </div>
            </div>
          `).join('') : '<div style="color:#718096;padding:.5rem;">No recent applications</div>'}
        </div>
      </div>

      <div class="card">
        <h3 style="margin-top:0;"><i class="fas fa-chart-line"></i> Quick Analytics</h3>
        <div id="analyticsHost">
          <pre style="background:#f7fafc;padding:.75rem;border-radius:8px;">${JSON.stringify(analytics, null, 2)}</pre>
        </div>
      </div>
    </section>
  `);

  // Approve buttons
  node.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const appId = btn.getAttribute('data-app-id');
      if (!appId) return;
      if (!confirm('Move this application to Under Review and notify candidate?')) return;
      try {
        const token = localStorage.getItem('skreenit_token');
        const resp = await backendFetch(`/recruiter/application/${encodeURIComponent(appId)}/approve`, {
          method: 'POST',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        });
        if (!resp.ok) throw new Error('Approve failed');
        alert('Application approved');
        dashboardSummary = null;
        await render(); // refresh
      } catch {
        alert('Failed to approve application');
      }
    });
  });

  mountContent(node);
}

/* -------------------------------------------------------
   JOBS, CANDIDATES, ANALYTICS PAGES
------------------------------------------------------- */
function renderJobs() {
  const node = el(`
    <section class="dashboard-section">
      <div class="section-header"><h1>Jobs</h1><a class="btn btn-primary" href="job-create.html"><i class="fas fa-plus"></i> Create Job</a></div>
      <div id="jobsHost" class="card"><em>Loading jobs...</em></div>
    </section>
  `);
  mountContent(node);

  (async () => {
    try {
      const token = localStorage.getItem('skreenit_token');
      const resp = await backendFetch('/recruiter/jobs', { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const data = await resp.json().catch(() => ({}));
      const jobs = data?.jobs || [];
      const host = node.querySelector('#jobsHost');
      if (!jobs.length) { host.innerHTML = '<div style="color:#718096;padding:.5rem;">No jobs found</div>'; return; }
      host.innerHTML = jobs.map(j => `
        <div class="card" style="padding:.75rem;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:600;">${j.title}</div>
              <div style="font-size:.9rem;color:#4a5568;">${j.company_name || ''}</div>
            </div>
            <div style="display:flex;gap:.5rem;">
              <a class="btn btn-secondary" href="job-edit.html?job_id=${encodeURIComponent(j.id)}">Edit</a>
              <a class="btn btn-primary" href="job-applications.html?job_id=${encodeURIComponent(j.id)}">View Applications</a>
            </div>
          </div>
        </div>
      `).join('');
    } catch {
      const host = node.querySelector('#jobsHost');
      host.innerHTML = '<div style="color:#e53e3e;padding:.5rem;">Failed to load jobs</div>';
    }
  })();
}

function renderCandidates() {
  const node = el(`
    <section class="dashboard-section">
      <div class="section-header"><h1>Candidates</h1></div>
      <div id="candsHost" class="card"><em>Loading candidates...</em></div>
    </section>
  `);
  mountContent(node);

  (async () => {
    try {
      const token = localStorage.getItem('skreenit_token');
      const resp = await backendFetch('/recruiter/candidates', { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const data = await resp.json().catch(() => ({}));
      const cands = data?.candidates || [];
      const host = node.querySelector('#candsHost');
      if (!cands.length) { host.innerHTML = '<div style="color:#718096;padding:.5rem;">No candidates found</div>'; return; }
      host.innerHTML = cands.map(c => `
        <div class="card" style="padding:.75rem;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:600;">${c.full_name || c.email || 'Candidate'}</div>
              <div style="font-size:.9rem;color:#4a5568;">${c.current_role || ''}</div>
            </div>
            <div>
              <a class="btn btn-secondary" href="candidate-details.html?candidate_id=${encodeURIComponent(c.id)}">View</a>
            </div>
          </div>
        </div>
      `).join('');
    } catch {
      const host = node.querySelector('#candsHost');
      host.innerHTML = '<div style="color:#e53e3e;padding:.5rem;">Failed to load candidates</div>';
    }
  })();
}

function renderAnalytics() {
  const node = el(`
    <section class="dashboard-section">
      <div class="section-header"><h1>Analytics</h1></div>
      <div id="analyticsHost" class="card"><em>Loading analytics...</em></div>
    </section>
  `);
  mountContent(node);

  (async () => {
    try {
      const token = localStorage.getItem('skreenit_token');
      const resp = await backendFetch('/recruiter/analytics', { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      const data = await resp.json().catch(() => ({}));
      const host = node.querySelector('#analyticsHost');
      host.innerHTML = `<pre style="background:#f7fafc;padding:.75rem;border-radius:8px;">${JSON.stringify(data || {}, null, 2)}</pre>`;
    } catch {
      const host = node.querySelector('#analyticsHost');
      host.innerHTML = '<div style="color:#e53e3e;padding:.5rem;">Failed to load analytics</div>';
    }
  })();
}

/* -------------------------------------------------------
   ROUTER
------------------------------------------------------- */
async function render() {
  const hash = window.location.hash || '#overview';
  setActiveNav(hash);

  if (!dashboardSummary && hash === '#overview') {
    try {
      dashboardSummary = await fetchDashboardSummary();
    } catch (e) {
      console.error('Failed to load dashboard summary', e);
      const main = qs('.main-content');
      if (main) main.innerHTML = '<p class="error-message">Failed to load dashboard. Please try again.</p>';
      return;
    }
  }

  if (hash === '#jobs') return renderJobs();
  if (hash === '#candidates') return renderCandidates();
  if (hash === '#analytics') return renderAnalytics();
  return renderOverview(dashboardSummary || {});
}

/* -------------------------------------------------------
   NAV + LOGOUT BINDINGS
------------------------------------------------------- */
(function bindNav() {
  document.querySelectorAll('.nav-menu .nav-item').forEach(li => {
    li.addEventListener('click', () => {
      const section = li.getAttribute('data-section');
      if (section) window.location.hash = '#' + section;
    });
  });
})();

(function bindLogout() {
  function doRedirect() { window.location.href = 'https://login.skreenit.com/login.html'; }
  async function doLogout() {
    try {
      try {
        localStorage.removeItem('skreenit_token');
        localStorage.removeItem('skreenit_refresh_token');
        localStorage.removeItem('skreenit_user_id');
        localStorage.removeItem('skreenit_role');
      } catch {}
      await Promise.race([ supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 1500)) ]);
    } catch {}
    doRedirect();
  }
  const btn = document.getElementById('logoutBtn');
  if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); doLogout(); });
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('#logoutBtn');
    if (t) { e.preventDefault(); doLogout(); }
  });
})();

/* -------------------------------------------------------
   BOOTSTRAP
------------------------------------------------------- */
window.addEventListener('hashchange', render);
checkAuth().then(render).catch(() => {});
