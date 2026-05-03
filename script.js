/* ─── AQ11 Dashboard · script.js ─────────────────── */
"use strict";

let DATA = null;

/* ═══════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initTheme();
  initPalette();
  initSideNav();
  initFooter();
});

async function loadData() {
  try {
    const res = await fetch('data.json');
    DATA = await res.json();
    renderAll();
  } catch (e) {
    console.error('Could not load data.json:', e);
    DATA = getFallbackData();
    renderAll();
  }
}

function renderAll() {
  renderTable();
  renderExperiments(0);
  renderRules();
  renderComparisonTable();
  renderScatter();
  renderConfusion();
  renderRuleSpace();
  renderExpChart();
  animateCounters();
  animateRings();
}

/* ═══════════════════════════════════════════════════
   THEME TOGGLE
═══════════════════════════════════════════════════ */
function initTheme() {
  const btn = document.getElementById('themeToggle');
  const saved = localStorage.getItem('aq11-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('aq11-theme', next);
    redrawCanvases();
  });
}

/* ═══════════════════════════════════════════════════
   PALETTE
═══════════════════════════════════════════════════ */
function initPalette() {
  const btn   = document.getElementById('paletteBtn');
  const panel = document.getElementById('palettePanel');
  const saved = localStorage.getItem('aq11-color') || 'blue';
  setColor(saved);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('open');
  });
  document.addEventListener('click', () => panel.classList.remove('open'));
  panel.addEventListener('click', (e) => e.stopPropagation());

  document.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      const c = sw.dataset.color;
      setColor(c);
      localStorage.setItem('aq11-color', c);
      panel.classList.remove('open');
      setTimeout(redrawCanvases, 100);
    });
  });
}

function setColor(c) {
  document.documentElement.setAttribute('data-color', c);
  document.querySelectorAll('.swatch').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.color === c);
  });
}

/* ═══════════════════════════════════════════════════
   SIDE NAV – scroll spy
═══════════════════════════════════════════════════ */
function initSideNav() {
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-item');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    navItems.forEach(ni => {
      ni.classList.toggle('active', ni.getAttribute('href') === '#' + current);
    });
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════ */
function initFooter() {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
}

/* ═══════════════════════════════════════════════════
   DATASET TABLE
═══════════════════════════════════════════════════ */
function renderTable() {
  const rows = DATA.dataset_sample;
  const tbody = document.getElementById('tableBody');
  const countEl = document.getElementById('ds-rows');
  if (countEl) countEl.textContent = rows.length;

  function build(data) {
    tbody.innerHTML = '';
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading-row">Žiadne výsledky</td></tr>';
      return;
    }
    data.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.x.toFixed(2)}</td>
        <td>${r.y.toFixed(2)}</td>
        <td>${r.hair}</td>
        <td>${r.eyes}</td>
        <td><span class="class-badge class-${r.class}">Trieda ${r.class}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  build(rows);

  // Search
  const search = document.getElementById('tableSearch');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      const filtered = rows.filter(r =>
        r.hair.toLowerCase().includes(q) ||
        r.eyes.toLowerCase().includes(q) ||
        String(r.class).includes(q) ||
        String(r.x).includes(q) ||
        String(r.y).includes(q)
      );
      build(filtered);
    });
  }
}

/* ═══════════════════════════════════════════════════
   EXPERIMENTS
═══════════════════════════════════════════════════ */
function renderExperiments(idx) {
  const exp = DATA.experiments[idx];
  const container = document.getElementById('expContent');

  container.innerHTML = `
    <div class="exp-card">
      <h3>📋 ${exp.label}</h3>
      <div class="exp-stat"><span class="exp-stat-k">Veľkosť datasetu</span><span class="exp-stat-v">${exp.size} vzoriek</span></div>
      <div class="exp-stat"><span class="exp-stat-k">Trénovacie dáta</span><span class="exp-stat-v">${exp.train} vzoriek</span></div>
      <div class="exp-stat"><span class="exp-stat-k">Testovacie dáta</span><span class="exp-stat-v">${exp.test} vzoriek</span></div>
      <div class="exp-stat"><span class="exp-stat-k">Vygenerované pravidlá</span><span class="exp-stat-v">${exp.rules_generated}</span></div>
      <div class="exp-stat"><span class="exp-stat-k">Čas trénovania</span><span class="exp-stat-v">${exp.training_time_ms} ms</span></div>
      <p class="exp-desc">${exp.description}</p>
    </div>
    <div class="exp-bar">
      <h3>📊 Metriky výkonu</h3>
      ${metricBar('Accuracy',  exp.accuracy)}
      ${metricBar('Precision', exp.precision)}
      ${metricBar('Recall',    exp.recall)}
      ${metricBar('F1 Score',  exp.f1)}
    </div>
  `;

  // animate bars
  requestAnimationFrame(() => {
    container.querySelectorAll('.exp-bar-fill').forEach(b => {
      const target = b.dataset.target;
      b.style.width = (parseFloat(target) * 100).toFixed(1) + '%';
    });
  });
}

function metricBar(label, val) {
  const pct = (val * 100).toFixed(1);
  return `
    <div class="exp-metric">
      <span class="exp-metric-k">${label}</span>
      <div class="exp-bar-wrap">
        <div class="exp-bar-fill" data-target="${val}" style="width:0%"></div>
      </div>
      <span class="exp-metric-v">${pct}%</span>
    </div>
  `;
}

document.addEventListener('click', (e) => {
  const tab = e.target.closest('.exp-tab');
  if (!tab) return;
  document.querySelectorAll('.exp-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  renderExperiments(parseInt(tab.dataset.exp));
});

/* ═══════════════════════════════════════════════════
   RULES
═══════════════════════════════════════════════════ */
function renderRules() {
  const container = document.getElementById('rulesContainer');
  container.innerHTML = DATA.rules.map((r, i) => `
    <div class="rule-card">
      <span class="rule-num">#${String(i+1).padStart(2,'0')}</span>
      <div class="rule-body">
        <div class="rule-text">
          <span class="rule-kw">IF</span>
          <span class="rule-cond"> ${r.condition} </span>
          <span class="rule-kw">THEN</span>
          <span class="rule-then"> ${r.conclusion}</span>
        </div>
        <div class="rule-meta">
          <span class="rule-badge">Support: ${(r.support*100).toFixed(1)}%</span>
          <span class="rule-badge">Confidence: ${(r.confidence*100).toFixed(1)}%</span>
          <span class="rule-badge">Coverage: ${r.coverage} vzoriek</span>
        </div>
      </div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════
   COMPARISON TABLE
═══════════════════════════════════════════════════ */
function renderComparisonTable() {
  const tbody = document.getElementById('compTableBody');
  const rows = [
    ['Presnosť (Accuracy)',
      fmt(DATA.comparison[0].accuracy), fmt(DATA.comparison[1].accuracy), fmt(DATA.comparison[2].accuracy)],
    ['Interpretovateľnosť',
      badge(DATA.comparison[0].interpretability), badge(DATA.comparison[1].interpretability), badge(DATA.comparison[2].interpretability)],
    ['Rýchlosť trénovania',
      badge(DATA.comparison[0].training_speed), badge(DATA.comparison[1].training_speed), badge(DATA.comparison[2].training_speed)],
    ['Škálovateľnosť',
      badge(DATA.comparison[0].scalability), badge(DATA.comparison[1].scalability), badge(DATA.comparison[2].scalability)],
    ['Pravidlá (IF-THEN)',
      boolBadge(DATA.comparison[0].rule_based), boolBadge(DATA.comparison[1].rule_based), boolBadge(DATA.comparison[2].rule_based)],
    ['Robustnosť na šum',
      badge(DATA.comparison[0].noise_robustness), badge(DATA.comparison[1].noise_robustness), badge(DATA.comparison[2].noise_robustness)],
  ];
  tbody.innerHTML = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
}

function fmt(v) { return `<span class="badge-high">${(v*100).toFixed(1)}%</span>`; }
function boolBadge(v) { return v ? '<span class="badge-yes">✓ Áno</span>' : '<span class="badge-no">✗ Nie</span>'; }
function badge(v) {
  if (v === 'Vysoká' || v === 'Rýchly') return `<span class="badge-high">${v}</span>`;
  if (v === 'Stredná' || v === 'Pomalý') return `<span class="badge-med">${v}</span>`;
  return `<span class="badge-low">${v}</span>`;
}

/* ═══════════════════════════════════════════════════
   SCATTER PLOT
═══════════════════════════════════════════════════ */
function renderScatter() {
  const canvas = document.getElementById('scatterCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const pts = DATA.scatter_points;
  const accent = getAccentColor();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#8899bb' : '#445577';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const W = canvas.width, H = canvas.height;
  const PAD = { left: 40, right: 20, top: 20, bottom: 40 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const x = PAD.left + (i/10) * plotW;
    const y = PAD.top + (i/10) * plotH;
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + plotW, y); ctx.stroke();
  }

  // Decision boundary approx x=4.5, y=4.5
  const bx = PAD.left + (4.5/10) * plotW;
  const by = PAD.top  + (1 - 4.5/10) * plotH;
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(bx, PAD.top); ctx.lineTo(bx, PAD.top + plotH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PAD.left, by); ctx.lineTo(PAD.left + plotW, by); ctx.stroke();
  ctx.setLineDash([]);

  // Points
  pts.forEach(p => {
    const px = PAD.left + (p.x / 10) * plotW;
    const py = PAD.top  + (1 - p.y / 10) * plotH;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    if (p.class === 1) {
      ctx.fillStyle = accent + 'cc';
      ctx.strokeStyle = accent;
    } else {
      ctx.fillStyle = 'rgba(239,68,68,0.7)';
      ctx.strokeStyle = '#ef4444';
    }
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
  });

  // Axes labels
  ctx.fillStyle = textColor;
  ctx.font = '11px Space Mono, monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 10; i += 2) {
    const x = PAD.left + (i/10) * plotW;
    ctx.fillText(i, x, H - 8);
  }
  ctx.textAlign = 'right';
  for (let i = 0; i <= 10; i += 2) {
    const y = PAD.top + (1 - i/10) * plotH;
    ctx.fillText(i, PAD.left - 6, y + 4);
  }
  ctx.fillStyle = textColor;
  ctx.font = 'bold 11px Space Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('x', W/2, H - 2);
  ctx.save();
  ctx.translate(10, H/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillText('y', 0, 0);
  ctx.restore();
}

/* ═══════════════════════════════════════════════════
   CONFUSION MATRIX
═══════════════════════════════════════════════════ */
function renderConfusion() {
  const canvas = document.getElementById('confusionCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cm = DATA.confusion_matrix.size_1000;
  const accent = getAccentColor();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#e8edf8' : '#0f172a';
  const dimColor  = isDark ? '#8899bb' : '#445577';

  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const labels = ['Trieda 0', 'Trieda 1'];
  const PAD = 80;
  const cellW = (W - PAD * 2) / 2;
  const cellH = (H - PAD * 2) / 2;
  const maxVal = Math.max(cm[0][0], cm[0][1], cm[1][0], cm[1][1]);

  const colors = [
    [cm[0][0], cm[0][1]],
    [cm[1][0], cm[1][1]]
  ];

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const val = colors[r][c];
      const x = PAD + c * cellW;
      const y = PAD + r * cellH;
      const intensity = val / maxVal;
      const isCorrect = r === c;

      ctx.fillStyle = isCorrect
        ? `rgba(${hexToRgb(accent)},${intensity * 0.7 + 0.1})`
        : `rgba(239,68,68,${intensity * 0.5 + 0.05})`;
      ctx.beginPath();
      roundRect(ctx, x + 3, y + 3, cellW - 6, cellH - 6, 12);
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.font = `bold ${Math.min(cellW, cellH) * 0.28}px Space Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val, x + cellW/2, y + cellH/2 - 10);

      ctx.font = `11px Space Mono, monospace`;
      ctx.fillStyle = dimColor;
      const lbl = r === c ? (r === 0 ? 'TN' : 'TP') : (r === 0 ? 'FP' : 'FN');
      ctx.fillText(lbl, x + cellW/2, y + cellH/2 + 16);
    }
  }

  // Axis labels
  ctx.fillStyle = dimColor;
  ctx.font = '12px Syne, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  labels.forEach((lb, i) => {
    ctx.fillText(lb, PAD + i * cellW + cellW/2, PAD - 20);
    ctx.fillText(lb, PAD - 36, PAD + i * cellH + cellH/2);
  });

  ctx.fillStyle = accent;
  ctx.font = 'bold 11px Space Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PREDIKOVANÉ', W/2, 16);
  ctx.save();
  ctx.translate(12, H/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillText('SKUTOČNÉ', 0, 0);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

/* ═══════════════════════════════════════════════════
   RULE SPACE VISUALIZATION
═══════════════════════════════════════════════════ */
function renderRuleSpace() {
  const canvas = document.getElementById('ruleSpaceCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const accent = getAccentColor();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#e8edf8' : '#0f172a';
  const dimColor  = isDark ? '#8899bb' : '#445577';

  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const PAD = { left: 50, right: 20, top: 20, bottom: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  function toCanvasX(x) { return PAD.left + (x / 10) * plotW; }
  function toCanvasY(y) { return PAD.top + (1 - y / 10) * plotH; }

  // Background: class regions
  // Class 0 region (x <= 4.5 OR y <= 4.5)
  const grd0 = ctx.createLinearGradient(0, 0, 0, H);
  grd0.addColorStop(0, 'rgba(239,68,68,0.06)');
  grd0.addColorStop(1, 'rgba(239,68,68,0.02)');
  ctx.fillStyle = grd0;
  ctx.fillRect(PAD.left, PAD.top, plotW, plotH);

  // Class 1 quadrant
  const x1 = toCanvasX(4.5), y1 = toCanvasY(4.5);
  const grd1 = ctx.createLinearGradient(x1, y1, W, PAD.top);
  grd1.addColorStop(0, `rgba(${hexToRgb(accent)},0.12)`);
  grd1.addColorStop(1, `rgba(${hexToRgb(accent)},0.05)`);
  ctx.fillStyle = grd1;
  ctx.fillRect(x1, PAD.top, plotW - (x1 - PAD.left), y1 - PAD.top);

  // Rule boxes
  const rules = [
    { x0:5.2, x1:10, y0:0, y1:10, label:'R1', cls:1 },
    { x0:0,   x1:10, y0:0, y1:3.1, label:'R2', cls:0 },
    { x0:6.0, x1:10, y0:4.5, y1:10, label:'R3', cls:1 },
    { x0:3.5, x1:5.2, y0:5.0, y1:10, label:'R5', cls:1 },
    { x0:0,   x1:4.0, y0:0, y1:10, label:'R4', cls:0 },
    { x0:0,   x1:3.0, y0:0, y1:2.0, label:'R7', cls:0 },
  ];

  rules.forEach((rule, i) => {
    const rx  = toCanvasX(rule.x0);
    const ry  = toCanvasY(rule.y1);
    const rw  = toCanvasX(rule.x1) - toCanvasX(rule.x0);
    const rh  = toCanvasY(rule.y0) - toCanvasY(rule.y1);
    const hue = rule.cls === 1 ? `rgba(${hexToRgb(accent)},0.15)` : 'rgba(239,68,68,0.12)';
    const stroke = rule.cls === 1 ? accent : '#ef4444';

    ctx.fillStyle = hue;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    roundRect(ctx, rx, ry, rw, rh, 4);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = stroke;
    ctx.font = 'bold 11px Space Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rule.label, rx + rw/2, ry + 12);
  });

  // Decision boundary
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  const bx = toCanvasX(4.5), by = toCanvasY(4.5);
  ctx.beginPath(); ctx.moveTo(bx, PAD.top); ctx.lineTo(bx, PAD.top + plotH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(PAD.left, by); ctx.lineTo(PAD.left + plotW, by); ctx.stroke();
  ctx.setLineDash([]);

  // Grid
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const x = toCanvasX(i), y = toCanvasY(i);
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, PAD.top + plotH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + plotW, y); ctx.stroke();
  }

  // Axes
  ctx.fillStyle = dimColor;
  ctx.font = '11px Space Mono, monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i <= 10; i += 2) {
    ctx.fillText(i, toCanvasX(i), H - 14);
  }
  ctx.textAlign = 'right';
  for (let i = 0; i <= 10; i += 2) {
    ctx.fillText(i, PAD.left - 8, toCanvasY(i) + 4);
  }

  ctx.fillStyle = accent;
  ctx.font = 'bold 11px Space Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('x  →', W/2, H - 2);
  ctx.save();
  ctx.translate(10, H/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillText('y  →', 0, 0);
  ctx.restore();
}

/* ═══════════════════════════════════════════════════
   EXPERIMENTS BAR CHART
═══════════════════════════════════════════════════ */
function renderExpChart() {
  const canvas = document.getElementById('expChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const accent = getAccentColor();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#8899bb' : '#445577';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const exps = DATA.experiments;
  const metrics = ['accuracy','precision','recall','f1'];
  const metricLabels = ['Accuracy','Precision','Recall','F1'];
  const groupW = (W - 80) / exps.length;
  const barW   = groupW / (metrics.length + 1);
  const PAD    = { left: 60, bottom: 50, top: 20 };
  const plotH  = H - PAD.bottom - PAD.top;

  // Y grid
  [0.6, 0.7, 0.8, 0.9, 1.0].forEach(v => {
    const y = PAD.top + plotH * (1 - (v - 0.6) / 0.4);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W, y); ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = '10px Space Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText((v*100).toFixed(0) + '%', PAD.left - 8, y + 4);
  });

  // Bars
  const accentRgb = hexToRgb(accent);
  exps.forEach((exp, gi) => {
    const groupX = PAD.left + gi * groupW + barW * 0.5;
    metrics.forEach((m, mi) => {
      const val = exp[m];
      const norm = (val - 0.6) / 0.4;
      const barH = norm * plotH;
      const x = groupX + mi * barW;
      const y = PAD.top + plotH - barH;

      const alpha = 0.4 + (mi / metrics.length) * 0.5;
      ctx.fillStyle = `rgba(${accentRgb},${alpha})`;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, barW - 2, barH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isDark ? '#e8edf8' : '#0f172a';
      ctx.font = 'bold 9px Space Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText((val*100).toFixed(1), x + (barW-2)/2, y - 4);
    });

    // Group label
    ctx.fillStyle = textColor;
    ctx.font = '11px Syne, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(exp.label, PAD.left + gi * groupW + groupW/2, H - 8);
  });

  // Legend
  const legX = PAD.left;
  metricLabels.forEach((lb, i) => {
    const alpha = 0.4 + (i / metrics.length) * 0.5;
    ctx.fillStyle = `rgba(${accentRgb},${alpha})`;
    ctx.fillRect(legX + i * 100, PAD.top - 10, 12, 12);
    ctx.fillStyle = textColor;
    ctx.font = '10px Space Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(lb, legX + i * 100 + 16, PAD.top);
  });
}

/* ═══════════════════════════════════════════════════
   COUNTER ANIMATIONS
═══════════════════════════════════════════════════ */
function animateCounters() {
  const els = document.querySelectorAll('.hs-val, .rv');
  els.forEach(el => {
    const target = parseFloat(el.dataset.target);
    const isFloat = target % 1 !== 0;
    let start = 0;
    const duration = 1800;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const cur = start + (target - start) * eased;
      el.textContent = isFloat ? cur.toFixed(1) : Math.round(cur);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/* ═══════════════════════════════════════════════════
   RING ANIMATIONS
═══════════════════════════════════════════════════ */
function animateRings() {
  // CSS animation via stroke-dashoffset – triggered by having --pct set
  // No extra JS needed – CSS transitions handle it on load
}

/* ═══════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════ */
function getAccentColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
}

function hexToRgb(hex) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
  const r = parseInt(hex.slice(0,2), 16);
  const g = parseInt(hex.slice(2,4), 16);
  const b = parseInt(hex.slice(4,6), 16);
  return `${r},${g},${b}`;
}

function redrawCanvases() {
  renderScatter();
  renderConfusion();
  renderRuleSpace();
  renderExpChart();
}

/* ═══════════════════════════════════════════════════
   FALLBACK DATA (if data.json not found)
═══════════════════════════════════════════════════ */
function getFallbackData() {
  return {
    experiments: [
      { id:1, label:"Malý dataset", size:100, train:70, test:30, accuracy:.867, precision:.854, recall:.881, f1:.867, rules_generated:6, training_time_ms:12, description:"Malý dataset s 100 vzorkami." },
      { id:2, label:"Stredný dataset", size:500, train:350, test:150, accuracy:.913, precision:.907, recall:.921, f1:.914, rules_generated:11, training_time_ms:48, description:"Stredný dataset s 500 vzorkami." },
      { id:3, label:"Veľký dataset", size:1000, train:700, test:300, accuracy:.943, precision:.939, recall:.948, f1:.943, rules_generated:17, training_time_ms:187, description:"Veľký dataset s 1000 vzorkami." }
    ],
    confusion_matrix: { size_1000: [[278,18],[14,290]] },
    rules: [
      { id:1, condition:"x > 5.2 AND hair = tmavé", conclusion:"trieda = 1", support:.312, confidence:.941, coverage:156 },
      { id:2, condition:"y < 3.1 AND eyes = modré", conclusion:"trieda = 0", support:.287, confidence:.923, coverage:143 }
    ],
    comparison: [
      { algorithm:"AQ11", accuracy:.943, interpretability:"Vysoká", training_speed:"Rýchly", scalability:"Stredná", rule_based:true, noise_robustness:"Stredná" },
      { algorithm:"Decision Tree", accuracy:.931, interpretability:"Vysoká", training_speed:"Rýchly", scalability:"Vysoká", rule_based:true, noise_robustness:"Stredná" },
      { algorithm:"Neurónová sieť", accuracy:.971, interpretability:"Nízka", training_speed:"Pomalý", scalability:"Vysoká", rule_based:false, noise_robustness:"Vysoká" }
    ],
    scatter_points: [
      {x:1.2,y:1.5,hair:"svetlé",eyes:"modré",class:0},{x:5.5,y:5.0,hair:"tmavé",eyes:"zelené",class:1},
      {x:2.3,y:2.5,hair:"ryšavé",eyes:"hnedé",class:0},{x:6.0,y:5.5,hair:"tmavé",eyes:"modré",class:1},
      {x:3.5,y:3.5,hair:"tmavé",eyes:"modré",class:0},{x:7.0,y:6.5,hair:"tmavé",eyes:"zelené",class:1}
    ],
    dataset_sample: [
      {id:1,x:1.23,y:2.45,hair:"svetlé",eyes:"modré",class:0},
      {id:2,x:5.67,y:6.12,hair:"tmavé",eyes:"hnedé",class:1}
    ]
  };
}
