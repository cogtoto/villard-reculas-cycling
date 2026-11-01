// Vélo route aéro carbone noir (logo VAN RYSEL) + cycliste animé (pédalage IK) — Three.js pur, ~40 meshes.
// Repère local : +Z = avant, +Y = haut, X = latéral. Unités : mètres.
import * as THREE from 'three';

const V = (y, z, x = 0) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 10);
const unitBox = new THREE.BoxGeometry(1, 1, 1);

// segment orienté de a à b (cylindre ou box aéro : sx = largeur latérale, sz = profondeur)
function seg(mesh, a, b, sx, sz = sx) {
  const d = new THREE.Vector3().subVectors(b, a), L = d.length();
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / (L || 1)));
  mesh.scale.set(sx, L, sz);
  return mesh;
}

function logoTexture() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, 512, 64);
  g.font = 'italic 900 50px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#f2f2f2'; g.fillText('VAN RYSEL', 256, 34);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function createRider() {
  const group = new THREE.Group();
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, ...o });
  const carbon = M(0x0c0d0f, { metalness: 0.55, roughness: 0.28 });      // cadre noir carbone verni
  const matte = M(0x111214, { roughness: 0.7 });
  const rubber = M(0x1a1a1a, { roughness: 0.9 });
  const silver = M(0xb8bcc2, { metalness: 0.9, roughness: 0.3 });
  const jersey = M(0xf4f4f2, { roughness: 0.7 });   // maillot blanc
  const shorts = M(0x121317, { roughness: 0.75 });  // cuissard noir
  const skin = M(0xd29a74, { roughness: 0.7 });
  const white = M(0xf3f3f0, { roughness: 0.5 });
  const lens = M(0xb9c4cf, { metalness: 1, roughness: 0.08 });
  const add = (geo, mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; group.add(m); return m; };
  const tube = (a, b, w, d, mat = carbon) => seg(add(unitBox, mat), a, b, w, d);

  // --- géométrie du cadre (taille M) ---
  const R = V(0.34, -0.5), F = V(0.34, 0.5), BB = V(0.27, -0.08);
  const ST = V(0.80, -0.24), HT = V(0.80, 0.40), HB = V(0.64, 0.45), SS = V(0.74, -0.215);
  tube(BB, HB, 0.045, 0.075);                      // tube diagonal aéro
  tube(ST, HT, 0.035, 0.05);                        // tube horizontal (plongeant)
  tube(BB, ST, 0.04, 0.07);                         // tube de selle profilé
  tube(HB, HT, 0.045, 0.07);                        // douille de direction
  for (const x of [-0.055, 0.055]) {
    tube(V(BB.y, BB.z, x * 0.6), V(R.y, R.z, x), 0.022, 0.035); // bases
    tube(V(SS.y, SS.z, x * 0.4), V(R.y, R.z, x), 0.018, 0.03);  // haubans bas
    tube(V(HB.y, HB.z, x * 0.7), V(F.y, F.z, x), 0.022, 0.045); // fourche aéro
  }
  tube(ST, V(0.93, -0.29), 0.03, 0.05);             // tige de selle aéro
  const saddle = add(unitBox, matte); saddle.position.set(0, 0.945, -0.3); saddle.scale.set(0.13, 0.035, 0.27);
  // cockpit intégré : potence + cintre aplati + cocottes + drops
  tube(HT, V(0.84, 0.52), 0.04, 0.05);
  const bar = add(unitBox, carbon); bar.position.set(0, 0.845, 0.54); bar.scale.set(0.42, 0.022, 0.06);
  for (const x of [-0.2, 0.2]) {
    tube(V(0.85, 0.56, x), V(0.88, 0.66, x), 0.03, 0.04, matte);          // cocottes
    tube(V(0.84, 0.56, x), V(0.72, 0.6, x), 0.024, 0.024, matte);         // drops
    tube(V(0.72, 0.6, x), V(0.69, 0.52, x), 0.024, 0.024, matte);
  }
  // logo VAN RYSEL des deux côtés du tube diagonal
  const logoMat = new THREE.MeshBasicMaterial({ map: logoTexture(), transparent: true, depthWrite: false, toneMapped: false });
  const mid = BB.clone().lerp(HB, 0.5);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.055), logoMat);
    p.position.set(s * 0.0235, mid.y, mid.z);
    const n = new THREE.Vector3(s, 0, 0), xa = new THREE.Vector3().subVectors(HB, BB).normalize().multiplyScalar(-s);
    p.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xa, new THREE.Vector3().crossVectors(n, xa), n)); // texte lisible des deux côtés
    group.add(p);
  }
  // bidon sur le tube de selle/diagonal
  const bid = add(unitCyl, white); seg(bid, V(0.36, 0.05), V(0.55, 0.22), 0.034, 0.034);

  // --- roues profondes (jantes 60 mm noires), pneus, rayons, disques ---
  const wheels = [];
  const rimG = new THREE.TorusGeometry(0.295, 0.03, 8, 40); rimG.scale(1, 1, 0.45);
  const tireG = new THREE.TorusGeometry(0.335, 0.013, 6, 48);
  const deepG = new THREE.RingGeometry(0.27, 0.325, 40);
  const spokeG = new THREE.BoxGeometry(0.004, 0.27, 0.004); spokeG.translate(0, 0.135, 0);
  for (const c of [R, F]) {
    const w = new THREE.Group(); w.position.copy(c); w.rotation.y = Math.PI / 2;
    const rim = new THREE.Mesh(rimG, carbon); rim.castShadow = true;
    const tire = new THREE.Mesh(tireG, rubber); tire.castShadow = true;
    const deep = new THREE.Mesh(deepG, M(0x0a0a0b, { roughness: 0.35, metalness: 0.3, side: THREE.DoubleSide }));
    w.add(rim, tire, deep);
    for (let i = 0; i < 24; i++) { const s = new THREE.Mesh(spokeG, matte); s.rotation.z = (i / 24) * Math.PI * 2; s.position.z = i % 2 ? 0.012 : -0.012; w.add(s); }
    const hub = new THREE.Mesh(unitCyl, silver); hub.scale.set(0.025, 0.1, 0.025); hub.rotation.x = Math.PI / 2; w.add(hub);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.003, 24), silver); disc.rotation.x = Math.PI / 2; disc.position.z = -0.05; w.add(disc);
    group.add(w); wheels.push(w);
  }
  // étriers de frein
  for (const c of [R, F]) { const e = add(unitBox, matte); e.position.set(-0.055, c.y + 0.06, c.z + (c === F ? -0.06 : 0.06)); e.scale.set(0.02, 0.05, 0.08); }

  // --- pédalier ---
  const crank = new THREE.Group(); crank.position.copy(BB); group.add(crank);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.006, 32), M(0x222428, { metalness: 0.8, roughness: 0.35 }));
  ring.rotation.z = Math.PI / 2; ring.position.x = 0.07; crank.add(ring);
  const crankArms = [];
  for (const s of [1, -1]) { const a = new THREE.Mesh(unitBox, matte); a.scale.set(0.015, 0.17, 0.03); a.position.set(s * 0.085, s * 0.085, 0); crank.add(a); crankArms.push(a); }
  tube(V(0.27, -0.08, 0.07), V(0.34, -0.5, 0.07), 0.006, 0.006, matte); // chaîne (simplifiée)

  // --- cycliste ---
  const HIP = V(1.0, -0.22), SH = V(1.33, 0.24);
  const torso = add(new THREE.CapsuleGeometry(1, 1, 4, 10), jersey);
  seg(torso, HIP, SH, 0.14, 0.11); torso.scale.y = HIP.distanceTo(SH) - 0.2;
  const pelvis = add(new THREE.SphereGeometry(0.15, 12, 8), shorts); pelvis.position.copy(HIP); pelvis.scale.set(1.05, 0.8, 1);
  const neck = add(unitCyl, skin); seg(neck, V(1.36, 0.26), V(1.43, 0.33), 0.045);
  const head = add(new THREE.SphereGeometry(0.095, 14, 10), skin); head.position.set(0, 1.47, 0.37);
  const helmet = add(new THREE.SphereGeometry(0.125, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), M(0x1f5fd1, { roughness: 0.35, metalness: 0.2 }));
  helmet.position.set(0, 1.49, 0.34); helmet.rotation.x = 0.35; helmet.scale.set(0.95, 0.9, 1.15);
  for (const x of [-0.05, 0.05]) { const v = add(unitBox, M(0x123a80)); v.position.set(x, 1.6, 0.34); v.scale.set(0.025, 0.012, 0.18); } // aérations
  const glasses = add(new THREE.SphereGeometry(0.1, 16, 6, -Math.PI * 0.4, Math.PI * 0.8, Math.PI * 0.42, Math.PI * 0.13), lens);
  glasses.position.set(0, 1.465, 0.385); glasses.rotation.x = 0.2;
  // bras (fixes) : épaule → coude → mains sur les cocottes
  for (const x of [-0.19, 0.19]) {
    const s = V(SH.y, SH.z, x * 0.95), e = V(1.12, 0.42, x * 1.02), h = V(0.89, 0.62, x * 1.02);
    seg(add(unitCyl, jersey), s, s.clone().lerp(e, 0.55), 0.048);
    seg(add(unitCyl, skin), s.clone().lerp(e, 0.5), e, 0.04);
    seg(add(unitCyl, skin), e, h, 0.034);
    const hand = add(new THREE.SphereGeometry(0.04, 8, 6), M(0x1b1c20)); hand.position.copy(h);
  }
  // jambes animées (IK 2 os)
  const legs = [-1, 1].map((s) => ({
    s, hip: V(HIP.y - 0.03, HIP.z, s * 0.1),
    thigh: add(unitCyl, shorts), knee: add(new THREE.SphereGeometry(0.055, 8, 6), skin), shin: add(unitCyl, skin),
    sock: add(unitCyl, white), shoe: add(unitBox, white),
  }));
  const L1 = 0.44, L2 = 0.43, tmp = new THREE.Vector3(), fwd = new THREE.Vector3();
  let crankA = 0;
  function pose() {
    legs.forEach((l, i) => {
      const a = crankA + i * Math.PI;
      const P = V(BB.y + Math.cos(a) * 0.17 + 0.05, BB.z + Math.sin(a) * 0.17, l.s * 0.105);
      const H = l.hip, d = Math.min(L1 + L2 - 0.005, H.distanceTo(P));
      const dir = tmp.subVectors(P, H).normalize();
      const along = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hgt = Math.sqrt(Math.max(0, L1 * L1 - along * along));
      fwd.set(0, -dir.z, dir.y); if (fwd.z < 0) fwd.negate();            // genou vers l'avant / haut
      const K = H.clone().addScaledVector(dir, along).addScaledVector(fwd, hgt);
      const Pc = H.clone().addScaledVector(dir, d);
      seg(l.thigh, H, K, 0.075); l.knee.position.copy(K);
      seg(l.shin, K, K.clone().lerp(Pc, 0.78), 0.05);
      seg(l.sock, K.clone().lerp(Pc, 0.72), Pc, 0.042);
      l.shoe.position.set(Pc.x, Pc.y - 0.02, Pc.z + 0.04); l.shoe.scale.set(0.09, 0.07, 0.26);
    });
    crank.rotation.x = -crankA;
  }
  pose();

  return {
    group,
    update(dt, cadenceRpm, speedMs) {
      for (const w of wheels) w.rotateZ(-(speedMs / 0.335) * dt);
      crankA += ((cadenceRpm || 0) / 60) * Math.PI * 2 * dt * (speedMs > 0.3 ? 1 : 0);
      pose();
    },
  };
}
