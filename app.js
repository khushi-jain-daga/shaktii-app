const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const alarmLayer = document.getElementById('alarmLayer');

const state = {
  user: JSON.parse(localStorage.getItem('SHAKTII_USER') || 'null'),
  installPrompt: null,
  installed: isStandalone(),
  sidebarOpen: false,
  source: 'demo',
  upload: { step: 1, file: null, options: { encrypt: true, blockchain: true, access: true }, result: null },
  filters: { files: '', activity: '', analytics: '7d' }
};

const routes = [
  { path: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { path: '/files', label: 'Secure Files', icon: '▣' },
  { path: '/upload', label: 'Upload & Encrypt', icon: '⇧' },
  { path: '/access', label: 'Access Control', icon: '◈' },
  { path: '/blockchain', label: 'Blockchain Ledger', icon: '◇' },
  { path: '/security', label: 'Security Monitoring', icon: '!' },
  { path: '/analytics', label: 'Analytics', icon: '↗' },
  { path: '/activity', label: 'Audit Logs', icon: '☷' },
  { path: '/reports', label: 'Reports', icon: '◧' },
  { path: '/notifications', label: 'Notifications', icon: '◎' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
  { path: '/profile', label: 'Profile', icon: '◉' }
];

const sample = () => window.SHAKTII_DATA;
const currentPath = () => window.location.pathname === '/' ? '/login' : window.location.pathname;
const byId = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m]));

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || localStorage.getItem('SHAKTII_INSTALLED') === 'true';
}

function toast(message, type = 'default') {
  toastEl.textContent = message;
  toastEl.className = `toast show ${type}`;
  setTimeout(() => toastEl.className = 'toast', 2400);
}

function navigate(path) {
  window.history.pushState({}, '', path);
  state.sidebarOpen = false;
  render();
}

window.addEventListener('popstate', render);
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.installPrompt = event;
  state.installed = isStandalone();
  updateInstallButtons();
});
window.addEventListener('appinstalled', () => {
  state.installed = true;
  state.installPrompt = null;
  localStorage.setItem('SHAKTII_INSTALLED', 'true');
  updateInstallButtons();
  toast('App installed successfully', 'success');
});

document.addEventListener('click', (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) return navigate(nav.dataset.nav);

  const action = event.target.closest('[data-action]');
  if (!action) return;
  const value = action.dataset.action;
  if (value === 'login') return login();
  if (value === 'logout') return logout();
  if (value === 'toggle-sidebar') { state.sidebarOpen = !state.sidebarOpen; return render(); }
  if (value === 'install') return installApp();
  if (value === 'next-upload') return nextUploadStep();
  if (value === 'prev-upload') return prevUploadStep();
  if (value === 'complete-upload') return completeUpload();
  if (value === 'test-alarm') return triggerAlarm();
  if (value === 'ack-alarm') return acknowledgeAlarm();
  if (value === 'contain') return containThreat();
  if (value === 'generate-report') return generateReport();
  if (value === 'verify-file') return verifyFile(action.dataset.file || 'FL-003');
  if (value === 'save-settings') return toast('Settings saved for this device', 'success');
});

document.addEventListener('input', (event) => {
  const input = event.target;
  if (input.matches('[data-filter="files"]')) { state.filters.files = input.value; return renderPage(); }
  if (input.matches('[data-filter="activity"]')) { state.filters.activity = input.value; return renderPage(); }
  if (input.matches('#uploadFile')) { state.upload.file = input.files?.[0] || null; return renderPage(); }
});

document.querySelector('[data-close-alarm]')?.addEventListener('click', () => alarmLayer.classList.remove('show'));
document.querySelector('[data-ack-alarm]')?.addEventListener('click', acknowledgeAlarm);

function login() {
  const name = byId('loginName')?.value?.trim() || 'Khushi Jain';
  state.user = { name, role: 'Security Admin', email: 'admin@pwnshakti.ai' };
  localStorage.setItem('SHAKTII_USER', JSON.stringify(state.user));
  navigate('/dashboard');
}

function logout() {
  localStorage.removeItem('SHAKTII_USER');
  state.user = null;
  navigate('/login');
}

async function installApp() {
  if (state.installed || isStandalone()) {
    state.installed = true;
    localStorage.setItem('SHAKTII_INSTALLED', 'true');
    updateInstallButtons();
    return toast('App is already installed', 'success');
  }
  if (!state.installPrompt) return toast('Install is available from browser menu: Add to Home Screen', 'info');
  state.installPrompt.prompt();
  const result = await state.installPrompt.userChoice;
  if (result.outcome === 'accepted') {
    state.installed = true;
    localStorage.setItem('SHAKTII_INSTALLED', 'true');
    toast('App installed successfully', 'success');
  }
  state.installPrompt = null;
  updateInstallButtons();
}

function updateInstallButtons() {
  document.querySelectorAll('[data-action="install"]').forEach((button) => {
    const installed = state.installed || isStandalone();
    button.textContent = installed ? 'App Installed' : 'Install App';
    button.disabled = installed;
    button.classList.toggle('is-installed', installed);
  });
}

function ensureAuth() {
  const path = currentPath();
  if (!state.user && !['/login', '/signup'].includes(path)) {
    window.history.replaceState({}, '', '/login');
  }
}

function render() {
  ensureAuth();
  const path = currentPath();
  if (['/login', '/signup'].includes(path) || !state.user) {
    app.innerHTML = authPage(path === '/signup');
    requestAnimationFrame(updateInstallButtons);
    return;
  }
  app.innerHTML = shellTemplate();
  renderPage();
  requestAnimationFrame(updateInstallButtons);
}

function renderPage() {
  const outlet = byId('pageOutlet');
  if (!outlet) return;
  const path = currentPath();
  const fileMatch = path.match(/^\/files\/([^/]+)$/);
  const txMatch = path.match(/^\/blockchain\/([^/]+)$/);
  const alertMatch = path.match(/^\/security\/alerts\/([^/]+)$/);
  if (fileMatch) outlet.innerHTML = fileDetailPage(fileMatch[1]);
  else if (txMatch) outlet.innerHTML = txDetailPage(txMatch[1]);
  else if (alertMatch) outlet.innerHTML = alertDetailPage(alertMatch[1]);
  else if (path === '/dashboard') outlet.innerHTML = dashboardPage();
  else if (path === '/files') outlet.innerHTML = filesPage();
  else if (path === '/upload') outlet.innerHTML = uploadPage();
  else if (path === '/access') outlet.innerHTML = accessPage();
  else if (path === '/blockchain') outlet.innerHTML = blockchainPage();
  else if (path === '/security') outlet.innerHTML = securityPage();
  else if (path === '/analytics') outlet.innerHTML = analyticsPage();
  else if (path === '/activity') outlet.innerHTML = activityPage();
  else if (path === '/reports') outlet.innerHTML = reportsPage();
  else if (path === '/notifications') outlet.innerHTML = notificationsPage();
  else if (path === '/settings') outlet.innerHTML = settingsPage();
  else if (path === '/profile') outlet.innerHTML = profilePage();
  else outlet.innerHTML = notFoundPage();
}

function authPage(signup = false) {
  return `
    <main class="auth-screen">
      <section class="auth-card">
        <img src="/assets/logo.svg?v=12" alt="PWN SHAKTI" class="auth-logo" />
        <p class="eyebrow">Secure data command</p>
        <h1>${signup ? 'Create workspace' : 'Welcome back'}</h1>
        <p class="muted">Access protected files, blockchain verification, threat monitoring and audit reports from one command application.</p>
        <label class="field-label">Operator name</label>
        <input id="loginName" class="input" placeholder="Khushi Jain" value="Khushi Jain" />
        <label class="field-label">Workspace code</label>
        <input class="input" placeholder="SHAKTII-SOC-01" value="SHAKTII-SOC-01" />
        <button class="btn primary full" data-action="login">${signup ? 'Create and enter app' : 'Enter secure app'}</button>
        <button class="btn secondary full" data-action="install">Install App</button>
        <p class="auth-switch">${signup ? 'Already have access?' : 'Need a demo account?'} <button data-nav="${signup ? '/login' : '/signup'}">${signup ? 'Login' : 'Create one'}</button></p>
      </section>
    </main>`;
}

function shellTemplate() {
  const path = currentPath();
  return `
    <div class="app-shell ${state.sidebarOpen ? 'sidebar-open' : ''}">
      <aside class="sidebar">
        <div class="brand-block">
          <img src="/assets/logo.svg?v=12" alt="PWN SHAKTI" />
          <div><strong>PWN SHAKTI</strong><span>Secure data command</span></div>
        </div>
        <nav class="side-nav">
          ${routes.map((r) => `<button class="nav-item ${isActive(path, r.path) ? 'active' : ''}" data-nav="${r.path}"><span>${r.icon}</span>${r.label}</button>`).join('')}
        </nav>
      </aside>
      <div class="shell-backdrop" data-action="toggle-sidebar"></div>
      <section class="main-shell">
        <header class="topbar">
          <button class="icon-btn menu" data-action="toggle-sidebar">☰</button>
          <div class="top-title"><strong>${titleForPath(path)}</strong><span>${window.SHAKTII_API.base ? 'Connected to backend API' : 'Demo data mode · backend-ready'}</span></div>
          <div class="top-actions">
            <button class="status-pill ${window.SHAKTII_API.base ? 'ok' : 'demo'}">${window.SHAKTII_API.base ? 'API Live' : 'Demo Mode'}</button>
            <button class="btn small" data-action="install">Install App</button>
            <button class="avatar" data-nav="/profile">${state.user?.name?.[0] || 'S'}</button>
          </div>
        </header>
        <main class="content" id="pageOutlet"></main>
      </section>
      <nav class="mobile-nav">
        ${routes.slice(0, 5).map((r) => `<button class="mobile-nav-item ${isActive(path, r.path) ? 'active' : ''}" data-nav="${r.path}"><span>${r.icon}</span><small>${r.label.split(' ')[0]}</small></button>`).join('')}
      </nav>
    </div>`;
}

function isActive(path, item) { return path === item || (item !== '/dashboard' && path.startsWith(item + '/')); }
function titleForPath(path) {
  if (path.startsWith('/files/')) return 'File Details';
  if (path.startsWith('/blockchain/')) return 'Ledger Record';
  if (path.startsWith('/security/alerts/')) return 'Security Alert';
  return routes.find((r) => r.path === path)?.label || 'Workspace';
}

function pageHeader(overline, title, text, actions = '') {
  return `<section class="page-header"><div><p class="eyebrow">${overline}</p><h1>${title}</h1><p>${text}</p></div><div class="page-actions">${actions}</div></section>`;
}

function dashboardPage() {
  const d = sample();
  return `
    ${pageHeader('Overview', 'Security posture at a glance', 'Dashboard is only a high-level overview. Open each module for complete investigation, verification and reporting.', '<button class="btn primary" data-nav="/upload">Upload file</button><button class="btn secondary" data-action="test-alarm">Test alarm</button>')}
    <section class="stats-grid">
      ${statCard('Protected files', d.stats.protectedFiles, 'Encrypted and access-controlled', '/files')}
      ${statCard('Verified files', d.stats.verifiedFiles, 'Blockchain integrity passed', '/blockchain')}
      ${statCard('Security alerts', d.stats.securityAlerts, 'Open issues needing review', '/security', 'warn')}
      ${statCard('Integrity score', `${d.stats.integrityScore}%`, 'System health score', '/analytics', 'ok')}
    </section>
    <section class="dashboard-grid">
      <article class="card span-2"><div class="card-head"><h2>Security events over time</h2><button data-nav="/analytics">Open analytics →</button></div>${lineChart(d.analytics.securityEvents)}</article>
      <article class="card"><div class="card-head"><h2>Threat severity</h2><button data-nav="/security">Investigate →</button></div>${donutLike(d.analytics.severity)}</article>
      <article class="card"><div class="card-head"><h2>Recent activity</h2><button data-nav="/activity">View all →</button></div>${activityList(d.activity.slice(0, 4))}</article>
      <article class="card span-2"><div class="card-head"><h2>Protected files</h2><button data-nav="/files">View files →</button></div>${fileTable(d.files.slice(0, 4), false)}</article>
    </section>`;
}

function statCard(label, value, helper, nav, tone = '') {
  return `<button class="stat-card ${tone}" data-nav="${nav}"><span>${label}</span><strong>${value}</strong><small>${helper}</small><em>View details →</em></button>`;
}

function filesPage() {
  const term = state.filters.files.toLowerCase();
  const files = sample().files.filter((f) => `${f.name} ${f.owner} ${f.status} ${f.hash}`.toLowerCase().includes(term));
  return `
    ${pageHeader('Secure files', 'Protected documents vault', 'Search, verify, review encryption status and open full file records.', '<button class="btn primary" data-nav="/upload">Upload & encrypt</button>')}
    <section class="toolbar"><input class="input" data-filter="files" placeholder="Search file, owner, hash or status" value="${escapeHtml(state.filters.files)}" /><button class="btn secondary" data-action="verify-file">Verify file</button></section>
    <section class="card">${files.length ? fileTable(files, true) : emptyState('No protected files found', 'Change your search or upload a new file.', '/upload', 'Upload file')}</section>`;
}

function fileTable(files, actions = true) {
  return `<div class="table-wrap"><table><thead><tr><th>File</th><th>Owner</th><th>Encryption</th><th>Verification</th><th>Status</th><th>Last Accessed</th>${actions ? '<th>Action</th>' : ''}</tr></thead><tbody>${files.map((f) => `<tr><td><strong>${f.name}</strong><small>${f.id} · ${f.type} · ${f.size}</small></td><td>${f.owner}</td><td>${badge(f.encrypted ? 'Encrypted' : 'Open', f.encrypted ? 'ok' : 'warn')}</td><td>${badge(f.verified ? 'Verified' : 'Pending', f.verified ? 'ok' : 'warn')}</td><td>${badge(f.status, f.status === 'Protected' ? 'ok' : 'warn')}</td><td>${f.lastAccessed}</td>${actions ? `<td><button class="link-btn" data-nav="/files/${f.id}">Open →</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}

function fileDetailPage(id) {
  const file = sample().files.find((f) => f.id === id) || sample().files[0];
  const activity = sample().activity.filter((a) => a.resource === file.id || a.ref === file.tx);
  return `
    ${pageHeader('File record', file.name, 'Complete file integrity, encryption, owner and blockchain verification details.', '<button class="btn secondary" data-nav="/files">Back to files</button><button class="btn primary" data-action="verify-file" data-file="' + file.id + '">Verify integrity</button>')}
    <section class="detail-grid">
      <article class="card span-2"><h2>File information</h2><div class="info-grid">${info('File ID', file.id)}${info('Owner', file.owner)}${info('Type', file.type)}${info('Size', file.size)}${info('Hash', file.hash)}${info('Uploaded', file.uploaded)}${info('Encryption', file.encrypted ? 'AES-256 enabled' : 'Not encrypted')}${info('Verification', file.verified ? 'Verified on ledger' : 'Pending')}</div></article>
      <article class="card"><h2>Actions</h2><div class="stack"><button class="btn primary" data-nav="/blockchain/${file.tx}">View blockchain record</button><button class="btn secondary" data-nav="/activity">Audit trail</button><button class="btn secondary" data-nav="/reports">Generate report</button></div></article>
      <article class="card span-3"><div class="card-head"><h2>Access history</h2><button data-nav="/activity">Open audit logs →</button></div>${activity.length ? activityList(activity) : emptyState('No access activity yet', 'Activity will appear after users interact with this file.')}</article>
    </section>`;
}

function uploadPage() {
  const s = state.upload.step;
  const file = state.upload.file;
  return `
    ${pageHeader('Upload workflow', 'Encrypt and verify a file', 'A complete demonstrable flow: choose file, configure protection, process encryption, generate hash and verify ledger.', '<button class="btn secondary" data-nav="/files">View files</button>')}
    <section class="upload-layout">
      <aside class="stepper">${[1,2,3,4,5].map((n) => `<div class="step ${n < s ? 'done' : n === s ? 'active' : ''}"><b>${n}</b><span>${['Choose file','Review details','Security options','Encrypt & verify','Success'][n-1]}</span></div>`).join('')}</aside>
      <article class="card upload-card">${uploadStepContent()}</article>
    </section>`;
}

function uploadStepContent() {
  const s = state.upload.step;
  if (s === 1) return `<h2>Choose file</h2><p class="muted">Select a document or use the demo file for jury walkthrough.</p><input id="uploadFile" type="file" class="input file-input" /><button class="btn secondary" onclick="window.demoUploadFile()">Use demo file</button><div class="form-actions"><button class="btn primary" data-action="next-upload">Continue</button></div>`;
  if (s === 2) return `<h2>Review file information</h2><div class="info-grid">${info('Name', state.upload.file?.name || 'incident-evidence-demo.pdf')}${info('Size', state.upload.file ? `${Math.max(1, Math.round(state.upload.file.size / 1024))} KB` : '2.1 MB')}${info('Type', state.upload.file?.type || 'application/pdf')}${info('Owner', state.user.name)}</div><div class="form-actions"><button class="btn secondary" data-action="prev-upload">Back</button><button class="btn primary" data-action="next-upload">Configure protection</button></div>`;
  if (s === 3) return `<h2>Protection settings</h2><div class="option-list"><label><input type="checkbox" checked> Encrypt file with AES-256 policy</label><label><input type="checkbox" checked> Create blockchain verification record</label><label><input type="checkbox" checked> Restrict access to approved users</label><label><input type="checkbox" checked> Enable activity audit trail</label></div><div class="form-actions"><button class="btn secondary" data-action="prev-upload">Back</button><button class="btn primary" data-action="next-upload">Start processing</button></div>`;
  if (s === 4) return `<h2>Processing file</h2><p class="muted">Encryption, hashing and ledger preparation are running. This state is backend-ready.</p><div class="process-list"><span>✓ File sanitized</span><span>✓ Encryption policy applied</span><span>✓ SHA-256 hash generated</span><span>✓ Blockchain record queued</span></div><div class="form-actions"><button class="btn secondary" data-action="prev-upload">Back</button><button class="btn primary" data-action="complete-upload">Complete workflow</button></div>`;
  return `<h2>File protected successfully</h2><p class="muted">The file has been encrypted, logged and prepared for blockchain verification.</p><div class="success-box"><strong>${state.upload.result?.fileId || 'FL-NEW'}</strong><span>${state.upload.result?.tx || 'TX-DEMO'}</span></div><div class="form-actions"><button class="btn secondary" data-nav="/dashboard">Dashboard</button><button class="btn primary" data-nav="/files/${state.upload.result?.fileId || 'FL-005'}">View protected file</button></div>`;
}

window.demoUploadFile = () => { state.upload.file = { name: 'incident-evidence-demo.pdf', size: 2194000, type: 'application/pdf' }; renderPage(); toast('Demo file selected', 'success'); };
function nextUploadStep() { if (state.upload.step === 1 && !state.upload.file) window.demoUploadFile(); state.upload.step = Math.min(5, state.upload.step + 1); renderPage(); }
function prevUploadStep() { state.upload.step = Math.max(1, state.upload.step - 1); renderPage(); }
async function completeUpload() { const res = await window.SHAKTII_API.upload({ name: state.upload.file?.name || 'incident-evidence-demo.pdf' }); state.upload.result = { fileId: 'FL-005', tx: res.data.tx || 'TX-8848' }; state.upload.step = 5; toast('File encrypted and verified', 'success'); renderPage(); }

function accessPage() {
  return `${pageHeader('Access control', 'Users, roles and file permissions', 'Manage who can view, verify, download or share protected resources.', '<button class="btn primary">Invite user</button>')}
    <section class="cards-3"><article class="card"><h2>Admins</h2><strong class="big">04</strong><p>Full security access</p></article><article class="card"><h2>Analysts</h2><strong class="big">09</strong><p>Investigation and verification</p></article><article class="card"><h2>Viewers</h2><strong class="big">05</strong><p>Read-only reports</p></article></section>
    <section class="card"><h2>Permission matrix</h2><div class="table-wrap"><table><thead><tr><th>Role</th><th>Upload</th><th>Verify</th><th>Contain</th><th>Reports</th></tr></thead><tbody><tr><td>Security Admin</td><td>Yes</td><td>Yes</td><td>Approval</td><td>Yes</td></tr><tr><td>Analyst</td><td>Yes</td><td>Yes</td><td>No</td><td>Yes</td></tr><tr><td>Viewer</td><td>No</td><td>Read</td><td>No</td><td>Read</td></tr></tbody></table></div></section>`;
}

function blockchainPage() {
  const txs = sample().ledger;
  return `${pageHeader('Blockchain ledger', 'Verification records', 'Search and inspect file hashes, record IDs, owners, timestamps and transaction details.', '<button class="btn primary" data-action="verify-file">Verify file</button>')}
    <section class="card"><div class="table-wrap"><table><thead><tr><th>Transaction</th><th>File</th><th>Hash</th><th>Status</th><th>Owner</th><th>Time</th><th></th></tr></thead><tbody>${txs.map((t) => `<tr><td><strong>${t.id}</strong><small>${t.block}</small></td><td>${t.file}</td><td><code>${t.hash}</code></td><td>${badge(t.status, 'ok')}</td><td>${t.owner}</td><td>${t.time}</td><td><button class="link-btn" data-nav="/blockchain/${t.id}">Details →</button></td></tr>`).join('')}</tbody></table></div></section>`;
}

function txDetailPage(id) {
  const tx = sample().ledger.find((t) => t.id === id) || sample().ledger[0];
  return `${pageHeader('Ledger details', tx.id, 'Complete blockchain verification record.', '<button class="btn secondary" data-nav="/blockchain">Back to ledger</button><button class="btn primary" data-nav="/files/' + tx.fileId + '">Open file</button>')}
    <section class="detail-grid"><article class="card span-2"><h2>Verification record</h2><div class="info-grid">${info('Record ID', tx.id)}${info('Block', tx.block)}${info('File', tx.file)}${info('Type', tx.type)}${info('Hash', tx.hash)}${info('Status', tx.status)}${info('Owner', tx.owner)}${info('Timestamp', tx.time)}</div></article><article class="card"><h2>Integrity result</h2><div class="result-ok">Verified</div><p class="muted">The file hash matches the ledger record.</p></article></section>`;
}

function securityPage() {
  const alerts = sample().alerts;
  return `${pageHeader('Security monitoring', 'Threats and incident response', 'Track active threats, suspicious events, integrity failures and containment actions.', '<button class="btn danger" data-action="test-alarm">Trigger alarm demo</button>')}
    <section class="stats-grid"><div class="stat-card"><span>Security score</span><strong>98</strong><small>Excellent posture</small></div><div class="stat-card warn"><span>Active alerts</span><strong>${alerts.filter(a => a.status !== 'Resolved').length}</strong><small>Needs review</small></div><div class="stat-card"><span>Unauthorized attempts</span><strong>12</strong><small>Last 24 hours</small></div><div class="stat-card ok"><span>Contained</span><strong>08</strong><small>Safe actions</small></div></section>
    <section class="card"><div class="card-head"><h2>Security alerts</h2><button data-action="contain">Contain selected →</button></div><div class="alert-list">${alerts.map(alertCard).join('')}</div></section>`;
}

function alertCard(a) {
  return `<button class="alert-row" data-nav="/security/alerts/${a.id}"><div>${badge(a.severity, a.severity === 'Critical' ? 'danger' : a.severity === 'High' ? 'warn' : 'info')}<h3>${a.title}</h3><p>${a.detail}</p></div><span>${a.time}</span></button>`;
}

function alertDetailPage(id) {
  const a = sample().alerts.find((x) => x.id === id) || sample().alerts[0];
  return `${pageHeader('Alert investigation', a.title, a.detail, '<button class="btn secondary" data-nav="/security">Back</button><button class="btn danger" data-action="contain">Contain threat</button>')}
    <section class="detail-grid"><article class="card span-2"><h2>Incident evidence</h2><div class="info-grid">${info('Alert ID', a.id)}${info('Severity', a.severity)}${info('Status', a.status)}${info('Asset', a.asset)}${info('Source IP', a.ip)}${info('Recommended action', a.recommendation)}</div></article><article class="card"><h2>Alarm facilities</h2><div class="stack"><button class="btn danger" data-action="test-alarm">Test sound/vibration</button><button class="btn primary" data-action="ack-alarm">Acknowledge</button><button class="btn secondary">Escalate</button></div></article></section>`;
}

function analyticsPage() {
  const a = sample().analytics;
  return `${pageHeader('Analytics', 'Operational intelligence', 'Detailed graphs for security events, file protection, verification and user access.', '<div class="segmented"><button class="active">7 Days</button><button>30 Days</button><button>90 Days</button></div>')}
    <section class="analytics-grid"><article class="card span-2"><h2>Security events over time</h2>${lineChart(a.securityEvents)}</article><article class="card"><h2>Verification success</h2>${barPair('Verified', a.verification[0], 'Pending', a.verification[1])}</article><article class="card"><h2>Files uploaded</h2>${barChart(a.filesUploaded)}</article><article class="card"><h2>Access attempts</h2>${lineChart(a.access)}</article><article class="card"><h2>Blockchain transactions</h2>${barChart(a.blockchain)}</article><article class="card"><h2>Threat categories</h2>${donutLike(a.severity)}</article></section>`;
}

function activityPage() {
  const term = state.filters.activity.toLowerCase();
  const items = sample().activity.filter((a) => `${a.user} ${a.action} ${a.resource} ${a.status} ${a.ref}`.toLowerCase().includes(term));
  return `${pageHeader('Audit logs', 'Searchable activity history', 'Every upload, verification, access and security action is recorded for accountability.', '<button class="btn secondary" data-nav="/reports">Export report</button>')}
    <section class="toolbar"><input class="input" data-filter="activity" placeholder="Search user, action, resource or status" value="${escapeHtml(state.filters.activity)}" /></section>
    <section class="card">${items.length ? `<div class="table-wrap"><table><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Resource</th><th>IP/Device</th><th>Status</th><th>Reference</th></tr></thead><tbody>${items.map((a) => `<tr><td>${a.time}</td><td>${a.user}</td><td>${a.action}</td><td>${a.resource}</td><td>${a.ip}</td><td>${badge(a.status, a.status === 'Success' ? 'ok' : 'warn')}</td><td>${a.ref}</td></tr>`).join('')}</tbody></table></div>` : emptyState('No audit entries found', 'Try a different search term.')}</section>`;
}

function reportsPage() {
  return `${pageHeader('Reports', 'Generate and review reports', 'Security summaries, file integrity reports, access reports, blockchain reports and threat analysis.', '<button class="btn primary" data-action="generate-report">Generate report</button>')}
    <section class="cards-3">${sample().reports.map((r) => `<article class="card report"><p class="eyebrow">${r.type}</p><h2>${r.title}</h2><p>${r.created}</p>${badge(r.status, 'ok')}<button class="btn secondary full">Open report</button></article>`).join('')}</section>`;
}

function notificationsPage() {
  return `${pageHeader('Notifications', 'Alerts and acknowledgement', 'Configure app alarms, browser notifications, vibration and escalation reminders.', '<button class="btn danger" data-action="test-alarm">Test critical alarm</button>')}
    <section class="card"><h2>Alarm facilities</h2><div class="option-list"><label><input type="checkbox" checked> Visual critical overlay</label><label><input type="checkbox" checked> Browser notification</label><label><input type="checkbox" checked> Phone vibration when supported</label><label><input type="checkbox" checked> Sound alarm after user interaction</label><label><input type="checkbox" checked> SLA escalation reminder</label></div></section>`;
}

function settingsPage() {
  return `${pageHeader('Settings', 'Application preferences', 'Backend endpoint, PWA state and security preferences.', '<button class="btn primary" data-action="save-settings">Save settings</button>')}
    <section class="card settings"><label class="field-label">Docker backend API URL</label><input class="input" value="${escapeHtml(window.SHAKTII_API.base || '')}" placeholder="http://localhost:8000" /><p class="helper">You can also open the app with ?api=http://localhost:8000</p><label class="field-label">PWA status</label><div class="status-line">${state.installed || isStandalone() ? 'App installed / standalone mode detected' : 'Browser mode. Install CTA will show when available.'}</div></section>`;
}

function profilePage() {
  return `${pageHeader('Profile', 'Operator account', 'Demo operator profile for the installed app.', '<button class="btn secondary" data-action="logout">Logout</button>')}
    <section class="card profile"><div class="profile-avatar">${state.user.name[0]}</div><h2>${state.user.name}</h2><p>${state.user.role}</p><div class="info-grid">${info('Email', state.user.email)}${info('Workspace', 'SHAKTII-SOC-01')}${info('MFA', 'Required')}${info('Role', state.user.role)}</div></section>`;
}

function notFoundPage() { return `${pageHeader('Page not found', 'This route is not available', 'Use the sidebar to open a valid SHAKTII application page.', '<button class="btn primary" data-nav="/dashboard">Go to dashboard</button>')}`; }

function emptyState(title, text, nav = '', label = '') { return `<div class="empty"><h3>${title}</h3><p>${text}</p>${nav ? `<button class="btn primary" data-nav="${nav}">${label}</button>` : ''}</div>`; }
function info(label, value) { return `<div class="info"><span>${label}</span><strong>${value}</strong></div>`; }
function badge(text, tone = 'info') { return `<span class="badge ${tone}">${text}</span>`; }
function activityList(items) { return `<div class="activity-list">${items.map((a) => `<div class="activity-item"><i></i><div><strong>${a.action}</strong><p>${a.user} · ${a.resource} · ${a.time}</p></div><span>${a.status}</span></div>`).join('')}</div>`; }
function lineChart(values) { const max = Math.max(...values, 1); return `<div class="line-chart">${values.map((v, i) => `<span title="Day ${i+1}: ${v}" style="height:${24 + (v/max)*76}%"></span>`).join('')}</div>`; }
function barChart(values) { const max = Math.max(...values, 1); return `<div class="bar-chart">${values.map((v, i) => `<div><span style="height:${20 + (v/max)*120}px" title="${v}"></span><small>${i+1}</small></div>`).join('')}</div>`; }
function barPair(a, av, b, bv) { const total = av + bv; return `<div class="pair"><div><label>${a}</label><span><i style="width:${(av/total)*100}%"></i></span><b>${av}</b></div><div><label>${b}</label><span><i class="warn" style="width:${(bv/total)*100}%"></i></span><b>${bv}</b></div></div>`; }
function donutLike(obj) { const entries = Object.entries(obj); return `<div class="severity-list">${entries.map(([k,v]) => `<div><span>${k}</span><strong>${v}</strong><i style="width:${v * 9}%"></i></div>`).join('')}</div>`; }

function triggerAlarm() {
  alarmLayer.classList.add('show');
  toast('Critical alarm triggered', 'danger');
  if ('vibrate' in navigator) navigator.vibrate([260, 120, 260, 120, 420]);
  if ('Notification' in window) {
    if (Notification.permission === 'granted') new Notification('PWN SHAKTI Critical Alert', { body: 'Suspicious admin session requires acknowledgement.' });
    else if (Notification.permission !== 'denied') Notification.requestPermission().then((p) => { if (p === 'granted') new Notification('PWN SHAKTI Critical Alert', { body: 'Suspicious admin session requires acknowledgement.' }); });
  }
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=');
    audio.play().catch(() => undefined);
  } catch (_) {}
}
function acknowledgeAlarm() { alarmLayer.classList.remove('show'); toast('Alert acknowledged. SLA timer stopped.', 'success'); navigate('/security/alerts/AL-901'); }
async function containThreat() { await window.SHAKTII_API.contain({ alertId: 'AL-901' }); toast('Containment queued: IP block + session freeze', 'success'); }
async function verifyFile(fileId) { const res = await window.SHAKTII_API.verify({ fileId }); toast(`Verification successful: ${res.data.tx}`, 'success'); }
async function generateReport() { const res = await window.SHAKTII_API.report({ type: 'security-summary' }); toast(`Report generated: ${res.data.reportId}`, 'success'); }

render();
