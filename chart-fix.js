(() => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function points(values, width = 320, height = 150, pad = 24) {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    return values.map((value, index) => {
      const x = pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1);
      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return { x, y, value };
    });
  }

  window.lineChart = lineChart = function polishedLineChart(values) {
    const pts = points(values);
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L 296 132 L 24 132 Z`;
    const latest = values[values.length - 1];
    const delta = latest - values[0];

    return `
      <div class="chart-pro" aria-label="Security events trend">
        <div class="chart-summary"><span>7-day event trend</span><b>${delta >= 0 ? '+' : ''}${delta}</b></div>
        <svg viewBox="0 0 320 170" preserveAspectRatio="xMidYMid meet" role="img">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#a855f7" stop-opacity="0.42" />
              <stop offset="1" stop-color="#a855f7" stop-opacity="0.02" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#c084fc" />
              <stop offset="0.55" stop-color="#a855f7" />
              <stop offset="1" stop-color="#f472b6" />
            </linearGradient>
          </defs>
          <g opacity="0.32" stroke="#263044" stroke-width="1">
            <line x1="24" y1="42" x2="296" y2="42" />
            <line x1="24" y1="82" x2="296" y2="82" />
            <line x1="24" y1="122" x2="296" y2="122" />
          </g>
          <path d="${area}" fill="url(#areaGradient)" />
          <path d="${line}" fill="none" stroke="url(#lineGradient)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          ${pts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#0b0e19" stroke="#d8b4fe" stroke-width="2.5"><title>${p.value} events</title></circle>`).join('')}
        </svg>
        <div class="chart-caption-row">${days.map((day) => `<span>${day}</span>`).join('')}</div>
      </div>`;
  };

  window.barChart = barChart = function polishedBarChart(values) {
    const max = Math.max(...values, 1);
    const barW = 22;
    const gap = 19;
    const base = 136;
    const bars = values.map((v, i) => {
      const h = Math.max(12, (v / max) * 104);
      const x = 30 + i * (barW + gap);
      const y = base - h;
      return `<g><rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="7" fill="url(#barGradient)"><title>${v}</title></rect><text x="${x + barW / 2}" y="154" text-anchor="middle" fill="#8d95a8" font-size="9">${i + 1}</text></g>`;
    }).join('');

    return `
      <div class="chart-bars-pro">
        <svg viewBox="0 0 320 170" preserveAspectRatio="xMidYMid meet" role="img">
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#c084fc" />
              <stop offset="1" stop-color="#7c3aed" />
            </linearGradient>
          </defs>
          <g opacity="0.28" stroke="#263044" stroke-width="1">
            <line x1="22" y1="34" x2="298" y2="34" />
            <line x1="22" y1="86" x2="298" y2="86" />
            <line x1="22" y1="136" x2="298" y2="136" />
          </g>
          ${bars}
        </svg>
      </div>`;
  };

  window.donutLike = donutLike = function polishedSeverity(values) {
    const entries = Object.entries(values);
    const max = Math.max(...entries.map(([, value]) => Number(value)), 1);
    return `<div class="severity-pro">${entries.map(([name, value]) => {
      const width = Math.max(8, (Number(value) / max) * 100);
      return `<div class="severity-pro-row"><span class="severity-pro-label">${name}</span><span class="severity-pro-track"><i class="severity-pro-fill" style="width:${width}%"></i></span><b class="severity-pro-count">${value}</b></div>`;
    }).join('')}</div>`;
  };

  setTimeout(() => {
    try {
      if (typeof renderPage === 'function') renderPage();
    } catch (_) {}
  }, 0);
})();
