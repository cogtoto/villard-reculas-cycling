// Chalets alpins en bois (madriers) — 3 variantes, géométries fusionnées + InstancedMesh (1 draw call par matériau et variante).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeRoofGeometry } from './decor.js';
import { PALETTE } from './palette.js';

let seed = 4242;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// ---------- textures procédurales ----------
function canvasTex(size, draw, rep = 1) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  t.repeat.set(rep, rep); return t;
}
// madriers : 8 rondins de ~30 cm pour 2,4 m, ombrés en arrondi, veinage, joints sombres
const logTex = () => canvasTex(256, (g, S) => {
  const n = 8, h = S / n;
  for (let r = 0; r < n; r++) {
    const y = r * h, base = 150 + rand() * 30;
    const grd = g.createLinearGradient(0, y, 0, y + h);
    const L = (k) => `rgb(${base * k * 1.45},${base * k * 1.4},${base * k * 1.32})`; // texture neutre, couleur via teinte d'instance
    grd.addColorStop(0, L(0.55)); grd.addColorStop(0.35, L(1)); grd.addColorStop(0.8, L(0.82)); grd.addColorStop(1, L(0.38));
    g.fillStyle = grd; g.fillRect(0, y, S, h);
    for (let k = 0; k < 14; k++) { // veinage
      g.strokeStyle = `rgba(60,35,18,${0.08 + rand() * 0.14})`; g.lineWidth = 0.6 + rand();
      const yy = y + 3 + rand() * (h - 6); g.beginPath(); g.moveTo(0, yy);
      for (let x = 0; x <= S; x += 16) g.lineTo(x, yy + Math.sin(x * 0.05 + k) * 1.2);
      g.stroke();
    }
    for (let k = 0; k < 2; k++) { g.fillStyle = 'rgba(70,40,20,.45)'; g.beginPath(); g.ellipse(rand() * S, y + h / 2, 3 + rand() * 3, 2, 0, 0, 7); g.fill(); } // nœuds
    g.fillStyle = 'rgba(25,14,6,.85)'; g.fillRect(0, y + h - 1.5, S, 1.5);
  }
});
const plankTex = () => canvasTex(128, (g, S) => { // planches verticales (balcon, pignon)
  for (let i = 0; i < 8; i++) { const b = 175 + rand() * 50; g.fillStyle = `rgb(${b},${b * 0.96},${b * 0.9})`; g.fillRect(i * 16, 0, 16, S);
    g.fillStyle = 'rgba(30,16,8,.7)'; g.fillRect(i * 16 + 15, 0, 1, S); }
});
const stoneTex = () => canvasTex(256, (g, S) => {
  g.fillStyle = '#8b877e'; g.fillRect(0, 0, S, S);
  for (let k = 0; k < 140; k++) {
    const x = rand() * S, y = rand() * S, w = 14 + rand() * 26, h = 9 + rand() * 14, v = 120 + rand() * 70;
    g.fillStyle = `rgb(${v},${v * 0.97},${v * 0.9})`; g.strokeStyle = 'rgba(50,48,44,.8)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x, y, w, h, 4); g.fill(); g.stroke();
  }
});
const roofTex = () => canvasTex(256, (g, S) => { // bardeaux / lauzes en rangées décalées
  g.fillStyle = '#6a6a6c'; g.fillRect(0, 0, S, S);
  const rh = 16;
  for (let r = 0; r < S / rh; r++) for (let x = -((r % 2) * 10); x < S; x += 20) {
    const v = 150 + rand() * 60; g.fillStyle = `rgb(${v},${v},${v * 1.02})`; g.fillRect(x + 1, r * rh, 18, rh - 2);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 1, r * rh + rh - 4, 18, 2);
  }
});

// UV planaires en mètres (projection selon l'axe dominant de la normale), tuilage = 2,4 m
function planarUV(geo, scale = 1 / 2.4) {
  geo = geo.index ? geo.toNonIndexed() : geo; geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay > ax && ay > az) { u = p.getX(i); v = p.getZ(i); } else if (ax > az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u * scale; uv[i * 2 + 1] = v * scale;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
const box = (w, h, d, x, y, z, rx = 0, col) => {
  const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z);
  const o = planarUV(g);
  if (col !== undefined) { const c = new THREE.Color(col), a = new Float32Array(o.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; } o.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
  return o;
};

// ---------- géométrie d'une variante (pignon + balcon côté +X = face à la route) ----------
function chaletParts(o) {
  const { W, D, floors, balcony, terrace, chimney } = o; // W le long de X (faîtage), D en Z
  const hb = 1.1, hw = 2.7 * floors, pitch = THREE.MathUtils.degToRad(o.pitch), rh = (D / 2) * Math.tan(pitch), top = hb + hw + rh;
  const P = { stone: [], render: [], wood: [], plank: [], roof: [], trim: [], solar: [] };
  P.stone.push(box(W + 0.3, hb + 2, D + 0.3, 0, (hb - 2) / 2, 0));            // soubassement pierre (enterré de 2 m)
  if (o.renderGround && floors > 1) { // RDC crépi beige, étages en madriers
    P.render.push(box(W + 0.06, 2.7, D + 0.06, 0, hb + 1.35, 0));
    P.wood.push(box(W, hw - 2.7, D, 0, hb + 2.7 + (hw - 2.7) / 2, 0));
  } else P.wood.push(box(W, hw, D, 0, hb + hw / 2, 0));                        // madriers
  const gable = makeRoofGeometry(); gable.scale(W, rh, D); gable.translate(0, hb + hw, 0); P.plank.push(planarUV(gable)); // pignons en planches
  // toit 2 pans débordant (rives + avant-toit côté balcon)
  const ovZ = 1.0, ovX = 1.1, L = (D / 2 + ovZ) / Math.cos(pitch), th = 0.22;
  for (const sgn of [1, -1]) {
    const g = new THREE.BoxGeometry(W + ovX * 2, th, L); g.rotateX(sgn * pitch);
    g.translate(0.2, top - Math.sin(pitch) * L / 2 + Math.cos(pitch) * th / 2 + 0.05, sgn * Math.cos(pitch) * L / 2);
    P.roof.push(planarUV(g, 1 / 3));
    if (sgn === 1) { // panneaux solaires sombres sur le pan avant (instanciés seulement sur certains chalets)
      const sp = new THREE.BoxGeometry(W * 0.5, 0.05, L * 0.5); sp.rotateX(pitch);
      sp.translate(-W * 0.1, top - Math.sin(pitch) * L * 0.45 + Math.cos(pitch) * (th + 0.06), Math.cos(pitch) * L * 0.45); P.solar.push(planarUV(sp));
    }
    // planche de rive sous le pan (bois sombre)
    P.plank.push(box(0.12, 0.35, L, W / 2 + ovX + 0.2, 0, 0, 0)); P.plank[P.plank.length - 1].rotateX(sgn * pitch).translate(0, top - Math.sin(pitch) * L / 2 - 0.1, sgn * Math.cos(pitch) * L / 2);
  }
  P.plank.push(box(W + ovX * 2 + 0.2, 0.25, 0.25, 0.2, top + 0.12, 0));       // faîtage
  // pannes apparentes sous l'avant-toit, côté pignon
  for (const z of [-D / 4, 0, D / 4]) P.plank.push(box(ovX + 0.4, 0.2, 0.2, W / 2 + ovX / 2, top - Math.abs(z) * Math.tan(pitch) - 0.25, z));
  // fenêtres + volets (vertex colors)
  const glass = 0x1f2a33, frame = 0xe8dcc4, shut = o.shutter;
  const win = (x, y, z, face) => { // face: 'x' (pignon +X) ou 'z+' / 'z-'
    if (face === 'x') {
      P.trim.push(box(0.12, 1.25, 1.0, x, y, z, 0, frame), box(0.14, 1.05, 0.8, x + 0.02, y, z, 0, glass));
      P.trim.push(box(0.08, 1.25, 0.5, x + 0.04, y, z - 0.78, 0, shut), box(0.08, 1.25, 0.5, x + 0.04, y, z + 0.78, 0, shut));
    } else { const s = face === 'z+' ? 1 : -1;
      P.trim.push(box(1.0, 1.25, 0.12, x, y, z, 0, frame), box(0.8, 1.05, 0.14, x, y, z + 0.02 * s, 0, glass));
      P.trim.push(box(0.5, 1.25, 0.08, x - 0.78, y, z + 0.04 * s, 0, shut), box(0.5, 1.25, 0.08, x + 0.78, y, z + 0.04 * s, 0, shut));
    }
  };
  for (let f = 0; f < floors; f++) {
    const y = hb + 1.45 + f * 2.7;
    for (const z of D > 8.5 ? [-D / 3.2, 0, D / 3.2] : [-D / 4, D / 4]) win(W / 2 + 0.02, y, z, 'x');
    for (const x of W > 9 ? [-W / 3, 0, W / 3] : [-W / 4, W / 4]) { if (!(f === 0 && o.garage && x <= 0)) win(x, y, D / 2 + 0.02, 'z+'); win(x, y, -D / 2 - 0.02, 'z-'); }
  }
  P.trim.push(box(0.12, 2.1, 1.1, W / 2 + 0.02, hb + 1.05, 0, 0, 0x5a3a22)); // porte
  if (o.garage) for (let k = 0; k < 9; k++) // porte de garage en planches verticales orange-brun
    P.trim.push(box(0.3, 2.3, 0.12, -W / 4 - 1.2 + k * 0.3 + 0.15, hb + 1.15 - 0.6, D / 2 + 0.05, 0, k % 2 ? PALETTE.chalet.garage : 0xa65a27));
  win(W / 2 + 0.02, hb + hw + rh * 0.4, 0, 'x');                             // fenêtre de pignon
  // balcon à barreaux sur le pignon
  const railing = (y0, depth, span, withPosts) => {
    const xo = W / 2 + depth;
    P.plank.push(box(depth + 0.1, 0.2, span, W / 2 + depth / 2, y0, 0));      // plancher
    P.plank.push(box(0.12, 0.12, span, xo, y0 + 1.0, 0), box(0.1, 0.1, span, xo, y0 + 0.2, 0)); // lisses
    for (const s of [-1, 1]) P.plank.push(box(depth, 0.12, 0.12, W / 2 + depth / 2, y0 + 1.0, s * span / 2));
    for (let z = -span / 2; z <= span / 2 + 0.01; z += 0.22) P.plank.push(box(0.06, 0.8, 0.14, xo, y0 + 0.6, z)); // barreaux
    for (const s of [-1, 1]) for (let x = W / 2 + 0.3; x < xo; x += 0.22) P.plank.push(box(0.14, 0.8, 0.06, x, y0 + 0.6, s * span / 2));
    if (withPosts) for (const s of [-1, 1]) P.plank.push(box(0.22, y0 + 2, 0.22, xo - 0.1, (y0 - 2) / 2, s * (span / 2 - 0.1)));
    for (const s of [-1, 1]) P.plank.push(box(depth, 0.18, 0.18, W / 2 + depth / 2, y0 - 0.15, s * span * 0.3)); // consoles
  };
  if (balcony) for (let f = 1; f < floors + (o.atticBalcony ? 1 : 0); f++) railing(hb + f * 2.7, 1.5, D + 0.2, true); // balcon pleine largeur
  if (terrace) railing(hb, 2.6, D + 0.3, true);
  if (chimney) { const cx = -W * 0.25, cz = -D * 0.22, cy = top - Math.abs(cz) * Math.tan(pitch);
    P.stone.push(box(0.75, 2.4, 0.75, cx, cy + 0.4, cz)); P.roof.push(box(1.0, 0.12, 1.0, cx, cy + 1.65, cz)); }
  const out = {}; for (const k in P) out[k] = P[k].length ? mergeGeometries(P[k].map((g) => { if (k !== 'trim') g.deleteAttribute('color'); return g; })) : null;
  return out;
}
const VARIANTS = [
  { W: 8, D: 7, floors: 1, pitch: 24, balcony: false, terrace: true, chimney: true, shutter: PALETTE.chalet.shutters[0] },   // mazot / petit chalet
  { W: 10, D: 8.5, floors: 2, pitch: 22, balcony: true, terrace: false, chimney: true, atticBalcony: true, renderGround: true, shutter: PALETTE.chalet.shutters[1] }, // chalet classique
  { W: 13, D: 10, floors: 2, pitch: 20, balcony: true, terrace: true, chimney: true, renderGround: true, garage: true, shutter: PALETTE.chalet.shutters[2] },   // grand chalet / ferme
];

// ---------- placement : village de départ + hameaux le long de la route ----------
export function addChalets(scene, track, terrain, { village = 34, hamlets = 70 } = {}) {
  const { pts, cum, length } = track, list = [];
  const ok = (x, z, r2 = 260) => terrain.distTo(x, z) > 11 && terrain.slopeAt(x, z) < 0.55 && !(terrain.waterAt && terrain.waterAt(x, z))
    && terrain.classify(x, z) !== 'rock' && terrain.classify(x, z) !== 'snow' && !list.some((h) => (h.x - x) ** 2 + (h.z - z) ** 2 < r2);
  const push = (x, z) => {
    const near = nearestRoad(x, z), fx = near.x - x, fz = near.z - z, L = Math.hypot(fx, fz) || 1;
    const v = rand() < 0.3 ? 0 : rand() < 0.7 ? 1 : 2, V = VARIANTS[v];
    const rot = Math.atan2(-fz / L, fx / L) + (rand() - 0.5) * 0.4;   // pignon/balcon (+X) tourné vers la route
    let y = Infinity; const c = Math.cos(rot), s = Math.sin(rot);
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const lx = a * V.W / 2, lz = b * V.D / 2; y = Math.min(y, terrain.heightAt(x + lx * c + lz * s, z - lx * s + lz * c)); }
    list.push({ x, z, y: y - 0.15, rot, v, wood: rand(), roof: rand(), solar: rand() < 0.3 });
  };
  const nearestRoad = (x, z) => { let b = Infinity, p0 = pts[0]; for (let i = 0; i < pts.length; i += 1) { const p = pts[i], d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < b) { b = d; p0 = p; } } return p0; };
  const s0 = pts[0];
  for (let t = 0; t < 3000 && list.length < village; t++) { const a = rand() * 6.28, r = 18 + rand() * 240, x = s0.x + Math.cos(a) * r, z = s0.z + Math.sin(a) * r; if (ok(x, z, 300)) push(x, z); }
  const along = (d) => { let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const A = pts[lo], B = pts[hi], sl = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / sl; return { x: A.x + (B.x - A.x) * t, z: A.z + (B.z - A.z) * t, tx: (B.x - A.x) / sl, tz: (B.z - A.z) / sl }; };
  const nv = list.length;
  for (let d = 700; d < length - 300 && list.length - nv < hamlets; d += 1100 + rand() * 1600) {
    const n = 3 + Math.floor(rand() * 6);
    for (let i = 0; i < n * 3 && list.length - nv < hamlets; i++) {
      const p = along(d + rand() * 160), side = rand() < 0.5 ? 1 : -1, off = 15 + rand() * 30;
      const x = p.x - p.tz * side * off, z = p.z + p.tx * side * off; if (ok(x, z)) push(x, z);
    }
  }
  // matériaux partagés
  const mats = {
    stone: new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.95 }),
    wood: new THREE.MeshStandardMaterial({ map: logTex(), roughness: 0.85 }),
    plank: new THREE.MeshStandardMaterial({ map: plankTex(), roughness: 0.85, color: 0xb99a80 }),
    roof: new THREE.MeshStandardMaterial({ map: roofTex(), roughness: 0.9 }),
    trim: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
    render: new THREE.MeshStandardMaterial({ map: stoneTex(), color: PALETTE.chalet.render, roughness: 1 }),
    solar: new THREE.MeshStandardMaterial({ color: PALETTE.chalet.solar, roughness: 0.25, metalness: 0.6 }),
  };
  const woodTints = PALETTE.chalet.woodTints.map((c) => new THREE.Color(c)); // miel → bois vieilli
  const roofTints = PALETTE.chalet.roofTints.map((c) => new THREE.Color(c));            // lauze / ardoise / bardeau
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  VARIANTS.forEach((V, vi) => {
    const items = list.filter((h) => h.v === vi); if (!items.length) return;
    const parts = chaletParts(V);
    for (const k in parts) {
      if (!parts[k]) continue;
      const its = k === 'solar' ? items.filter((h) => h.solar) : items; if (!its.length) continue;
      const im = new THREE.InstancedMesh(parts[k], mats[k], its.length);
      its.forEach((h, i) => {
        im.setMatrixAt(i, m.compose(P.set(h.x, h.y, h.z), q.setFromAxisAngle(up, h.rot), one));
        if (k === 'wood' || k === 'plank') im.setColorAt(i, woodTints[Math.floor(h.wood * woodTints.length)]);
        if (k === 'roof') im.setColorAt(i, roofTints[Math.floor(h.roof * roofTints.length)]);
      });
      im.castShadow = k !== 'trim'; im.receiveShadow = true; scene.add(im);
    }
  });
  terrain.houses.push(...list);
  return { village: nv, hamlets: list.length - nv };
}
