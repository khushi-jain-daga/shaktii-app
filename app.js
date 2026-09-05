const qs = (id) => document.getElementById(id);
const steps = ['edge', 'alert', 'ack', 'investigate', 'trace', 'recommend', 'contain'];
const state = { step: 0, risk: 18, confidence: 0, sla: '--', backend: false, timer: 120, interval: null };

const copy = [
  {
    title: 'Waiting for edge telemetry',
    text: 'No tabs. No passive dashboard. Start the command flow and the app will move step-by-step like a live incident console.',
    work: 'Start edge sync',
    body: 'Tap the primary button to simulate firmware telemetry. When backend is ready, this same state will come from your Docker API.',
    incident: ['Edge channel idle', 'Router firmware and Docker backend can plug into this flow later. Until then this app uses a realistic local event bus.', 'secure']
  },
  {
    title: 'Critical alert received',
    text: 'The app forces operator attention first. Investigation is opened only after the incident is acknowledged or escalated.',
    work: 'Acknowledge required',
    body: '<code>policy.sla = 02:00</code><code>if no_ack → escalate_to_backup_admin()</code>',
    incident: ['Admin credential compromise chain', 'Failed login burst was followed by admin login, API key creation and suspicious outbound lookup.', 'critical']
  },
  {
    title: 'Operator acknowledged',
    text: 'Now the flow unlocks evidence instead of showing everything as static screens.',
    work: 'Build attack story',
    body: '<div class="kv"><div class="box"><small>source</small><b>185.220.101.45</b></div><div class="box"><small>asset</small><b>web-02</b></div><div class="box"><small>session</small><b>admin_7f3</b></div><div class="box"><small>indicator</small><b>key created</b></div></div>',
    incident: ['Alert acknowledged', 'The system is now correlating auth, network, API and DNS events into one readable chain.', 'critical']
  },
  {
    title: 'Investigation running',
    text: 'SHAKTII connects technical signals into a human-readable incident path.',
    work: 'Correlation result',
    body: '<code>brute_force → admin_success → privilege_change → export_route → c2_lookup</code>',
    incident: ['Privilege escalation path found', 'Current stage: credential compromise. Next likely stage: data exfiltration or persistence.', 'critical']
  },
  {
    title: 'Blockchain trace optional',
    text: 'Blockchain is not a random tab. It opens only if wallet or transaction evidence is attached to the incident.',
    work: 'On-chain context',
    body: '<div class="kv"><div class="box"><small>wallet</small><b>0x7a3f...9d2e</b></div><div class="box"><small>risk</small><b>low</b></div><div class="box"><small>tx count</small><b>342</b></div><div class="box"><small>linked</small><b>2 alerts</b></div></div>',
    incident: ['Wallet context checked', 'No direct malicious wallet movement found. Continue network-side containment first.', 'warn']
  },
  {
    title: 'Recommendation ready',
    text: 'The app gives a practical action, not only AI text.',
    work: 'SHAKTII recommendation',
    body: '<code>temporary_ip_block(30m)</code><code>freeze_session(admin_7f3)</code><code>revoke_new_api_key_after_approval()</code>',
    incident: ['Safe response recommended', 'Use reversible containment first, then allow analyst review and rollback.', 'critical']
  },
  {
    title: 'Containment applied',
    text: 'Critical risk reduced. Rollback remains available for analyst review.',
    work: 'Containment status',
    body: '<div class="kv"><div class="box"><small>ip block</small><b>active 30m</b></div><div class="box"><small>session</small><b>frozen</b></div><div class="box"><small>token</small><b>revocation pending</b></div><div class="box"><small>rollback</small><b>available</b></div></div>',
    incident: ['Threat contained', 'Temporary block and session freeze applied. Ticket ready for backend/SOC handoff.', 'secure']
  }
];

const bootLines = [
  'loading pwn-shakti mobile command...',
  'mounting edge telemetry channel...',
  'docker backend adapter: waiting',
  'fallback event bus: active',
  'operator workflow handlers: ready',
  'opening command surface...'
];

function time() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function toast(text) { const t = qs('toast'); t.textContent = text; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1700); }
function addLog(text, type='cmd') { const el = document.createElement('div'); el.className = `log ${type}`; el.dataset.time = time(); el.textContent = text; qs('runtime').prepend(el); }
function setButtons(primary, secondary) { qs('primaryBtn').textContent = primary; qs('secondaryBtn').textContent = secondary; }

function renderStrip() {
  qs('stageStrip').innerHTML = steps.map((_, i) => `<i class="${i < state.step ? 'done' : i === state.step ? 'active' : ''}"></i>`).join('');
}

function render() {
  const c = copy[state.step];
  qs('stageTitle').textContent = c.title;
  qs('stageCopy').textContent = c.text;
  qs('workKicker').textContent = `step ${String(state.step + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
  qs('workTitle').textContent = c.work;
  qs('workBody').innerHTML = c.body;
  qs('incidentTitle').textContent = c.incident[0];
  qs('incidentBody').textContent = c.incident[1];
  qs('severity').textContent = c.incident[2] === 'critical' ? 'critical' : c.incident[2] === 'warn' ? 'review' : 'secure';
  qs('severity').className = `severity ${c.incident[2] === 'critical' ? 'danger' : c.incident[2]}`;
  qs('riskScore').textContent = state.risk;
  qs('confidence').textContent = `${state.confidence}%`;
  qs('sla').textContent = state.sla;
  qs('incidentClock').textContent = state.step ? 'live now' : 'standby';
  qs('backendChip').querySelector('span').textContent = state.backend ? 'api live' : 'mock bus';
  renderStrip();

  if (state.step === 0) setButtons('Start flow', 'Backend check');
  if (state.step === 1) setButtons('Acknowledge', 'Escalate');
  if (state.step === 2) setButtons('Investigate', 'Ask AI');
  if (state.step === 3) setButtons('Trace wallet', 'Skip trace');
  if (state.step === 4) setButtons('Get recommendation', 'Generate report');
  if (state.step === 5) setButtons('Approve contain', 'Create ticket');
  if (state.step === 6) setButtons('Reset demo', 'Rollback');
}

function startTimer() {
  clearInterval(state.interval);
  state.timer = 120;
  state.interval = setInterval(() => {
    if (state.step !== 1) return clearInterval(state.interval);
    state.timer -= 1;
    const m = String(Math.floor(state.timer / 60)).padStart(2, '0');
    const s = String(state.timer % 60).padStart(2, '0');
    state.sla = `${m}:${s}`;
    qs('sla').textContent = state.sla;
    if (state.timer === 90) addLog('SLA warning: primary admin not acknowledged yet.', 'warn');
    if (state.timer <= 0) { clearInterval(state.interval); addLog('No acknowledgement. Escalating to backup SOC.', 'bad'); }
  }, 1000);
}

function next() {
  if (state.step === 0) {
    state.step = 1; state.risk = 94; state.confidence = 87; state.sla = '02:00';
    addLog('edge telemetry received from router-edge-01', 'good');
    addLog('risk spike: auth burst + admin success + API key creation', 'bad');
    startTimer();
  } else if (state.step < 6) {
    state.step += 1;
    if (state.step === 2) { clearInterval(state.interval); state.sla = 'ACK'; addLog('operator acknowledged incident. opening evidence path.', 'good'); }
    if (state.step === 3) addLog('correlation engine linked 5 events into one attack chain.', 'cmd');
    if (state.step === 4) addLog('wallet context available, opening optional blockchain trace.', 'warn');
    if (state.step === 5) addLog('ai recommendation generated: reversible containment first.', 'cmd');
    if (state.step === 6) { state.risk = 41; state.confidence = 92; state.sla = 'DONE'; addLog('temporary IP block + session freeze applied.', 'good'); }
  } else {
    reset();
    return;
  }
  render(); toast(copy[state.step].title);
}

function secondary() {
  if (state.step === 0) { state.backend = !state.backend; addLog(state.backend ? 'backend adapter marked connected for demo.' : 'backend adapter returned to fallback mock bus.', state.backend ? 'good' : 'warn'); }
  else if (state.step === 1) { addLog('manual escalation sent to backup SOC channel.', 'warn'); state.sla = 'ESC'; }
  else if (state.step === 2) { state.step = 5; addLog('AI shortcut opened from acknowledgement step.', 'cmd'); }
  else if (state.step === 3) { state.step = 5; addLog('wallet trace skipped. moving to recommendation.', 'warn'); }
  else if (state.step === 4) addLog('incident report draft queued for backend PDF service.', 'cmd');
  else if (state.step === 5) addLog('SOC ticket created locally. backend endpoint pending.', 'good');
  else if (state.step === 6) { state.risk = 58; addLog('rollback requested. waiting for analyst confirmation.', 'warn'); }
  render(); toast('Action registered');
}

function reset() {
  clearInterval(state.interval);
  state.step = 0; state.risk = 18; state.confidence = 0; state.sla = '--';
  qs('runtime').innerHTML = '';
  addLog('demo reset. waiting for new telemetry.', 'cmd');
  render(); toast('Demo reset');
}

function boot() {
  const box = qs('bootLines');
  bootLines.forEach((line, i) => setTimeout(() => {
    const div = document.createElement('div'); div.className = 'boot-line'; div.textContent = line; box.appendChild(div);
    if (i === bootLines.length - 1) setTimeout(() => qs('boot').classList.add('hide'), 650);
  }, 310 * i));
}

qs('primaryBtn').addEventListener('click', next);
qs('secondaryBtn').addEventListener('click', secondary);
render();
boot();
addLog('app mounted in offline-capable PWA mode.', 'good');
