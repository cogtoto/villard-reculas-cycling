// Mini-map 2D (canvas) du tracé GPX, vue de dessus. X = Est (droite), Z = Sud (bas).
export function createMinimap(track, size = 180, classify = null, onPick = null, colors = null) {
  const dpr = Math.min(devicePixelRatio, 2);
  const cv = document.createElement('canvas');
  cv.width = cv.height = size * dpr;
  Object.assign(cv.style, {
    position: 'fixed', top: '12px', right: '12px', width: size + 'px', height: size + 'px', zIndex: 2,
    background: 'rgba(10,14,28,.65)', borderRadius: '10px', backdropFilter: 'blur(6px)',
  });
  document.body.appendChild(cv);
  // Clic → coordonnées monde XZ (ox/oz/s définis plus bas, utilisés à l'exécution)
  if (onPick) {
    cv.style.cursor = 'pointer';
    cv.title = 'Cliquer sur le parcours pour s’y téléporter';
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      onPick(minX + (px - ox) / s, minZ + (py - oz) / s);
    });
  }
  const g = cv.getContext('2d');
  const xs = track.pts.map((p) => p.x), zs = track.pts.map((p) => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const pad = 10, s = (size - 2 * pad) / Math.max(maxX - minX, maxZ - minZ);
  const ox = pad + ((size - 2 * pad) - (maxX - minX) * s) / 2, oz = pad + ((size - 2 * pad) - (maxZ - minZ) * s) / 2;
  const P = (x, z) => [(ox + (x - minX) * s) * dpr, (oz + (z - minZ) * s) * dpr];

  // Fond pré-rendu (tracé + départ/arrivée)
  const bg = document.createElement('canvas'); bg.width = bg.height = cv.width;
  const b = bg.getContext('2d');
  // Fond terre / mer (même heuristique de côte que decor.js), cellules de 3 px
  if (classify) {
    const cell = 3, R = 10 * dpr, W = cv.width;
    b.save(); b.beginPath(); b.roundRect(0, 0, W, W, R); b.clip();
    for (let py = 0; py < size; py += cell) for (let px = 0; px < size; px += cell) {
      const x = minX + (px + cell / 2 - ox) / s, z = minZ + (py + cell / 2 - oz) / s;
      const k = classify(x, z);
      b.fillStyle = colors ? (colors[k] || 'rgba(160,180,110,.6)') : k === 'sea' ? 'rgba(45,110,175,.75)' : k === 'marsh' ? 'rgba(120,165,155,.8)' : 'rgba(160,180,110,.6)';
      b.fillRect(px * dpr, py * dpr, cell * dpr + 1, cell * dpr + 1);
    }
    b.restore();
  }
  b.lineJoin = b.lineCap = 'round';
  const path = () => { b.beginPath(); track.pts.forEach((p, i) => { const [x, y] = P(p.x, p.z); i ? b.lineTo(x, y) : b.moveTo(x, y); }); b.stroke(); };
  b.strokeStyle = 'rgba(10,14,28,.85)'; b.lineWidth = 4.5 * dpr; path(); // liseré sombre pour la lisibilité
  b.strokeStyle = '#ffe08a'; b.lineWidth = 2.5 * dpr; path();
  const dot = (p, c) => { const [x, y] = P(p.x, p.z); b.fillStyle = c; b.beginPath(); b.arc(x, y, 3 * dpr, 0, 7); b.fill(); };
  dot(track.pts[0], '#9ece6a'); dot(track.pts[track.pts.length - 1], '#f7768e');
  b.fillStyle = '#e8eefc'; b.font = `${10 * dpr}px system-ui`; b.fillText('N ↑', 6 * dpr, 14 * dpr);

  return function update(pos, dir) {
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(bg, 0, 0);
    const [x, y] = P(pos.x, pos.z), a = Math.atan2(dir.z, dir.x);
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = '#ff7a1a'; g.strokeStyle = '#fff'; g.lineWidth = 1.5 * dpr;
    g.beginPath(); g.moveTo(8 * dpr, 0); g.lineTo(-5 * dpr, 5 * dpr); g.lineTo(-2 * dpr, 0); g.lineTo(-5 * dpr, -5 * dpr); g.closePath();
    g.fill(); g.stroke(); g.restore();
  };
}
