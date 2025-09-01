import { initBackground } from './background.js';
import { parseGitHubUrl, showError } from './utils.js';
import { fetchRepositoryInfo, fetchBranchCommitCounts, listUserRepos } from './api.js';
import { resetDashboardVisuals, showRepositoryData, createComparisonChart } from './repository.js';

let allRepositoriesData = [];
let currentRepoIndex = 0;

window.addEventListener('load', () => {
  initBackground();

  const tabsContainer = document.getElementById('repoTabs');
  if (tabsContainer) {
    tabsContainer.addEventListener('click', (e) => {
      const tabEl = e.target.closest('.repo-tab');
      if (!tabEl) return;
      const idx = Number(tabEl.dataset.index);
      if (Number.isNaN(idx) || idx === currentRepoIndex) return;

      currentRepoIndex = idx;
      resetDashboardVisuals();
      showRepositoryData(allRepositoriesData[currentRepoIndex], getToken());
      syncActiveTab();
      createComparisonChart(allRepositoriesData); 
    });
  }

  // expose actions for inline HTML buttons
  window.analyzeRepository = analyzeRepository;
  window.loadUserRepositories = loadUserRepositoriesUI;
  window.analyzeSelectedRepositories = analyzeSelectedRepositories;

  // Enter key support
  const repoUrl = document.getElementById('repoUrl');
  const token = document.getElementById('token');
  if (repoUrl) repoUrl.addEventListener('keypress', e => e.key === 'Enter' && analyzeRepository());
  if (token) token.addEventListener('keypress', e => e.key === 'Enter' && analyzeRepository());
});

function getToken() {
  return (document.getElementById('token')?.value || '').trim();
}

async function analyzeRepository() {
  const url = document.getElementById('repoUrl')?.value.trim();
  if (!url) return showError('Please enter a GitHub repository URL');
  if (!url.includes('github.com') || !url.includes('/')) return showError('Please enter a valid GitHub repository URL');
  await analyzeRepositories([url]);
}

async function analyzeRepositories(repoUrlsInput = null) {
  const token = getToken();
  const errorBox = document.getElementById('error');
  const loading = document.getElementById('loading');
  const dashboard = document.getElementById('dashboard');
  const comparison = document.getElementById('comparisonSection');

  if (errorBox) { errorBox.style.display = 'none'; errorBox.textContent = ''; }
  if (dashboard) dashboard.style.display = 'none';
  if (loading) loading.style.display = 'block';

  const repoUrls = repoUrlsInput?.length
    ? repoUrlsInput
    : [...document.querySelectorAll('input[name="repoSelect"]:checked')].map(el => `https://github.com/${el.value}`);

  if (repoUrls.length === 0) {
    showError('Please enter or select at least one GitHub repository');
    if (loading) loading.style.display = 'none';
    return;
  }

  try {
    allRepositoriesData = [];
    for (const repoUrl of repoUrls) {
      const { owner, repo } = parseGitHubUrl(repoUrl);
      const [combined, branchCommits] = await Promise.all([
        fetchRepositoryInfo(owner, repo, token),
        fetchBranchCommitCounts(owner, repo, token)
      ]);
      allRepositoriesData.push({
        repository: combined.repository || {},
        contributors: Array.isArray(combined.contributors) ? combined.contributors : [],
        commits: Array.isArray(combined.commits) ? combined.commits : [],
        languages: combined.languages || {},
        branchCommits: Array.isArray(branchCommits) ? branchCommits : []
      });
    }

    currentRepoIndex = 0;
    resetDashboardVisuals();
    showRepositoryData(allRepositoriesData[currentRepoIndex], token);
    updateRepositoryTabs();
    createComparisonChart(allRepositoriesData);

    if (loading) loading.style.display = 'none';
    if (dashboard) dashboard.style.display = 'grid';
    if (comparison) comparison.style.display = allRepositoriesData.length > 1 ? 'block' : 'none';
  } catch (err) {
    showError(err.message);
    if (loading) loading.style.display = 'none';
  }
}

function updateRepositoryTabs() {
  const tabsContainer = document.getElementById('repoTabs');
  if (!tabsContainer) return;
  tabsContainer.innerHTML = '';
  allRepositoriesData.forEach((data, index) => {
    const tab = document.createElement('div');
    tab.className = 'repo-tab';
    tab.dataset.index = index;
    tab.textContent = data.repository.full_name;
    tabsContainer.appendChild(tab);
  });
  syncActiveTab();
}

function syncActiveTab() {
  document.querySelectorAll('#repoTabs .repo-tab').forEach((el, i) => {
    el.classList.toggle('active', i === currentRepoIndex);
  });
}

// Bulk user flow
async function loadUserRepositoriesUI() {
  const username = document.getElementById('githubUser')?.value.trim();
  const token = getToken();
  const listDiv = document.getElementById('repoList');
  if (listDiv) listDiv.innerHTML = '';

  if (!username) return showError('Please enter a GitHub username');

  try {
    const repos = await listUserRepos(username, token);
    repos.forEach(repo => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = repo.full_name;
      checkbox.name = 'repoSelect';

      const label = document.createElement('label');
      label.textContent = repo.full_name;
      label.style.display = 'block';
      label.prepend(checkbox);

      listDiv.appendChild(label);
    });
  } catch (e) {
    showError('Failed to load repositories for user');
  }
}

async function analyzeSelectedRepositories() {
  const selected = [...document.querySelectorAll('input[name="repoSelect"]:checked')];
  if (selected.length === 0) return showError('Select at least one repository');
  const repoUrls = selected.map(el => `https://github.com/${el.value}`);
  await analyzeRepositories(repoUrls);
}
