import { loadAllData } from './utils/data_loader.js';
import { renderSalaryDist, renderTopCities, renderTopIndustries } from './echarts_charts/overview_charts.js';
import { formatNumber, formatSalary } from './utils/formatters.js';

let DATA = null;

const toast = document.getElementById('toast');
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toast.hidden = true), 2000);
}

function bindTabs() {
  const tabs = document.querySelectorAll('.tab');
  const views = document.querySelectorAll('.view');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const id = `view-${btn.dataset.view}`;
      views.forEach(v => v.classList.remove('active'));
      const view = document.getElementById(id);
      if (view) view.classList.add('active');
    });
  });
}

function fillStats(summary) {
  if (!summary) return;
  document.getElementById('stat-records').textContent = formatNumber(summary.total_records);
  document.getElementById('stat-jobs').textContent = formatNumber(summary.total_jobs);
  document.getElementById('stat-companies').textContent = formatNumber(summary.total_companies);
  document.getElementById('stat-industries').textContent = formatNumber(summary.total_industries);
  document.getElementById('stat-salary').textContent = formatSalary(summary.salary_stats?.mean);
}

async function init() {
  try {
    showToast('加载数据...');
    DATA = await loadAllData();
    showToast('加载完成');
    bindTabs();
    fillStats(DATA.summary);
    renderSalaryDist('chart-salary', DATA.salary);
    renderTopCities('chart-top-cities', DATA.rankings?.top_cities || []);
    renderTopIndustries('chart-top-industries', DATA.rankings?.top_industries || []);
  } catch (e) {
    console.error(e);
    showToast('数据加载失败，检查是否通过本地服务器访问');
  }
}

document.addEventListener('DOMContentLoaded', init);
