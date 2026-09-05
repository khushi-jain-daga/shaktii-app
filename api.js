window.SHAKTII_API = (() => {
  const params = new URLSearchParams(location.search);
  const savedBase = localStorage.getItem('SHAKTII_API_BASE') || '';
  const base = params.get('api') || savedBase || '';
  if (params.get('api') !== null) localStorage.setItem('SHAKTII_API_BASE', params.get('api') || '');

  async function jsonRequest(path, payload) {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!res.ok || data.success === false) {
      const err = new Error(data.error || `API request failed (${res.status})`);
      err.payload = data;
      throw err;
    }
    return data;
  }

  async function health() {
    try {
      const res = await fetch(`${base}/api/health`, { cache: 'no-store' });
      return { ok: res.ok, status: res.status, source: base ? 'configured backend' : 'same-origin vercel' };
    } catch (error) {
      return { ok: false, error: error.message, source: base || 'same-origin' };
    }
  }

  return {
    get base() { return base; },
    health,
    analyze: ({ fileName, redactedData, settings }) => jsonRequest('/api/pkap-analyze', { fileName, redactedData, settings }),
    generateReport: ({ analysisData }) => jsonRequest('/api/pkap-generate-report', { analysisData })
  };
})();
