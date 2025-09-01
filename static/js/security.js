import { fetchSecurityScore } from './api.js';

export async function loadSecurityScore(owner, repo, token) {
  const card = document.getElementById('security-score-card');
  if (!card) return;
  try {
    const data = await fetchSecurityScore(owner, repo, token);
    renderSecurityScore(data);
  } catch (e) {
    card.innerHTML = `<h4>🔒 Security Score</h4><p>Unable to fetch security score.</p>`;
  }
}

function renderSecurityScore(data) {
  const checks = data.checks || {};
  const card = document.getElementById('security-score-card');
  const scoreColor = data.security_score >= 75 ? '#00ff88' :
                     data.security_score >= 50 ? '#ffce56' : '#ff3b30';

  card.innerHTML = `
    <h3>🔒 Security Score</h3>
    <div class="security-score-display">
      <div class="score-circle" style="border: 3px solid ${scoreColor}">
        <div class="score-inner">
          <span class="score-value" style="color: ${scoreColor}">${data.security_score}</span>
          <span class="score-max">/100</span>
        </div>
      </div>
    </div>
    <div class="security-checks">
      ${Object.entries(checks).map(([k, v]) => `
        <div class="security-check ${v ? 'passed' : 'failed'}">
          <span class="check-icon">${v ? '✅' : '❌'}</span>
          <span class="check-name">${k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
        </div>`).join('')}
    </div>`;
}

