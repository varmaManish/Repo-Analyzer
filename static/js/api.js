import { API_BASE } from './config.js';

function tokenParam(token) {
  return token ? `?token=${encodeURIComponent(token)}` : '';
}

export async function fetchRepositoryInfo(owner, repo, token) {
  const res = await fetch(`${API_BASE}/github/${owner}/${repo}${tokenParam(token)}`);
  if (!res.ok) throw new Error(`Repository ${owner}/${repo} not found or access denied (${res.status})`);
  return res.json();
}

export async function fetchBranchCommitCounts(owner, repo, token) {
  const res = await fetch(`${API_BASE}/github/${owner}/${repo}/branch-commits${tokenParam(token)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchRepositoryContents(owner, repo, token, path = '') {
  const qs = new URLSearchParams();
  if (path) qs.set('path', path);
  if (token) qs.set('token', token);
  const res = await fetch(`${API_BASE}/github/${owner}/${repo}/contents?${qs.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch contents: ${res.status}`);
  return res.json();
}

export async function listUserRepos(username, token) {
  const res = await fetch(`${API_BASE}/github/user/${encodeURIComponent(username)}/repos${tokenParam(token)}`);
  if (!res.ok) throw new Error('Failed to load repositories for user');
  return res.json();
}

export async function fetchContributorImpact(owner, repo, token) {
  const res = await fetch(`${API_BASE}/repo/${owner}/${repo}/contributors-impact${tokenParam(token)}`);
  if (!res.ok) return { impact: [] };
  return res.json();
}

export async function fetchSecurityScore(owner, repo, token) {
  const res = await fetch(`${API_BASE}/repo/${owner}/${repo}/security-score${tokenParam(token)}`);
  if (!res.ok) throw new Error('Unable to fetch security score');
  return res.json();
}
