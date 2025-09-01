// Small, reusable helpers

export function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) throw new Error(`Invalid GitHub repository URL format: ${url}`);
  return { owner: match[1], repo: match[2].replace(/\.git$/i, '') };
}

export function showError(message) {
  const errorBox = document.getElementById('error');
  if (!errorBox) return;
  
  errorBox.textContent = '❌ ' + message;
  errorBox.style.display = 'block';

  // hide after 5 seconds
  setTimeout(() => {
    errorBox.style.display = 'none';
    errorBox.textContent = '';
  }, 5000);
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const iconMap = {
    js:'📄', jsx:'⚛️', ts:'📘', tsx:'⚛️',
    py:'🐍', java:'☕', cpp:'⚙️', c:'⚙️',
    html:'🌐', css:'🎨', scss:'🎨', sass:'🎨',
    json:'📋', xml:'📄', yaml:'📄', yml:'📄',
    md:'📝', txt:'📄', pdf:'📕',
    png:'🖼️', jpg:'🖼️', jpeg:'🖼️', gif:'🖼️', svg:'🖼️',
    mp4:'🎥', avi:'🎥', mov:'🎥',
    mp3:'🎵', wav:'🎵', flac:'🎵',
    zip:'📦', tar:'📦', gz:'📦', rar:'📦',
    sql:'🗃️', db:'🗃️',
    sh:'⚡', bat:'⚡', ps1:'⚡'
  };
  return iconMap[ext] || '📄';
}
