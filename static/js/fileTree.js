import { fetchRepositoryContents } from './api.js';
import { formatBytes, getFileIcon } from './utils.js';

export async function loadFileTree(owner, repo, token) {
  const container = document.getElementById('fileTree');
  if (!container) return;
  try {
    container.innerHTML = '<div class="loading-tree">Loading file structure...</div>';
    const data = await fetchRepositoryContents(owner, repo, token);
    renderFileTree(container, data.contents, owner, repo, token, '');
  } catch (e) {
    console.error(e);
    container.innerHTML = `<div class="error-message">Failed to load file structure: ${e.message}</div>`;
  }
}

function renderFileTree(container, contents, owner, repo, token, currentPath = '') {
  if (!contents || contents.length === 0) {
    container.innerHTML = '<div class="empty-tree">No files found</div>';
    return;
  }

  const treeHtml = contents.map(item => {
    const icon = item.type === 'dir' ? '📁' : getFileIcon(item.name);
    const sizeInfo = item.type === 'file' && item.size ? `<span class="file-size">(${formatBytes(item.size)})</span>` : '';
    const itemClass = item.type === 'dir' ? 'tree-directory' : 'tree-file';
    return `
      <div class="tree-item ${itemClass}" data-path="${item.path}" data-type="${item.type}">
        <span class="tree-icon">${icon}</span>
        <span class="tree-name">${item.name}</span>
        ${sizeInfo}
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="file-tree-header">
      <h4>📂 File Structure ${currentPath ? `- ${currentPath}` : ''}</h4>
    </div>
    <div class="tree-content">${treeHtml}</div>
  `;

  container.querySelectorAll('.tree-directory').forEach(dir => {
    dir.addEventListener('click', async () => {
      await loadSubDirectory(container, owner, repo, token, dir.dataset.path);
    });
  });
  container.querySelectorAll('.tree-file').forEach(file => {
    file.addEventListener('click', () => {
      const name = file.querySelector('.tree-name').textContent;
      const data = contents.find(i => i.name === name);
      showFileInfo(name, data);
    });
  });
}

async function loadSubDirectory(container, owner, repo, token, path) {
  try {
    container.innerHTML = '<div class="loading-tree">Loading subdirectory...</div>';
    const data = await fetchRepositoryContents(owner, repo, token, path);
    renderFileTree(container, data.contents, owner, repo, token, path);

    const backButton = `
      <div class="tree-item tree-back" role="button">
        <span class="tree-icon">🔙</span>
        <span class="tree-name">Back to root</span>
      </div>`;
    const treeContent = container.querySelector('.tree-content');
    if (treeContent) {
      treeContent.insertAdjacentHTML('afterbegin', backButton);
      treeContent.querySelector('.tree-back').addEventListener('click', () => loadFileTree(owner, repo, token));
    }
  } catch (e) {
    console.error(e);
    container.innerHTML = `<div class="error-message">Failed to load directory: ${e.message}</div>`;
  }
}

function showFileInfo(fileName, fileData) {
  if (!fileData) return;
  const modal = document.createElement('div');
  modal.className = 'file-info-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>📄 ${fileName}</h3>
        <button class="close-modal" aria-label="Close">✖️</button>
      </div>
      <div class="modal-body">
        <p><strong>Path:</strong> ${fileData.path}</p>
        <p><strong>Size:</strong> ${formatBytes(fileData.size)}</p>
        <p><strong>Type:</strong> ${fileData.type}</p>
        ${fileData.html_url ? `<p><strong>View on GitHub:</strong> <a href="${fileData.html_url}" target="_blank" rel="noopener noreferrer">Open</a></p>` : ''}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.classList.contains('close-modal')) modal.remove();
  });
}
