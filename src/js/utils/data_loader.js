const BASE = '../data/processed/';

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`加载失败 ${path}: ${res.status}`);
  return res.json();
}

export async function loadAllData() {
  const files = [
    'data_summary.json',
    'salary_analysis.json',
    'top_rankings.json',
    'city_statistics.json',
    'industry_statistics.json',
    'education_experience.json'
  ];
  const [summary, salary, rankings, cities, industries, eduExp] = await Promise.all(
    files.map(f => fetchJSON(BASE + f))
  );
  return { summary, salary, rankings, cities, industries, eduExp };
}
