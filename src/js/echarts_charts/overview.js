export function renderTopBars(elId, data, opts = {}) {
  const el = document.getElementById(elId);
  if (!el || !data) return;
  const chart = echarts.init(el);

  const top = data.slice(0, 15);
  chart.setOption({
    grid: { left: 120, right: 20, top: 30, bottom: 20 },
    tooltip: { trigger: 'item' },
    xAxis: { type: 'value', axisLabel: { color: '#6f7391' } },
    yAxis: {
      type: 'category',
      data: top.map(d => d.name || d[opts.label] || d.city || d.industry),
      axisLabel: { color: '#202536' }
    },
    series: [{
      type: 'bar',
      data: top.map(d => d.count || d.job_count || d.value || 0),
      barWidth: 14,
      itemStyle: {
        color: opts.color || '#5c7cfa',
        borderRadius: [6, 6, 6, 6]
      },
      label: { show: true, position: 'right', color: '#6f7391' }
    }]
  });
}
