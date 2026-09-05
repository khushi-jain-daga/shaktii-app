(() => {
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || localStorage.getItem('SHAKTII_INSTALLED') === 'true';

  function replaceCopy() {
    document.querySelectorAll('button, a').forEach((el) => {
      const text = (el.textContent || '').trim().toLowerCase();
      if (text === 'enter secure app') el.textContent = 'Open Demo Dashboard';
      if (text === 'create and enter app') el.textContent = 'Create Demo Workspace';
    });
    document.querySelectorAll('h1').forEach((el) => {
      if ((el.textContent || '').trim() === 'Welcome back') el.textContent = 'Open PWN SHAKTI';
      if ((el.textContent || '').trim() === 'Create workspace') el.textContent = 'Create demo workspace';
    });
  }

  function updateInstallButtons() {
    const installed = isStandalone();
    document.querySelectorAll('[data-action="install"]').forEach((button) => {
      button.textContent = installed ? 'App Installed' : 'Install App';
      button.disabled = installed;
      button.classList.toggle('is-installed', installed);
      button.title = installed ? 'PWN SHAKTI is already installed' : 'Install PWN SHAKTI on this device';
    });
  }

  function showInstallHelp() {
    if (isStandalone()) return;
    const existing = document.querySelector('.install-help');
    if (existing) existing.remove();
    const box = document.createElement('div');
    box.className = 'install-help';
    box.innerHTML = `
      <div class="install-help-card">
        <button class="install-help-close" aria-label="Close">×</button>
        <img src="/assets/logo.svg?v=15" alt="PWN SHAKTI" />
        <h2>Install PWN SHAKTI</h2>
        <p>Your browser has not exposed the native install prompt yet. Use the browser menu once:</p>
        <ol>
          <li>Open this link in <b>Chrome</b>.</li>
          <li>Tap the <b>⋮ menu</b>.</li>
          <li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li>
        </ol>
        <p class="helper">After install, this button will change to App Installed.</p>
      </div>`;
    document.body.appendChild(box);
    box.querySelector('.install-help-close').onclick = () => box.remove();
    box.addEventListener('click', (e) => { if (e.target === box) box.remove(); });
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action="install"]');
    if (!btn || isStandalone()) return;
    setTimeout(() => {
      const text = (document.getElementById('toast')?.textContent || '').toLowerCase();
      if (text.includes('browser menu') || text.includes('available from browser')) showInstallHelp();
    }, 120);
  }, true);

  window.addEventListener('appinstalled', () => {
    localStorage.setItem('SHAKTII_INSTALLED', 'true');
    updateInstallButtons();
  });

  const observer = new MutationObserver(() => {
    replaceCopy();
    updateInstallButtons();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  replaceCopy();
  updateInstallButtons();
})();
