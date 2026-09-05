(() => {
  function isAuthRoute() {
    return location.pathname === '/login' || location.pathname === '/signup';
  }

  function ensureMobileNavControls() {
    if (isAuthRoute()) {
      document.body.classList.remove('mobile-nav-open');
      document.querySelector('.mobile-menu-btn')?.remove();
      document.querySelector('.mobile-nav-backdrop')?.remove();
      return;
    }

    if (!document.querySelector('.mobile-menu-btn')) {
      const button = document.createElement('button');
      button.className = 'mobile-menu-btn';
      button.type = 'button';
      button.setAttribute('aria-label', 'Open navigation menu');
      button.textContent = '☰';
      button.addEventListener('click', () => {
        document.body.classList.toggle('mobile-nav-open');
        button.textContent = document.body.classList.contains('mobile-nav-open') ? '×' : '☰';
      });
      document.body.appendChild(button);
    }

    if (!document.querySelector('.mobile-nav-backdrop')) {
      const backdrop = document.createElement('div');
      backdrop.className = 'mobile-nav-backdrop';
      backdrop.addEventListener('click', closeMobileNav);
      document.body.appendChild(backdrop);
    }
  }

  function closeMobileNav() {
    document.body.classList.remove('mobile-nav-open');
    const button = document.querySelector('.mobile-menu-btn');
    if (button) button.textContent = '☰';
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('.pkap-side button')) {
      setTimeout(closeMobileNav, 80);
    }
  }, true);

  window.addEventListener('popstate', () => setTimeout(ensureMobileNavControls, 0));
  window.addEventListener('resize', () => {
    if (innerWidth > 900) closeMobileNav();
  });

  const obs = new MutationObserver(() => requestAnimationFrame(ensureMobileNavControls));
  obs.observe(document.documentElement, { childList: true, subtree: true });
  ensureMobileNavControls();
})();
