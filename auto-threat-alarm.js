(() => {
  const STORE_KEYS = ['SHAKTII_APP_FINAL_STATE_V2', 'SHAKTII_FINAL_PWA_STATE_V1', 'SHAKTII_PKAP_STATE_V1'];
  const ACK_STORE = 'SHAKTII_ACKED_CRITICAL_ALARMS_V1';
  const DANGER_RISK_SCORE = 80;
  const HIGH_COUNT_THRESHOLD = 3;
  let activeAlarmId = '';
  let lastCheck = 0;

  const dangerWords = [
    'malware', 'ransomware', 'trojan', 'worm', 'virus', 'botnet', 'payload',
    'c2', 'command and control', 'command-and-control', 'beacon', 'beaconing',
    'exfil', 'exfiltration', 'privilege escalation', 'root access', 'shell',
    'backdoor', 'keylogger', 'phishing', 'ddos', 'dns tunneling', 'port scan',
    'brute force', 'bruteforce', 'unauthorized admin', 'router config changed'
  ];

  function safeJson(value, fallback) {
    try { return JSON.parse(value || ''); } catch (_) { return fallback; }
  }

  function readAppState() {
    for (const key of STORE_KEYS) {
      const parsed = safeJson(localStorage.getItem(key), null);
      if (parsed && (Array.isArray(parsed.analyses) || parsed.activeId)) return parsed;
    }
    return null;
  }

  function acked() {
    return safeJson(localStorage.getItem(ACK_STORE), {});
  }

  function markAcked(alarmId) {
    if (!alarmId) return;
    const map = acked();
    map[alarmId] = new Date().toISOString();
    localStorage.setItem(ACK_STORE, JSON.stringify(map));
  }

  function activeAnalysis(appState) {
    const analyses = Array.isArray(appState?.analyses) ? appState.analyses : [];
    return analyses.find((item) => item.id === appState.activeId) || analyses[0] || null;
  }

  function textOfAnalysis(analysis) {
    const parts = [
      analysis?.fileName,
      analysis?.executiveSummary,
      analysis?.metadata?.logTypeDetected,
      ...(analysis?.findings || []).flatMap((f) => [f.severity, f.eventType, f.description, f.rawLogSnippet, f.matchedPattern, f.mitreTag, f.sourceIP]),
      ...(analysis?.iocs || []).flatMap((i) => [i.value, i.type, i.reputation])
    ];
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  function isSuspiciousIoc(ioc) {
    const rep = String(ioc?.reputation || '').toLowerCase();
    return /malicious|suspicious|blacklist|tor|c2|botnet|phish|ransom|trojan/.test(rep);
  }

  function evaluateDanger(analysis) {
    if (!analysis) return { danger: false, reasons: [] };
    const severity = analysis.severityBreakdown || {};
    const risk = Number(analysis?.metadata?.overallRiskScore || analysis?.riskScore || 0);
    const critical = Number(severity.critical || severity.Critical || 0);
    const high = Number(severity.high || severity.High || 0);
    const suspiciousIocs = (analysis.iocs || []).filter(isSuspiciousIoc).length;
    const haystack = textOfAnalysis(analysis);
    const matchedWords = dangerWords.filter((word) => haystack.includes(word));

    const reasons = [];
    if (risk >= DANGER_RISK_SCORE) reasons.push(`risk score ${risk}/100`);
    if (critical > 0) reasons.push(`${critical} critical finding${critical > 1 ? 's' : ''}`);
    if (high >= HIGH_COUNT_THRESHOLD) reasons.push(`${high} high-severity findings`);
    if (suspiciousIocs > 0) reasons.push(`${suspiciousIocs} suspicious/malicious IOC${suspiciousIocs > 1 ? 's' : ''}`);
    if (matchedWords.length) reasons.push(`router/malware signal: ${matchedWords.slice(0, 3).join(', ')}`);

    return { danger: reasons.length > 0, reasons };
  }

  function showCriticalBanner(analysis, reasons) {
    let banner = document.querySelector('.auto-threat-banner');
    if (!banner) {
      banner = document.createElement('section');
      banner.className = 'auto-threat-banner';
      document.body.appendChild(banner);
    }
    banner.innerHTML = `
      <strong>Critical threat detected</strong>
      <span>${analysis?.fileName || 'Router flow'} · ${reasons.join(' · ')}</span>
      <button type="button" data-auto-threat-stop>Stop Alarm</button>
    `;
  }

  function removeCriticalBanner() {
    document.querySelector('.auto-threat-banner')?.remove();
  }

  function triggerCriticalAlarm(analysis, reasons) {
    const alarmId = analysis?.id || `router-${Date.now()}`;
    if (acked()[alarmId]) return;
    if (activeAlarmId === alarmId) return;
    activeAlarmId = alarmId;
    document.body.dataset.activeThreatAlarm = alarmId;
    showCriticalBanner(analysis, reasons);
    if (typeof window.triggerAlarm === 'function') {
      window.triggerAlarm();
    }
  }

  function checkForThreat() {
    const now = Date.now();
    if (now - lastCheck < 900) return;
    lastCheck = now;
    const appState = readAppState();
    const analysis = activeAnalysis(appState);
    const result = evaluateDanger(analysis);
    if (result.danger) triggerCriticalAlarm(analysis, result.reasons);
  }

  function stopCurrentAlarm() {
    const alarmId = activeAlarmId || document.body.dataset.activeThreatAlarm;
    markAcked(alarmId);
    activeAlarmId = '';
    delete document.body.dataset.activeThreatAlarm;
    removeCriticalBanner();
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-auto-threat-stop], [data-action="ack-alarm"], [data-ack-alarm], [data-close-alarm]')) {
      stopCurrentAlarm();
    }
  }, true);

  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function patchedSetItem(key, value) {
    const output = originalSetItem(key, value);
    if (STORE_KEYS.includes(key)) setTimeout(checkForThreat, 40);
    return output;
  };

  window.SHAKTII_AUTO_THREAT_ALARM = { checkForThreat, evaluateDanger, stopCurrentAlarm };
  setInterval(checkForThreat, 1500);
  window.addEventListener('focus', checkForThreat);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForThreat(); });
  setTimeout(checkForThreat, 800);
})();
