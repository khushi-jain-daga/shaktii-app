const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const alarmLayer = document.getElementById('alarmLayer');
const STORE = 'SHAKTII_APP_FINAL_STATE_V2';

const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
const state = {
  user: saved.user || JSON.parse(localStorage.getItem('SHAKTII_USER') || 'null'),
  installPrompt: null,
  installed: isStandalone(),
  sidebarOpen: false,
  upload: { file: null, processing: null },
  analyses: saved.analyses || [],
  activeId: saved.activeId || null,
  reports: saved.reports || [],
  settings: saved.settings || { theme: 'dark', strictAnalysis: true, includeFindings: true, includeIocs: true, includeRecommendations: true },
  filters: { files: '', activity: '', history: '', findings: '' },
  drawer: null
};

const routes = [
  { path: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { path: '/files', label: 'Secure Files', icon: '▣' },
  { path: '/upload', label: 'PKAP Analyzer', icon: '⇧' },
  { path: '/history', label: 'Analysis History', icon: '☷' },
  { path: '/analytics', label: 'Analytics', icon: '↗' },
  { path: '/findings', label: 'Findings / Issues', icon: '!' },
  { path: '/iocs', label: 'Indicators / IOCs', icon: '◎' },
  { path: '/access', label: 'Access Control', icon: '◈' },
  { path: '/blockchain', label: 'Blockchain Ledger', icon: '◇' },
  { path: '/security', label: 'Security Monitoring', icon: '⚡' },
  { path: '/activity', label: 'Audit Logs', icon: '≋' },
  { path: '/reports', label: 'Reports', icon: '◧' },
  { path: '/notifications', label: 'Notifications', icon: '◌' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
  { path: '/profile', label: 'Profile', icon: '◉' }
];

const stages = ['Uploading file', 'Reading file content', 'Redacting sensitive values', 'Running PKAP analysis', 'Extracting findings and IOCs', 'Calculating statistics', 'Preparing dashboard'];
const sample = () => window.SHAKTII_DATA || fallbackData();
const byId = (id) => document.getElementById(id);
const currentPath = () => window.location.pathname === '/' ? (state.user ? '/dashboard' : '/login') : window.location.pathname;
const activeAnalysis = () => state.analyses.find((a) => a.id === state.activeId) || state.analyses[0] || null;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m]));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pct = (n, total) => total ? Math.round((Number(n || 0) / total) * 100) : 0;

function saveState() {
  localStorage.setItem(STORE, JSON.stringify({ user: state.user, analyses: state.analyses, activeId: state.activeId, reports: state.reports, settings: state.settings }));
  if (state.user) localStorage.setItem('SHAKTII_USER', JSON.stringify(state.user));
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || localStorage.getItem('SHAKTII_INSTALLED') === 'true';
}

function toast(message, type = 'default') {
  toastEl.textContent = message;
  toastEl.className = `toast show ${type}`;
  setTimeout(() => toastEl.className = 'toast', 2500);
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
  if (value === 'clear-file') { state.upload.file = null; state.upload.processing = null; return renderPage(); }
  if (value === 'start-pkap') return startPkapAnalysis();
  if (value === 'generate-report') return generateReport(action.dataset.analysis); 
  if (value === 'download-pdf') return downloadPdf(action.dataset.analysis || state.activeId);
  if (value === 'open-drawer') { state.drawer = action.dataset.drawer; return render(); }
  if (value === 'close-drawer') { state.drawer = null; return render(); }
  if (value === 'test-alarm') return triggerAlarm();
  if (value === 'ack-alarm') return acknowledgeAlarm();
  if (value === 'contain') return containThreat();
  if (value === 'verify-file') return verifyFile(action.dataset.file || 'FL-003');
  if (value === 'save-settings') return saveSettings();
});

document.addEventListener('input', (event) => {
  const input = event.target;
  if (input.matches('[data-filter="files"]')) { state.filters.files = input.value; return renderPage(); }
  if (input.matches('[data-filter="activity"]')) { state.filters.activity = input.value; return renderPage(); }
  if (input.matches('[data-filter="history"]')) { state.filters.history = input.value; return renderPage(); }
  if (input.matches('[data-filter="findings"]')) { state.filters.findings = input.value; return renderPage(); }
  if (input.matches('#uploadFile')) { state.upload.file = input.files?.[0] || null; return renderPage(); }
});

document.addEventListener('change', (event) => {
  const input = event.target;
  if (input.matches('[data-setting]')) {
    const key = input.dataset.setting;
    state.settings[key] = input.type === 'checkbox' ? input.checked : input.value;
    saveState();
  }
});

document.addEventListener('dragover', (event) => {
  const zone = event.target.closest('.dropzone-pkap');
  if (!zone) return;
  event.preventDefault();
  zone.classList.add('dragging');
});
document.addEventListener('dragleave', (event) => {
  const zone = event.target.closest('.dropzone-pkap');
  if (zone) zone.classList.remove('dragging');
});
document.addEventListener('drop', (event) => {
  const zone = event.target.closest('.dropzone-pkap');
  if (!zone) return;
  event.preventDefault();
  zone.classList.remove('dragging');
  state.upload.file = event.dataTransfer.files?.[0] || null;
  renderPage();
});

document.querySelector('[data-close-alarm]')?.addEventListener('click', () => alarmLayer.classList.remove('show'));
document.querySelector('[data-ack-alarm]')?.addEventListener('click', acknowledgeAlarm);

function login() {
  const name = byId('loginName')?.value?.trim() || 'Security Admin';
  const code = byId('workspaceCode')?.value?.trim() || 'SHAKTII-SOC-01';
  state.user = { name, role: 'Security Admin', email: 'admin@pwnshakti.ai', workspace: code };
  localStorage.setItem('SHAKTII_USER', JSON.stringify(state.user));
  saveState();
  navigate('/dashboard');
}

function logout() {
  localStorage.removeItem('SHAKTII_USER');
  state.user = null;
  saveState();
  navigate('/login');
}

async function installApp() {
  if (state.installed || isStandalone()) {
    state.installed = true;
    localStorage.setItem('SHAKTII_INSTALLED', 'true');
    updateInstallButtons();
    return toast('App is already installed', 'success');
  }
  if (!state.installPrompt) return toast('Use browser menu → Install app / Add to Home screen', 'info');
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
  const installed = state.installed || isStandalone();
  document.querySelectorAll('[data-action="install"]').forEach((button) => {
    if (installed) {
      button.classList.add('install-hidden');
      button.hidden = true;
      button.disabled = true;
    } else {
      button.classList.remove('install-hidden');
      button.hidden = false;
      button.disabled = false;
      button.textContent = 'Install App';
    }
  });
}

function ensureAuth() {
  const path = currentPath();
  if (!state.user && !['/login', '/signup'].includes(path)) window.history.replaceState({}, '', '/login');
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
  if (state.drawer) app.insertAdjacentHTML('beforeend', drawerView(state.drawer));
  requestAnimationFrame(updateInstallButtons);
}

function renderPage() {
  const outlet = byId('pageOutlet');
  if (!outlet) return;
  const path = currentPath();
  const fileMatch = path.match(/^\/files\/([^/]+)$/);
  const txMatch = path.match(/^\/blockchain\/([^/]+)$/);
  const alertMatch = path.match(/^\/security\/alerts\/([^/]+)$/);
  const analysisMatch = path.match(/^\/analysis\/([^/]+)$/);
  if (analysisMatch) outlet.innerHTML = analysisPage(analysisMatch[1]);
  else if (fileMatch) outlet.innerHTML = fileDetailPage(fileMatch[1]);
  else if (txMatch) outlet.innerHTML = txDetailPage(txMatch[1]);
  else if (alertMatch) outlet.innerHTML = alertDetailPage(alertMatch[1]);
  else if (path === '/dashboard') outlet.innerHTML = dashboardPage();
  else if (path === '/files') outlet.innerHTML = filesPage();
  else if (path === '/upload') outlet.innerHTML = analyzerPage();
  else if (path === '/history') outlet.innerHTML = historyPage();
  else if (path === '/analytics') outlet.innerHTML = analyticsPage();
  else if (path === '/findings') outlet.innerHTML = findingsPage();
  else if (path === '/iocs') outlet.innerHTML = iocsPage();
  else if (path === '/access') outlet.innerHTML = accessPage();
  else if (path === '/blockchain') outlet.innerHTML = blockchainPage();
  else if (path === '/security') outlet.innerHTML = securityPage();
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
        <img src="/assets/logo.svg?v=28" alt="PWN SHAKTI" class="auth-logo" />
        <p class="eyebrow">Secure data command</p>
        <h1>${signup ? 'Create workspace' : 'Welcome back'}</h1>
        <p class="muted">Access protected files, blockchain verification, threat monitoring, PKAP analysis and audit reports from one command application.</p>
        <label class="field-label">Operator name</label>
        <input id="loginName" class="input" placeholder="Security Admin" value="Security Admin" />
        <label class="field-label">Workspace code</label>
        <input id="workspaceCode" class="input" placeholder="SHAKTII-SOC-01" value="SHAKTII-SOC-01" />
        <button class="btn primary full" data-action="login">${signup ? 'Create and enter app' : 'Enter secure app'}</button>
        ${isStandalone() ? '' : '<button class="btn secondary full" data-action="install">Install App</button>'}
        <p class="auth-switch">${signup ? 'Already have access?' : 'Need access?'} <button data-nav="${signup ? '/login' : '/signup'}">${signup ? 'Login' : 'Create workspace'}</button></p>
      </section>
    </main>`;
}

function shellTemplate() {
  const path = currentPath();
  return `
    <div class="app-shell ${state.sidebarOpen ? 'sidebar-open' : ''}">
      <aside class="sidebar">
        <div class="brand-block">
          <img src="/assets/logo.svg?v=28" alt="PWN SHAKTI" />
          <div><strong>PWN SHAKTI</strong><span>Secure data command</span></div>
        </div>
        <nav class="side-nav">
          ${routes.map((r) => `<button class="nav-item ${isActive(path, r.path) ? 'active' : ''}" data-nav="${r.path}"><span>${r.icon}</span>${r.label}</button>`).join('')}
        </nav>
        <button class="nav-item logout-nav" data-action="logout"><span>⏻</span>Logout</button>
      </aside>
      <div class="shell-backdrop" data-action="toggle-sidebar"></div>
      <section class="main-shell">
        <header class="topbar">
          <button class="icon-btn menu" data-action="toggle-sidebar">☰</button>
          <div class="top-title"><strong>${titleForPath(path)}</strong><span>${window.SHAKTII_API.base ? 'Connected to backend API' : 'Local + same-origin PKAP processing'}</span></div>
          <div class="top-actions">
            <button class="status-pill ${window.SHAKTII_API.base ? 'ok' : 'local'}">${window.SHAKTII_API.base ? 'API Live' : 'Local Mode'}</button>
            ${isStandalone() ? '' : '<button class="btn small" data-action="install">Install App</button>'}
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
  if (path.startsWith('/analysis/')) return 'Analysis Result';
  return routes.find((r) => r.path === path)?.label || 'Workspace';
}
function pageHeader(overline, title, text, actions = '') { return `<section class="page-header"><div><p class="eyebrow">${overline}</p><h1>${title}</h1><p>${text}</p></div><div class="page-actions">${actions}</div></section>`; }
function emptyState(title, text, nav = '/upload', label = 'Start Analysis') { return `<div class="empty"><h3>${title}</h3><p>${text}</p>${nav ? `<button class="btn primary" data-nav="${nav}">${label}</button>` : ''}</div>`; }
function badge(text, tone = '') { return `<span class="badge ${tone}">${escapeHtml(text)}</span>`; }
function info(label, value) { return `<div class="info"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`; }

function dashboardPage() {
  const a = activeAnalysis();
  if (a) {
    return `
      ${pageHeader('Latest PKAP result', a.fileName, `Processed ${new Date(a.createdAt).toLocaleString()} · ${a.provider}`, '<button class="btn primary" data-nav="/upload">New Analysis</button><button class="btn secondary" data-action="generate-report">Generate Report</button><button class="btn secondary" data-action="download-pdf">Download PDF</button>')}
      ${summaryCards(a)}
      <section class="dashboard-grid">
        <article class="card span-2"><div class="card-head"><h2>Security events over time</h2><button data-nav="/analytics">Open analytics →</button></div>${lineChartFromSeverity(a)}</article>
        <article class="card"><div class="card-head"><h2>Threat severity</h2><button data-action="open-drawer" data-drawer="severity">Inspect →</button></div>${severityBars(a)}</article>
        <article class="card"><div class="card-head"><h2>Recent findings</h2><button data-nav="/findings">View all →</button></div>${findingsList(a.findings.slice(0, 4))}</article>
        <article class="card span-2"><div class="card-head"><h2>Indicators of compromise</h2><button data-nav="/iocs">Open IOCs →</button></div>${iocTable(a.iocs.slice(0, 6))}</article>
      </section>`;
  }
  const d = sample();
  return `
    ${pageHeader('Overview', 'Security posture at a glance', 'Start PKAP analysis from the analyzer module. Other command-center sections remain available for security workflow presentation.', '<button class="btn primary" data-nav="/upload">Start PKAP Analysis</button><button class="btn secondary" data-action="test-alarm">Test alarm</button>')}
    <section class="stats-grid">
      ${statCard('Protected files', d.stats.protectedFiles || 0, 'Encrypted and access-controlled', '/files')}
      ${statCard('Verified files', d.stats.verifiedFiles || 0, 'Blockchain integrity passed', '/blockchain')}
      ${statCard('Security alerts', d.stats.securityAlerts || 0, 'Open issues needing review', '/security', 'warn')}
      ${statCard('Integrity score', `${d.stats.integrityScore || 0}%`, 'System health score', '/analytics', 'ok')}
    </section>
    <section class="dashboard-grid">
      <article class="card span-2"><div class="card-head"><h2>Security events over time</h2><button data-nav="/analytics">Open analytics →</button></div>${lineChart((d.analytics && d.analytics.securityEvents) || [4,7,5,11,8,13,9])}</article>
      <article class="card"><div class="card-head"><h2>Threat severity</h2><button data-nav="/security">Investigate →</button></div>${donutLike((d.analytics && d.analytics.severity) || { High: 3, Medium: 8, Low: 12 })}</article>
      <article class="card"><div class="card-head"><h2>Recent activity</h2><button data-nav="/activity">View all →</button></div>${activityList((d.activity || []).slice(0, 4))}</article>
      <article class="card span-2"><div class="card-head"><h2>Protected files</h2><button data-nav="/files">View files →</button></div>${fileTable((d.files || []).slice(0, 4), false)}</article>
    </section>`;
}

function summaryCards(a) {
  const sev = a.severityBreakdown || {};
  return `<section class="stats-grid">
    ${statCard('Overall risk', `${a.metadata.overallRiskScore}/100`, 'Calculated from processed findings', `/analysis/${a.id}`, a.metadata.overallRiskScore >= 70 ? 'warn' : 'ok')}
    ${statCard('Findings', a.findings.length, 'Issues detected from file', '/findings')}
    ${statCard('Critical + High', (sev.critical || 0) + (sev.high || 0), 'Priority review items', '/analytics', 'warn')}
    ${statCard('IOCs', a.iocs.length, 'IP, domain or hash indicators', '/iocs')}
  </section>`;
}
function statCard(label, value, helper, nav, tone = '') { return `<button class="stat-card ${tone}" data-nav="${nav}"><span>${label}</span><strong>${value}</strong><small>${helper}</small><em>View details →</em></button>`; }

function analyzerPage() {
  if (state.upload.processing) return processingPage();
  const file = state.upload.file;
  const error = validateFile(file);
  return `
    ${pageHeader('PKAP Analyzer', 'Upload file for intelligent analysis', 'Upload a log/content file. Processing, analytics, history and reports are generated from the uploaded file.', '<button class="btn secondary" data-nav="/history">History</button>')}
    <section class="upload-layout">
      <aside class="stepper">
        <div class="step active"><b>1</b><span>Upload file</span></div>
        <div class="step"><b>2</b><span>Process</span></div>
        <div class="step"><b>3</b><span>Analyse</span></div>
        <div class="step"><b>4</b><span>Report</span></div>
      </aside>
      <article class="card upload-card">
        <label class="dropzone-pkap">
          <input id="uploadFile" type="file" accept=".log,.txt,.json,.csv,.md,.yaml,.yml" hidden />
          <b>Drop file here or browse</b>
          <span>Supported: LOG, TXT, JSON, CSV, MD, YAML/YML · Maximum 8 MB</span>
        </label>
        ${file ? `<div class="selected-file"><div><strong>${escapeHtml(file.name)}</strong><small>${(file.size / 1024).toFixed(1)} KB · ready for PKAP processing</small></div><button class="btn secondary" data-action="clear-file">Remove</button></div>` : ''}
        ${file && error ? `<div class="pkap-error">${escapeHtml(error)}</div>` : ''}
        <div class="form-actions"><button class="btn primary" data-action="start-pkap" ${!file || error ? 'disabled' : ''}>Process & Analyse</button></div>
      </article>
    </section>`;
}

function processingPage() {
  const p = state.upload.processing;
  return `
    ${pageHeader('Processing', 'PKAP analysis running', 'SHAKTII is reading, redacting, analysing and preparing the result dashboard.')}
    <section class="progress-box">
      <p class="eyebrow">${escapeHtml(p.stage)}</p>
      <h2>${p.error ? 'Processing failed' : `${p.percent}% complete`}</h2>
      <div class="progress-line"><i style="width:${p.percent}%"></i></div>
      ${p.error ? `<div class="pkap-error">${escapeHtml(p.error)}</div><button class="btn primary" data-action="clear-file">Try again</button>` : `<div class="stage-list">${stages.map((s, i) => `<span class="${i <= p.index ? 'done' : ''}">${s}</span>`).join('')}</div>`}
    </section>`;
}

async function startPkapAnalysis() {
  const error = validateFile(state.upload.file);
  if (error) return toast(error, 'danger');
  const file = state.upload.file;
  try {
    let raw = '';
    for (let i = 0; i < stages.length; i++) {
      state.upload.processing = { index: i, stage: stages[i], percent: Math.min(94, 8 + i * 14), error: '' };
      renderPage();
      await wait(360);
      if (i === 1) raw = await file.text();
    }
    if (!raw.trim()) throw new Error('Uploaded file has no readable text content.');
    const redacted = redactSensitive(raw);
    let analysis;
    try {
      const response = await window.SHAKTII_API.analyze({ fileName: file.name, redactedData: redacted.text, settings: state.settings });
      analysis = normalizeAnalysis(response.analysis, file.name, raw, redacted.masked, response.providerUsed || 'PKAP API');
    } catch (apiError) {
      analysis = localAnalyze(file.name, raw, redacted.masked, apiError.message);
    }
    state.upload.processing = { index: stages.length, stage: 'Completed', percent: 100, error: '' };
    renderPage();
    await wait(250);
    state.analyses = [analysis, ...state.analyses.filter((a) => a.id !== analysis.id)].slice(0, 20);
    state.activeId = analysis.id;
    state.upload = { file: null, processing: null };
    saveState();
    toast('PKAP analysis completed', 'success');
    navigate(`/analysis/${analysis.id}`);
  } catch (err) {
    state.upload.processing = { index: 0, stage: 'Failed', percent: 0, error: err.message || 'Analysis failed.' };
    renderPage();
  }
}

function validateFile(file) {
  if (!file) return 'Please select a file first.';
  const name = file.name.toLowerCase();
  if (!['.log','.txt','.json','.csv','.md','.yaml','.yml'].some((ext) => name.endsWith(ext))) return 'Unsupported file type. Upload LOG, TXT, JSON, CSV, MD, YAML or YML.';
  if (file.size > 8 * 1024 * 1024) return 'File is too large. Keep it below 8 MB for this PWA build.';
  return '';
}

function redactSensitive(text) {
  let masked = 0;
  const rules = [
    [/([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '[REDACTED_EMAIL]'],
    [/(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED_SECRET]'],
    [/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]'],
    [/eyJ[A-Za-z0-9_-]{18,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]']
  ];
  let out = text;
  rules.forEach(([regex, replacement]) => { out = out.replace(regex, () => { masked++; return replacement; }); });
  return { text: out, masked };
}

function normalizeAnalysis(a = {}, fileName, raw, masked, provider) {
  const findings = Array.isArray(a.findings) ? a.findings : [];
  const iocs = Array.isArray(a.iocs) ? a.iocs : [];
  const severityBreakdown = a.severityBreakdown || countSeverity(findings);
  const risk = Number(a?.metadata?.overallRiskScore ?? scoreFromSeverity(severityBreakdown, iocs));
  return { id: `AN-${Date.now()}`, fileName, createdAt: new Date().toISOString(), provider, executiveSummary: a.executiveSummary || 'PKAP analysis completed from uploaded content.', metadata: { ...(a.metadata || {}), overallRiskScore: risk, lines: raw.split(/\r?\n/).length, privacyMasked: masked, fileName }, severityBreakdown, findings, iocs, remediationChecklist: Array.isArray(a.remediationChecklist) ? a.remediationChecklist : recommendations(severityBreakdown, findings, iocs), report: '' };
}

function localAnalyze(fileName, raw, masked, apiError) {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const findings = [];
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    let severity = ''; let type = '';
    if (/ransom|malware|exfil|privilege|root|critical|breach|c2|command.+control|shell|payload/.test(lower)) { severity = 'Critical'; type = 'Critical threat signal'; }
    else if (/failed|denied|unauthorized|forbidden|bruteforce|brute force|suspicious|blocked|invalid login/.test(lower)) { severity = 'High'; type = 'Suspicious access event'; }
    else if (/warning|warn|timeout|anomaly|unusual|policy|scan|rate limit/.test(lower)) { severity = 'Medium'; type = 'Warning or anomaly'; }
    else if (/info|ok|success|normal|pass|verified/.test(lower)) { severity = 'Info'; type = 'Informational event'; }
    if (severity) findings.push({ severity, eventType: type, sourceIP: (line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/) || ['-'])[0], timestamp: (line.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/) || [`line ${idx + 1}`])[0], description: line.slice(0, 190), mitreTag: severity === 'Critical' ? 'Impact / Exfiltration' : severity === 'High' ? 'Initial Access' : 'Review', rawLogSnippet: line.slice(0, 260), matchedPattern: type });
  });
  const iocs = extractIocs(raw);
  const sev = countSeverity(findings);
  const risk = scoreFromSeverity(sev, iocs);
  return { id: `AN-${Date.now()}`, fileName, createdAt: new Date().toISOString(), provider: 'Local PKAP analyzer', executiveSummary: `PKAP processed ${lines.length} lines and detected ${findings.length} notable events. ${apiError ? 'Same-origin AI endpoint was unavailable, so local analysis completed the run.' : ''}`.trim(), metadata: { logTypeDetected: detectType(raw, fileName), timeRangeCovered: detectRange(raw), overallRiskScore: risk, lines: lines.length, privacyMasked: masked, fileName }, severityBreakdown: sev, findings, iocs, remediationChecklist: recommendations(sev, findings, iocs), report: '' };
}
function extractIocs(raw) {
  const ips = [...new Set(raw.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [])].slice(0, 50).map((value) => ({ value, type: 'IP', reputation: /185\.220|45\.|91\./.test(value) ? 'Suspicious' : 'Unknown' }));
  const domains = [...new Set(raw.match(/\b[a-z0-9.-]+\.(?:com|net|org|io|in|ru|cn|xyz)\b/gi) || [])].slice(0, 40).map((value) => ({ value, type: 'Domain', reputation: /tor|mal|evil|c2|phish/i.test(value) ? 'Suspicious' : 'Unknown' }));
  const hashes = [...new Set(raw.match(/\b[a-f0-9]{32,64}\b/gi) || [])].slice(0, 20).map((value) => ({ value, type: 'Hash', reputation: 'Unknown' }));
  return [...ips, ...domains, ...hashes];
}
function countSeverity(findings) { return findings.reduce((acc, f) => { const key = String(f.severity || 'Info').toLowerCase(); acc[key] = (acc[key] || 0) + 1; return acc; }, { critical: 0, high: 0, medium: 0, low: 0, info: 0 }); }
function scoreFromSeverity(s, iocs) { return Math.min(100, (s.critical || 0) * 22 + (s.high || 0) * 12 + (s.medium || 0) * 6 + Math.min(18, iocs.length * 2)); }
function recommendations(s, findings, iocs) { const recs = []; if (s.critical) recs.push('Immediately review critical findings and preserve evidence.'); if (s.high) recs.push('Validate high-severity access events and affected assets.'); if (iocs.length) recs.push('Enrich extracted IOCs using threat intelligence before blocking.'); recs.push('Generate and download the PKAP report for submission or incident record.'); return recs; }
function detectType(raw, name) { if (/nginx|apache|http/i.test(raw)) return 'Web/server logs'; if (/ssh|sudo|auth/i.test(raw)) return 'Authentication/system logs'; if (/wallet|transaction|block|hash/i.test(raw)) return 'Blockchain/security records'; return name.split('.').pop()?.toUpperCase() || 'Text'; }
function detectRange(raw) { const dates = raw.match(/\d{4}-\d{2}-\d{2}/g) || []; return dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : 'Not detected'; }

function analysisPage(id) {
  const a = state.analyses.find((x) => x.id === id) || activeAnalysis();
  if (!a) return emptyState('No analysis found', 'Upload a file to generate a PKAP result.', '/upload', 'Open PKAP Analyzer');
  state.activeId = a.id; saveState();
  return `
    ${pageHeader('Analysis result', a.fileName, `${new Date(a.createdAt).toLocaleString()} · ${a.provider}`, '<div class="analysis-actions"><button class="btn secondary" data-nav="/upload">New Analysis</button><button class="btn primary" data-action="generate-report">Generate Report</button><button class="btn secondary" data-action="download-pdf">Download PDF</button></div>')}
    ${summaryCards(a)}
    <section class="dashboard-grid">
      <article class="card"><div class="card-head"><h2>Severity distribution</h2><button data-action="open-drawer" data-drawer="severity">Details →</button></div>${severityBars(a)}</article>
      <article class="card"><div class="card-head"><h2>Indicators</h2><button data-nav="/iocs">Open IOCs →</button></div>${iocTable(a.iocs.slice(0, 5))}</article>
      <article class="card"><h2>Executive summary</h2><p>${escapeHtml(a.executiveSummary)}</p></article>
      <article class="card span-3"><div class="card-head"><h2>Question/content-level findings</h2><button data-nav="/findings">View all →</button></div>${findingsList(a.findings.slice(0, 8))}</article>
      ${a.report ? `<article class="card span-3"><div class="card-head"><h2>Report preview</h2><button data-action="download-pdf">Download PDF →</button></div><pre class="report-preview">${escapeHtml(a.report.slice(0, 3000))}</pre></article>` : ''}
    </section>`;
}

function historyPage() {
  const term = state.filters.history.toLowerCase();
  const list = state.analyses.filter((a) => `${a.fileName} ${a.provider}`.toLowerCase().includes(term));
  return `${pageHeader('Analysis history', 'Processed PKAP analyses', 'Every completed analysis is saved here and can be reopened.', '<button class="btn primary" data-nav="/upload">New Analysis</button>')}
    <section class="toolbar"><input class="input" data-filter="history" placeholder="Search analysis history" value="${escapeHtml(state.filters.history)}" /></section>
    <section class="card">${list.length ? `<div class="table-wrap"><table><thead><tr><th>File</th><th>Processed</th><th>Risk</th><th>Findings</th><th>IOCs</th><th></th></tr></thead><tbody>${list.map((a) => `<tr><td><strong>${escapeHtml(a.fileName)}</strong><small>${a.provider}</small></td><td>${new Date(a.createdAt).toLocaleString()}</td><td>${a.metadata.overallRiskScore}/100</td><td>${a.findings.length}</td><td>${a.iocs.length}</td><td><button class="link-btn" data-nav="/analysis/${a.id}">Open →</button></td></tr>`).join('')}</tbody></table></div>` : emptyState('No analyses yet', 'Upload your first file to create history.', '/upload', 'Open PKAP Analyzer')}</section>`;
}

function analyticsPage() {
  const a = activeAnalysis();
  if (!a) return `${pageHeader('Analytics', 'No PKAP analytics yet', 'Upload a file first. Analytics will populate from processed data only.', '<button class="btn primary" data-nav="/upload">Start Analysis</button>')}${emptyState('No processed data', 'Analytics appear after PKAP processing.', '/upload', 'Open PKAP Analyzer')}`;
  return `${pageHeader('Analytics', 'PKAP analytics dashboard', `Based on ${escapeHtml(a.fileName)} processed at ${new Date(a.createdAt).toLocaleString()}`, '<button class="btn secondary" data-nav="/analysis/' + a.id + '">Open Result</button>')}
    ${summaryCards(a)}
    <section class="analytics-grid">
      <article class="card span-2"><h2>Severity weight</h2>${lineChartFromSeverity(a)}</article>
      <article class="card"><h2>Severity distribution</h2>${severityBars(a)}</article>
      <article class="card"><h2>IOC distribution</h2>${iocDistribution(a)}</article>
      <article class="card span-2"><h2>Recommendations</h2><div class="process-list">${a.remediationChecklist.map((r) => `<span>✓ ${escapeHtml(r)}</span>`).join('')}</div></article>
    </section>`;
}

function findingsPage() {
  const a = activeAnalysis();
  if (!a) return emptyState('No findings yet', 'Run a PKAP analysis to inspect findings.', '/upload', 'Start Analysis');
  const term = state.filters.findings.toLowerCase();
  const list = a.findings.filter((f) => `${f.severity} ${f.eventType} ${f.description} ${f.sourceIP}`.toLowerCase().includes(term));
  return `${pageHeader('Findings / Issues', 'Detected PKAP findings', 'Inspect why each issue was detected and what should be reviewed.', '<button class="btn secondary" data-nav="/analysis/' + a.id + '">Open Result</button>')}
    <section class="toolbar"><input class="input" data-filter="findings" placeholder="Search findings" value="${escapeHtml(state.filters.findings)}" /></section>
    <section class="card">${findingsList(list, true)}</section>`;
}

function iocsPage() {
  const a = activeAnalysis();
  if (!a) return emptyState('No IOCs yet', 'Run analysis to extract indicators.', '/upload', 'Start Analysis');
  return `${pageHeader('Indicators / IOCs', 'Extracted security indicators', 'IPs, domains and hashes are extracted from the processed file.', '<button class="btn secondary" data-nav="/analysis/' + a.id + '">Open Result</button>')}
    <section class="card">${iocTable(a.iocs, true)}</section>`;
}

function reportsPage() {
  const a = activeAnalysis();
  return `${pageHeader('Reports', 'PKAP reports', 'Generate and download professional PDF reports from completed analyses.', a ? '<button class="btn primary" data-action="generate-report">Generate Report</button><button class="btn secondary" data-action="download-pdf">Download PDF</button>' : '<button class="btn primary" data-nav="/upload">Start Analysis</button>')}
    <section class="card report">
      ${state.reports.length ? `<div class="table-wrap"><table><thead><tr><th>Report</th><th>Created</th><th>Provider</th><th></th></tr></thead><tbody>${state.reports.map((r) => `<tr><td><strong>${escapeHtml(r.fileName)}</strong><small>${r.analysisId}</small></td><td>${new Date(r.createdAt).toLocaleString()}</td><td>${escapeHtml(r.provider)}</td><td><button class="link-btn" data-nav="/analysis/${r.analysisId}">Open →</button></td></tr>`).join('')}</tbody></table></div>` : emptyState('No reports generated yet', 'Open an analysis and click Generate Report.', a ? `/analysis/${a.id}` : '/upload', a ? 'Open latest analysis' : 'Start Analysis')}
      ${a?.report ? `<div class="pdf-ready">Report is ready for ${escapeHtml(a.fileName)}. Use Download PDF to save it.</div><pre class="report-preview">${escapeHtml(a.report.slice(0, 2600))}</pre>` : ''}
    </section>`;
}

async function generateReport(id) {
  const a = id ? state.analyses.find((x) => x.id === id) : activeAnalysis();
  if (!a) return toast('Run an analysis before generating a report.', 'danger');
  toast('Generating report...', 'default');
  try {
    const response = await window.SHAKTII_API.generateReport({ analysisData: a });
    a.report = response.report || buildLocalReport(a);
    a.reportProvider = response.providerUsed || 'PKAP report service';
  } catch (error) {
    a.report = buildLocalReport(a);
    a.reportProvider = 'Local report builder';
  }
  state.activeId = a.id;
  state.reports = [{ id: `RP-${Date.now()}`, analysisId: a.id, fileName: a.fileName, createdAt: new Date().toISOString(), provider: a.reportProvider }, ...state.reports.filter((r) => r.analysisId !== a.id)].slice(0, 20);
  saveState();
  toast('Report generated', 'success');
  render();
}

function buildLocalReport(a) {
  const sev = a.severityBreakdown || {};
  const verdict = a.metadata.overallRiskScore >= 80 ? 'High Revision Required' : a.metadata.overallRiskScore >= 60 ? 'Needs Improvement' : a.metadata.overallRiskScore >= 35 ? 'Good with Review' : 'Low Risk / Good';
  return `# SHAKTII PKAP ANALYSIS REPORT\n\nAnalysed File: ${a.fileName}\nGenerated: ${new Date().toLocaleString()}\nRisk Score: ${a.metadata.overallRiskScore}/100\nFinal Verdict: ${verdict}\n\n## Executive Summary\n${a.executiveSummary}\n\n## Severity Analysis\nCritical: ${sev.critical || 0}\nHigh: ${sev.high || 0}\nMedium: ${sev.medium || 0}\nLow: ${sev.low || 0}\nInfo: ${sev.info || 0}\n\n## Findings\n${a.findings.map((f, i) => `${i + 1}. [${f.severity}] ${f.eventType} - ${f.description}`).join('\n') || 'No actionable findings detected.'}\n\n## Indicators of Compromise\n${a.iocs.map((x, i) => `${i + 1}. ${x.value} (${x.type}) - ${x.reputation}`).join('\n') || 'No IOCs extracted.'}\n\n## Recommendations\n${a.remediationChecklist.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nGenerated by SHAKTII / PKAP Analyzer.`;
}

function downloadPdf(id) {
  const a = id ? state.analyses.find((x) => x.id === id) : activeAnalysis();
  if (!a) return toast('No analysis available for PDF.', 'danger');
  const report = a.report || buildLocalReport(a);
  const blob = makePdfBlob(report);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${a.fileName.replace(/\W+/g, '_')}_PKAP_Report.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast('PDF download started', 'success');
}

function makePdfBlob(text) {
  const lines = text.replace(/[#*_`|]/g, '').split(/\n/).flatMap((line) => line.length > 88 ? line.match(/.{1,88}(\s|$)/g) : [line]).slice(0, 96);
  const esc = (s) => String(s || '').replace(/[()\\]/g, '\\$&');
  const body = lines.map((line, i) => `BT /F1 10 Tf 50 ${752 - i * 13} Td (${esc(line.trim())}) Tj ET`).join('\n');
  const content = `q 0.03 0.04 0.08 rg 0 0 612 792 re f Q\nBT /F1 18 Tf 50 770 Td (SHAKTII PKAP ANALYSIS REPORT) Tj ET\n${body}`;
  const objects = [`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`, `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`, `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj`, `4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj`, `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj) => { offsets.push(pdf.length); pdf += obj + '\n'; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((n) => String(n).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

function severityBars(a) {
  const s = a.severityBreakdown || {};
  const total = Math.max(1, Object.values(s).reduce((x, y) => x + Number(y || 0), 0));
  return `<div class="severity-bars">${['critical','high','medium','low','info'].map((k) => `<div title="${k}: ${s[k] || 0} (${pct(s[k], total)}%)"><span>${k}</span><i><b style="width:${pct(s[k], total)}%"></b></i><em>${s[k] || 0}</em></div>`).join('')}</div>`;
}
function iocTable(iocs = [], full = false) {
  if (!iocs.length) return emptyState('No IOCs extracted', 'No IP, domain or hash indicators were detected.', '', '');
  return `<div class="table-wrap"><table><thead><tr><th>Indicator</th><th>Type</th><th>Reputation</th></tr></thead><tbody>${iocs.slice(0, full ? 200 : 8).map((x) => `<tr><td><code>${escapeHtml(x.value)}</code></td><td>${escapeHtml(x.type)}</td><td>${badge(x.reputation || 'Unknown', /malicious|suspicious/i.test(x.reputation || '') ? 'warn' : '')}</td></tr>`).join('')}</tbody></table></div>`;
}
function findingsList(findings = [], full = false) {
  if (!findings.length) return emptyState('No findings detected', 'No actionable issue was found in this view.', '', '');
  return findings.slice(0, full ? 200 : 8).map((f) => `<article class="finding-card"><div>${badge(f.severity || 'Info', String(f.severity).toLowerCase())}</div><h3>${escapeHtml(f.eventType || 'Finding')}</h3><p>${escapeHtml(f.description || '-')}</p><small>${escapeHtml(f.timestamp || '')} · Source: ${escapeHtml(f.sourceIP || '-')} · ${escapeHtml(f.mitreTag || '')}</small>${full ? `<code>${escapeHtml(f.rawLogSnippet || '')}</code>` : ''}</article>`).join('');
}
function lineChartFromSeverity(a) { const s = a.severityBreakdown || {}; return lineChart([s.info || 1, s.low || 1, s.medium || 1, s.high || 1, s.critical || 1, a.iocs.length || 1, a.metadata.overallRiskScore || 1]); }
function iocDistribution(a) { const groups = a.iocs.reduce((acc, x) => { acc[x.type] = (acc[x.type] || 0) + 1; return acc; }, {}); return donutLike(groups); }
function lineChart(values = []) { const max = Math.max(1, ...values.map(Number)); return `<div class="line-chart">${values.map((v) => `<span title="${v}" style="height:${Math.max(8, (Number(v) / max) * 100)}%"></span>`).join('')}</div>`; }
function donutLike(data = {}) { const entries = Object.entries(data); if (!entries.length) return emptyState('No data', 'No chart data yet.', '', ''); const total = entries.reduce((s, [, v]) => s + Number(v || 0), 0) || 1; return `<div class="severity-list">${entries.map(([k, v]) => `<div><span>${escapeHtml(k)}</span><strong>${v}</strong><i style="width:${pct(v,total)}%"></i></div>`).join('')}</div>`; }

function filesPage() { const term = state.filters.files.toLowerCase(); const files = (sample().files || []).filter((f) => `${f.name} ${f.owner} ${f.status} ${f.hash}`.toLowerCase().includes(term)); return `${pageHeader('Secure files', 'Protected documents vault', 'Search, verify, review encryption status and open full file records.', '<button class="btn primary" data-nav="/upload">Open PKAP Analyzer</button>')}<section class="toolbar"><input class="input" data-filter="files" placeholder="Search file, owner, hash or status" value="${escapeHtml(state.filters.files)}" /><button class="btn secondary" data-action="verify-file">Verify file</button></section><section class="card">${files.length ? fileTable(files, true) : emptyState('No protected files found', 'Change your search or upload a new file.', '/upload', 'Open analyzer')}</section>`; }
function fileTable(files, actions = true) { return `<div class="table-wrap"><table><thead><tr><th>File</th><th>Owner</th><th>Encryption</th><th>Verification</th><th>Status</th><th>Last Accessed</th>${actions ? '<th>Action</th>' : ''}</tr></thead><tbody>${files.map((f) => `<tr><td><strong>${escapeHtml(f.name)}</strong><small>${escapeHtml(f.id)} · ${escapeHtml(f.type)} · ${escapeHtml(f.size)}</small></td><td>${escapeHtml(f.owner)}</td><td>${badge(f.encrypted ? 'Encrypted' : 'Open', f.encrypted ? 'ok' : 'warn')}</td><td>${badge(f.verified ? 'Verified' : 'Pending', f.verified ? 'ok' : 'warn')}</td><td>${badge(f.status, f.status === 'Protected' ? 'ok' : 'warn')}</td><td>${escapeHtml(f.lastAccessed)}</td>${actions ? `<td><button class="link-btn" data-nav="/files/${f.id}">Open →</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`; }
function fileDetailPage(id) { const file = sample().files.find((f) => f.id === id) || sample().files[0]; if (!file) return emptyState('No file found', 'Open the analyzer to process a file.', '/upload', 'Open analyzer'); return `${pageHeader('File record', file.name, 'Complete file integrity, encryption, owner and blockchain verification details.', '<button class="btn secondary" data-nav="/files">Back to files</button><button class="btn primary" data-action="verify-file" data-file="' + file.id + '">Verify integrity</button>')}<section class="detail-grid"><article class="card span-2"><h2>File information</h2><div class="info-grid">${info('File ID', file.id)}${info('Owner', file.owner)}${info('Type', file.type)}${info('Size', file.size)}${info('Hash', file.hash)}${info('Uploaded', file.uploaded)}${info('Encryption', file.encrypted ? 'AES-256 enabled' : 'Not encrypted')}${info('Verification', file.verified ? 'Verified on ledger' : 'Pending')}</div></article><article class="card"><h2>Actions</h2><div class="stack"><button class="btn primary" data-nav="/blockchain/${file.tx}">View blockchain record</button><button class="btn secondary" data-nav="/activity">Audit trail</button><button class="btn secondary" data-nav="/reports">Reports</button></div></article></section>`; }

function accessPage() { return `${pageHeader('Access control', 'Users, roles and file permissions', 'Manage who can view, verify, download or share protected resources.', '<button class="btn primary">Invite user</button>')}<section class="cards-3"><article class="card"><h2>Admins</h2><strong class="big">04</strong><p>Full security access</p></article><article class="card"><h2>Analysts</h2><strong class="big">09</strong><p>Investigation and verification</p></article><article class="card"><h2>Viewers</h2><strong class="big">05</strong><p>Read-only reports</p></article></section><section class="card"><h2>Permission matrix</h2><div class="table-wrap"><table><thead><tr><th>Role</th><th>Upload</th><th>Verify</th><th>Contain</th><th>Reports</th></tr></thead><tbody><tr><td>Security Admin</td><td>Yes</td><td>Yes</td><td>Approval</td><td>Yes</td></tr><tr><td>Analyst</td><td>Yes</td><td>Yes</td><td>No</td><td>Yes</td></tr><tr><td>Viewer</td><td>No</td><td>Read</td><td>No</td><td>Read</td></tr></tbody></table></div></section>`; }
function blockchainPage() { const txs = sample().ledger || []; return `${pageHeader('Blockchain ledger', 'Verification records', 'Search and inspect file hashes, record IDs, owners, timestamps and transaction details.', '<button class="btn primary" data-action="verify-file">Verify file</button>')}<section class="card"><div class="table-wrap"><table><thead><tr><th>Transaction</th><th>File</th><th>Hash</th><th>Status</th><th>Owner</th><th>Time</th><th></th></tr></thead><tbody>${txs.map((t) => `<tr><td><strong>${t.id}</strong><small>${t.block}</small></td><td>${t.file}</td><td><code>${t.hash}</code></td><td>${badge(t.status, 'ok')}</td><td>${t.owner}</td><td>${t.time}</td><td><button class="link-btn" data-nav="/blockchain/${t.id}">Details →</button></td></tr>`).join('')}</tbody></table></div></section>`; }
function txDetailPage(id) { const tx = sample().ledger.find((t) => t.id === id) || sample().ledger[0]; if (!tx) return notFoundPage(); return `${pageHeader('Ledger details', tx.id, 'Complete blockchain verification record.', '<button class="btn secondary" data-nav="/blockchain">Back to ledger</button>')}<section class="detail-grid"><article class="card span-2"><h2>Verification record</h2><div class="info-grid">${info('Record ID', tx.id)}${info('Block', tx.block)}${info('File', tx.file)}${info('Type', tx.type)}${info('Hash', tx.hash)}${info('Status', tx.status)}${info('Owner', tx.owner)}${info('Timestamp', tx.time)}</div></article><article class="card"><h2>Integrity result</h2><div class="result-ok">Verified</div><p class="muted">The file hash matches the ledger record.</p></article></section>`; }
function securityPage() { const alerts = sample().alerts || []; return `${pageHeader('Security monitoring', 'Threats and incident response', 'Track active threats, suspicious events, integrity failures and containment actions.', '<button class="btn danger" data-action="test-alarm">Trigger alarm</button>')}<section class="stats-grid"><div class="stat-card"><span>Security score</span><strong>98</strong><small>Excellent posture</small></div><div class="stat-card warn"><span>Active alerts</span><strong>${alerts.filter((a) => a.status !== 'Resolved').length}</strong><small>Needs review</small></div><div class="stat-card"><span>Unauthorized attempts</span><strong>12</strong><small>Last 24 hours</small></div><div class="stat-card ok"><span>Contained</span><strong>08</strong><small>Safe actions</small></div></section><section class="card"><div class="card-head"><h2>Security alerts</h2><button data-action="contain">Contain selected →</button></div><div class="alert-list">${alerts.map(alertCard).join('')}</div></section>`; }
function alertCard(a) { return `<button class="alert-row" data-nav="/security/alerts/${a.id}"><div>${badge(a.severity, a.severity === 'Critical' ? 'danger' : 'warn')}<h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.summary)}</p></div><span>${escapeHtml(a.time)}</span></button>`; }
function alertDetailPage(id) { const a = sample().alerts.find((x) => x.id === id) || sample().alerts[0]; if (!a) return notFoundPage(); return `${pageHeader('Security alert', a.title, a.summary, '<button class="btn secondary" data-nav="/security">Back</button><button class="btn danger" data-action="contain">Contain threat</button>')}<section class="detail-grid"><article class="card span-2"><h2>Alert details</h2><div class="info-grid">${info('Alert ID', a.id)}${info('Severity', a.severity)}${info('Status', a.status)}${info('Detected', a.time)}${info('Source', a.source || 'Unknown')}${info('Policy', a.policy || 'Security monitoring')}</div></article><article class="card"><h2>Recommended response</h2><p>Review evidence, acknowledge alert, freeze suspicious session and escalate if needed.</p></article></section>`; }
function activityPage() { const term = state.filters.activity.toLowerCase(); const list = (sample().activity || []).filter((a) => `${a.actor} ${a.action} ${a.resource}`.toLowerCase().includes(term)); return `${pageHeader('Audit logs', 'Activity timeline', 'Search user actions, access events and verification records.', '')}<section class="toolbar"><input class="input" data-filter="activity" placeholder="Search audit logs" value="${escapeHtml(state.filters.activity)}" /></section><section class="card">${activityList(list)}</section>`; }
function activityList(list = []) { if (!list.length) return emptyState('No activity found', 'Activity will appear here.', '', ''); return `<div class="timeline">${list.map((a) => `<article><i></i><div><strong>${escapeHtml(a.action || a.title)}</strong><p>${escapeHtml(a.actor || a.summary || '')} · ${escapeHtml(a.resource || '')}</p></div><span>${escapeHtml(a.time || '')}</span></article>`).join('')}</div>`; }
function notificationsPage() { return `${pageHeader('Notifications', 'Alert delivery center', 'Security messages, warnings and system notices.', '')}<section class="card">${activityList([{ action: 'Critical alerts enabled', actor: 'SHAKTII', resource: 'Mobile vibration and alarm ready', time: 'Active' }, { action: 'Report service ready', actor: 'PKAP', resource: 'PDF generation available', time: 'Active' }])}</section>`; }
function settingsPage() { return `${pageHeader('Settings', 'Application preferences', 'Settings are saved locally and influence analysis/report output.', '<button class="btn primary" data-action="save-settings">Save settings</button>')}<section class="cards-3"><article class="card"><h2>Analysis</h2>${settingCheck('strictAnalysis','Strict issue detection')}${settingCheck('includeIocs','Extract IOCs')}</article><article class="card"><h2>Reports</h2>${settingCheck('includeFindings','Include findings')}${settingCheck('includeRecommendations','Include recommendations')}</article><article class="card"><h2>Application</h2><div class="info-grid">${info('Mode', window.SHAKTII_API.base ? 'Backend API connected' : 'Same-origin + local processing')}${info('Version', 'b3d5186 rebuild + PKAP')}</div></article></section>`; }
function settingCheck(key, label) { return `<label class="option-list"><label><input type="checkbox" data-setting="${key}" ${state.settings[key] ? 'checked' : ''}> ${label}</label></label>`; }
function profilePage() { return `${pageHeader('Profile', 'Operator profile', 'Signed-in workspace operator details.', '<button class="btn danger" data-action="logout">Logout</button>')}<section class="detail-grid"><article class="card"><h2>Account</h2><div class="info-grid">${info('Name', state.user.name)}${info('Role', state.user.role)}${info('Email', state.user.email)}${info('Workspace', state.user.workspace || 'SHAKTII-SOC-01')}</div></article><article class="card"><h2>Session</h2><p class="muted">Logout clears the session and returns to login. Login remains accessible after logout.</p></article></section>`; }
function notFoundPage() { return `${pageHeader('Page not found', 'This route is not available', 'Return to dashboard or open PKAP Analyzer.', '<button class="btn primary" data-nav="/dashboard">Dashboard</button>')}`; }

function drawerView(type) { const a = activeAnalysis(); return `<div class="drawer-backdrop"><aside class="drawer"><button data-action="close-drawer">×</button><h2>${type === 'iocs' ? 'Indicators / IOCs' : type === 'severity' ? 'Severity details' : 'Findings / Issues'}</h2>${!a ? '<p>No analysis available.</p>' : type === 'iocs' ? iocTable(a.iocs, true) : type === 'severity' ? severityBars(a) : findingsList(a.findings, true)}</aside></div>`; }
function triggerAlarm() { alarmLayer?.classList.add('show'); if (navigator.vibrate) navigator.vibrate([650, 150, 650, 180, 1000]); toast('Critical alarm activated', 'danger'); }
function acknowledgeAlarm() { alarmLayer?.classList.remove('show'); if (navigator.vibrate) navigator.vibrate(0); toast('Alert acknowledged', 'success'); }
async function containThreat() { await window.SHAKTII_API.contain({ scope: 'current-alert' }); toast('Containment action queued', 'success'); }
async function verifyFile(file = 'FL-003') { await window.SHAKTII_API.verify({ file }); toast('File integrity verified', 'success'); }
function saveSettings() { saveState(); toast('Settings saved for this device', 'success'); }

function fallbackData() { return { stats: { protectedFiles: 18, verifiedFiles: 16, securityAlerts: 3, integrityScore: 98 }, files: [{ id: 'FL-001', name: 'incident-evidence.log', owner: 'Security Admin', type: 'LOG', size: '2.1 MB', encrypted: true, verified: true, status: 'Protected', lastAccessed: 'Today', hash: '9f2c...a81e', uploaded: 'Today', tx: 'TX-8841' }], ledger: [{ id: 'TX-8841', block: 'Block 2048', file: 'incident-evidence.log', fileId: 'FL-001', type: 'SHA-256', hash: '9f2c...a81e', status: 'Verified', owner: 'Security Admin', time: 'Today' }], alerts: [{ id: 'AL-901', severity: 'Critical', title: 'Unauthorized access chain detected', summary: 'Suspicious session sequence requires acknowledgement.', status: 'Open', time: 'Now', source: 'Auth Gateway', policy: 'Critical Response' }], activity: [{ action: 'Workspace opened', actor: 'Security Admin', resource: 'SHAKTII', time: 'Now' }], analytics: { securityEvents: [4,7,5,11,8,13,9], severity: { High: 3, Medium: 8, Low: 12 } } }; }

render();
