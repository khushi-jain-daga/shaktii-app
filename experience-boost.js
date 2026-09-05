(() => {
  const workflowSteps = [
    { title: 'Upload evidence file', path: '/new-analysis', text: 'Start with raw log or content evidence and validate the file before processing.' },
    { title: 'Run staged PKAP analysis', path: '/new-analysis', text: 'Show upload, reading, extraction, privacy redaction, analysis, statistics and insight generation.' },
    { title: 'Inspect analysis dashboard', path: '/dashboard', text: 'Review summary score, findings, indicators and risk signals from processed data.' },
    { title: 'Open drill-down evidence', path: '/dashboard', text: 'Click KPI cards and findings to inspect why each risk or issue was detected.' },
    { title: 'Generate PDF report', path: '/reports', text: 'Build the report from analysis data and download the professional PDF.' }
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
      const label = btn.textContent.trim().replace(/^.+?\s/, '') || btn.getAttribute('data-route') || 'Open';
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

  function addWorkflowPanel() {
    if (document.querySelector('.workflow-fab')) return;
    const fab = document.createElement('button');
    fab.className = 'workflow-fab';
    fab.textContent = 'Analysis Workflow';
    fab.addEventListener('click', () => {
      panelOpen = !panelOpen;
      const panel = document.querySelector('.workflow-panel');
      if (panel) panel.classList.toggle('show', panelOpen);
    });

    const panel = document.createElement('section');
    panel.className = 'workflow-panel';
    panel.innerHTML = `
      <h3>PKAP workflow</h3>
      <p>Use this guided path to present the full product workflow from upload to report.</p>
      <div class="flow-steps">
        ${workflowSteps.map((s, i) => `<i data-workflow-step="${i}">${i + 1}. ${s.title}</i>`).join('')}
      </div>
      <button class="pkap-btn primary" data-workflow-start>Start workflow</button>
    `;

    panel.addEventListener('click', (e) => {
      const item = e.target.closest('[data-workflow-step]');
      if (item) {
        const step = workflowSteps[Number(item.dataset.workflowStep)];
        go(step.path);
      }
      if (e.target.closest('[data-workflow-start]')) go('/new-analysis');
    });

    document.body.appendChild(panel);
    document.body.appendChild(fab);
  }

  function addCommandStrip() {
    const pageHead = document.querySelector('.pkap-hero, .result-top, .pkap-pagehead, .empty-state');
    if (!pageHead || document.querySelector('.command-strip')) return;
    if (!location.pathname.includes('/dashboard') && location.pathname !== '/') return;

    const strip = document.createElement('section');
    strip.className = 'command-strip';
    strip.innerHTML = `
      <article class="command-card">
        <p>Live product flow</p>
        <h3>PKAP Analyzer command path</h3>
        <span>Upload → staged processing → analysis dashboard → evidence drill-down → report/PDF. Use the workflow control during presentation.</span>
      </article>
      <article class="command-card">
        <p>System readiness</p>
        <h3>Backend-ready</h3>
        <div class="flow-steps"><i>Same-origin PKAP API</i><i>Docker backend URL supported</i><i>Local analyzer fallback available</i></div>
      </article>
      <article class="command-card command-matrix" aria-label="PKAP visual command matrix"></article>
    `;
    pageHead.after(strip);
  }

  function keepHomeVisible() {
    const onAuth = location.pathname === '/login' || location.pathname === '/signup';
    document.querySelectorAll('.side-home-fab, .workflow-fab').forEach((el) => {
      el.style.display = onAuth ? 'none' : '';
    });
  }

  function runEnhancements() {
    enhanceSidebarLabels();
    addSideHome();
    addWorkflowPanel();
    addCommandStrip();
    keepHomeVisible();
  }

  const obs = new MutationObserver(() => requestAnimationFrame(runEnhancements));
  obs.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', () => setTimeout(runEnhancements, 0));
  document.addEventListener('click', () => setTimeout(runEnhancements, 0));
  runEnhancements();
})();
