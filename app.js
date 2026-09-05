const $ = (q, r = document) => r.querySelector(q);
const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));
const app = $('#app');
const toastEl = $('#toast');
const STORE = 'SHAKTII_PKAP_STATE_V1';

const defaultSettings = {
  theme: 'dark', strictDuplicates: true, nearDuplicate: true, severityAnalysis: true,
  iocExtraction: true, answerPattern: false, languageValidation: true,
  includeCharts: true, includeFindings: true, includeRecommendations: true, includeAISummary: true
};

const state = loadState();
let installPrompt = null;
let activeFile = null;
let processingTimer = null;

function loadState() {
  const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
  return {
    user: saved.user || null,
    analyses: saved.analyses || [],
    activeId: saved.activeId || null,
    reports: saved.reports || [],
    settings: { ...defaultSettings, ...(saved.settings || {}) },
    drawer: null,
    processing: null,
    authError: '',
    route: normalizeRoute(location.pathname)
  };
}
function saveState() { localStorage.setItem(STORE, JSON.stringify({ user: state.user, analyses: state.analyses, activeId: state.activeId, reports: state.reports, settings: state.settings })); }
function normalizeRoute(path) { return path === '/' ? '/login' : path; }
function navigate(path) { history.pushState({}, '', path); state.route = normalizeRoute(path); render(); }
function activeAnalysis() { return state.analyses.find(a => a.id === state.activeId) || state.analyses[0] || null; }
function currentAnalysisIdFromRoute() { const m = state.route.match(/^\/analysis\/([^/]+)/); return m ? decodeURIComponent(m[1]) : null; }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m])); }
function pct(n, total) { return total ? Math.round((Number(n || 0) / total) * 100) : 0; }
function toast(msg, type = 'info') { toastEl.textContent = msg; toastEl.className = `toast show ${type}`; setTimeout(() => toastEl.className = 'toast', 2600); }

window.addEventListener('popstate', () => { state.route = normalizeRoute(location.pathname); render(); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; render(); });
window.addEventListener('appinstalled', () => { localStorage.setItem('SHAKTII_INSTALLED', 'true'); installPrompt = null; toast('App installed successfully', 'success'); render(); });

document.addEventListener('click', async e => {
  const nav = e.target.closest('[data-route]');
  if (nav) { e.preventDefault(); return navigate(nav.dataset.route); }
  const action = e.target.closest('[data-pkap-action]');
  if (!action) return;
  const a = action.dataset.pkapAction;
  if (a === 'login') return login();
  if (a === 'logout') return logout();
  if (a === 'install') return installApp();
  if (a === 'clear-file') { activeFile = null; return render(); }
  if (a === 'start-analysis') return startAnalysis();
  if (a === 'new-analysis') { activeFile = null; state.processing = null; return navigate('/new-analysis'); }
  if (a === 'drawer') { state.drawer = action.dataset.drawer; return render(); }
  if (a === 'close-drawer') { state.drawer = null; return render(); }
  if (a === 'generate-report') return generateReport();
  if (a === 'download-pdf') return downloadActivePdf();
  if (a === 'save-settings') return saveSettings();
});

document.addEventListener('change', e => {
  if (e.target.id === 'fileInput') { activeFile = e.target.files?.[0] || null; render(); }
  if (e.target.matches('[data-setting]')) { const k = e.target.dataset.setting; state.settings[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; saveState(); }
});

document.addEventListener('dragover', e => { if (e.target.closest('.dropzone')) { e.preventDefault(); e.target.closest('.dropzone').classList.add('dragging'); } });
document.addEventListener('dragleave', e => { if (e.target.closest('.dropzone')) e.target.closest('.dropzone').classList.remove('dragging'); });
document.addEventListener('drop', e => {
  const dz = e.target.closest('.dropzone');
  if (!dz) return;
  e.preventDefault(); dz.classList.remove('dragging'); activeFile = e.dataTransfer.files?.[0] || null; render();
});

document.addEventListener('mousemove', e => {
  const t = e.target.closest('[data-tip]');
  const tip = $('#chartTooltip');
  if (!tip) return;
  if (!t) { tip.classList.remove('show'); return; }
  tip.textContent = t.dataset.tip;
  tip.style.left = Math.min(e.clientX + 14, innerWidth - 230) + 'px';
  tip.style.top = Math.max(e.clientY - 34, 12) + 'px';
  tip.classList.add('show');
});

async function installApp() {
  if (isStandalone()) return toast('App already installed', 'success');
  if (!installPrompt) return toast('Use Chrome menu → Install app / Add to Home screen', 'info');
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  render();
}
function isStandalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
function login() {
  const email = $('#email')?.value?.trim(); const pass = $('#password')?.value?.trim();
  if (!email || !pass) { state.authError = 'Enter email and password to continue.'; return render(); }
  state.user = { name: email.split('@')[0] || 'Operator', email, role: 'PKAP Analyst' };
  state.authError = ''; saveState(); navigate(state.analyses.length ? '/dashboard' : '/new-analysis');
}
function logout() { state.user = null; state.authError = ''; saveState(); navigate('/login'); }

async function readFile(file) { return await file.text(); }
function validateFile(file) {
  if (!file) return 'Please select a log/content file first.';
  const max = 8 * 1024 * 1024;
  const ok = ['.log','.txt','.json','.csv','.md','.yaml','.yml'].some(ext => file.name.toLowerCase().endsWith(ext));
  if (!ok) return 'Unsupported file type. Use .log, .txt, .json, .csv, .md, .yaml or .yml for this analyzer build.';
  if (file.size > max) return 'File is too large for browser demo mode. Keep it under 8 MB.';
  return '';
}
function redact(text) {
  let masked = 0;
  const rules = [
    [/([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '[REDACTED_EMAIL]'],
    [/(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED_SECRET]'],
    [/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]'],
    [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]']
  ];
  let out = text;
  rules.forEach(([r, v]) => { out = out.replace(r, m => { masked++; return typeof v === 'function' ? v(m) : v; }); });
  return { text: out, masked };
}

async function startAnalysis() {
  const error = validateFile(activeFile);
  if (error) return toast(error, 'danger');
  const stages = ['Uploading file','Reading file','Extracting content','Redacting sensitive values','Running PKAP analysis','Calculating statistics','Generating insights','Preparing dashboard'];
  state.processing = { stage: stages[0], percent: 4, error: '' }; render();
  try {
    let raw = '';
    for (let i = 0; i < stages.length; i++) {
      state.processing = { stage: stages[i], percent: Math.min(94, 8 + i * 12), error: '' }; renderProcessingOnly();
      await new Promise(r => setTimeout(r, 420));
      if (i === 1) raw = await readFile(activeFile);
    }
    if (!raw.trim()) throw new Error('Uploaded file has no readable text content.');
    const redacted = redact(raw);
    let result, source = 'backend';
    try {
      result = await window.SHAKTII_API.analyze({ fileName: activeFile.name, redactedData: redacted.text, settings: state.settings });
      result = normalizeAnalysis(result.analysis, activeFile.name, raw, redacted.masked, result.providerUsed || 'PKAP API');
    } catch (apiError) {
      source = 'local deterministic fallback';
      result = localAnalyze(activeFile.name, raw, redacted.masked, apiError.message);
    }
    state.processing = { stage: 'Completed', percent: 100, error: '' }; renderProcessingOnly(); await new Promise(r => setTimeout(r, 350));
    const existing = state.analyses.filter(a => a.id !== result.id);
    state.analyses = [result, ...existing].slice(0, 12);
    state.activeId = result.id;
    saveState(); activeFile = null; state.processing = null;
    toast(`Analysis complete via ${source}`, source === 'backend' ? 'success' : 'info');
    navigate(`/analysis/${result.id}`);
  } catch (err) {
    state.processing = { stage: 'Failed', percent: 0, error: err.message || 'Analysis failed.' }; render();
  }
}

function normalizeAnalysis(a = {}, fileName, raw, masked, provider) {
  const id = `AN-${Date.now()}`;
  const findings = Array.isArray(a.findings) ? a.findings : [];
  const iocs = Array.isArray(a.iocs) ? a.iocs : [];
  const sev = a.severityBreakdown || countSeverity(findings);
  const risk = Number(a?.metadata?.overallRiskScore ?? scoreFromSeverity(sev, iocs));
  return { id, fileName, createdAt: new Date().toISOString(), provider, executiveSummary: a.executiveSummary || 'PKAP analysis completed.', metadata: { ...(a.metadata || {}), overallRiskScore: risk, fileName, lines: raw.split(/\r?\n/).length, privacyMasked: masked }, severityBreakdown: sev, findings, iocs, remediationChecklist: a.remediationChecklist || recommendations(sev, findings, iocs), rawStats: basicStats(raw), report: '' };
}
function localAnalyze(fileName, raw, masked, apiError) {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const findings = [];
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase(); let severity = '', type = '';
    if (/ransom|malware|exfil|privilege|root|critical|breach|c2|command.+control/.test(lower)) { severity = 'Critical'; type = 'Critical threat signal'; }
    else if (/failed|denied|unauthorized|forbidden|bruteforce|brute force|suspicious|blocked/.test(lower)) { severity = 'High'; type = 'Suspicious access/event'; }
    else if (/warning|warn|timeout|anomaly|unusual|policy|scan/.test(lower)) { severity = 'Medium'; type = 'Warning/anomaly'; }
    else if (/info|ok|success|normal|pass/.test(lower)) { severity = 'Info'; type = 'Informational event'; }
    if (severity) findings.push({ severity, eventType: type, sourceIP: (line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/) || ['-'])[0], timestamp: (line.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/) || [`line ${idx+1}`])[0], description: line.slice(0, 180), mitreTag: severity === 'Critical' ? 'Tactic: Impact / Exfiltration' : severity === 'High' ? 'Tactic: Initial Access' : 'Review', rawLogSnippet: line.slice(0, 240), matchedPattern: type });
  });
  const iocs = extractIocs(raw);
  const sev = countSeverity(findings);
  const risk = scoreFromSeverity(sev, iocs);
  return { id: `AN-${Date.now()}`, fileName, createdAt: new Date().toISOString(), provider: 'Client deterministic analyzer', executiveSummary: `PKAP processed ${lines.length} log/content lines and detected ${findings.length} notable events. ${apiError ? 'AI backend was unavailable, so deterministic analysis was used.' : ''}`.trim(), metadata: { logTypeDetected: detectType(raw, fileName), timeRangeCovered: detectRange(raw), overallRiskScore: risk, fileName, lines: lines.length, privacyMasked: masked, apiError }, severityBreakdown: sev, findings, iocs, remediationChecklist: recommendations(sev, findings, iocs), rawStats: basicStats(raw), report: '' };
}
function extractIocs(raw) {
  const ips = [...new Set(raw.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [])].slice(0, 40).map(v => ({ value: v, type: 'IP', reputation: /185\.220|45\.|91\./.test(v) ? 'Suspicious' : 'Unknown' }));
  const domains = [...new Set(raw.match(/\b[a-z0-9.-]+\.(?:com|net|org|io|in|ru|cn|xyz)\b/gi) || [])].slice(0, 30).map(v => ({ value: v, type: 'Domain', reputation: /tor|mal|evil|c2|phish/i.test(v) ? 'Suspicious' : 'Unknown' }));
  const hashes = [...new Set(raw.match(/\b[a-f0-9]{32,64}\b/gi) || [])].slice(0, 20).map(v => ({ value: v, type: 'Hash', reputation: 'Unknown' }));
  return [...ips, ...domains, ...hashes];
}
function countSeverity(findings) { return findings.reduce((a, f) => { const k = String(f.severity || 'Info').toLowerCase(); a[k] = (a[k] || 0) + 1; return a; }, { critical:0, high:0, medium:0, low:0, info:0 }); }
function scoreFromSeverity(s, iocs) { return Math.min(100, (s.critical||0)*22 + (s.high||0)*12 + (s.medium||0)*6 + Math.min(20, iocs.length*2)); }
function recommendations(s, findings, iocs) { const r = []; if (s.critical) r.push('Immediately review critical findings and preserve evidence.'); if (s.high) r.push('Acknowledge high severity access or policy events and validate affected assets.'); if (iocs.length) r.push('Enrich extracted IOCs with threat intelligence and block confirmed malicious indicators.'); r.push('Generate a PDF report and attach it to the incident/history record.'); return r; }
function detectType(raw, name) { if (/nginx|apache|http/i.test(raw)) return 'Web/server logs'; if (/ssh|sudo|auth/i.test(raw)) return 'Authentication/system logs'; if (/wallet|transaction|block|hash/i.test(raw)) return 'Blockchain/security records'; return name.split('.').pop()?.toUpperCase() || 'Text'; }
function detectRange(raw) { const dates = raw.match(/\d{4}-\d{2}-\d{2}/g) || []; return dates.length ? `${dates[0]} to ${dates[dates.length-1]}` : 'Not detected'; }
function basicStats(raw) { return { chars: raw.length, words: raw.trim().split(/\s+/).filter(Boolean).length, lines: raw.split(/\r?\n/).length }; }

async function generateReport() {
  const a = activeAnalysis(); if (!a) return toast('Run an analysis first.', 'danger');
  toast('Generating AI report...', 'info');
  try {
    const res = await window.SHAKTII_API.generateReport({ analysisData: a });
    a.report = res.report; a.reportProvider = res.providerUsed; state.reports = [{ id: `RP-${Date.now()}`, analysisId: a.id, fileName: a.fileName, createdAt: new Date().toISOString(), provider: res.providerUsed }, ...state.reports.filter(r => r.analysisId !== a.id)];
  } catch {
    a.report = buildLocalReport(a); a.reportProvider = 'Local report builder'; state.reports = [{ id: `RP-${Date.now()}`, analysisId: a.id, fileName: a.fileName, createdAt: new Date().toISOString(), provider: 'Local report builder' }, ...state.reports.filter(r => r.analysisId !== a.id)];
  }
  saveState(); toast('Report ready', 'success'); render();
}
function buildLocalReport(a) { return `# SHAKTII PKAP ANALYSIS REPORT\n\nAnalysed file: ${a.fileName}\nGenerated: ${new Date().toLocaleString()}\nRisk score: ${a.metadata.overallRiskScore}/100\n\n## Executive Summary\n${a.executiveSummary}\n\n## Findings\n${a.findings.map((f,i)=>`${i+1}. [${f.severity}] ${f.eventType}: ${f.description}`).join('\n') || 'No findings.'}\n\n## Recommendations\n${a.remediationChecklist.map((r,i)=>`${i+1}. ${r}`).join('\n')}`; }

function downloadActivePdf() {
  const a = activeAnalysis(); if (!a) return toast('No active analysis.', 'danger');
  const text = a.report || buildLocalReport(a);
  const blob = makePdfBlob(text);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `${a.fileName.replace(/\W+/g,'_')}_PKAP_Report.pdf`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  toast('PDF download started', 'success');
}
function makePdfBlob(text) {
  const lines = text.replace(/[#*_`|]/g,'').split(/\n/).flatMap(l => l.length > 88 ? l.match(/.{1,88}(\s|$)/g) : [l]).slice(0, 95);
  const esc = s => String(s || '').replace(/[()\\]/g, '\\$&');
  const body = lines.map((l,i)=>`BT /F1 10 Tf 50 ${770 - i*13} Td (${esc(l.trim())}) Tj ET`).join('\n');
  const content = `q 0.15 0.11 0.22 rg 0 0 612 792 re f Q\nBT /F1 18 Tf 50 755 Td (SHAKTII PKAP ANALYSIS REPORT) Tj ET\n${body}`;
  const objects = [`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`, `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`, `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj`, `4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj`, `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`];
  let pdf = '%PDF-1.4\n'; const offsets = [0]; objects.forEach(o => { offsets.push(pdf.length); pdf += o + '\n'; }); const xref = pdf.length; pdf += `xref\n0 6\n0000000000 65535 f \n` + offsets.slice(1).map(n => String(n).padStart(10,'0') + ' 00000 n ').join('\n') + `\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

function render() {
  if (!state.user && !['/login','/signup'].includes(state.route)) history.replaceState({}, '', '/login'), state.route='/login';
  document.body.dataset.theme = state.settings.theme;
  if (['/login','/signup'].includes(state.route) || !state.user) app.innerHTML = loginView();
  else app.innerHTML = shell();
  if (state.drawer) app.insertAdjacentHTML('beforeend', drawerView(state.drawer));
}
function loginView() { return `<main class="pkap-auth"><section class="pkap-login"><img src="/assets/logo.svg?v=22" alt="PWN SHAKTI"><p>PKAP Analyzer</p><h1>Upload. Analyse. Act.</h1><span>Professional log/content analysis with SHAKTII-branded reporting.</span><label>Email</label><input id="email" value="admin@pwnshakti.ai"><label>Password</label><input id="password" type="password" value="demo123"><button class="pkap-btn primary" data-pkap-action="login">Login</button><button class="pkap-btn ghost" data-pkap-action="install">Install App</button>${state.authError ? `<div class="pkap-error">${escapeHtml(state.authError)}</div>`:''}</section></main>`; }
function shell() { return `<div class="pkap-shell"><aside class="pkap-side"><img src="/assets/logo.svg?v=22" alt="PWN SHAKTI"><nav>${navBtn('/dashboard','Dashboard')}${navBtn('/new-analysis','New Analysis')}${navBtn('/history','History')}${navBtn('/reports','Reports')}${navBtn('/settings','Settings')}</nav><button class="pkap-logout" data-pkap-action="logout">Logout</button></aside><section class="pkap-main"><header><strong>${pageTitle()}</strong><span>${state.analyses.length} analyses stored</span></header><main>${page()}</main><nav class="pkap-bottom">${navBtn('/dashboard','Home')}${navBtn('/new-analysis','Analyze')}${navBtn('/history','History')}${navBtn('/reports','Reports')}${navBtn('/settings','Settings')}</nav></section><div id="chartTooltip" class="chart-tooltip"></div></div>`; }
function navBtn(path,label) { return `<button class="${state.route.startsWith(path) ? 'active':''}" data-route="${path}">${label}</button>`; }
function pageTitle(){ if(state.route.startsWith('/analysis/')) return 'Analysis Result'; return ({'/dashboard':'Dashboard','/new-analysis':'New Analysis','/history':'History','/reports':'Reports','/settings':'Settings'}[state.route] || 'PKAP Analyzer'); }
function page() { const id = currentAnalysisIdFromRoute(); if (id) { state.activeId = id; saveState(); return analysisView(state.analyses.find(a=>a.id===id)); } if(state.route==='/dashboard') return dashboardView(); if(state.route==='/new-analysis') return uploadView(); if(state.route==='/history') return historyView(); if(state.route==='/reports') return reportsView(); if(state.route==='/settings') return settingsView(); return dashboardView(); }

function dashboardView() { const a = activeAnalysis(); if (!a) return emptyView('No analyses yet','Upload your first log/content file to generate PKAP analytics.','Analyse Question Paper / Logs','/new-analysis'); return `<section class="pkap-hero"><div><p>Latest Analysis</p><h1>${escapeHtml(a.fileName)}</h1><span>Processed ${new Date(a.createdAt).toLocaleString()} · ${a.provider}</span></div><button class="pkap-btn primary" data-route="/analysis/${a.id}">Open Result</button><button class="pkap-btn ghost" data-pkap-action="new-analysis">New Analysis</button></section>${summaryGrid(a)}<section class="pkap-grid two"><article class="pkap-card"><div class="card-head"><h2>Risk trend</h2><button data-route="/analysis/${a.id}">Details →</button></div>${lineSvg(Object.values(a.severityBreakdown),'Severity weight')}</article><article class="pkap-card"><div class="card-head"><h2>Severity distribution</h2><button data-pkap-action="drawer" data-drawer="severity">Inspect →</button></div>${severityBars(a)}</article></section>`; }
function uploadView() { if (state.processing) return processingView(); const err = validateFile(activeFile); return `<section class="pkap-pagehead"><h1>New PKAP Analysis</h1><p>Upload a supported log/content file. The dashboard will use only processed data from this file.</p></section><section class="upload-panel"><label class="dropzone"><input id="fileInput" type="file" accept=".log,.txt,.json,.csv,.md,.yaml,.yml" hidden><b>Drop file here or browse</b><span>Supported: LOG, TXT, JSON, CSV, MD, YAML · Max 8 MB</span></label>${activeFile ? `<div class="file-preview"><div><strong>${escapeHtml(activeFile.name)}</strong><span>${(activeFile.size/1024).toFixed(1)} KB · ready to process</span></div><button data-pkap-action="clear-file">Remove</button></div>`:''}${activeFile && err ? `<div class="pkap-error">${escapeHtml(err)}</div>`:''}<button class="pkap-btn primary wide" data-pkap-action="start-analysis" ${!activeFile || err ? 'disabled':''}>Process & Analyse</button></section>`; }
function processingView() { const p = state.processing; return `<section class="processing"><h1>${p.error ? 'Processing failed' : 'Processing analysis'}</h1><p>${escapeHtml(p.error || 'Please wait while PKAP reads, redacts, analyses and prepares the dashboard.')}</p><div class="progress"><i style="width:${p.percent}%"></i></div><strong>${p.percent}%</strong><span>${escapeHtml(p.stage)}</span>${p.error ? '<button class="pkap-btn primary" data-pkap-action="new-analysis">Try again</button>':''}</section>`; }
function renderProcessingOnly(){ const main = $('.pkap-main main'); if(main) main.innerHTML = processingView(); }
function analysisView(a) { if (!a) return emptyView('Analysis not found','Open History and select a valid analysis.','Go to History','/history'); return `<section class="result-top"><div><p>Completed analysis</p><h1>${escapeHtml(a.fileName)}</h1><span>${new Date(a.createdAt).toLocaleString()} · ${a.provider}</span></div><button class="pkap-btn ghost" data-pkap-action="new-analysis">New Analysis</button><button class="pkap-btn primary" data-pkap-action="generate-report">Generate Report</button><button class="pkap-btn secondary" data-pkap-action="download-pdf">Download PDF</button></section>${summaryGrid(a)}<section class="pkap-grid two"><article class="pkap-card"><h2>Difficulty / severity distribution</h2>${severityBars(a)}</article><article class="pkap-card"><h2>IOC distribution</h2>${iocBars(a)}</article><article class="pkap-card"><h2>Event quality analysis</h2>${qualityBars(a)}</article><article class="pkap-card"><h2>Correct-answer pattern equivalent</h2><p class="muted">PKAP backend is log-focused, not question-paper answer-key focused. This section is intentionally not fabricated.</p>${emptyMini('No answer-key data in backend response')}</article></section><section class="pkap-card"><div class="card-head"><h2>Detected issues / findings</h2><button data-pkap-action="drawer" data-drawer="findings">View all →</button></div>${findingsList(a.findings.slice(0,6))}</section>${a.report ? `<section class="pkap-card report-preview"><h2>AI Report Preview</h2><pre>${escapeHtml(a.report.slice(0,1600))}</pre></section>`:''}`; }
function historyView(){ if(!state.analyses.length) return emptyView('History is empty','Your analysed files will appear here after processing.','New Analysis','/new-analysis'); return `<section class="pkap-pagehead"><h1>Analysis History</h1><p>Reopen previously processed PKAP analyses.</p></section><section class="pkap-card list">${state.analyses.map(a=>`<button data-route="/analysis/${a.id}"><strong>${escapeHtml(a.fileName)}</strong><span>${new Date(a.createdAt).toLocaleString()} · Risk ${a.metadata.overallRiskScore}/100 · ${a.findings.length} findings</span></button>`).join('')}</section>`; }
function reportsView(){ if(!state.reports.length) return emptyView('No reports generated yet','Generate a report from any analysis result, then download PDF.','Open Latest Analysis', activeAnalysis()?`/analysis/${activeAnalysis().id}`:'/new-analysis'); return `<section class="pkap-pagehead"><h1>Reports</h1><p>Generated report records. Open an analysis to regenerate or download PDF.</p></section><section class="pkap-card list">${state.reports.map(r=>`<button data-route="/analysis/${r.analysisId}"><strong>${escapeHtml(r.fileName)}</strong><span>${new Date(r.createdAt).toLocaleString()} · ${r.provider}</span></button>`).join('')}</section>`; }
function settingsView(){ return `<section class="pkap-pagehead"><h1>Settings</h1><p>Preferences persist locally and influence analysis/report behaviour.</p></section><section class="settings-grid"><article class="pkap-card"><h2>Appearance</h2>${select('theme',['dark','light','system'])}</article><article class="pkap-card"><h2>Analysis Preferences</h2>${check('strictDuplicates','Strict duplicate detection')}${check('nearDuplicate','Near-duplicate detection')}${check('severityAnalysis','Severity analysis')}${check('iocExtraction','IOC extraction')}${check('languageValidation','Language validation')}</article><article class="pkap-card"><h2>Report Preferences</h2>${check('includeCharts','Include chart summaries')}${check('includeFindings','Include question/finding-level list')}${check('includeRecommendations','Include recommendations')}${check('includeAISummary','Include AI summary')}</article><article class="pkap-card"><h2>Application Information</h2><p>API mode: ${window.SHAKTII_API.base || 'same-origin Vercel functions'}</p><p>App version: PKAP PWA v22</p><button class="pkap-btn primary" data-pkap-action="save-settings">Save settings</button></article></section>`; }
function select(k, opts){ return `<label class="setting"><span>${k}</span><select data-setting="${k}">${opts.map(o=>`<option ${state.settings[k]===o?'selected':''}>${o}</option>`).join('')}</select></label>`; }
function check(k,label){ return `<label class="setting"><span>${label}</span><input type="checkbox" data-setting="${k}" ${state.settings[k]?'checked':''}></label>`; }
function emptyView(title,text,label,route){ return `<section class="empty-state"><img src="/assets/logo.svg?v=22" alt="PWN SHAKTI"><h1>${title}</h1><p>${text}</p><button class="pkap-btn primary" data-route="${route}">${label}</button></section>`; }
function summaryGrid(a){ const sev=a.severityBreakdown, total=a.findings.length; return `<section class="kpi-grid"><button data-pkap-action="drawer" data-drawer="risk"><b>${a.metadata.overallRiskScore}</b><span>Overall Risk Score</span><small>Calculated from actual findings</small></button><button data-pkap-action="drawer" data-drawer="severity"><b>${sev.critical+sev.high}</b><span>High/Critical</span><small>Needs review</small></button><button data-pkap-action="drawer" data-drawer="findings"><b>${total}</b><span>Issues Detected</span><small>Click to inspect</small></button><button data-pkap-action="drawer" data-drawer="iocs"><b>${a.iocs.length}</b><span>IOCs Extracted</span><small>IP / domain / hash</small></button><button><b>${a.metadata.privacyMasked || 0}</b><span>Privacy Masked</span><small>Secrets redacted pre-analysis</small></button></section>`; }
function severityBars(a){ const s=a.severityBreakdown, total=Math.max(1,Object.values(s).reduce((x,y)=>x+y,0)); return `<div class="sv-bars">${['critical','high','medium','low','info'].map(k=>`<div data-tip="${k}: ${s[k]||0} events · ${pct(s[k],total)}%"><span>${k}</span><i><b style="width:${pct(s[k],total)}%"></b></i><em>${s[k]||0}</em></div>`).join('')}</div>`; }
function iocBars(a){ const g=a.iocs.reduce((m,x)=>{m[x.type]=(m[x.type]||0)+1;return m;},{}), total=Math.max(1,a.iocs.length); return `<div class="sv-bars">${['IP','Domain','Hash','User'].map(k=>`<div data-tip="${k}: ${g[k]||0} IOCs · ${pct(g[k],total)}%"><span>${k}</span><i><b style="width:${pct(g[k],total)}%"></b></i><em>${g[k]||0}</em></div>`).join('')}</div>`; }
function qualityBars(a){ const vals={Excellent:Math.max(0,(a.severityBreakdown.info||0)),Good:a.severityBreakdown.low||0,Average:a.severityBreakdown.medium||0,'Needs Improvement':(a.severityBreakdown.high||0)+(a.severityBreakdown.critical||0)}; const total=Math.max(1,Object.values(vals).reduce((x,y)=>x+y,0)); return `<div class="sv-bars">${Object.entries(vals).map(([k,v])=>`<div data-tip="${k}: ${v} records · ${pct(v,total)}%"><span>${k}</span><i><b style="width:${pct(v,total)}%"></b></i><em>${v}</em></div>`).join('')}</div>`; }
function lineSvg(vals,label){ const max=Math.max(1,...vals); const points=vals.map((v,i)=>`${20+i*(260/(vals.length-1||1))},${150-(v/max)*110}`).join(' '); return `<svg class="spark" viewBox="0 0 300 170" role="img" aria-label="${label}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#a855f7" stop-opacity=".55"/><stop offset="1" stop-color="#a855f7" stop-opacity="0"/></linearGradient></defs><polyline points="${points}" fill="none" stroke="#a855f7" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${vals.map((v,i)=>`<circle cx="${20+i*(260/(vals.length-1||1))}" cy="${150-(v/max)*110}" r="5" fill="#fff" data-tip="${label}: ${v}"/>`).join('')}</svg>`; }
function findingsList(items){ if(!items.length) return emptyMini('No findings detected'); return `<div class="finding-list">${items.map(f=>`<article><strong>${escapeHtml(f.eventType)}</strong><span class="pill ${String(f.severity).toLowerCase()}">${f.severity}</span><p>${escapeHtml(f.description)}</p><small>${escapeHtml(f.sourceIP)} · ${escapeHtml(f.timestamp)}</small></article>`).join('')}</div>`; }
function emptyMini(t){ return `<div class="mini-empty">${t}</div>`; }
function drawerView(type){ const a=activeAnalysis(); if(!a) return ''; let title='Details', body=''; if(type==='findings'){ title='Detected Findings'; body=findingsList(a.findings); } else if(type==='iocs'){ title='Extracted IOCs'; body=`<div class="finding-list">${a.iocs.map(i=>`<article><strong>${escapeHtml(i.value)}</strong><span class="pill info">${i.type}</span><p>Reputation: ${i.reputation}</p></article>`).join('') || emptyMini('No IOCs')}</div>`; } else if(type==='severity'){ title='Severity Drill-down'; body=severityBars(a)+findingsList(a.findings); } else { title='Risk Score Explanation'; body=`<p>Score ${a.metadata.overallRiskScore}/100 is based on severity weighting, findings count and IOC extraction from the uploaded file.</p>${severityBars(a)}`; } return `<div class="drawer-backdrop" data-pkap-action="close-drawer"><aside class="drawer" onclick="event.stopPropagation()"><button data-pkap-action="close-drawer">×</button><h2>${title}</h2>${body}</aside></div>`; }

render();
