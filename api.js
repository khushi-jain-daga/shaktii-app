window.SHAKTII_API = (() => {
  const params = new URLSearchParams(location.search);
  const stored = localStorage.getItem('SHAKTII_API_BASE') || '';
  const base = params.get('api') || stored;
  if (params.get('api')) localStorage.setItem('SHAKTII_API_BASE', params.get('api'));

  const delay = (ms = 260) => new Promise((resolve) => setTimeout(resolve, ms));
  const data = () => window.SHAKTII_DATA;

  async function request(path, options = {}) {
    if (!base) throw new Error('Backend is not connected. Using demo data.');
    const res = await fetch(`${base}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return res.json();
  }

  async function withFallback(path, fallback, options) {
    try {
      return { data: await request(path, options), source: 'api', error: null };
    } catch (error) {
      await delay();
      return { data: fallback(), source: 'demo', error: error.message };
    }
  }

  return {
    get base() { return base; },
    dashboard: () => withFallback('/api/dashboard', () => data()),
    files: () => withFallback('/api/files', () => data().files),
    file: (id) => withFallback(`/api/files/${id}`, () => data().files.find((x) => x.id === id)),
    alerts: () => withFallback('/api/security/alerts', () => data().alerts),
    alert: (id) => withFallback(`/api/security/alerts/${id}`, () => data().alerts.find((x) => x.id === id)),
    ledger: () => withFallback('/api/blockchain/records', () => data().ledger),
    tx: (id) => withFallback(`/api/blockchain/records/${id}`, () => data().ledger.find((x) => x.id === id)),
    activity: () => withFallback('/api/activity', () => data().activity),
    reports: () => withFallback('/api/reports', () => data().reports),
    analytics: () => withFallback('/api/analytics', () => data().analytics),
    upload: (payload) => withFallback('/api/files/upload', () => payload, { method: 'POST', body: JSON.stringify(payload) }),
    verify: (payload) => withFallback('/api/blockchain/verify', () => ({ ok: true, tx: `TX-${Math.floor(9000 + Math.random() * 999)}`, ...payload }), { method: 'POST', body: JSON.stringify(payload) }),
    contain: (payload) => withFallback('/api/security/contain', () => ({ ok: true, action: 'Temporary block and session freeze queued', ...payload }), { method: 'POST', body: JSON.stringify(payload) }),
    report: (payload) => withFallback('/api/reports/generate', () => ({ ok: true, reportId: `RP-${Math.floor(500 + Math.random() * 99)}`, ...payload }), { method: 'POST', body: JSON.stringify(payload) })
  };
})();
