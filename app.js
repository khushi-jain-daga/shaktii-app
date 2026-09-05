const $ = (id) => document.getElementById(id);

const API_BASE = new URLSearchParams(location.search).get('api') || localStorage.getItem('SHAKTII_API_BASE') || '';
const stages = ['edge', 'alert', 'ack', 'investigate', 'trace', 'recommend', 'contain'];
const state = {
  step: 0,
  risk: 18,
  confidence: 0,
  sla: '--',
  timer: null,
  deferredInstall: null,
  alarmAudio: null,
  alarmOn: false,
  backendLive: false
};

const content = [
  {
    title: 'Edge command ready',
    sub: 'Installable lightweight mobile app for jury demo. It works now with a local event bus and is ready for Docker backend/SSE integration.',
    incident: 'No active incident',
    copy: 'Tap Start Edge Sync. The app will simulate router firmware telemetry, raise a critical incident, trigger alarm, and unlock the response flow.',
    badge: 'secure',
    workTitle: 'Start edge sync',
    work: '<p>Demo bus is idle. Backend can later push the same events from <b>GET /events</b> or <b>POST /api/ingest-telemetry</b>.</p>',
    buttons: ['Backend Check', 'Start Edge Sync']
  },
  {
    title: 'Critical alert raised',
    sub: 'Alarm is active. This proves the app does not depend on someone checking a dashboard every time.',
    incident: 'Admin credential compromise chain',
    copy: 'Failed login burst was followed by successful admin session, API key creation and suspicious outbound lookup.',
    badge: 'critical',
    workTitle: 'Acknowledge within SLA',
    work: '<code>alarm.sound = active</code><code>alarm.vibration = active</code><code>if no_ack → escalate_to_backup()</code>',
    buttons: ['Escalate', 'Acknowledge']
  },
  {
    title: 'Operator acknowledged',
    sub: 'Now the app unlocks the investigation path instead of dumping all screens at once.',
    incident: 'Alert acknowledged',
    copy: 'Operator has accepted ownership. SHAKTII is now correlating auth, network, API and DNS signals.',
    badge: 'critical',
    workTitle: 'Evidence summary',
    work: '<div class="kv"><div class="box"><small>source</small><b>185.220.101.45</b></div><div class="box"><small>asset</small><b>web-02</b></div><div class="box"><small>session</small><b>admin_7f3</b></div><div class="box"><small>indicator</small><b>api key made</b></div></div>',
    buttons: ['Create Ticket', 'Investigate']
  },
  {
    title: 'Investigation running',
    sub: 'The app connects individual signals into one readable attack story for the analyst.',
    incident: 'Privilege path found',
    copy: 'Current stage: credential compromise. Predicted next stage: data exfiltration or persistence.',
    badge: 'critical',
    workTitle: 'Attack path',
    work: '<code>brute_force → admin_success → privilege_change → export_route → c2_lookup</code>',
    buttons: ['Skip Chain', 'Trace Evidence']
  },
  {
    title: 'Evidence trace completed',
    sub: 'Blockchain view opens only when the incident has wallet or transaction context. No random tab navigation.',
    incident: 'Wallet context reviewed',
    copy: 'No direct malicious wallet movement detected. Continue network-side containment first.',
    badge: 'review',
    workTitle: 'On-chain intelligence',
    work: '<div class="kv"><div class="box"><small>wallet</small><b>0x7a3f...9d2e</b></div><div class="box"><small>risk</small><b>low</b></div><div class="box"><small>tx count</small><b>342</b></div><div class="box"><small>linked alerts</small><b>2</b></div></div>',
    buttons: ['Generate Report', 'Ask SHAKTII']
  },
  {
    title: 'Recommendation ready',
    sub: 'SHAKTII gives a practical response action, not only AI text.',
    incident: 'Safe response recommended',
    copy: 'Use reversible containment first, then analyst review and rollback.',
    badge: 'critical',
    workTitle: 'Recommended containment',
    work: '<code>temporary_ip_block(30m)</code><code>freeze_session(admin_7f3)</code><code>revoke_new_api_key_after_approval()</code>',
    buttons: ['Escalate', 'Approve Containment']
  },
  {
    title: 'Containment applied',
    sub: 'Risk reduced. Rollback remains available for safe human review.',
    incident: 'Threat contained',
    copy: 'Temporary block and session freeze applied. Ticket is ready for backend/SOC handoff.',
    badge: 'secure',
    workTitle: 'Containment status',
    work: '<div class="kv"><div class="box"><small>ip block</small><b>active 30m</b></div><div class="box"><small>session</small><b>frozen</b></div><div class="box"><small>token</small><b>revocation pending</b></div><div class="box"><small>rollback</small><b>available</b></div></div>',
    buttons: ['Reset Demo', 'Rollback Ready']
  }
];

const bootLines = [
  'loading pwn-shakti command...',
  'checking installed app shell...',
  'router firmware channel: standby',
  'docker backend adapter: waiting',
  'alarm handlers: sound + vibration + notification',
  'operator flow ready.'
];

function time() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function toast(message) {
  const t = $('toast');
  t.textContent = message;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1700);
}

function log(message, type = 'cmd') {
  const el = document.createElement('div');
  el.className = `log ${type}`;
  el.dataset.time = time();
  el.textContent = message;
  $('runtime').prepend(el);
}

function setAlarm(active) {
  state.alarmOn = active;
  $('alarmState').textContent = active ? 'ON' : 'OFF';
  $('alarmOverlay').classList.toggle('show', active);
  $('statusCard').classList.toggle('critical', active);

  if (active) {
    try {
      if (!state.alarmAudio) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        state.alarmAudio = { ctx };
      }
      const ctx = state.alarmAudio.ctx;
      const play = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(780, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.38);
      };
      play(); setTimeout(play, 470);
    } catch (e) {}
    if ('vibrate' in navigator) navigator.vibrate([250, 90, 250, 90, 450]);
    notify('Critical SHAKTII Alert', 'Admin compromise chain detected. Acknowledge now.');
  } else {
    if ('vibrate' in navigator) navigator.vibrate(0);
  }
}

async function notify(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') await Notification.requestPermission();
  if (Notification.permission !== 'granted') return;
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (reg?.showNotification) {
      reg.showNotification(title, { body, icon: 'assets/logo.svg?v=10', badge: 'assets/logo.svg?v=10', tag: 'shaktii-critical-alert' });
      return;
    }
  }
  new Notification(title, { body, icon: 'assets/logo.svg?v=10' });
}

function startTimer() {
  clearInterval(state.timerInterval);
  state.timer = 90;
  state.sla = '01:30';
  state.timerInterval = setInterval(() => {
    if (state.step !== 1) return clearInterval(state.timerInterval);
    state.timer -= 1;
    const m = String(Math.floor(state.timer / 60)).padStart(2, '0');
    const s = String(state.timer % 60).padStart(2, '0');
    state.sla = `${m}:${s}`;
    $('sla').textContent = state.sla;
    if (state.timer === 60) log('SLA warning: primary admin has not acknowledged yet.', 'warn');
    if (state.timer <= 0) {
      clearInterval(state.timerInterval);
      log('SLA missed: escalating to backup SOC and preparing reversible containment.', 'bad');
      toast('SLA missed. Escalation started.');
    }
  }, 1000);
}

function renderProgress() {
  $('progress').innerHTML = stages.map((_, i) => `<i class="${i < state.step ? 'done' : i === state.step ? 'active' : ''}"></i>`).join('');
}

function render() {
  const c = content[state.step];
  $('stageNo').textContent = `STAGE ${String(state.step).padStart(2, '0')}`;
  $('title').textContent = c.title;
  $('subtitle').textContent = c.sub;
  $('incidentTitle').textContent = c.incident;
  $('incidentCopy').textContent = c.copy;
  $('severity').textContent = c.badge;
  $('severity').className = `badge ${c.badge}`;
  $('workStep').textContent = `step ${String(state.step + 1).padStart(2, '0')} / ${String(stages.length).padStart(2, '0')}`;
  $('workTitle').textContent = c.workTitle;
  $('workBody').innerHTML = c.work;
  $('secondaryBtn').textContent = c.buttons[0];
  $('primaryBtn').textContent = c.buttons[1];
  $('risk').textContent = state.risk;
  $('riskText').textContent = state.risk >= 90 ? 'critical' : state.risk >= 50 ? 'elevated' : 'baseline';
  $('confidence').textContent = `${state.confidence}%`;
  $('sla').textContent = state.sla;
  $('clock').textContent = state.step ? 'live now' : 'standby';
  $('sourceBadge').innerHTML = `<i></i> ${state.backendLive ? 'api live' : 'demo bus'}`;
  renderProgress();
}

function advance() {
  if (state.step === 0) {
    state.step = 1; state.risk = 94; state.confidence = 87; state.sla = '01:30';
    log('[edge] router telemetry received from gateway-01', 'cmd');
    log('[auth] 47 failed logins followed by admin success', 'bad');
    log('[risk] score raised 18 → 94', 'bad');
    log('[forecast] likely next stage: data exfiltration / persistence', 'warn');
    setAlarm(true); startTimer(); render(); return;
  }
  if (state.step === 1) {
    state.step = 2; clearInterval(state.timerInterval); state.sla = 'ACK'; setAlarm(false);
    log('[operator] alert acknowledged by primary admin', 'good');
    render(); return;
  }
  if (state.step === 2) { state.step = 3; log('[investigate] correlating session, API key and DNS lookup', 'cmd'); render(); return; }
  if (state.step === 3) { state.step = 4; log('[trace] wallet evidence checked; no direct malicious transfer', 'warn'); render(); return; }
  if (state.step === 4) { state.step = 5; log('[ai] recommended reversible containment before hard block', 'cmd'); render(); return; }
  if (state.step === 5) {
    state.step = 6; state.risk = 41; state.confidence = 91; state.sla = 'DONE';
    log('[contain] temporary IP block active for 30m', 'good');
    log('[contain] admin session frozen; rollback token generated', 'good');
    render(); return;
  }
  toast('Rollback available for analyst review.');
}

function secondary() {
  if (state.step === 0) { checkBackend(); return; }
  if (state.step === 1) { log('[escalate] backup SOC notified; alarm remains active', 'warn'); notify('SHAKTII Escalation', 'Backup SOC has been notified.'); toast('Escalation sent.'); return; }
  if (state.step === 2) { log('[ticket] incident ticket created for backend/SOC handoff', 'good'); toast('Ticket created.'); return; }
  if (state.step === 3) { state.step = 5; log('[trace] skipped blockchain because no wallet evidence required', 'warn'); render(); return; }
  if (state.step === 4) { log('[report] executive incident report generated locally', 'good'); toast('Report generated.'); return; }
  if (state.step === 5) { log('[escalate] containment approval requested from senior admin', 'warn'); toast('Senior admin approval requested.'); return; }
  if (state.step === 6) { resetDemo(); }
}

async function checkBackend() {
  if (!API_BASE) { toast('Backend not configured. Demo bus active.'); log('[backend] no API base configured; use ?api=http://localhost:8000 later', 'warn'); return; }
  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, '')}/health`, { cache: 'no-store' });
    state.backendLive = res.ok;
    toast(state.backendLive ? 'Backend connected.' : 'Backend not healthy.');
    log(state.backendLive ? '[backend] Docker API health check passed' : '[backend] API responded but health failed', state.backendLive ? 'good' : 'warn');
  } catch (e) {
    state.backendLive = false;
    toast('Backend unreachable. Demo bus active.');
    log('[backend] unreachable; app remains fully demo-ready', 'warn');
  }
  render();
}

function resetDemo() {
  clearInterval(state.timerInterval);
  Object.assign(state, { step: 0, risk: 18, confidence: 0, sla: '--', alarmOn: false });
  $('runtime').innerHTML = '';
  setAlarm(false);
  log('[system] demo reset. waiting for edge telemetry.', 'cmd');
  render();
}

function boot() {
  const box = $('bootLines');
  bootLines.forEach((line, i) => setTimeout(() => {
    const el = document.createElement('div');
    el.className = 'boot-line';
    el.textContent = line;
    box.appendChild(el);
    if (i === bootLines.length - 1) setTimeout(() => $('boot').classList.add('hide'), 650);
  }, i * 310));
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.deferredInstall = event;
  $('installBtn').textContent = 'Install';
});

$('installBtn').addEventListener('click', async () => {
  if (state.deferredInstall) {
    state.deferredInstall.prompt();
    await state.deferredInstall.userChoice;
    state.deferredInstall = null;
  } else {
    toast('Use Chrome menu → Add to Home Screen / Install App');
  }
});
$('primaryBtn').addEventListener('click', advance);
$('secondaryBtn').addEventListener('click', secondary);
$('quickAck').addEventListener('click', advance);

boot();
render();
setTimeout(() => log('[system] PWA loaded. waiting for operator.', 'cmd'), 2100);
