// Chalk graffiti on the tarmac at every kilometre to the summit (Villard climb):
// "5 KM" / "1120 m" / "8.2 %" hand-painted in white, read riding uphill.
// One small canvas per mark, one flush strip mesh per mark (10 draws max, culled).
import * as THREE from 'three';
import { sampleTrack } from './gpx.js';
import { ROAD_Y_LIFT } from './road-corridor.js';

const MARK_W = 3.6;                         // metres across (asphalt is 4 m)
const TEX_W = 256, TEX_H = 1024;            // square texels: 1.4 cm each
const MARK_LEN = MARK_W * TEX_H / TEX_W;    // 14.4 m along the road

export function chalkMarkData(track) {
  const L = track.length, out = [];
  for (let k = Math.floor((L - 1) / 1000); k >= 1; k--) {
    const d = L - k * 1000;
    if (d < 60) continue;
    const y0 = sampleTrack(track, d).pos.y, d1 = Math.min(L, d + 1000), y1 = sampleTrack(track, d1).pos.y;
    out.push({ d, start: d - 2, len: MARK_LEN, km: k, alt: Math.round(y0), grade: ((y1 - y0) / (d1 - d)) * 100 });
  }
  return out;
}

let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

function chalkLine(g, text, cx, cy, maxW, stretch, tilt) {
  g.save();
  g.translate(cx, cy); g.rotate(tilt); g.scale(1, stretch);
  let size = 120; const font = (z) => `900 ${z}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  g.font = font(size); size = Math.min(size, size * maxW / g.measureText(text).width); g.font = font(size);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  // several shaky passes = hand-painted stroke
  for (let p = 0; p < 4; p++) {
    g.strokeStyle = `rgba(250,250,245,${0.35 + rnd() * 0.25})`;
    g.lineWidth = size * (0.06 + rnd() * 0.04);
    g.strokeText(text, (rnd() - 0.5) * 3, (rnd() - 0.5) * 2);
  }
  g.fillStyle = 'rgba(248,248,242,0.88)';
  g.fillText(text, (rnd() - 0.5) * 2, (rnd() - 0.5) * 1.5);
  g.restore();
  return size * stretch;
}

export function makeChalkTexture({ km, alt, grade }) {
  const cv = document.createElement('canvas'); cv.width = TEX_W; cv.height = TEX_H;
  const g = cv.getContext('2d');
  // canvas top = uphill (far), bottom = towards the rider; text reads top → bottom
  // From the saddle the road is seen at a grazing angle, so letters are drawn
  // elongated, and the far line (km) the most: all three read about the same size.
  chalkLine(g, `${km} KM`, TEX_W / 2, TEX_H * 0.2, 236, 4.3, (rnd() - 0.5) * 0.04);
  g.strokeStyle = 'rgba(250,250,245,0.85)'; g.lineWidth = 9; g.lineCap = 'round';   // fan's underline
  g.beginPath(); g.moveTo(TEX_W * 0.12, TEX_H * 0.425); g.quadraticCurveTo(TEX_W * 0.5, TEX_H * 0.445, TEX_W * 0.9, TEX_H * 0.42); g.stroke();
  chalkLine(g, `${alt} m`, TEX_W / 2, TEX_H * 0.59, 210, 3.0, (rnd() - 0.5) * 0.05);
  chalkLine(g, `${grade.toFixed(1)}%`, TEX_W / 2, TEX_H * 0.84, 210, 2.5, (rnd() - 0.5) * 0.05);
  // chalk texture: erase speckles and dry streaks so the asphalt shows through
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 5200; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + rnd() * 0.7})`; g.fillRect(rnd() * TEX_W, rnd() * TEX_H, 1 + rnd() * 2.2, 1 + rnd() * 3); }
  for (let i = 0; i < 140; i++) { g.strokeStyle = `rgba(0,0,0,${0.25 + rnd() * 0.35})`; g.lineWidth = 1 + rnd() * 2; const x = rnd() * TEX_W, y = rnd() * TEX_H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 30, y + (rnd() - 0.5) * 8); g.stroke(); }
  g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// Strip that follows the road ribbon (same centreline, same height + 1.5 cm).
function markGeometry(track, d0) {
  const STEP = 0.5, n = Math.round(MARK_LEN / STEP) + 1, pos = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) {
    const s = sampleTrack(track, d0 + i * STEP), nx = -s.dir.z, nz = s.dir.x, y = s.pos.y + ROAD_Y_LIFT + 0.015, h = MARK_W / 2;
    // v = 1 at the far (uphill) end = canvas top (flipY)
    const v = i / (n - 1);
    pos.push(s.pos.x + nx * h, y, s.pos.z + nz * h, s.pos.x - nx * h, y, s.pos.z - nz * h);
    uv.push(1, v, 0, v);
    if (i < n - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}

export function addChalkMarks(scene, track) {
  const marks = chalkMarkData(track);
  for (const m of marks) {
    const mat = new THREE.MeshStandardMaterial({
      map: makeChalkTexture(m), transparent: true, depthWrite: false, roughness: 1,
      polygonOffset: true, polygonOffsetFactor: -10, polygonOffsetUnits: -16, side: THREE.DoubleSide
    });
    // text starts a few metres before the exact km point so the km line sits on it
    const mesh = new THREE.Mesh(markGeometry(track, m.d - 2), mat);
    mesh.renderOrder = 4; mesh.receiveShadow = true;
    scene.add(mesh);
  }
  return marks;
}
