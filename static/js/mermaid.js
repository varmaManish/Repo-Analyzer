export function initializeMermaid() {
  if (typeof mermaid === 'undefined') return;
  mermaid.initialize({
    theme: 'dark',
    darkMode: true,
    themeVariables: {
      primaryColor: '#00d4ff',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#00d4ff',
      lineColor: '#ffffff',
      secondaryColor: '#ff0080',
      tertiaryColor: '#00ff88',
      background: 'transparent',
      mainBkg: 'rgba(255, 255, 255, 0.1)',
      secondaryBkg: 'rgba(0, 212, 255, 0.1)',
      tertiaryBkg: 'rgba(255, 0, 128, 0.1)'
    },
    flowchart: { nodeSpacing: 50, rankSpacing: 50, curve: 'basis' }
  });
}

export function generateMermaidDiagram(repo, commits, contributors) {
  const container = document.getElementById('mermaidContainer');
  if (!container) return;
  try {
    if (!commits || commits.length === 0) {
      container.innerHTML = '<div class="error-message">No commit data available for diagram</div>';
      return;
    }
    const recent = commits.slice(0, 5);
    const topContributor = (contributors?.[0]?.login || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
    const repoName = (repo?.name || 'Repository').replace(/[^a-zA-Z0-9]/g, '_');

    let diagram = `graph TD
A[📁 ${repoName}] --> B[🔄 Recent Commits]
A --> C[👥 Top Contributor: ${topContributor}]
B --> D[Latest Activity]`;

    recent.forEach((commit, i) => {
      const sha = commit.sha ? commit.sha.substring(0, 7) : 'N/A';
      const msg = commit.commit?.message?.split('\n')[0]?.substring(0, 30)?.replace(/[^\w\s]/g, '') || 'No message';
      const author = commit.commit?.author?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Unknown';
      diagram += `\nD --> E${i}["${sha}<br/>${msg}<br/>by ${author}"]`;
    });

    const id = `diagram-${Date.now()}`;
    container.innerHTML = `<div class="mermaid" id="${id}">${diagram}</div>`;
    if (typeof mermaid !== 'undefined') mermaid.init(undefined, `#${id}`);
  } catch (e) {
    console.error('Mermaid error', e);
    container.innerHTML = `<div class="error-message">Error generating diagram: ${e.message}</div>`;
  }
}
