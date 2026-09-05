(() => {
  const workflowSteps = [
    { title: 'Upload evidence file', path: '/new-analysis', text: 'Start with raw log or content evidence and validate the file before processing.' },
    { title: 'Run staged PKAP analysis', path: '/new-analysis', text: 'Show upload, reading, extraction, privacy redaction, analysis, statistics and insight generation.' },
    { title: 'Inspect analysis dashboard', path: '/dashboard', text: 'Review summary score, findings, indicators and risk signals from processed data.' },
    { title: 'Open drill-down evidence', path: '/dashboard', text: 'Click KPI cards and findings to inspect why each risk or issue was detected.' },
    { title: 'Generate PDF report', path: '/reports', text: 'Build the report from analysis data and download the professional PDF.' }
  ];

  const navItems = [
    { key: 'dashboard', icon: '⌂', label: 'Home / Dashboard' },
    { key: 'new', icon: '⇧', label: 'New Analysis' },
    { key: 'result', icon: '◈', label: 'Analysis Result' },
    { key: 'analytics', icon: '↗', label: 'Analytics' },
    { key: 'findings', icon: '!', label: 'Findings / Issues' },
    { key: 'iocs', icon: '◎', label: 'Indicators / IOCs' },
    { key: 'history', icon: '☷', label: 'History' },
    { key: 'reports', icon: '◧', label: 'Reports' },
    { key: 'settings', icon: '⚙', label: 'Settings' },
    { key: 'profile', icon: '◉', label: 'Profile' }
  ];

  let panelOpen = false;

  const go = (path) => {
    if (typeof navigate === 'function') navigate(path);
    else {
      history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  function getActive() {
    try { return typeof activeAnalysis === 'function' ? activeAnalysis() : null; } catch (_) { return null; }
  }

  function routeFor(key) {
    const active = getActive();
    if (key === 'dashboard') return '/dashboard';
    if (key === 'new') return '/new-analysis';
    if (key === 'history') return '/history';
    if (key === 'reports') return '/reports';
    if (key === 'settings' || key === 'profile') return '/settings';
    if (['result', 'analytics', 'findings', 'iocs'].includes(key)) return active ? `/analysis/${active.id}` : '/new-analysis';
    return '/dashboard';
  }

  function replaceSidebarNav() {
    const side = document.querySelector('.pkap-side');
    const nav = document.querySelector('.pkap-side nav');
    if (!side || !nav || nav.dataset.fullRestored === 'true') return;

    nav.dataset.fullRestored = 'true';
    const active = getActive();
    const current = location.pathname;
    nav.innerHTML = navItems.map((item) => {
      const route = routeFor(item.key);
      const isActive = current === route || (item.key === 'result' && current.startsWith('/analysis/'));
      const disabled = !active && ['result','analytics','findings','iocs'].includes(item.key);
      return `<button class="${isActive ? 'active' : ''}" data-full-nav="${item.key}" ${disabled ? 'aria-disabled="true"' : ''}><span>${item.icon}</span>${item.label}</button>`;
    }).join('');

    const logout = side.querySelector('.pkap-logout');
    if (logout) logout.innerHTML = '<span>⏻</span> Logout';
  }

  document.addEventListener('click', (event) => {
    const item = event.target.closest('[data-full-nav]');
    if (!item) return;
    event.preventDefault();
    event.stopPropagation();

    const key = item.dataset.fullNav;
    const active = getActive();
    if (!active && ['result','analytics','findings','iocs'].includes(key)) {
      if (typeof toast === 'function') toast('Run a new analysis first.', 'info');
      return go('/new-analysis');
    }

    if (key === 'findings') {
      try { state.drawer = 'findings'; } catch (_) {}
      go(routeFor(key));
      setTimeout(() => { try { state.drawer = 'findings'; render(); } catch (_) {} }, 20);
      return;
    }
    if (key === 'iocs') {
      try { state.drawer = 'iocs'; } catch (_) {}
      go(routeFor(key));
      setTimeout(() => { try { state.drawer = 'iocs'; render(); } catch (_) {} }, 20);
      return;
    }
    if (key === 'analytics') {
      try { state.drawer = 'severity'; } catch (_) {}
      go(routeFor(key));
      return;
    }
    return go(routeFor(key));
  }, true);

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
    replaceSidebarNav();
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
