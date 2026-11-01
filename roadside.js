// Bords de route montagne : glissières W-beam côté ravin, murs de soutènement en pierre côté amont (instanciés).
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const ENABLE_RAILS = false; // glissières W-beam désactivées à la demande de Vincent

export function addRoadside(scene, track, terrain, halfWidth = 2) {
  const { pts, cum, length } = track, STEP = 4;
  const at = (d) => { let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const A = pts[lo], B = pts[hi], s = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / s;
    return { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, z: A.z + (B.z - A.z) * t, tx: (B.x - A.x) / s, tz: (B.z - A.z) / s }; };
  const rails = [], walls = [];
  for (let d = 0; d < length - STEP; d += STEP) {
    const p = at(d);
    if (terrain.waterAt && terrain.waterAt(p.x, p.z)) continue;
    for (const s of [1, -1]) {
      const nx = -p.tz * s, nz = p.tx * s, off = halfWidth + 1.1, x = p.x + nx * off, z = p.z + nz * off;
      const drop = p.y - terrain.heightAt(p.x + nx * 9, p.z + nz * 9);
      const rot = Math.atan2(p.tx, p.tz);
      if (ENABLE_RAILS && drop > 2.5) rails.push({ x, z, y: p.y, rot });                   // ravin → glissière (désactivé)
      else if (-drop > 4) walls.push({ x: p.x + nx * (halfWidth + 1.6), z: p.z + nz * (halfWidth + 1.6), y: p.y, rot, h: Math.min(3.2, -drop * 0.35) }); // talus → mur
    }
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), S = new THREE.Vector3();
  const steel = new THREE.MeshStandardMaterial({ color: PALETTE.road.rail, metalness: 0.7, roughness: 0.35 });
  // lisse W-beam (profil 2 ondes) + poteau, un segment par pas de 4 m
  const beam = new THREE.BoxGeometry(0.06, 0.32, STEP + 0.1); beam.translate(0, 0.62, 0);
  const groove = new THREE.BoxGeometry(0.08, 0.05, STEP + 0.1); groove.translate(-0.015, 0.62, 0);
  const post = new THREE.BoxGeometry(0.1, 0.75, 0.1); post.translate(0.08, 0.37, 0);
  for (const [g, mat] of [[beam, steel], [groove, new THREE.MeshStandardMaterial({ color: 0x7d8185, metalness: 0.6, roughness: 0.5 })], [post, steel]]) {
    if (!rails.length) break;
    const im = new THREE.InstancedMesh(g, mat, rails.length);
    rails.forEach((r, i) => im.setMatrixAt(i, m.compose(P.set(r.x, r.y, r.z), q.setFromAxisAngle(up, r.rot), S.set(1, 1, 1))));
    im.castShadow = g === beam; scene.add(im);
  }
  if (walls.length) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
    g.fillStyle = '#5d5953'; g.fillRect(0, 0, 128, 128);
    for (let k = 0; k < 90; k++) { const v = 110 + Math.random() * 70; g.fillStyle = `rgb(${v},${v * 0.97},${v * 0.9})`; g.beginPath(); g.roundRect(Math.random() * 128, Math.random() * 128, 12 + Math.random() * 18, 8 + Math.random() * 10, 3); g.fill(); }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const wg = new THREE.BoxGeometry(0.5, 1, STEP + 0.1); wg.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(wg, new THREE.MeshStandardMaterial({ map: tex, color: PALETTE.road.wall, roughness: 1 }), walls.length);
    walls.forEach((w, i) => im.setMatrixAt(i, m.compose(P.set(w.x, w.y - 0.3, w.z), q.setFromAxisAngle(up, w.rot), S.set(1, w.h + 0.3, 1))));
    im.castShadow = true; im.receiveShadow = true; scene.add(im);
  }
  return { rails: rails.length, walls: walls.length };
}
