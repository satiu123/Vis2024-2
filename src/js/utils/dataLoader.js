const DATA_BASE = '../data/processed/';

async function loadJSON(name) {
  try {
    const res = await fetch(`${DATA_BASE}${name}`);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch (err) {
    console.error(`加载 ${name} 失败`, err);
    return null;
  }
}

export async function loadAllData() {
  const [summary, cities, industries, salary, eduExp, rankings] = await Promise.all([
    loadJSON('data_summary.json'),
    loadJSON('city_statistics.json'),
    loadJSON('industry_statistics.json'),
    loadJSON('salary_analysis.json'),
    loadJSON('education_experience.json'),
    loadJSON('top_rankings.json')
  ]);

  return { summary, cities, industries, salary, eduExp, rankings };
}
