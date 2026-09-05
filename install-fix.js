(() => {
  const demoUser = { name: 'Khushi Jain', role: 'Security Admin', email: 'admin@pwnshakti.ai' };
  const realStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const installedFlag = () => localStorage.getItem('SHAKTII_INSTALLED') === 'true';
  const canOpenAsApp = () => realStandalone();

  function setDemoUser() {
    localStorage.setItem('SHAKTII_USER', JSON.stringify(demoUser));
    try { state.user = demoUser; } catch (_) {}
  }

  function showInstallHelp() {
    if (canOpenAsApp()) return;
    const existing = document.querySelector('.install-help');
    if (existing) existing.remove();
    const box = document.createElement('div');
    box.className = 'install-help';
    box.innerHTML = `
      <div class="install-help-card">
        <button class="install-help-close" aria-label="Close">×</button>
        <img src="/assets/logo.svg?v=16" alt="PWN SHAKTI" />
        <h2>Install PWN SHAKTI</h2>
        <p>If the automatic prompt does not open, install from Chrome menu:</p>
        <ol>
          <li>Tap the <b>⋮</b> menu in Chrome.</li>
          <li>Select <b>Install app</b> or <b>Add to Home screen</b>.</li>
          <li>Open PWN SHAKTI from your phone home screen.</li>
        </ol>
      </div>`;
    document.body.appendChild(box);
    box.querySelector('.install-help-close').onclick = () => box.remove();
    box.addEventListener('click', (e) => { if (e.target === box) box.remove(); });
  }

  authPage = function authPageInstallOnly() {
    return `
      <main class="auth-screen install-only-screen">
        <section class="auth-card install-only-card">
          <img src="/assets/logo.svg?v=16" alt="PWN SHAKTI" class="auth-logo" />
          <p class="eyebrow">Mobile security application</p>
          <h1>Install PWN SHAKTI</h1>
          <p class="muted">Install the lightweight app first. After installation, open it from your home screen to access Dashboard, Files, Upload, Blockchain, Security, Analytics and Reports.</p>
          <button class="btn primary full install-main-button" data-action="install">Install App</button>
        </section>
      </main>`;
  };

  const previousInstallApp = installApp;
  installApp = async function installOnlyFlow() {
    if (canOpenAsApp()) {
      localStorage.setItem('SHAKTII_INSTALLED', 'true');
      setDemoUser();
      if (window.location.pathname !== '/dashboard') navigate('/dashboard');
      return;
    }

    try {
      if (state.installPrompt) {
        state.installPrompt.prompt();
        const result = await state.installPrompt.userChoice;
        state.installPrompt = null;
        if (result.outcome === 'accepted') {
          localStorage.setItem('SHAKTII_INSTALLED', 'true');
          toast('App installed. Open it from your home screen.', 'success');
          updateInstallButtons();
          return;
        }
      }
    } catch (_) {
      try { await previousInstallApp(); } catch (__) {}
    }

    showInstallHelp();
  };

  updateInstallButtons = function updateInstallOnlyButtons() {
    const runningInstalledApp = canOpenAsApp();
    document.querySelectorAll('[data-action="install"]').forEach((button) => {
      if (runningInstalledApp) {
        button.style.display = 'none';
        return;
      }
      button.style.display = '';
      button.textContent = 'Install App';
      button.disabled = false;
      button.classList.remove('is-installed');
      button.title = 'Install PWN SHAKTI on this device';
    });
  };

  window.addEventListener('appinstalled', () => {
    localStorage.setItem('SHAKTII_INSTALLED', 'true');
    updateInstallButtons();
    toast('App installed. Open it from your home screen.', 'success');
  });

  if (canOpenAsApp()) {
    localStorage.setItem('SHAKTII_INSTALLED', 'true');
    setDemoUser();
    if (['/', '/login', '/signup'].includes(window.location.pathname)) {
      window.history.replaceState({}, '', '/dashboard');
    }
  } else if (installedFlag() && ['/', '/login', '/signup'].includes(window.location.pathname)) {
    // Browser tab still shows only installation CTA. The full dashboard opens in standalone app mode.
  }

  setTimeout(() => {
    try { render(); } catch (_) {}
    updateInstallButtons();
  }, 0);
})();
