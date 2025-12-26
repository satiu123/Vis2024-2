export function renderSalaryBox(elId, salary) {
  const el = document.getElementById(elId);
  if (!el || !salary || !salary.overall) return;
  const chart = echarts.init(el);

  const o = salary.overall;
  const boxData = [[o.min, o.q25, o.median, o.q75, o.max]];
  const dist = salary.distribution || [];

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    grid: [
      { left: 60, right: 20, top: 30, height: '45%' },
      { left: 60, right: 20, top: '58%', height: '35%' }
    ],
    xAxis: [
      { type: 'category', data: ['薪资'], axisLabel: { color: '#6f7391' } },
      { type: 'category', gridIndex: 1, data: dist.map(d => d.range || ''), axisLabel: { color: '#6f7391', rotate: 0 } }
    ],
    yAxis: [
      { type: 'value', axisLabel: { color: '#6f7391' } },
      { type: 'value', gridIndex: 1, axisLabel: { color: '#6f7391' } }
    ],
    series: [
      {
        name: '箱线', type: 'boxplot', data: boxData,
        itemStyle: { color: 'rgba(92,124,250,0.18)', borderColor: '#5c7cfa' },
        boxWidth: 20
      },
      {
        name: '均值', type: 'scatter', data: [[0, o.mean]],
        symbolSize: 12,
        itemStyle: { color: '#74c0fc' }
      },
      {
        name: '分布', type: 'bar', xAxisIndex: 1, yAxisIndex: 1,
        data: dist.map(d => d.count || 0),
        itemStyle: { color: 'rgba(92,124,250,0.35)', borderRadius: [6,6,6,6] },
        barWidth: 18
      }
    ]
  });
}
