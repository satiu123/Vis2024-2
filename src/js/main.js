import { loadAllData } from './utils/dataLoader.js';
import { renderTopBars } from './echarts_charts/overview.js';
import { renderSalaryBox } from './echarts_charts/salary.js';
import { renderEduExpBubble } from './echarts_charts/bubbles.js';
import { renderPlaceholder } from './d3_visualizations/placeholder.js';

const filters = {
  city: 'all',
  industry: 'all',
  edu: 'all',
  exp: 'all'
};

let cache = null;

const formatNumber = (n) => n ? n.toLocaleString('zh-CN') : '-';
const formatMoney = (n) => n ? Math.round(n).toLocaleString('zh-CN') : '-';

async function init() {
  toggleToast(true, '加载数据中...');
  cache = await loadAllData();
  toggleToast(false);
  if (!cache) return;

  initFilters(cache);
  updateStats(cache.summary);

  renderSalaryBox('chart-salary-box', cache.salary);
  renderTopBars('chart-top-cities', cache.rankings?.top_cities || [], {label: '城市', color: '#5c7cfa'});
  renderTopBars('chart-top-industries', cache.rankings?.top_industries || [], {label: '行业', color: '#74c0fc'});
  renderEduExpBubble('chart-edu-exp', cache.eduExp || []);

  // placeholders for not-yet-implemented charts
  renderPlaceholder('#chart-sankey', 'Sankey 待实现', 'D3');
  renderPlaceholder('#chart-heatmap', '行业-城市热力矩阵待实现', 'Canvas');
  renderPlaceholder('#chart-treemap', 'TreeMap 待实现', 'D3');
  renderPlaceholder('#chart-map', '城市气泡地图待实现（需市级GeoJSON）', 'D3 Geo');
  renderPlaceholder('#chart-network', '企业-行业网络待实现', 'D3 Force');
}

function initFilters(data) {
  const citySelect = document.getElementById('filter-city');
  const industrySelect = document.getElementById('filter-industry');

  if (data.cities) {
    data.cities
      .slice(0, 80)
      .sort((a, b) => b.job_count - a.job_count)
      .forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.city;
        opt.textContent = `${c.city}`;
        citySelect.appendChild(opt);
      });
  }

  if (data.industries) {
    data.industries
      .slice(0, 80)
      .sort((a, b) => b.job_count - a.job_count)
      .forEach(ind => {
        const opt = document.createElement('option');
        opt.value = ind.industry;
        opt.textContent = ind.industry;
        industrySelect.appendChild(opt);
      });
  }

  citySelect.addEventListener('change', (e) => { filters.city = e.target.value; applyFilters(); });
  industrySelect.addEventListener('change', (e) => { filters.industry = e.target.value; applyFilters(); });
  document.getElementById('filter-edu').addEventListener('change', (e) => { filters.edu = e.target.value; applyFilters(); });
  document.getElementById('filter-exp').addEventListener('change', (e) => { filters.exp = e.target.value; applyFilters(); });
  document.getElementById('btn-reset').addEventListener('click', () => {
    Object.assign(filters, {city: 'all', industry: 'all', edu: 'all', exp: 'all'});
    ['filter-city','filter-industry','filter-edu','filter-exp'].forEach(id => document.getElementById(id).value = 'all');
    applyFilters(true);
  });
}

function applyFilters(skipToast = false) {
  if (!cache) return;
  if (!skipToast) toggleToast(true, '筛选中...');

  // 当前版本仅用于联动展示，后续可在数据侧切片
  renderTopBars('chart-top-cities', cache.rankings?.top_cities || [], {label: '城市', color: '#5c7cfa'});
  renderTopBars('chart-top-industries', cache.rankings?.top_industries || [], {label: '行业', color: '#74c0fc'});
  renderEduExpBubble('chart-edu-exp', cache.eduExp || []);

  toggleToast(false);
}

function updateStats(summary) {
  if (!summary) return;
  document.getElementById('stat-total').textContent = formatNumber(summary.total_records);
  document.getElementById('stat-jobs').textContent = formatNumber(summary.total_jobs);
  document.getElementById('stat-companies').textContent = formatNumber(summary.total_companies);
  document.getElementById('stat-salary').textContent = formatMoney(summary.salary_stats?.mean);
}

function toggleToast(show, text = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.toggle('show', show);
}

window.addEventListener('DOMContentLoaded', init);
