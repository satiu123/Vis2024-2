export function renderEduExpBubble(elId, data) {
  const el = document.getElementById(elId);
  if (!el || !data) return;
  const chart = echarts.init(el);

  const mapper = { 0: '应届/0年', 1: '1-3年', 2: '3-5年', 3: '5-10年', 4: '10年以上' };
  const eduMapper = { 0: '不限/中专', 1: '大专', 2: '本科', 3: '硕士', 4: '博士' };

  const points = data.map(d => [d.experience, d.education, d.salary_mean || 0, d.count]);

  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: p => {
        const [exp, edu, salary, count] = p.value;
        return `${eduMapper[edu] || '—'} × ${mapper[exp] || '—'}<br/>样本: ${count}<br/>均薪: ${Math.round(salary).toLocaleString('zh-CN')} 元`;
      }
    },
    xAxis: {
      type: 'category',
      data: Object.values(mapper),
      axisLabel: { color: '#6f7391' }
    },
    yAxis: {
      type: 'category',
      data: Object.values(eduMapper),
      axisLabel: { color: '#6f7391' }
    },
    series: [{
      type: 'scatter',
      symbolSize: val => Math.sqrt(val[3]) * 2 + 8,
      data: points,
      itemStyle: {
        color: p => {
          const alpha = 0.5 + Math.min(p.value[2] / 30000, 0.45);
          return `rgba(92,124,250,${alpha})`;
        },
        borderColor: '#fff',
        borderWidth: 1
      }
    }]
  });
}
