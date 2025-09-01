// Three.js animated background + floating particles
let scene, camera, renderer;

export function initBackground() {
  const canvas = document.getElementById('canvas-bg');
  if (!canvas || typeof THREE === 'undefined') return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Particles
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

  const material = new THREE.PointsMaterial({ size: 2, vertexColors: true, transparent: true, opacity: 0.8 });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  camera.position.z = 1000;
  animate(points);

  window.addEventListener('resize', onResize);
  createParticles();
}

function animate(points) {
  requestAnimationFrame(() => animate(points));

  const pos = points.geometry.attributes.position.array;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i + 1] -= 0.5;
    if (pos[i + 1] < -1000) pos[i + 1] = 1000;
  }
  points.geometry.attributes.position.needsUpdate = true;
  points.rotation.y += 0.001;
  renderer.render(scene, camera);
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  setInterval(() => {
    if (container.children.length < 20) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 2 + 's';
      container.appendChild(particle);
      setTimeout(() => particle.remove(), 6000);
    }
  }, 300);
}
