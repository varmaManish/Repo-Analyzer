
    // Initialize Three.js background
    let scene, camera, renderer, particles = [], mouse = { x: 0, y: 0 };

    function initBackground() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas-bg'), alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);

      // Create particles
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const colors = [];

      for (let i = 0; i < 1000; i++) {
        positions.push((Math.random() - 0.5) * 2000);
        positions.push((Math.random() - 0.5) * 2000);
        positions.push((Math.random() - 0.5) * 2000);

        const color = new THREE.Color();
        color.setHSL(Math.random() * 0.6 + 0.5, 0.7, 0.5);
        colors.push(color.r, color.g, color.b);
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      camera.position.z = 1000;

      animate();
    }

    function animate() {
      requestAnimationFrame(animate);
      
      const positions = scene.children[0].geometry.attributes.position.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 0.5;
        if (positions[i + 1] < -1000) {
          positions[i + 1] = 1000;
        }
      }
      
      scene.children[0].geometry.attributes.position.needsUpdate = true;
      scene.children[0].rotation.y += 0.001;
      
      renderer.render(scene, camera);
    }

    // Initialize floating particles
    function createParticles() {
      const container = document.getElementById('particles');
      
      setInterval(() => {
        if (container.children.length < 20) {
          const particle = document.createElement('div');
          particle.className = 'particle';
          particle.style.left = Math.random() * 100 + '%';
          particle.style.animationDelay = Math.random() * 2 + 's';
          container.appendChild(particle);
          
          setTimeout(() => {
            if (particle.parentNode) {
              particle.parentNode.removeChild(particle);
            }
          }, 6000);
        }
      }, 300);
    }

    // Initialize app
    window.addEventListener('load', () => {
      initBackground();
      createParticles();
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

   // Store all repositories data
    let allRepositoriesData = [];
    let currentRepoIndex = 0;
    let comparisonChart = null; // Store the chart instance

    // GitHub API functionality
    async function analyzeRepositories() {
      const repoUrlsInput = document.getElementById('repoUrl').value.trim();
      const token = document.getElementById('token').value.trim();
      const errorBox = document.getElementById('error');
      const loading = document.getElementById('loading');
      
      errorBox.style.display = 'none';
      errorBox.textContent = '';
      document.getElementById('dashboard').style.display = 'none';
      loading.style.display = 'block';

      if (!repoUrlsInput) {
        showError('Please enter GitHub repository URLs');
        return;
      }

      // Split URLs by comma and trim whitespace
      const repoUrls = repoUrlsInput.split(',').map(url => url.trim()).filter(url => url);
      
      if (repoUrls.length === 0) {
        showError('Please enter valid GitHub repository URLs');
        return;
      }

      try {
        allRepositoriesData = [];
        
        // Process each repository
        for (const repoUrl of repoUrls) {
          const { owner, repo } = parseGitHubUrl(repoUrl);
          
          // Make real API calls to GitHub
          const headers = token ? { 'Authorization': `token ${token}` } : {};
          const queryToken = token ? `?token=${token}` : '';
          
          const [repoData, contributorsData, commitsData, languagesData, branchCommitsData] = await Promise.all([
            fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
            fetch(`https://api.github.com/repos/${owner}/${repo}/contributors`, { headers }),
            fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=20`, { headers }),
            fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers }),
            fetch(`http://localhost:8000/github/${owner}/${repo}/branch-commits${queryToken}`)
          ]);

          if (!repoData.ok) {
            throw new Error(`Repository ${owner}/${repo} not found or access denied (${repoData.status})`);
          }

          const data = {
            repository: await repoData.json(),
            contributors: contributorsData.ok ? await contributorsData.json() : [],
            commits: commitsData.ok ? await commitsData.json() : [],
            languages: languagesData.ok ? await languagesData.json() : {},
            branchCommits: branchCommitsData.ok ? await branchCommitsData.json() : []
          };

          allRepositoriesData.push(data);
        }

        // Show the first repository by default
        currentRepoIndex = 0;
        showRepositoryData(allRepositoriesData[currentRepoIndex]);
        updateRepositoryTabs();
        createComparisonChart();
        
        loading.style.display = 'none';
        document.getElementById('dashboard').style.display = 'grid';
        document.getElementById('comparisonSection').style.display = allRepositoriesData.length > 1 ? 'block' : 'none';
        
      } catch (err) {
        showError(err.message);
        loading.style.display = 'none';
      }
    }

    function updateRepositoryTabs() {
      const tabsContainer = document.getElementById('repoTabs');
      tabsContainer.innerHTML = '';
      
      allRepositoriesData.forEach((data, index) => {
        const tab = document.createElement('div');
        tab.className = `repo-tab ${index === currentRepoIndex ? 'active' : ''}`;
        tab.textContent = data.repository.full_name;
        tab.onclick = () => {
          currentRepoIndex = index;
          showRepositoryData(allRepositoriesData[currentRepoIndex]);
          // Update active tab styling
          document.querySelectorAll('.repo-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        };
        tabsContainer.appendChild(tab);
      });
    }

    function createComparisonChart() {
      if (allRepositoriesData.length < 2) return;
      
      const ctx = document.getElementById('comparisonChart').getContext('2d');
      
      // Destroy previous chart if it exists
      if (comparisonChart) {
        comparisonChart.destroy();
      }
      
      const labels = allRepositoriesData.map(data => data.repository.full_name);
      
      // Prepare comparison data
      const datasets = [
        {
          label: 'Stars',
          data: allRepositoriesData.map(data => data.repository.stargazers_count),
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2
        },
        {
          label: 'Forks',
          data: allRepositoriesData.map(data => data.repository.forks_count),
          backgroundColor: 'rgba(54, 162, 235, 0.7)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        },
        {
          label: 'Open Issues',
          data: allRepositoriesData.map(data => data.repository.open_issues_count),
          backgroundColor: 'rgba(255, 206, 86, 0.7)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 2
        },
        {
          label: 'Watchers',
          data: allRepositoriesData.map(data => data.repository.watchers_count),
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2
        },
        {
          label: 'Size (KB)',
          data: allRepositoriesData.map(data => data.repository.size),
          backgroundColor: 'rgba(153, 102, 255, 0.7)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 2
        }
      ];

      comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#fff' }
            },
            title: {
              display: true,
              text: 'Repository Comparison',
              color: '#fff',
              font: {
                size: 16
              }
            }
          },
          scales: {
            x: {
              stacked: false,
              ticks: { color: '#fff' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
              stacked: false,
              ticks: { color: '#fff' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
          }
        }
      });
    }


    function parseGitHubUrl(url) {
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) throw new Error(`Invalid GitHub repository URL format: ${url}`);
      return { owner: match[1], repo: match[2].replace('.git', '') };
    }

    function showError(message) {
      const errorBox = document.getElementById('error');
      errorBox.textContent = '❌ ' + message;
      errorBox.style.display = 'block';
    }

    function showRepositoryData(data) {
      const repo = data.repository;
      const contributors = data.contributors || [];
      const commits = data.commits || [];
      const languages = data.languages || {};
      const branchCommits = data.branchCommits || [];

      const langStatsDiv = document.getElementById('languageStats');
      langStatsDiv.innerHTML = ''; // Clear previous

      const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);

      Object.entries(languages).forEach(([lang, bytes], index) => {
        const percent = ((bytes / totalBytes) * 100).toFixed(2);
        const color = ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'][index % 6];

        const item = document.createElement('div');
        item.className = 'language-item';
        item.style.borderLeftColor = color;

        item.innerHTML = `
          <div class="language-name">
            <span class="language-color" style="background: ${color};"></span> ${lang}
          </div>
          <div class="language-bytes">${bytes.toLocaleString()} bytes (${percent}%)</div>
        `;
        langStatsDiv.appendChild(item);
      }); 

      // Repository info
      const details = document.getElementById('repoDetails');
      details.innerHTML = `
        <h4 style="color: #fff; margin-bottom: 1rem;">${repo.full_name}</h4>
        <p style="opacity: 0.8; margin-bottom: 1rem;">${repo.description}</p>
        <p style="opacity: 0.7; font-size: 0.9rem;">
          Created: ${new Date(repo.created_at).toLocaleDateString()} | 
          Last updated: ${new Date(repo.updated_at).toLocaleDateString()}
        </p>
      `;

      // Statistics
      const statsGrid = document.getElementById('statsGrid');
      const stats = [
        { label: 'Stars', value: repo.stargazers_count, icon: '⭐' },
        { label: 'Forks', value: repo.forks_count, icon: '🍴' },
        { label: 'Issues', value: repo.open_issues_count, icon: '🐛' },
        { label: 'Watchers', value: repo.watchers_count, icon: '👁️' },
        { label: 'Size (KB)', value: repo.size, icon: '💾' },
        { label: 'Contributors', value: contributors.length, icon: '👥' }
      ];

      statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-item">
          <div class="stat-number">${stat.value.toLocaleString()}</div>
          <div class="stat-label">${stat.icon} ${stat.label}</div>
        </div>
      `).join('');

      // Commit activity chart
      createCommitChart(commits);
      
      // Language distribution chart
      createLanguageChart(languages);
      
      // Contributors chart
      createContributorsChart(contributors);
      
      // Mermaid diagram
      createMermaidDiagram(commits, contributors);

      createBranchCommitChart(branchCommits);

      renderFileTree(repo.owner.login, repo.name, document.getElementById('token').value.trim());
    }

    async function renderFileTree(owner, repo, token) {
      const container = document.getElementById('fileTree');
      container.innerHTML = 'Loading...';

      const headers = token ? { Authorization: `token ${token}` } : {};
      const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents`;

      async function fetchTree(path = '') {
        const url = path ? `${apiBase}/${path}` : apiBase;
        const res = await fetch(url, { headers });
        if (!res.ok) return [];
        return await res.json();
      }

      async function buildTree(path = '') {
        const items = await fetchTree(path);
        const ul = document.createElement('ul');
        ul.style.paddingLeft = '1rem';
        ul.style.listStyle = 'none';
        ul.style.color = '#fff';

        for (let item of items) {
          const li = document.createElement('li');
          li.textContent = `${item.type === 'dir' ? '📁' : '📄'} ${item.name}`;
          if (item.type === 'dir') {
            li.style.cursor = 'pointer';
            li.onclick = async () => {
              if (li.dataset.loaded) {
                li.querySelector('ul').classList.toggle('hidden');
              } else {
                const subTree = await buildTree(item.path);
                li.appendChild(subTree);
                li.dataset.loaded = true;
              }
            };
          }
          ul.appendChild(li);
        }
        return ul;
      }

      try {
        const tree = await buildTree();
        container.innerHTML = '';
        container.appendChild(tree);
      } catch (err) {
        container.innerHTML = `<span style="color: #ff3b30;">Error loading file structure: ${err.message}</span>`;
      }
    }

    function createCommitChart(commits) {
      const ctx = document.getElementById('commitChart').getContext('2d');
      
      // Process actual commit data by date
      const commitsByDate = {};
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const dateStr = d.toISOString().split('T')[0];
        commitsByDate[dateStr] = 0;
        return {
          date: dateStr,
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
      });

      // Count commits by date
      commits.forEach(commit => {
        const commitDate = new Date(commit.commit.author.date).toISOString().split('T')[0];
        if (commitsByDate.hasOwnProperty(commitDate)) {
          commitsByDate[commitDate]++;
        }
      });

      const labels = last30Days.map(day => day.label);
      const data = last30Days.map(day => commitsByDate[day.date]);

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Daily Commits',
            data: data,
            borderColor: '#00d4ff',
            backgroundColor: 'rgba(0, 212, 255, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00d4ff',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#fff', font: { size: 14 } }
            }
          },
          scales: {
            x: {
              ticks: { color: '#fff', maxTicksLimit: 7 },
              grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
              ticks: { color: '#fff' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
          },
          elements: {
            point: {
              hoverRadius: 8
            }
          }
        }
      });
    }

    function createLanguageChart(languages) {
      const ctx = document.getElementById('langChart').getContext('2d');
      const colors = ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'];
      
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(languages),
          datasets: [{
            data: Object.values(languages),
            backgroundColor: colors,
            borderColor: colors.map(c => c + '80'),
            borderWidth: 2,
            hoverBorderWidth: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#fff', font: { size: 12 } },
              position: 'bottom'
            }
          },
          cutout: '60%'
        }
      });
    }

    function createContributorsChart(contributors) {
      const ctx = document.getElementById('contributorChart').getContext('2d');
      const topContributors = contributors.slice(0, 8);
      
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: topContributors.map(c => c.login),
          datasets: [{
            label: 'Contributions',
            data: topContributors.map(c => c.contributions),
            backgroundColor: 'rgba(0, 212, 255, 0.8)',
            borderColor: '#00d4ff',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#fff' }
            }
          },
          scales: {
            x: {
              ticks: { color: '#fff', maxRotation: 45 },
              grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
              ticks: { color: '#fff' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
          }
        }
      });
    }

    function createBranchCommitChart(branchCommits) {
      if (!branchCommits || branchCommits.length === 0) return;

      const ctx = document.getElementById('branchCommitChart').getContext('2d');
      const labels = branchCommits.map(branch => branch.branch);
      const data = branchCommits.map(branch => branch.commits);

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Commits per Branch',
            data: data,
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#fff' }
            }
          },
          scales: {
            x: {
              ticks: { color: '#fff' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
              ticks: { color: '#fff' },
              grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
          }
        }
      });
    }

    function createMermaidDiagram(commits, contributors) {
      if (!commits.length) {
        document.getElementById('mermaidContainer').innerHTML = 'No commit data available';
        return;
      }

      const recentCommits = commits.slice(0, 6);
      const topContributor = contributors.length > 0 ? contributors[0].login : 'Unknown';
      
      let diagram = `graph TD
        A[📁 Repository] --> B[🔄 Recent Commits]
        A --> C[👥 Top Contributor: ${topContributor}]
        B --> D[Latest Activity]
      `;
      
      recentCommits.forEach((commit, i) => {
        const sha = commit.sha.substring(0, 7);
        const msg = commit.commit.message.substring(0, 40).replace(/["\n\r]/g, ' ').trim();
        const author = commit.commit.author.name;
        diagram += `\n        D --> E${i}["${sha}<br/>${msg}<br/>by ${author}"]`;
      });

      // Add styling
      diagram += `
        classDef default fill:#1a1a2e,stroke:#00d4ff,stroke-width:2px,color:#fff
        classDef highlight fill:#00d4ff,stroke:#fff,stroke-width:2px,color:#000
        class A highlight
      `;

      document.getElementById('mermaidContainer').innerHTML = diagram;
      mermaid.initialize({ 
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#00d4ff',
          primaryTextColor: '#fff',
          primaryBorderColor: '#00d4ff',
          lineColor: '#00d4ff'
        }
      });
      mermaid.init(undefined, document.getElementById('mermaidContainer'));
    }

    // Add keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        analyzeRepositories();
      }
    });

    // Add demo functionality
    document.getElementById('repoUrl').addEventListener('focus', function() {
      if (!this.value) {
        this.placeholder = 'Enter GitHub repository URLs separated by commas';
      }
    });

    // Add info about CORS limitations
    window.addEventListener('load', () => {
      initBackground();
      createParticles();
      
      // Show info about GitHub API usage
      const info = document.createElement('div');
      info.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 212, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 12px;
        padding: 1rem;
        color: #fff;
        font-size: 0.9rem;
        max-width: 300px;
        z-index: 1000;
      `;
      info.innerHTML = `
        <strong>ℹ️ GitHub API Info</strong><br>
        This app makes direct calls to GitHub's API. 
        Due to CORS restrictions, it may not work in all browsers. 
        For best results, use a GitHub token for authentication.
      `;
      document.body.appendChild(info);
      
      // Hide info after 10 seconds
      setTimeout(() => {
        info.style.opacity = '0';
        info.style.transition = 'opacity 1s';
        setTimeout(() => info.remove(), 1000);
      }, 10000);
    });