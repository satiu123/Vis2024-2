const state = {
  dashboard: null,
  records: [],
  filters: {
    province: 'all',
    experience: 'all',
    education: 'all',
    salaryType: 'all',
    workMode: 'all',
    salaryRange: [0, 0],
  },
  salaryDomain: [0, 0],
};

const charts = {};
let histogramSvg = null;
let histogramX = null;
let histogramBrush = null;

const fmtMoney = (value) => {
  if (!Number.isFinite(value)) return '-';
  return `¥${(value / 1000).toFixed(1)}k`;
};

const fmtPercent = (value) => `${(value * 100).toFixed(1)}%`;

async function init() {
  try {
    const [dashboard, records] = await Promise.all([
      fetchWithFallback(['./assets/data/dashboard-data.json', '../assets/data/dashboard-data.json']),
      fetchWithFallback(['./assets/data/records-lite.json', '../assets/data/records-lite.json']),
    ]);

    state.dashboard = dashboard;
    state.records = records.map((d) => ({
      p: d.p,
      e: d.e,
      ed: d.ed,
      s: Number(d.s),
      wm: d.wm,
      st: d.st,
      ct: d.ct,
    }));

    const salaries = state.records.map((d) => d.s);
    const [sMin, sMax] = d3.extent(salaries);
    state.salaryDomain = [sMin ?? 0, sMax ?? 0];
    state.filters.salaryRange = [...state.salaryDomain];

    buildControls();
    setupCharts();
    attachEvents();
    updateVisuals();
  } catch (err) {
    console.error('初始化失败', err);
    showError('数据文件加载失败，请确认已在项目根目录启动 http server，并存在 assets/data/*.json');
  }
}

document.addEventListener('DOMContentLoaded', init);

function buildControls() {
  populateSelect('province-select', uniqueValues(state.records, 'p'));
  populateSelect('experience-select', uniqueValues(state.records, 'e'));
  populateSelect('education-select', uniqueValues(state.records, 'ed'));
  populateSelect('salary-type-select', uniqueValues(state.records, 'st'));
}

function populateSelect(id, values) {
  const select = document.getElementById(id);
  values.forEach((v) => {
    const option = document.createElement('option');
    option.value = v;
    option.textContent = v;
    select.appendChild(option);
  });
}

function uniqueValues(data, key) {
  return Array.from(new Set(data.map((d) => d[key]))).sort();
}

async function fetchWithFallback(paths) {
  for (const path of paths) {
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      console.warn(`加载 ${path} 失败`, err);
    }
  }
  throw new Error(`所有路径均加载失败: ${paths.join(', ')}`);
}

function attachEvents() {
  document.getElementById('province-select').addEventListener('change', (e) => {
    state.filters.province = e.target.value;
    updateVisuals();
  });

  document.getElementById('experience-select').addEventListener('change', (e) => {
    state.filters.experience = e.target.value;
    updateVisuals();
  });

  document.getElementById('education-select').addEventListener('change', (e) => {
    state.filters.education = e.target.value;
    updateVisuals();
  });

  document.getElementById('salary-type-select').addEventListener('change', (e) => {
    state.filters.salaryType = e.target.value;
    updateVisuals();
  });

  document.getElementById('workmode-toggle').addEventListener('click', (e) => {
    if (e.target.dataset.mode) {
      const mode = e.target.dataset.mode;
      state.filters.workMode = mode;
      const buttons = e.currentTarget.querySelectorAll('button');
      buttons.forEach((btn) => btn.classList.toggle('active', btn.dataset.mode === mode));
      updateVisuals();
    }
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    state.filters = {
      province: 'all',
      experience: 'all',
      education: 'all',
      salaryType: 'all',
      workMode: 'all',
      salaryRange: [...state.salaryDomain],
    };
    document.getElementById('province-select').value = 'all';
    document.getElementById('experience-select').value = 'all';
    document.getElementById('education-select').value = 'all';
    document.getElementById('salary-type-select').value = 'all';
    const buttons = document.querySelectorAll('#workmode-toggle button');
    buttons.forEach((btn) => btn.classList.toggle('active', btn.dataset.mode === 'all'));
    updateVisuals();
  });

  document.getElementById('export-btn').addEventListener('click', () => {
    window.print();
  });
}

function setupCharts() {
  charts.province = echarts.init(document.getElementById('province-chart'));
  charts.heatmap = echarts.init(document.getElementById('heatmap'));
  charts.salaryType = echarts.init(document.getElementById('salary-type-chart'));
  charts.company = echarts.init(document.getElementById('company-chart'));
}

function applyFilters(records, { ignoreSalaryRange = false } = {}) {
  return records.filter((d) => {
    if (state.filters.province !== 'all' && d.p !== state.filters.province) return false;
    if (state.filters.experience !== 'all' && d.e !== state.filters.experience) return false;
    if (state.filters.education !== 'all' && d.ed !== state.filters.education) return false;
    if (state.filters.salaryType !== 'all' && d.st !== state.filters.salaryType) return false;
    if (state.filters.workMode !== 'all' && d.wm !== state.filters.workMode) return false;
    if (!ignoreSalaryRange) {
      const [lo, hi] = state.filters.salaryRange;
      if (d.s < lo || d.s > hi) return false;
    }
    return true;
  });
}

function updateVisuals() {
  const filtered = applyFilters(state.records);
  const filteredNoSalary = applyFilters(state.records, { ignoreSalaryRange: true });

  renderStats(filtered);
  renderHistogram(filteredNoSalary);
  updateProvinceChart(filtered);
  updateHeatmap(filtered);
  updateSalaryTypeChart(filtered);
  updateCompanyChart(filtered);
  updateInsights(filtered);
}

function renderStats(filtered) {
  const total = state.dashboard.summary.jobs;
  const stats = [
    { label: '当前筛选岗位', value: filtered.length.toLocaleString() },
    { label: '均值年薪', value: fmtMoney(d3.mean(filtered, (d) => d.s) || 0) },
    { label: '薪酬范围', value: `${fmtMoney(state.filters.salaryRange[0])} - ${fmtMoney(state.filters.salaryRange[1])}` },
    { label: '灵活用工占比', value: fmtPercent(d3.mean(filtered, (d) => (d.wm === 'flex' ? 1 : 0)) || 0) },
    { label: '覆盖省份', value: uniqueValues(filtered, 'p').length || uniqueValues(state.records, 'p').length },
    { label: '数据总量', value: total.toLocaleString() },
  ];

  const container = document.getElementById('stats');
  container.innerHTML = '';
  stats.forEach((s) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `<p>${s.label}</p><h2>${s.value}</h2>`;
    container.appendChild(card);
  });
}

function renderHistogram(data) {
  const container = document.getElementById('salary-histogram');
  container.innerHTML = '';
  const width = container.clientWidth || 960;
  const height = 260;
  const margin = { top: 10, right: 16, bottom: 30, left: 48 };

  const salaries = data.map((d) => d.s);
  const [domainMin, domainMax] = state.salaryDomain;
  histogramX = d3.scaleLinear().domain([domainMin, domainMax]).range([margin.left, width - margin.right]);

  const thresholds = histogramX.ticks(30);
  const bins = d3.bin().domain(histogramX.domain()).thresholds(thresholds)(salaries);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length) || 1])
    .nice()
    .range([height - margin.bottom, margin.top]);

  histogramSvg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const g = histogramSvg.append('g');

  g.selectAll('rect')
    .data(bins)
    .enter()
    .append('rect')
    .attr('x', (d) => histogramX(d.x0) + 1)
    .attr('y', (d) => y(d.length))
    .attr('width', (d) => Math.max(0, histogramX(d.x1) - histogramX(d.x0) - 2))
    .attr('height', (d) => y(0) - y(d.length))
    .attr('fill', 'url(#histGradient)')
    .attr('opacity', 0.9);

  const defs = histogramSvg.append('defs');
  const grad = defs.append('linearGradient').attr('id', 'histGradient').attr('x1', '0%').attr('x2', '0%').attr('y1', '0%').attr('y2', '100%');
  grad.append('stop').attr('offset', '0%').attr('stop-color', '#7ed4ff');
  grad.append('stop').attr('offset', '100%').attr('stop-color', '#1f2435');

  const xAxis = d3.axisBottom(histogramX).ticks(8).tickFormat((d) => `¥${(d / 1000).toFixed(0)}k`);
  const yAxis = d3.axisLeft(y).ticks(4);

  histogramSvg
    .append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(xAxis)
    .selectAll('text')
    .attr('fill', '#8c94ad');

  histogramSvg
    .append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(yAxis)
    .selectAll('text')
    .attr('fill', '#8c94ad');

  histogramSvg.selectAll('path').attr('stroke', '#4d5266');

  histogramBrush = d3
    .brushX()
    .extent([
      [margin.left, margin.top],
      [width - margin.right, height - margin.bottom],
    ])
    .on('end', onBrushEnd);

  histogramSvg.append('g').attr('class', 'brush').call(histogramBrush);

  updateRangeLabel(state.filters.salaryRange);
}

function onBrushEnd(event) {
  if (!event.selection) {
    state.filters.salaryRange = [...state.salaryDomain];
  } else {
    const [x0, x1] = event.selection.map(histogramX.invert);
    state.filters.salaryRange = [Math.max(x0, state.salaryDomain[0]), Math.min(x1, state.salaryDomain[1])];
  }
  updateRangeLabel(state.filters.salaryRange);
  updateVisuals();
}

function updateRangeLabel([lo, hi]) {
  const label = document.getElementById('salary-range-label');
  label.textContent = `已选区间：${fmtMoney(lo)} - ${fmtMoney(hi)}`;
}

function showError(message) {
  const container = document.getElementById('stats');
  container.innerHTML = `<div class="stat-card"><p>错误</p><h2>${message}</h2></div>`;
}

function updateProvinceChart(data) {
  const grouped = Array.from(
    d3.rollup(
      data,
      (v) => ({ count: v.length, avg: d3.mean(v, (d) => d.s) }),
      (d) => d.p,
    ),
    ([name, stats]) => ({ name, ...stats }),
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  charts.province.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 50, bottom: 60, top: 30 },
    xAxis: { type: 'category', data: grouped.map((d) => d.name), axisLabel: { color: '#8c94ad' } },
    yAxis: [
      { type: 'value', name: '岗位数', axisLabel: { color: '#8c94ad' } },
      { type: 'value', name: '均薪', axisLabel: { formatter: (v) => `${(v / 1000).toFixed(0)}k`, color: '#8c94ad' } },
    ],
    series: [
      { name: '岗位数', type: 'bar', data: grouped.map((d) => d.count), itemStyle: { color: '#7ed4ff' } },
      { name: '均薪', type: 'line', yAxisIndex: 1, smooth: true, data: grouped.map((d) => d.avg), itemStyle: { color: '#ff9f7a' } },
    ],
  });
}

function updateHeatmap(data) {
  const xp = uniqueValues(data, 'e');
  const ed = uniqueValues(data, 'ed');
  const matrix = [];

  xp.forEach((xVal, xi) => {
    ed.forEach((eVal, ei) => {
      const subset = data.filter((d) => d.e === xVal && d.ed === eVal);
      if (subset.length) {
        matrix.push([ei, xi, Math.round(d3.mean(subset, (d) => d.s))]);
      }
    });
  });

  charts.heatmap.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      position: 'top',
      formatter: (p) => `${xp[p.value[1]]} × ${ed[p.value[0]]}<br/>均值：${fmtMoney(p.value[2])}`,
    },
    grid: { top: 20, left: 90, right: 20, bottom: 50 },
    xAxis: { type: 'category', data: ed, axisLabel: { color: '#8c94ad' }, splitArea: { show: true } },
    yAxis: { type: 'category', data: xp, axisLabel: { color: '#8c94ad' }, splitArea: { show: true } },
    visualMap: {
      min: state.salaryDomain[0],
      max: state.salaryDomain[1],
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 5,
      textStyle: { color: '#8c94ad' },
      inRange: { color: ['#1f2435', '#7ed4ff', '#ff9f7a'] },
    },
    series: [
      {
        name: '经验 × 学历',
        type: 'heatmap',
        data: matrix,
        label: { show: false },
      },
    ],
  });
}

function updateSalaryTypeChart(data) {
  const stats = Array.from(d3.rollup(data, (v) => v.length, (d) => d.st), ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  charts.salaryType.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [
      {
        type: 'pie',
        radius: ['35%', '65%'],
        itemStyle: { borderColor: '#0c0d11', borderWidth: 2 },
        data: stats,
      },
    ],
  });
}

function updateCompanyChart(data) {
  const stats = Array.from(
    d3.rollup(
      data,
      (v) => ({ count: v.length, avg: d3.mean(v, (d) => d.s) }),
      (d) => d.ct,
    ),
    ([name, val]) => ({ name, ...val }),
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  charts.company.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 120, right: 40, bottom: 20, top: 20 },
    xAxis: { type: 'value', axisLabel: { color: '#8c94ad' } },
    yAxis: { type: 'category', data: stats.map((d) => d.name), axisLabel: { color: '#8c94ad' } },
    series: [
      { name: '岗位数', type: 'bar', data: stats.map((d) => d.count), itemStyle: { color: '#7ed4ff' } },
      { name: '均薪', type: 'bar', data: stats.map((d) => d.avg), itemStyle: { color: '#ff9f7a' } },
    ],
  });
}

function updateInsights(data) {
  const container = document.getElementById('insight-log');
  const byProvince = Array.from(d3.rollup(data, (v) => d3.mean(v, (d) => d.s), (d) => d.p)).sort((a, b) => b[1] - a[1]);
  const byMode = Array.from(d3.rollup(data, (v) => v.length, (d) => d.wm)).sort((a, b) => b[1] - a[1]);
  const topProvince = byProvince[0];
  const dominantMode = byMode[0];
  const span = d3.mean(data, (d) => d.s);

  const messages = [
    topProvince ? `当前筛选最高均薪省份 ${topProvince[0]}：${fmtMoney(topProvince[1])}` : '暂无数据',
    dominantMode ? `岗位最多的用工方式：${dominantMode[0]}（${dominantMode[1]} 条）` : '暂无数据',
    span ? `筛选样本的平均年薪约为 ${fmtMoney(span)}，薪酬分布可通过上方直方图继续收缩范围。` : '无可用数据',
  ];

  container.innerHTML = '';
  messages.forEach((m) => {
    const item = document.createElement('div');
    item.innerHTML = `<span class="badge">Insight</span> ${m}`;
    container.appendChild(item);
  });

  renderEmergingRoles(data);
}

function renderEmergingRoles(data) {
  const container = document.getElementById('emerging-log');
  if (!container) return;

  if (!data.length) {
    container.innerHTML = '<div><span class="badge">Tip</span> 暂无数据</div>';
    return;
  }

  const salaries = data.map((d) => d.s).sort(d3.ascending);
  const p90 = d3.quantile(salaries, 0.9) || 0;

  const combos = Array.from(
    d3.rollup(
      data,
      (v) => ({
        count: v.length,
        avg: d3.mean(v, (d) => d.s),
        provinceMode: d3.rollup(v, (vv) => vv.length, (d) => d.p),
      }),
      (d) => `${d.e}|${d.ed}|${d.ct}|${d.wm}`,
    ),
    ([key, val]) => {
      const [e, ed, ct, wm] = key.split('|');
      const province = Array.from(val.provinceMode?.entries?.() || []).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
      return { e, ed, ct, wm, count: val.count, avg: val.avg, province };
    },
  )
    .filter((d) => d.count >= 5 && d.count <= 80 && d.avg >= p90)
    .sort((a, b) => b.avg - a.avg || a.count - b.count)
    .slice(0, 5);

  container.innerHTML = '';
  if (!combos.length) {
    container.innerHTML = '<div><span class="badge">Tip</span> 暂未识别到高薪稀缺组合，可放宽筛选试试。</div>';
    return;
  }

  combos.forEach((c) => {
    const text = `高薪稀缺组合：经验 ${c.e} × 学历 ${c.ed} × 行业 ${c.ct} （${c.wm}），均薪 ${fmtMoney(c.avg)}，样本 ${c.count} 条，集中省份 ${c.province}`;
    const item = document.createElement('div');
    item.innerHTML = `<span class="badge">Emerging</span> ${text}`;
    container.appendChild(item);
  });
}
