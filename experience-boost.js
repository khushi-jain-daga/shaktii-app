(() => {
  const demoSteps = [
    { title: 'Upload evidence file', path: '/analysis/new', text: 'Start with raw log/question-paper evidence and validate file type before processing.' },
    { title: 'Run staged PKAP analysis', path: '/analysis/new', text: 'Show upload, reading, extraction, analysis, statistics and insight generation stages.' },
    { title: 'Inspect risk dashboard', path: '/dashboard', text: 'Explain summary score, findings, IOCs and quality/risk signals from processed data.' },
    { title: 'Open drill-down evidence', path: '/analysis/result', text: 'Click KPI cards and findings to show why a score or issue was detected.' },
    { title: 'Generate PDF report', path: '/reports', text: 'Build the AI/local report and download a professional PDF.' }
  ];

  let panelOpen = false;

  const go = (path) => {
    if (typeof navigate === 'function') navigate(path);
    else {
      history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  function enhanceSidebarLabels() {
    document.querySelectorAll('.pkap-side button').forEach((btn) => {
      const label = btn.textContent.trim().replace(/^.+?\s/, '') || btn.getAttribute('data-nav') || 'Open';
      btn.setAttribute('data-tip', label);
    });
  }

  function addSideHome() {
    if (document.querySelector('.side-home-fab')) return;
    const btn = document.createElement('button');
    btn.className = 'side-home-fab';
    btn.innerHTML = '<span>⌂</span> Home';
    btn.addEventListener('click', () => go('/dashboard'));
    document.body.appendChild(btn);
  }

  function addDemoFlow() {
    if (document.querySelector('.demo-flow-fab')) return;
    const fab = document.createElement('button');
    fab.className = 'demo-flow-fab';
    fab.textContent = 'Guided Jury Demo';
    fab.addEventListener('click', () => {
      panelOpen = !panelOpen;
      const panel = document.querySelector('.guided-panel');
      if (panel) panel.classList.toggle('show', panelOpen);
    });

    const panel = document.createElement('section');
    panel.className = 'guided-panel';
    panel.innerHTML = `
      <h3>Presenter flow</h3>
      <p>Use this sequence to show the jury that SHAKTII is not a static dashboard.</p>
      <div class="flow-steps">
        ${demoSteps.map((s, i) => `<i data-demo-step="${i}">${i + 1}. ${s.title}</i>`).join('')}
      </div>
      <button class="pkap-btn primary" data-demo-start>Start demo flow</button>
    `;

    panel.addEventListener('click', (e) => {
      const item = e.target.closest('[data-demo-step]');
      if (item) {
        const step = demoSteps[Number(item.dataset.demoStep)];
        go(step.path);
      }
      if (e.target.closest('[data-demo-start]')) go('/analysis/new');
    });

    document.body.appendChild(panel);
    document.body.appendChild(fab);
  }

  function addCommandStrip() {
    const outlet = document.querySelector('.pkap-main main');
    const pageHead = document.querySelector('.pkap-hero, .result-top, .pkap-pagehead, .empty-state');
    if (!outlet || !pageHead || document.querySelector('.command-strip')) return;
    if (!location.pathname.includes('/dashboard') && location.pathname !== '/') return;

    const strip = document.createElement('section');
    strip.className = 'command-strip';
    strip.innerHTML = `
      <article class="command-card">
        <p>Live product flow</p>
        <h3>PKAP Analyzer command path</h3>
        <span>Upload → staged processing → analysis dashboard → evidence drill-down → report/PDF. Use quick actions below during presentation.</span>
      </article>
      <article class="command-card">
        <p>System readiness</p>
        <h3>Backend-ready</h3>
        <div class="flow-steps"><i>Same-origin PKAP API</i><i>Docker URL supported</i><i>Fallback shown clearly</i></div>
      </article>
      <article class="command-card command-matrix" aria-label="PKAP visual command matrix"></article>
    `;
    pageHead.after(strip);
  }

  function keepHomeVisible() {
    const loggedIn = !!localStorage.getItem('SHAKTII_AUTH') || !!localStorage.getItem('SHAKTII_PKAP_STATE_V1');
    const onAuth = location.pathname === '/login' || location.pathname === '/signup';
    document.querySelectorAll('.side-home-fab, .demo-flow-fab').forEach((el) => {
      el.style.display = onAuth ? 'none' : '';
    });
  }

  function runEnhancements() {
    enhanceSidebarLabels();
    addSideHome();
    addDemoFlow();
    addCommandStrip();
    keepHomeVisible();
  }

  const obs = new MutationObserver(() => requestAnimationFrame(runEnhancements));
  obs.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', () => setTimeout(runEnhancements, 0));
  document.addEventListener('click', () => setTimeout(runEnhancements, 0));
  runEnhancements();
})();
