// static/js/main.js - Updated with logout functionality
import { initBackground } from './background.js';
import { parseGitHubUrl, showError } from './utils.js';
import { fetchRepositoryInfo, fetchBranchCommitCounts, listUserRepos } from './api.js';
import { resetDashboardVisuals, showRepositoryData, createComparisonChart } from './repository.js';

let allRepositoriesData = [];
let currentRepoIndex = 0;

// Import auth manager for logout functionality
let authManager = null;

window.addEventListener('load', async () => {
    initBackground();
    
    // Initialize authentication
    try {
        const authModule = await import('./auth.js');
        authManager = authModule.authManager;
        
        // Initialize auth UI on main page
        initMainPageAuth();
        
        // Check if user is logged in
        if (!authManager.isLoggedIn()) {
            window.location.href = '/login';
            return;
        }
    } catch (error) {
        console.error('Auth module not available:', error);
    }
    
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
    
    // Add logout function to window
    window.logout = logout;
    
    // Enter key support
    const repoUrl = document.getElementById('repoUrl');
    const token = document.getElementById('token');
    if (repoUrl) repoUrl.addEventListener('keypress', e => e.key === 'Enter' && analyzeRepository());
    if (token) token.addEventListener('keypress', e => e.key === 'Enter' && analyzeRepository());
});

function initMainPageAuth() {
    const header = document.querySelector('.header');
    if (!header || !authManager) return;

    // Remove existing auth section
    const existingAuthSection = header.querySelector('.auth-section');
    if (existingAuthSection) {
        existingAuthSection.remove();
    }

    // Create auth section
    const authSection = document.createElement('div');
    authSection.className = 'auth-section';
    authSection.style.cssText = `
        position: absolute;
        top: 1rem;
        right: 1rem;
        display: flex;
        gap: 0.5rem;
        align-items: center;
        z-index: 10;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    `;

    if (authManager.isLoggedIn()) {
        // Show user info and logout button
        authSection.innerHTML = `
            <div class="user-info" style="
                display: flex;
                align-items: center;
                gap: 0.75rem;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 0.75rem 1.25rem;
                color: white;
                font-size: 0.9rem;
                font-weight: 500;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                ">
                    <div style="
                        width: 32px;
                        height: 32px;
                        background: linear-gradient(45deg, #00d4ff, #ff0080);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1rem;
                        font-weight: 600;
                        color: white;
                    ">
                        ${authManager.user.full_name ? authManager.user.full_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style="
                        display: flex;
                        flex-direction: column;
                        gap: 0.125rem;
                    ">
                        <span style="font-weight: 600; font-size: 0.85rem;">
                            ${authManager.user.full_name || 'User'}
                        </span>
                        <span style="opacity: 0.7; font-size: 0.75rem;">
                            ${authManager.user.auth_provider === 'google' ? 'Google Account' : 'Local Account'}
                        </span>
                    </div>
                </div>
                <button onclick="logout()" id="logoutBtn" style="
                    background: linear-gradient(135deg, rgba(255, 59, 48, 0.8), rgba(255, 59, 48, 0.6));
                    border: 1px solid rgba(255, 59, 48, 0.4);
                    color: white;
                    border-radius: 8px;
                    padding: 0.5rem 1rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    min-width: fit-content;
                " 
                onmouseover="this.style.background='linear-gradient(135deg, rgba(255, 59, 48, 1), rgba(255, 59, 48, 0.8))'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 24px rgba(255, 59, 48, 0.3)';"
                onmouseout="this.style.background='linear-gradient(135deg, rgba(255, 59, 48, 0.8), rgba(255, 59, 48, 0.6))'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 012 2v2h-2V4H5v16h9v-2h2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2h9z"/>
                    </svg>
                    Logout
                </button>
            </div>
        `;
    } else {
        // Show login/register buttons
        authSection.innerHTML = `
            <a href="/login" style="
                background: linear-gradient(135deg, rgba(0, 212, 255, 0.8), rgba(0, 212, 255, 0.6));
                border: 1px solid rgba(0, 212, 255, 0.4);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                padding: 0.5rem 1rem;
                font-size: 0.9rem;
                font-weight: 600;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
            " onmouseover="this.style.background='linear-gradient(135deg, rgba(0, 212, 255, 1), rgba(0, 212, 255, 0.8))'"
               onmouseout="this.style.background='linear-gradient(135deg, rgba(0, 212, 255, 0.8), rgba(0, 212, 255, 0.6))'">
                Login
            </a>
            <a href="/register" style="
                background: linear-gradient(135deg, rgba(255, 0, 128, 0.8), rgba(255, 0, 128, 0.6));
                border: 1px solid rgba(255, 0, 128, 0.4);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                padding: 0.5rem 1rem;
                font-size: 0.9rem;
                font-weight: 600;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
            " onmouseover="this.style.background='linear-gradient(135deg, rgba(255, 0, 128, 1), rgba(255, 0, 128, 0.8))'"
               onmouseout="this.style.background='linear-gradient(135deg, rgba(255, 0, 128, 0.8), rgba(255, 0, 128, 0.6))'">
                Register
            </a>
        `;
    }

    header.appendChild(authSection);
}

// Logout function
function logout() {
    if (!authManager) {
        // Fallback logout if auth manager not available
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
    }

    // Show confirmation dialog
    if (confirm('Are you sure you want to logout?')) {
        // Add loading state to logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = `
                <div style="
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top: 2px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                "></div>
                Logging out...
            `;
        }

        // Clear auth data and redirect
        setTimeout(() => {
            authManager.logout();
        }, 500); // Small delay for user feedback
    }
}

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