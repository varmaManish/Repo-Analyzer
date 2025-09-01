// Chart.js builders & lifecycle

let commitChartInstance = null;
let contributorChartInstance = null;
let branchCommitChartInstance = null;
let impactChartInstance = null;
let comparisonChart = null;

export function destroyAllCharts() {
  [commitChartInstance, contributorChartInstance, branchCommitChartInstance, impactChartInstance, comparisonChart]
    .forEach(ch => ch && ch.destroy && ch.destroy());
  commitChartInstance = contributorChartInstance = branchCommitChartInstance = impactChartInstance = comparisonChart = null;
}

export function createCommitChart(commits) {
  const el = document.getElementById('commitChart');
  if (!el || !Array.isArray(commits) || commits.length === 0) return;
  if (commitChartInstance) commitChartInstance.destroy();

  const dateCounts = {};
  commits.forEach(c => {
    const d = new Date(c.commit.author.date).toISOString().split('T')[0];
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  });
  const labels = Object.keys(dateCounts).sort();
  const data = labels.map(d => dateCounts[d]);

  commitChartInstance = new Chart(el, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Commits per Day', data, borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.1)', borderWidth: 2, fill: true, tension: 0.4 }]},
    options: baseOptions()
  });
}

export function createContributorChart(contributors) {
  const el = document.getElementById('contributorChart');
  if (!el || !Array.isArray(contributors) || contributors.length === 0) return;
  if (contributorChartInstance) contributorChartInstance.destroy();

  const top = contributors.slice(0, 10);
  const labels = top.map(c => c.login);
  const data = top.map(c => c.contributions);

  contributorChartInstance = new Chart(el, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: ['#ff6384','#36a2eb','#ffce56','#4bc0c0','#9966ff','#ff9f40','#c9cbcf','#00d4ff','#00ff88','#ff0080'], borderWidth: 2, borderColor: '#0a0a0f' }]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#fff' } } } }
  });
}

export function createBranchCommitChart(branchCommits) {
  const el = document.getElementById('branchCommitChart');
  if (!el || !Array.isArray(branchCommits) || branchCommits.length === 0) return;
  if (branchCommitChartInstance) branchCommitChartInstance.destroy();

  const top = branchCommits.slice().sort((a, b) => b.commits - a.commits).slice(0, 15);
  const labels = top.map(b => b.branch);
  const data = top.map(b => b.commits);

  branchCommitChartInstance = new Chart(el, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Commits per Branch', data, backgroundColor: 'rgba(0,255,136,0.7)', borderColor: '#00ff88', borderWidth: 1 }]},
    options: baseOptions()
  });
}

export function renderContributorImpact(impactData) {
  const el = document.getElementById('impactChart');
  if (!el || !Array.isArray(impactData) || impactData.length === 0) return;
  if (impactChartInstance) impactChartInstance.destroy();

  const top = impactData.slice(0, 8);
  const labels = top.map(c => c.login);
  const data = top.map(c => c.impact_score);

  impactChartInstance = new Chart(el, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Impact Score', data, backgroundColor: 'rgba(255,0,128,0.7)', borderColor: '#ff0080', borderWidth: 2 }]},
    options: { ...baseOptions(), plugins: { ...baseOptions().plugins, title: { display: true, text: 'Contributor Impact Scores', color: '#fff' } } }
  });
}

export function createComparisonChart(allRepositoriesData) {
  if (!Array.isArray(allRepositoriesData) || allRepositoriesData.length < 2) return;
  const el = document.getElementById('comparisonChart');
  if (!el) return;
  if (comparisonChart) comparisonChart.destroy();

  const labels = allRepositoriesData.map(d => d.repository.full_name);
 const ds = [
  { label: 'Stars', key: 'stargazers_count', bg: 'rgba(255,99,132,0.7)', bc: 'rgba(255,99,132,1)' },
  { label: 'Forks', key: 'forks_count', bg: 'rgba(54,162,235,0.7)', bc: 'rgba(54,162,235,1)' },
  { label: 'Open Issues', key: 'open_issues_count', bg: 'rgba(255,206,86,0.7)', bc: 'rgba(255,206,86,1)' },
  { label: 'Watchers', key: 'watchers_count', bg: 'rgba(75,192,192,0.7)', bc: 'rgba(75,192,192,1)' },
  { label: 'Size (KB)', key: 'size', bg: 'rgba(153,102,255,0.7)', bc: 'rgba(153,102,255,1)' },
].map(cfg => ({
  label: cfg.label,
  data: allRepositoriesData.map(d => (d.repository?.[cfg.key] ?? 0)), // safe default
  backgroundColor: cfg.bg,
  borderColor: cfg.bc,
  borderWidth: 2
}));

  comparisonChart = new Chart(el, {
    type: 'bar',
    data: { labels, datasets: ds },
    options: baseOptions({ title: 'Repository Comparison' })
  });
}

function baseOptions({ title } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#fff' } },
      title: title ? { display: true, text: title, color: '#fff', font: { size: 16 } } : undefined
    },
    scales: {
      x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
      y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }
    }
  };
}
