export function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '-';
  return n.toLocaleString('zh-CN');
}

export function formatSalary(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '-';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return Math.round(n).toLocaleString('zh-CN');
}

export const educationLabel = {
  0: '不限/中专',
  1: '大专',
  2: '本科',
  3: '硕士',
  4: '博士',
  [-1]: '未知'
};

export const experienceLabel = {
  0: '应届/无经验',
  1: '1-3年',
  2: '3-5年',
  3: '5-10年',
  4: '10年以上',
  [-1]: '未知'
};
