import { formatNumber, formatSalary } from '../utils/formatters.js';

const palette = ['#7ad7f0', '#c4a3ff', '#8fb3ff', '#a0e9de'];

export function renderSalaryDist(domId, salary) {
  const el = document.getElementById(domId);
  if (!el || !salary) return;
  const chart = echarts.init(el);
  const bins = salary.distribution || [];
  const categories = bins.map(d => d.range);
  const counts = bins.map(d => d.count);
  const mean = salary.overall?.mean;
  const median = salary.overall?.median;

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 60, right: 40, top: 40, bottom: 40 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: categories, axisLine: { lineStyle: { color: '#8892b0' } } },
    yAxis: { type: 'value', axisLine: { lineStyle: { color: '#8892b0' } }, splitLine: { lineStyle: { color: '#1f2336' } } },
    series: [
      {
        type: 'bar',
        data: counts,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#8fb3ff' },
            { offset: 1, color: '#5362b8' }
          ])
        },
        barWidth: '55%'
      },
      mean && median ? {
        type: 'line',
        data: counts.map(() => mean),
        name: '均值',
        lineStyle: { color: '#7ad7f0', width: 1.5, type: 'dashed' },
        showSymbol: false,
        tooltip: { formatter: () => `均值 ${formatSalary(mean)}` }
      } : null,
      mean && median ? {
        type: 'line',
        data: counts.map(() => median),
        name: '中位数',
        lineStyle: { color: '#c4a3ff', width: 1.2, type: 'dotted' },
        showSymbol: false,
        tooltip: { formatter: () => `中位数 ${formatSalary(median)}` }
      } : null
    ].filter(Boolean)
  });
}

function buildBarOption(data, title, color) {
  return {
    backgroundColor: 'transparent',
    grid: { left: 120, right: 40, top: 20, bottom: 30 },
    tooltip: { trigger: 'item', formatter: p => `${p.name}<br/>${formatNumber(p.value)} 条` },
    xAxis: { type: 'value', axisLine: { lineStyle: { color: '#8892b0' } }, splitLine: { lineStyle: { color: '#1f2336' } } },
    yAxis: {
      type: 'category',
      data: data.map(d => d.name).reverse(),
      axisLine: { lineStyle: { color: '#8892b0' } },
      axisLabel: { color: '#e9edf7', fontSize: 11 }
    },
    series: [{
      type: 'bar',
      data: data.map(d => d.count).reverse(),
      itemStyle: {
        color: color,
        borderRadius: [6, 6, 6, 6],
        shadowBlur: 8,
        shadowColor: 'rgba(0,0,0,0.2)'
      },
      barWidth: 12
    }]
  };
}

export function renderTopCities(domId, list) {
  const el = document.getElementById(domId);
  if (!el || !list) return;
  const chart = echarts.init(el);
  const top = list.slice(0, 20);
  chart.setOption(buildBarOption(top, 'TOP 城市', palette[0]));
}

export function renderTopIndustries(domId, list) {
  const el = document.getElementById(domId);
  if (!el || !list) return;
  const chart = echarts.init(el);
  const top = list.slice(0, 20);
  chart.setOption(buildBarOption(top, 'TOP 行业', palette[1]));
}
