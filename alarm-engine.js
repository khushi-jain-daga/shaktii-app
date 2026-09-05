(() => {
  let alarmAudioContext = null;
  let alarmOscillator = null;
  let alarmGain = null;
  let alarmLfo = null;
  let alarmLfoGain = null;
  let vibrationTimer = null;
  let alarmActive = false;

  const supportsVibration = () => typeof navigator !== 'undefined' && 'vibrate' in navigator;

  function showAlarmStatus(message) {
    const toastEl = document.getElementById('toast');
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = 'toast show danger';
    setTimeout(() => {
      if (toastEl.textContent === message) toastEl.className = 'toast';
    }, 2800);
  }

  function startStrongVibration() {
    if (!supportsVibration()) return;
    navigator.vibrate([900, 180, 900, 180, 1200, 260, 1200]);
    clearInterval(vibrationTimer);
    vibrationTimer = setInterval(() => {
      if (!alarmActive) return;
      navigator.vibrate([900, 180, 900, 180, 1200, 260, 1200]);
    }, 3900);
  }

  function stopStrongVibration() {
    clearInterval(vibrationTimer);
    vibrationTimer = null;
    if (supportsVibration()) navigator.vibrate(0);
  }

  function startLoudSiren() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;

      stopLoudSiren();
      alarmAudioContext = new AudioContext();
      alarmOscillator = alarmAudioContext.createOscillator();
      alarmGain = alarmAudioContext.createGain();
      alarmLfo = alarmAudioContext.createOscillator();
      alarmLfoGain = alarmAudioContext.createGain();

      alarmOscillator.type = 'sawtooth';
      alarmOscillator.frequency.value = 720;
      alarmLfo.type = 'sine';
      alarmLfo.frequency.value = 3.1;
      alarmLfoGain.gain.value = 430;
      alarmGain.gain.value = 0.38;

      alarmLfo.connect(alarmLfoGain);
      alarmLfoGain.connect(alarmOscillator.frequency);
      alarmOscillator.connect(alarmGain);
      alarmGain.connect(alarmAudioContext.destination);

      alarmOscillator.start();
      alarmLfo.start();
      return true;
    } catch (_) {
      return false;
    }
  }

  function stopLoudSiren() {
    try { alarmOscillator && alarmOscillator.stop(); } catch (_) {}
    try { alarmLfo && alarmLfo.stop(); } catch (_) {}
    try { alarmAudioContext && alarmAudioContext.close(); } catch (_) {}
    alarmOscillator = null;
    alarmGain = null;
    alarmLfo = null;
    alarmLfoGain = null;
    alarmAudioContext = null;
  }

  function notifyCritical() {
    if (!('Notification' in window)) return;
    const send = () => new Notification('PWN SHAKTI Critical Alert', {
      body: 'Critical threat detected. Immediate acknowledgement required.',
      tag: 'pwn-shakti-critical-alert',
      renotify: true,
      requireInteraction: true,
      icon: '/assets/icon-192.svg'
    });

    if (Notification.permission === 'granted') send();
    else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') send();
      });
    }
  }

  function runStrongAlarm() {
    alarmActive = true;
    document.body.classList.add('danger-alarm-active');
    const layer = document.getElementById('alarmLayer');
    if (layer) layer.classList.add('show');
    startStrongVibration();
    const soundStarted = startLoudSiren();
    notifyCritical();
    showAlarmStatus(soundStarted ? 'Critical alarm: siren + strong vibration active' : 'Critical alarm: strong vibration active. Tap screen once to enable siren.');
  }

  function stopStrongAlarm() {
    alarmActive = false;
    document.body.classList.remove('danger-alarm-active');
    const layer = document.getElementById('alarmLayer');
    if (layer) layer.classList.remove('show');
    stopStrongVibration();
    stopLoudSiren();
  }

  const originalTriggerAlarm = window.triggerAlarm || triggerAlarm;
  window.triggerAlarm = triggerAlarm = function enhancedTriggerAlarm() {
    runStrongAlarm();
  };

  const originalAcknowledgeAlarm = window.acknowledgeAlarm || acknowledgeAlarm;
  window.acknowledgeAlarm = acknowledgeAlarm = function enhancedAcknowledgeAlarm() {
    stopStrongAlarm();
    if (typeof originalAcknowledgeAlarm === 'function') return originalAcknowledgeAlarm();
  };

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="ack-alarm"], [data-ack-alarm], [data-close-alarm]')) {
      stopStrongAlarm();
    }
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && alarmActive) startStrongVibration();
  });
})();
