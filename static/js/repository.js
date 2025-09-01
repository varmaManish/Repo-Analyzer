import { generateMermaidDiagram, initializeMermaid } from './mermaid.js';
import { loadFileTree } from './filetree.js';
import { loadSecurityScore } from './security.js';
import { destroyAllCharts, createCommitChart, createContributorChart, createBranchCommitChart, createComparisonChart, renderContributorImpact } from './charts.js';
import { formatBytes } from './utils.js';
import { fetchContributorImpact } from './api.js';

export function resetDashboardVisuals() {
  destroyAllCharts();
  ['langChartContainer','langLegend','languageStats','repoDetails','statsGrid','fileTree','security-score-card','mermaidContainer']
    .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
  ['commitChart','contributorChart','branchCommitChart','impactChart'].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.width = canvas.width; }
  });
}

export function showRepositoryData(data, token) {
  const repo = data.repository || {};
  const contributors = data.contributors || [];
  const commits = data.commits || [];
  const languages = data.languages || {};
  const branchCommits = data.branchCommits || [];

  // Language stats
  const langStatsDiv = document.getElementById('languageStats');
  if (langStatsDiv) {
    langStatsDiv.innerHTML = '';
    const total = Object.values(languages).reduce((a,b) => (Number(a)||0) + (Number(b)||0), 0);
    const colors = ['#ff6384','#36a2eb','#ffce56','#4bc0c0','#9966ff','#ff9f40'];
    Object.entries(languages).forEach(([lang, bytes], i) => {
      const n = Number(bytes) || 0;
      const percent = total ? ((n / total) * 100).toFixed(2) : '0.00';
      const color = colors[i % colors.length];
      const item = document.createElement('div');
      item.className = 'language-item';
      item.style.borderLeftColor = color;
      item.innerHTML = `
        <div class="language-name"><span class="language-color" style="background-color:${color};"></span>${lang}</div>
        <div class="language-bytes">${percent}% (${formatBytes(n)})</div>`;
      langStatsDiv.appendChild(item);
    });
  }

  // Repo details
  const repoDetails = document.getElementById('repoDetails');
  if (repoDetails) {
    repoDetails.innerHTML = `
      <h2>${repo.full_name || 'Unknown Repository'}</h2>
      <p>${repo.description || ''}</p>
      <p><strong>Created:</strong> ${repo.created_at ? new Date(repo.created_at).toLocaleDateString() : 'N/A'} |
         <strong>Last updated:</strong> ${repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'N/A'}</p>
    `;
  }

  // Stats grid
  const statsGrid = document.getElementById('statsGrid');
  if (statsGrid) {
    const stats = [
      { label: 'Stars', value: Number(repo.stargazers_count) || 0, icon: '⭐' },
      { label: 'Forks', value: Number(repo.forks_count) || 0, icon: '🍴' },
      { label: 'Issues', value: Number(repo.open_issues_count) || 0, icon: '🐛' },
      { label: 'Watchers', value: Number(repo.watchers_count) || 0, icon: '👁️' },
      { label: 'Size (KB)', value: Number(repo.size) || 0, icon: '💾' },
      { label: 'Contributors', value: contributors.length || 0, icon: '👥' }
    ];
    statsGrid.innerHTML = stats.map(s => `
      <div class="stat-item">
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-number">${s.value.toLocaleString()}</div>
        <div class="stat-label">${s.label}</div>
      </div>`).join('');
  }

  // Mermaid diagram + file tree
  initializeMermaid();
  generateMermaidDiagram(repo, commits, contributors);
  if (repo?.owner?.login && repo?.name) {
    loadFileTree(repo.owner.login, repo.name, token);
    loadSecurityScore(repo.owner.login, repo.name, token);
    fetchContributorImpact(repo.owner.login, repo.name, token).then(d => renderContributorImpact(d.impact || []));
  }

  // Charts
  createCommitChart(commits);
  createContributorChart(contributors);
  createBranchCommitChart(branchCommits);
}

// comparison chart wrapper (used by main.js)
export { createComparisonChart };

