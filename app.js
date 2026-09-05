const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const alarmLayer = document.getElementById('alarmLayer');
const STORE = 'SHAKTII_FINAL_PWA_STATE_V1';

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
  drawer: null,
  filters: { history: '', findings: '' }
};

const routes = [
  { path: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { path: '/upload', label: 'PKAP Analyzer', icon: '⇧' },
  { path: '/history', label: 'Analysis History', icon: '☷' },
  { path: '/analytics', label: 'Analytics', icon: '↗' },
  { path: '/findings', label: 'Findings / Issues', icon: '!' },
  { path: '/iocs', label: 'Indicators / IOCs', icon: '◎' },
  { path: '/reports', label: 'Reports', icon: '◧' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
  { path: '/profile', label: 'Profile', icon: '◉' }
];

const processingStages = [
  'Uploading file',
  'Reading file content',
  'Redacting sensitive values',
  'Running PKAP analysis',
  'Extracting indicators and findings',
  'Calculating severity statistics',
  'Preparing dashboard'
];

const byId = (id) => document.getElementById(id);
const currentPath = () => window.location.pathname === '/' ? (state.user ? '/dashboard' : '/login') : window.location.pathname;
const activeAnalysis = () => state.analyses.find((a) => a.id === state.activeId) || state.analyses[0] || null;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m]));
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
  setTimeout(() => toastEl.className = 'toast', 2600);
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
  if (value === 'generate-report') return generateReport();
  if (value === 'download-pdf') return downloadPdf(action.dataset.analysis || state.activeId);
  if (value === 'open-drawer') { state.drawer = action.dataset.drawer; return render(); }
  if (value === 'close-drawer') { state.drawer = null; return render(); }
  if (value === 'test-alarm') return triggerAlarm();
  if (value === 'ack-alarm') return acknowledgeAlarm();
  if (value === 'save-settings') return saveSettings();
});

document.addEventListener('input', (event) => {
  const input = event.target;
  if (input.matches('#uploadFile')) { state.upload.file = input.files?.[0] || null; return renderPage(); }
  if (input.matches('[data-filter="history"]')) { state.filters.history = input.value; return renderPage(); }
  if (input.matches('[data-filter="findings"]')) { state.filters.findings = input.value; return renderPage(); }
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
  const drop = event.target.closest('.dropzone-pkap');
  if (!drop) return;
  event.preventDefault();
  drop.classList.add('dragging');
});
document.addEventListener('dragleave', (event) => {
  const drop = event.target.closest('.dropzone-pkap');
  if (drop) drop.classList.remove('dragging');
});
document.addEventListener('drop', (event) => {
  const drop = event.target.closest('.dropzone-pkap');
  if (!drop) return;
  event.preventDefault();
  drop.classList.remove('dragging');
  state.upload.file = event.dataTransfer.files?.[0] || null;
  renderPage();
});

document.querySelector('[data-close-alarm]')?.addEventListener('click', () => alarmLayer?.classList.remove('show'));
document.querySelector('[data-ack-alarm]')?.addEventListener('click', acknowledgeAlarm);

function login() {
  const name = byId('loginName')?.value?.trim() || 'Operator';
  state.user = { name, role: 'PKAP Analyst', email: byId('email')?.value?.trim() || 'analyst@pwnshakti.ai' };
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
    return;
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
    button.hidden = installed;
    button.classList.toggle('install-hidden', installed);
    button.disabled = installed;
    button.textContent = 'Install App';
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
  document.body.dataset.theme = state.settings.theme || 'dark';
  if (['/login', '/signup'].includes(path) || !state.user) {
    app.innerHTML = authPage();
    requestAnimationFrame(updateInstallButtons);
    return;
  }
  app.innerHTML = shellTemplate();
  renderPage();
  if (state.drawer) app.insertAdjacentHTML('beforeend', drawerTemplate(state.drawer));
  requestAnimationFrame(updateInstallButtons);
}

function renderPage() {
  const outlet = byId('pageOutlet');
  if (!outlet) return;
  const path = currentPath();
  const match = path.match(/^\/analysis\/([^/]+)$/);
  if (match) outlet.innerHTML = analysisPage(match[1]);
  else if (path === '/dashboard') outlet.innerHTML = dashboardPage();
  else if (path === '/upload' || path === '/new-analysis') outlet.innerHTML = analyzerPage();
  else if (path === '/history') outlet.innerHTML = historyPage();
  else if (path === '/analytics') outlet.innerHTML = analyticsPage();
  else if (path === '/findings') outlet.innerHTML = findingsPage();
  else if (path === '/iocs') outlet.innerHTML = iocsPage();
  else if (path === '/reports') outlet.innerHTML = reportsPage();
  else if (path === '/settings') outlet.innerHTML = settingsPage();
  else if (path === '/profile') outlet.innerHTML = profilePage();
  else outlet.innerHTML = dashboardPage();
}

function authPage() {
  return `
    <main class="auth-screen">
      <section class="auth-card">
        <img src="/assets/logo.svg?v=27" alt="PWN SHAKTI" class="auth-logo" />
        <p class="eyebrow">PKAP Analyzer</p>
        <h1>Welcome back</h1>
        <p class="muted">Upload evidence, run PKAP analysis, inspect findings, save history and generate professional reports.</p>
        <label class="field-label">Operator name</label>
        <input id="loginName" class="input" placeholder="Security Analyst" value="${escapeHtml(state.user?.name || 'Security Analyst')}" />
        <label class="field-label">Email</label>
        <input id="email" class="input" placeholder="analyst@pwnshakti.ai" value="analyst@pwnshakti.ai" />
        <button class="btn primary full" data-action="login">Open PKAP Analyzer</button>
        <button class="btn secondary full" data-action="install">Install App</button>
      </section>
    </main>`;
}

function shellTemplate() {
  const path = currentPath();
  const latest = activeAnalysis();
  return `
    <div class="app-shell ${state.sidebarOpen ? 'sidebar-open' : ''}">
      <aside class="sidebar">
        <div class="brand-block">
          <img src="/assets/logo.svg?v=27" alt="PWN SHAKTI" />
          <div><strong>PWN SHAKTI</strong><span>PKAP Analyzer</span></div>
        </div>
        <nav class="side-nav">
          ${routes.map((r) => `<button class="nav-item ${isActive(path, r.path) ? 'active' : ''}" data-nav="${routeTarget(r.path, latest)}"><span>${r.icon}</span>${r.label}</button>`).join('')}
        </nav>
        <button class="nav-item" data-action="logout"><span>⏻</span>Logout</button>
      </aside>
      <div class="shell-backdrop" data-action="toggle-sidebar"></div>
      <section class="main-shell">
        <header class="topbar">
          <button class="icon-btn menu" data-action="toggle-sidebar">☰</button>
          <div class="top-title"><strong>${titleForPath(path)}</strong><span>${apiStatusText()}</span></div>
          <div class="top-actions">
            <button class="status-pill ${window.SHAKTII_API.base ? 'live' : 'local'}">${window.SHAKTII_API.base ? 'API Connected' : 'Local Processing'}</button>
            <button class="btn small" data-action="install">Install App</button>
            <button class="avatar" data-nav="/profile">${escapeHtml(state.user?.name?.[0] || 'S')}</button>
          </div>
        </header>
        <main class="content" id="pageOutlet"></main>
      </section>
      <nav class="mobile-nav">
        <button class="mobile-nav-item ${isActive(path, '/dashboard') ? 'active' : ''}" data-nav="/dashboard"><span>⌂</span><small>Home</small></button>
        <button class="mobile-nav-item ${isActive(path, '/upload') ? 'active' : ''}" data-nav="/upload"><span>⇧</span><small>PKAP</small></button>
        <button class="mobile-nav-item ${isActive(path, '/history') ? 'active' : ''}" data-nav="/history"><span>☷</span><small>History</small></button>
        <button class="mobile-nav-item ${isActive(path, '/reports') ? 'active' : ''}" data-nav="/reports"><span>◧</span><small>Reports</small></button>
        <button class="mobile-nav-item" data-action="toggle-sidebar"><span>☰</span><small>Menu</small></button>
      </nav>
    </div>`;
}

function routeTarget(path, latest) {
  if (['/analytics','/findings','/iocs'].includes(path) && !latest) return '/upload';
  return path;
}
function isActive(path, item) { return path === item || (item !== '/dashboard' && path.startsWith(item + '/')); }
function titleForPath(path) {
  if (path.startsWith('/analysis/')) return 'Analysis Result';
  return routes.find((r) => r.path === path)?.label || 'PKAP Analyzer';
}
function apiStatusText() {
  return window.SHAKTII_API.base ? 'Using configured backend endpoint' : 'Using same-origin PKAP endpoint with local fallback';
}
function pageHeader(overline, title, text, actions = '') {
  return `<section class="page-header"><div><p class="eyebrow">${overline}</p><h1>${title}</h1><p>${text}</p></div><div class="page-actions">${actions}</div></section>`;
}

function dashboardPage() {
  const a = activeAnalysis();
  if (!a) return `${pageHeader('Home', 'PKAP Analyzer command center', 'Start by uploading a log/content file. The dashboard will populate only after real processing.', '<button class="btn primary" data-nav="/upload">Start Analysis</button>')}${emptyState('No analysis history yet', 'Upload your first evidence file to generate risk analytics, findings, IOCs and reports.', '/upload', 'Open PKAP Analyzer')}`;
  return `
    ${pageHeader('Latest result', a.fileName, `Processed ${new Date(a.createdAt).toLocaleString()} · ${a.provider}`, '<button class="btn primary" data-nav="/upload">New Analysis</button><button class="btn secondary" data-nav="/reports">Reports</button>')}
    ${summaryCards(a)}
    <section class="dashboard-grid">
      <article class="card span-2"><div class="card-head"><h2>Severity analytics</h2><button data-nav="/analytics">Open analytics →</button></div>${lineChartFromSeverity(a)}</article>
      <article class="card"><div class="card-head"><h2>Threat severity</h2><button data-action="open-drawer" data-drawer="severity">Inspect →</button></div>${severityBars(a)}</article>
      <article class="card"><div class="card-head"><h2>Recent findings</h2><button data-nav="/findings">View all →</button></div>${findingsList(a.findings.slice(0, 4))}</article>
      <article class="card span-2"><div class="card-head"><h2>Indicators of compromise</h2><button data-nav="/iocs">Open IOCs →</button></div>${iocTable(a.iocs.slice(0, 6))}</article>
    </section>`;
}

function summaryCards(a) {
  const sev = a.severityBreakdown;
  return `<section class="stats-grid">
    ${statCard('Overall risk', `${a.metadata.overallRiskScore}/100`, 'Calculated from processed findings', `/analysis/${a.id}`, a.metadata.overallRiskScore >= 70 ? 'warn' : 'ok')}
    ${statCard('Findings', a.findings.length, 'Question/content issues detected', '/findings')}
    ${statCard('Critical + High', (sev.critical || 0) + (sev.high || 0), 'Priority review items', '/analytics', 'warn')}
    ${statCard('IOCs', a.iocs.length, 'IP, domain, hash or user indicators', '/iocs')}
  </section>`;
}
function statCard(label, value, helper, nav, tone = '') {
  return `<button class="stat-card ${tone}" data-nav="${nav}"><span>${label}</span><strong>${value}</strong><small>${helper}</small><em>View details →</em></button>`;
}

function analyzerPage() {
  if (state.upload.processing) return processingPage();
  const file = state.upload.file;
  const error = validateFile(file);
  return `
    ${pageHeader('PKAP Analyzer', 'Upload evidence for analysis', 'Drag and drop a supported log/content file. The result dashboard, history and report are generated from this processed file.', '<button class="btn secondary" data-nav="/history">History</button>')}
    <section class="upload-layout">
      <aside class="stepper">
        <div class="step active"><b>1</b><span>Upload</span></div>
        <div class="step"><b>2</b><span>Process</span></div>
        <div class="step"><b>3</b><span>Analyse</span></div>
        <div class="step"><b>4</b><span>Report</span></div>
      </aside>
      <article class="card upload-card">
        <label class="dropzone-pkap">
          <input id="uploadFile" type="file" accept=".log,.txt,.json,.csv,.md,.yaml,.yml" hidden />
          <b>Drop file here or browse</b>
          <span>Supported: LOG, TXT, JSON, CSV, MD, YAML/YML · Maximum 8 MB for browser/PWA processing</span>
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
    ${pageHeader('Processing', 'PKAP analysis running', 'The app reads, redacts, analyses and prepares the result dashboard from the uploaded file.')}
    <section class="progress-box">
      <p class="eyebrow">${escapeHtml(p.stage)}</p>
      <h2>${p.error ? 'Processing failed' : `${p.percent}% complete`}</h2>
      <div class="progress-line"><i style="width:${p.percent}%"></i></div>
      ${p.error ? `<div class="pkap-error">${escapeHtml(p.error)}</div><button class="btn primary" data-action="clear-file">Try again</button>` : `<div class="stage-list">${processingStages.map((s, i) => `<span class="${i <= p.index ? 'done' : ''}">${s}</span>`).join('')}</div>`}
    </section>`;
}

async function startPkapAnalysis() {
  const error = validateFile(state.upload.file);
  if (error) return toast(error, 'danger');
  const file = state.upload.file;
  try {
    let raw = '';
    for (let i = 0; i < processingStages.length; i++) {
      state.upload.processing = { index: i, stage: processingStages[i], percent: Math.min(94, 8 + i * 14), error: '' };
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
    state.upload.processing = { index: processingStages.length, stage: 'Completed', percent: 100, error: '' };
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
  if (file.size > 8 * 1024 * 1024) return 'File is too large. Keep it below 8 MB for the PWA build.';
  return '';
}
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

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
  return {
    id: `AN-${Date.now()}`,
    fileName,
    createdAt: new Date().toISOString(),
    provider,
    executiveSummary: a.executiveSummary || 'PKAP analysis completed from uploaded content.',
    metadata: { ...(a.metadata || {}), overallRiskScore: risk, lines: raw.split(/\r?\n/).length, privacyMasked: masked, fileName },
    severityBreakdown,
    findings,
    iocs,
    remediationChecklist: Array.isArray(a.remediationChecklist) ? a.remediationChecklist : recommendations(severityBreakdown, findings, iocs),
    report: ''
  };
}

function localAnalyze(fileName, raw, masked, apiError) {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const findings = [];
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    let severity = '';
    let type = '';
    if (/ransom|malware|exfil|privilege|root|critical|breach|c2|command.+control|shell|payload/.test(lower)) { severity = 'Critical'; type = 'Critical threat signal'; }
    else if (/failed|denied|unauthorized|forbidden|bruteforce|brute force|suspicious|blocked|invalid login/.test(lower)) { severity = 'High'; type = 'Suspicious access event'; }
    else if (/warning|warn|timeout|anomaly|unusual|policy|scan|rate limit/.test(lower)) { severity = 'Medium'; type = 'Warning or anomaly'; }
    else if (/info|ok|success|normal|pass|verified/.test(lower)) { severity = 'Info'; type = 'Informational event'; }
    if (severity) findings.push({ severity, eventType: type, sourceIP: (line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/) || ['-'])[0], timestamp: (line.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/) || [`line ${idx + 1}`])[0], description: line.slice(0, 190), mitreTag: severity === 'Critical' ? 'Impact / Exfiltration' : severity === 'High' ? 'Initial Access' : 'Review', rawLogSnippet: line.slice(0, 260), matchedPattern: type });
  });
  const iocs = extractIocs(raw);
  const sev = countSeverity(findings);
  const risk = scoreFromSeverity(sev, iocs);
  return { id: `AN-${Date.now()}`, fileName, createdAt: new Date().toISOString(), provider: 'Local PKAP analyzer', executiveSummary: `PKAP processed ${lines.length} lines and detected ${findings.length} notable events. ${apiError ? 'Backend AI was unavailable, so local analysis completed the run.' : ''}`.trim(), metadata: { logTypeDetected: detectType(raw, fileName), timeRangeCovered: detectRange(raw), overallRiskScore: risk, lines: lines.length, privacyMasked: masked, fileName }, severityBreakdown: sev, findings, iocs, remediationChecklist: recommendations(sev, findings, iocs), report: '' };
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
      <article class="card"><div class="card-head"><h2>Indicators</h2><button data-nav="/iocs">Open IOCs →</button></div>${iocSummary(a)}</article>
      <article class="card"><h2>Executive summary</h2><p>${escapeHtml(a.executiveSummary)}</p></article>
      <article class="card span-3"><div class="card-head"><h2>Findings</h2><button data-nav="/findings">View all →</button></div>${findingsList(a.findings.slice(0, 8))}</article>
      <article class="card span-3"><h2>Recommendations</h2>${recommendationList(a.remediationChecklist)}</article>
      ${a.report ? `<article class="card span-3"><div class="card-head"><h2>Report preview</h2><button data-action="download-pdf">Download PDF →</button></div><pre class="report-preview">${escapeHtml(a.report)}</pre></article>` : ''}
    </section>`;
}

async function generateReport() {
  const a = activeAnalysis();
  if (!a) return toast('Run an analysis first.', 'danger');
  toast('Generating report...', 'info');
  try {
    const response = await window.SHAKTII_API.generateReport({ analysisData: a });
    a.report = response.report || buildLocalReport(a);
    a.reportProvider = response.providerUsed || 'PKAP report builder';
  } catch (err) {
    a.report = buildLocalReport(a);
    a.reportProvider = 'Local report builder';
  }
  const entry = { id: `RP-${Date.now()}`, analysisId: a.id, fileName: a.fileName, createdAt: new Date().toISOString(), provider: a.reportProvider };
  state.reports = [entry, ...state.reports.filter((r) => r.analysisId !== a.id)].slice(0, 30);
  saveState();
  toast('Report generated', 'success');
  render();
}
function buildLocalReport(a) {
  const sev = a.severityBreakdown;
  return `# SHAKTII PKAP ANALYSIS REPORT\n\nAnalysed File: ${a.fileName}\nGenerated: ${new Date().toLocaleString()}\nOverall Risk Score: ${a.metadata.overallRiskScore}/100\nProvider: ${a.provider}\n\n## Executive Summary\n${a.executiveSummary}\n\n## Severity Breakdown\nCritical: ${sev.critical || 0}\nHigh: ${sev.high || 0}\nMedium: ${sev.medium || 0}\nLow: ${sev.low || 0}\nInfo: ${sev.info || 0}\n\n## Findings\n${a.findings.map((f, i) => `${i + 1}. [${f.severity}] ${f.eventType}: ${f.description}`).join('\n') || 'No actionable findings detected.'}\n\n## Indicators of Compromise\n${a.iocs.map((ioc) => `${ioc.value} (${ioc.type}) - ${ioc.reputation}`).join('\n') || 'No IOCs extracted.'}\n\n## Recommendations\n${a.remediationChecklist.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nFinal Verdict: ${a.metadata.overallRiskScore >= 75 ? 'High Revision Required' : a.metadata.overallRiskScore >= 45 ? 'Needs Review' : 'Good / Low Risk'}\n`;
}
function downloadPdf(id) {
  const a = state.analyses.find((x) => x.id === id) || activeAnalysis();
  if (!a) return toast('Run an analysis first.', 'danger');
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
  const clean = text.replace(/[#*_`|]/g, '');
  const wrapped = clean.split(/\n/).flatMap((line) => line.length > 86 ? line.match(/.{1,86}(\s|$)/g) || [line] : [line]).slice(0, 96);
  const esc = (s) => String(s || '').replace(/[()\\]/g, '\\$&');
  const body = wrapped.map((line, i) => `BT /F1 10 Tf 46 ${746 - i * 13} Td (${esc(line.trim())}) Tj ET`).join('\n');
  const content = `q 0.04 0.05 0.10 rg 0 0 612 792 re f Q\nBT /F1 18 Tf 46 768 Td (PWN SHAKTI PKAP REPORT) Tj ET\n${body}`;
  const objects = [`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`, `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`, `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj`, `4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj`, `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj) => { offsets.push(pdf.length); pdf += obj + '\n'; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((n) => String(n).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

function historyPage() {
  const q = state.filters.history.toLowerCase();
  const items = state.analyses.filter((a) => `${a.fileName} ${a.provider}`.toLowerCase().includes(q));
  return `${pageHeader('History', 'Analysis history', 'Every processed file is saved locally and can be reopened.', '<button class="btn primary" data-nav="/upload">New Analysis</button>')}
    <section class="toolbar"><input class="input" data-filter="history" placeholder="Search analysed file" value="${escapeHtml(state.filters.history)}" /></section>
    <section class="card">${items.length ? `<div class="table-wrap"><table><thead><tr><th>File</th><th>Risk</th><th>Findings</th><th>Provider</th><th>Date</th><th></th></tr></thead><tbody>${items.map((a) => `<tr><td><strong>${escapeHtml(a.fileName)}</strong><small>${a.id}</small></td><td>${a.metadata.overallRiskScore}/100</td><td>${a.findings.length}</td><td>${escapeHtml(a.provider)}</td><td>${new Date(a.createdAt).toLocaleString()}</td><td><button class="link-btn" data-nav="/analysis/${a.id}">Open →</button></td></tr>`).join('')}</tbody></table></div>` : emptyState('No history yet', 'Process a file and it will appear here.', '/upload', 'Start analysis')}</section>`;
}
function reportsPage() {
  const a = activeAnalysis();
  return `${pageHeader('Reports', 'PKAP reports', 'Generate and download professional PDF reports from processed analysis data.', '<button class="btn primary" data-action="generate-report" '+(!a?'disabled':'')+'>Generate Report</button><button class="btn secondary" data-action="download-pdf" '+(!a?'disabled':'')+'>Download PDF</button>')}
    ${!a ? emptyState('No analysis available', 'Run PKAP analysis first to create a report.', '/upload', 'Open PKAP Analyzer') : `<section class="dashboard-grid"><article class="card"><h2>Active report source</h2><p>${escapeHtml(a.fileName)}</p><div class="pdf-ready">${a.report ? 'Report generated and ready to download.' : 'Report not generated yet. Click Generate Report.'}</div></article><article class="card span-2"><h2>Generated report records</h2>${state.reports.length ? reportList() : '<p class="muted">No saved report records yet.</p>'}</article>${a.report ? `<article class="card span-3"><h2>Report preview</h2><pre class="report-preview">${escapeHtml(a.report)}</pre></article>` : ''}</section>`}`;
}
function reportList() { return `<div class="table-wrap"><table><thead><tr><th>File</th><th>Provider</th><th>Generated</th><th></th></tr></thead><tbody>${state.reports.map((r) => `<tr><td>${escapeHtml(r.fileName)}</td><td>${escapeHtml(r.provider)}</td><td>${new Date(r.createdAt).toLocaleString()}</td><td><button class="link-btn" data-nav="/analysis/${r.analysisId}">Open →</button></td></tr>`).join('')}</tbody></table></div>`; }
function analyticsPage() { const a = activeAnalysis(); if (!a) return emptyState('No analytics yet', 'Run PKAP analysis to see charts.', '/upload', 'Start analysis'); return `${pageHeader('Analytics', 'Analysis analytics', 'Charts use the active processed analysis, not sample values.', '<button class="btn secondary" data-nav="/analysis/'+a.id+'">Open Result</button>')}${summaryCards(a)}<section class="analytics-grid"><article class="card span-2"><h2>Severity trend</h2>${lineChartFromSeverity(a)}</article><article class="card"><h2>Severity distribution</h2>${severityBars(a)}</article><article class="card"><h2>IOC types</h2>${iocSummary(a)}</article><article class="card span-2"><h2>Recommendations</h2>${recommendationList(a.remediationChecklist)}</article></section>`; }
function findingsPage() { const a = activeAnalysis(); if (!a) return emptyState('No findings yet', 'Run PKAP analysis first.', '/upload', 'Start analysis'); const q = state.filters.findings.toLowerCase(); const items = a.findings.filter((f) => `${f.severity} ${f.eventType} ${f.description}`.toLowerCase().includes(q)); return `${pageHeader('Findings / Issues', 'Detected findings', 'Inspect why the analysis score was given.', '<button class="btn secondary" data-nav="/analysis/'+a.id+'">Back to result</button>')}<section class="toolbar"><input class="input" data-filter="findings" placeholder="Search findings" value="${escapeHtml(state.filters.findings)}" /></section><section class="card">${findingsList(items)}</section>`; }
function iocsPage() { const a = activeAnalysis(); if (!a) return emptyState('No indicators yet', 'Run PKAP analysis first.', '/upload', 'Start analysis'); return `${pageHeader('Indicators / IOCs', 'Extracted indicators', 'Review IP addresses, domains and hashes from the processed file.', '<button class="btn secondary" data-nav="/analysis/'+a.id+'">Back to result</button>')}<section class="card">${iocTable(a.iocs)}</section>`; }
function settingsPage() { return `${pageHeader('Settings', 'Application settings', 'Preferences persist on this device and control report output.', '<button class="btn primary" data-action="save-settings">Save Settings</button>')}<section class="cards-3"><article class="card"><h2>Analysis</h2>${check('strictAnalysis','Strict analysis')}${check('includeIocs','Extract IOCs')}</article><article class="card"><h2>Reports</h2>${check('includeFindings','Include findings')}${check('includeRecommendations','Include recommendations')}</article><article class="card"><h2>System</h2><p>API: ${window.SHAKTII_API.base || 'Same-origin PKAP API'}</p><p>App: PWA v27</p></article></section>`; }
function profilePage() { return `${pageHeader('Profile', 'Operator profile', 'Local authenticated session for the installed PWA.', '<button class="btn danger" data-action="logout">Logout</button>')}<section class="card"><div class="info-grid">${info('Name', state.user?.name)}${info('Role', state.user?.role)}${info('Email', state.user?.email)}${info('Analyses saved', state.analyses.length)}</div></section>`; }
function saveSettings() { saveState(); toast('Settings saved', 'success'); }

function lineChartFromSeverity(a) { const s = a.severityBreakdown; const vals = [s.info || 0, s.low || 0, s.medium || 0, s.high || 0, s.critical || 0]; const max = Math.max(1, ...vals); return `<div class="line-chart">${vals.map((v) => `<span style="height:${Math.max(8, (v/max)*100)}%" title="${v} events"></span>`).join('')}</div>`; }
function severityBars(a) { const s = a.severityBreakdown; const total = Math.max(1, Object.values(s).reduce((x,y)=>x+Number(y||0),0)); return `<div class="severity-bars">${['critical','high','medium','low','info'].map((k) => `<div><span>${k}</span><i><b style="width:${pct(s[k], total)}%"></b></i><em>${s[k] || 0}</em></div>`).join('')}</div>`; }
function iocSummary(a) { const grouped = a.iocs.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {}); const total = Math.max(1, a.iocs.length); return `<div class="severity-bars">${Object.keys(grouped).length ? Object.entries(grouped).map(([k,v]) => `<div><span>${escapeHtml(k)}</span><i><b style="width:${pct(v,total)}%"></b></i><em>${v}</em></div>`).join('') : '<p class="muted">No IOCs extracted.</p>'}</div>`; }
function findingsList(findings) { if (!findings.length) return '<p class="muted">No findings found.</p>'; return findings.map((f) => `<article class="finding-card"><span class="badge ${String(f.severity).toLowerCase()==='critical' ? 'danger' : String(f.severity).toLowerCase()==='high' ? 'warn' : 'ok'}">${escapeHtml(f.severity || 'Info')}</span><h3>${escapeHtml(f.eventType || 'Finding')}</h3><p>${escapeHtml(f.description || '')}</p>${f.rawLogSnippet ? `<code>${escapeHtml(f.rawLogSnippet)}</code>` : ''}</article>`).join(''); }
function iocTable(iocs) { if (!iocs.length) return '<p class="muted">No IOCs extracted from this file.</p>'; return `<div class="table-wrap"><table><thead><tr><th>Indicator</th><th>Type</th><th>Reputation</th></tr></thead><tbody>${iocs.map((i) => `<tr><td><code>${escapeHtml(i.value)}</code></td><td>${escapeHtml(i.type)}</td><td>${badge(i.reputation || 'Unknown', i.reputation === 'Malicious' || i.reputation === 'Suspicious' ? 'warn' : 'ok')}</td></tr>`).join('')}</tbody></table></div>`; }
function recommendationList(list) { return `<div class="timeline">${(list || []).map((item, i) => `<article><i></i><div><strong>Recommendation ${i+1}</strong><p>${escapeHtml(item)}</p></div><span>PKAP</span></article>`).join('')}</div>`; }
function check(k, label) { return `<label class="option-list"><label><input type="checkbox" data-setting="${k}" ${state.settings[k] ? 'checked' : ''}> ${label}</label></label>`; }
function info(label, value) { return `<div class="info"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value ?? '-')}</strong></div>`; }
function badge(text, tone = '') { return `<span class="badge ${tone}">${escapeHtml(text)}</span>`; }
function emptyState(title, text, nav = '/upload', label = 'Start Analysis') { return `<section class="empty-state-final"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p><button class="btn primary" data-nav="${nav}">${escapeHtml(label)}</button></section>`; }
function drawerTemplate(type) { const a = activeAnalysis(); if (!a) return ''; const title = type === 'iocs' ? 'Indicators / IOCs' : type === 'severity' ? 'Severity details' : 'Findings'; const body = type === 'iocs' ? iocTable(a.iocs) : type === 'severity' ? severityBars(a) : findingsList(a.findings); return `<div class="drawer-backdrop"><aside class="drawer"><button data-action="close-drawer">×</button><h2>${title}</h2>${body}</aside></div>`; }

function triggerAlarm() { alarmLayer?.classList.add('show'); if (navigator.vibrate) navigator.vibrate([800,150,800,150,1200]); toast('Critical alarm triggered', 'danger'); }
function acknowledgeAlarm() { alarmLayer?.classList.remove('show'); if (navigator.vibrate) navigator.vibrate(0); toast('Alarm acknowledged', 'success'); }

render();
