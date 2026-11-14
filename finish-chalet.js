// Hero Savoyard chalet at the finish: 7 rue Nouvelle, Villard-Reculas.
// Low-poly, merged geometries, few draw calls — light enough for an i3-5020U.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const BAN = { lat: 45.092266, lon: 6.034288 };

function canvasTex(size, draw, repeat = 2) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.repeat.set(repeat, repeat);
  return t;
}

const stoneTex = canvasTex(256, (g, S) => {
  g.fillStyle = '#d4cdc4';
  g.fillRect(0, 0, S, S);
  for (let k = 0; k < 110; k++) {
    const x = Math.random() * S, y = Math.random() * S;
    const w = 12 + Math.random() * 28, h = 8 + Math.random() * 16;
    const v = 165 + Math.random() * 55;
    g.fillStyle = `rgb(${v}, ${v * 0.96}, ${v * 0.9})`;
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(80, 70, 60, 0.35)';
    g.lineWidth = 1.5;
    g.strokeRect(x, y, w, h);
  }
}, 3);

const woodTex = canvasTex(256, (g, S) => {
  g.fillStyle = '#a07545';
  g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 16) {
    const shade = 140 + Math.random() * 55;
    g.fillStyle = `rgb(${shade * 1.15}, ${shade * 0.82}, ${shade * 0.55})`;
    g.fillRect(0, y, S, 14);
    for (let x = 0; x < S; x += 10 + Math.random() * 18) {
      g.fillStyle = `rgba(60, 35, 18, ${0.12 + Math.random() * 0.12})`;
      g.fillRect(x, y + 1, 1 + Math.random() * 2, 12);
    }
    g.fillStyle = 'rgba(40, 22, 10, 0.45)';
    g.fillRect(0, y + 14, S, 2);
  }
}, 2);

const roofTex = canvasTex(256, (g, S) => {
  g.fillStyle = '#2a2b30';
  g.fillRect(0, 0, S, S);
  const rowH = 12;
  for (let r = 0; r < S / rowH; r++) {
    const offset = (r % 2) * 10;
    for (let x = -offset; x < S; x += 20) {
      const v = 36 + Math.random() * 28;
      g.fillStyle = `rgb(${v}, ${v}, ${v + 8})`;
      g.fillRect(x + 1, r * rowH, 18, rowH - 1);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(x, r * rowH + rowH - 1, 20, 1);
    }
  }
}, 3);

function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function buildChaletGeometry() {
  const W = 12, D = 8.5, baseH = 3.0, upperH = 3.1;
  const roofPitch = Math.PI / 10; // gently sloped
  const parts = { stone: [], wood: [], roof: [], windows: [], flowers: [], greenery: [] };

  // Slightly larger stone plinth so the building sits cleanly on the slope
  parts.stone.push(box(W + 0.5, 0.45, D + 0.5, 0, 0.2, 0));
  // Stone ground floor
  parts.stone.push(box(W, baseH, D, 0, 0.45 + baseH / 2, 0));
  // Corner quoins
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    parts.stone.push(box(0.35, baseH, 0.35, sx * (W / 2 - 0.05), 0.45 + baseH / 2, sz * (D / 2 - 0.05)));
  }
  // Wooden door (ground floor, front)
  parts.wood.push(box(1.15, 2.15, 0.12, 0, 0.45 + 1.1, D / 2 + 0.04));

  // Wooden upper storey, slightly inset
  parts.wood.push(box(W - 0.15, upperH, D - 0.15, 0, 0.45 + baseH + upperH / 2, 0));

  // Front balcony (wide, facing the road)
  const balD = 1.7, balY = 0.45 + baseH + 0.08;
  parts.wood.push(box(W - 0.2, 0.14, balD, 0, balY, D / 2 + balD / 2 - 0.05));
  // Carved railings: dense posts, upper + mid rails, decorative X panels
  const railZ = D / 2 + balD - 0.12;
  const postH = 1.05;
  const xs = [];
  for (let x = -W / 2 + 0.35; x <= W / 2 - 0.35 + 0.01; x += 0.7) xs.push(x);
  for (const x of xs) {
    parts.wood.push(box(0.08, postH, 0.08, x, balY + 0.07 + postH / 2, railZ));
  }
  parts.wood.push(box(W - 0.5, 0.07, 0.07, 0, balY + postH + 0.05, railZ));
  parts.wood.push(box(W - 0.5, 0.06, 0.06, 0, balY + postH * 0.5, railZ));
  // Decorative X between every other pair of posts
  for (let i = 0; i < xs.length - 1; i += 2) {
    const x0 = xs[i], x1 = xs[i + 1];
    const mid = (x0 + x1) / 2, span = x1 - x0;
    const g1 = new THREE.BoxGeometry(span * 1.05, 0.05, 0.05);
    g1.rotateZ(Math.atan2(postH * 0.75, span));
    g1.translate(mid, balY + 0.2 + postH * 0.45, railZ);
    parts.wood.push(g1);
    const g2 = new THREE.BoxGeometry(span * 1.05, 0.05, 0.05);
    g2.rotateZ(-Math.atan2(postH * 0.75, span));
    g2.translate(mid, balY + 0.2 + postH * 0.45, railZ);
    parts.wood.push(g2);
  }
  // Side balcony rails
  for (const side of [-1, 1]) {
    parts.wood.push(box(0.07, postH, balD - 0.2, side * (W / 2 - 0.25), balY + 0.07 + postH / 2, D / 2 + balD / 2));
  }

  // Flower boxes along the balcony rail, with red geraniums
  for (let x = -W / 2 + 1.2; x <= W / 2 - 1.2; x += 1.8) {
    parts.wood.push(box(0.7, 0.22, 0.28, x, balY + 0.22, railZ + 0.12));
    // Foliage clump
    parts.greenery.push(box(0.62, 0.16, 0.24, x, balY + 0.38, railZ + 0.12));
    // Red geranium blooms (a few small boxes per planter)
    for (let k = 0; k < 4; k++) {
      const ox = (k - 1.5) * 0.13, oy = 0.08 + (k % 2) * 0.05;
      parts.flowers.push(box(0.18, 0.15, 0.16, x + ox, balY + 0.52 + oy, railZ + 0.14));
    }
  }
  // Ground-floor window boxes
  for (const x of [-3.4, 3.4]) {
    parts.wood.push(box(0.9, 0.2, 0.28, x, 1.15, D / 2 + 0.2));
    parts.greenery.push(box(0.82, 0.14, 0.22, x, 1.3, D / 2 + 0.2));
    for (let k = 0; k < 3; k++) {
      parts.flowers.push(box(0.16, 0.12, 0.14, x + (k - 1) * 0.2, 1.42, D / 2 + 0.2));
    }
  }

  // Warm windows — upper front (behind balcony), ground floor, sides
  const wW = 0.9, wH = 1.25;
  for (const x of [-3.6, -1.2, 1.2, 3.6]) {
    parts.windows.push(box(wW, wH, 0.06, x, 0.45 + baseH + upperH * 0.52, D / 2 - 0.02));
  }
  for (const x of [-3.4, 3.4]) {
    parts.windows.push(box(0.85, 1.1, 0.06, x, 0.45 + 1.7, D / 2 + 0.03));
  }
  for (const side of [-1, 1]) {
    parts.windows.push(box(0.06, wH, 0.85, side * (W / 2 + 0.02), 0.45 + baseH + upperH * 0.52, -0.6));
    parts.windows.push(box(0.06, 1.0, 0.7, side * (W / 2 + 0.02), 0.45 + 1.7, 0.8));
  }

  // Wide overhanging roof (dark slate / lauze)
  const overhang = 1.7;
  const roofH = (D / 2 + 0.1) * Math.tan(roofPitch);
  const roofTop = 0.45 + baseH + upperH + roofH;
  const roofW = W + overhang * 2;
  const roofL = (D / 2 + overhang) / Math.cos(roofPitch);
  const thick = 0.22;
  for (const side of [-1, 1]) {
    const g = new THREE.BoxGeometry(roofW, thick, roofL);
    g.rotateX(side * roofPitch);
    g.translate(0, roofTop - Math.sin(roofPitch) * roofL / 2, side * Math.cos(roofPitch) * roofL / 2);
    parts.roof.push(g);
  }
  // Ridge beam
  parts.wood.push(box(roofW - 0.2, 0.12, 0.12, 0, roofTop + 0.04, 0));
  // Gable bargeboards
  for (const sx of [-1, 1]) {
    for (const side of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.12, 0.16, roofL);
      g.rotateX(side * roofPitch);
      g.translate(sx * (roofW / 2 - 0.08), roofTop - Math.sin(roofPitch) * roofL / 2, side * Math.cos(roofPitch) * roofL / 2);
      parts.wood.push(g);
    }
  }

  // Stone chimney on the back-right slope
  const chimX = W * 0.28, chimZ = -D * 0.18;
  const chimY = 0.45 + baseH + upperH + 0.4;
  parts.stone.push(box(0.85, 2.6, 0.7, chimX, chimY + 1.3, chimZ));
  parts.stone.push(box(1.05, 0.2, 0.9, chimX, chimY + 2.65, chimZ));

  const merged = {};
  for (const key of Object.keys(parts)) {
    if (parts[key].length) merged[key] = mergeGeometries(parts[key]);
  }
  return merged;
}

function makeSignTexture(title, subtitle) {
  const cv = document.createElement('canvas');
  cv.width = 768; cv.height = 384;
  const ctx = cv.getContext('2d');
  // Wooden board
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(0, 0, 768, 384);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(16, 16, 736, 352);
  // Subtle grain
  for (let y = 16; y < 368; y += 10) {
    ctx.fillStyle = `rgba(40, 22, 10, ${0.08 + Math.random() * 0.08})`;
    ctx.fillRect(16, y, 736, 2);
  }
  ctx.fillStyle = '#f3e6cc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 72px Georgia, serif';
  ctx.fillText(title, 384, 150);
  ctx.font = '42px Georgia, serif';
  ctx.fillText(subtitle, 384, 245);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeBannerTexture() {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#1e4d2b';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(0, 0, 1024, 18);
  ctx.fillRect(0, 238, 1024, 18);
  ctx.fillStyle = '#f7f1e1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 120px "Arial Black", sans-serif';
  ctx.fillText('FINISH', 512, 128);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function toLocal(lat, lon, origin) {
  const R = 6371000;
  const k = Math.cos((origin.lat0 * Math.PI) / 180);
  return {
    x: ((lon - origin.lon0) * Math.PI / 180) * R * k,
    z: -((lat - origin.lat0) * Math.PI / 180) * R
  };
}

export function addFinishChalet(scene, track, terrain) {
  const pts = track.pts;
  const end = pts[pts.length - 1];
  const prev = pts[Math.max(0, pts.length - 12)];
  const dirX = end.x - prev.x, dirZ = end.z - prev.z;
  const dirLen = Math.hypot(dirX, dirZ) || 1;
  const fx = dirX / dirLen, fz = dirZ / dirLen;

  const house = toLocal(BAN.lat, BAN.lon, track.origin);
  // Side of the road toward 7 rue Nouvelle
  let sx = house.x - end.x, sz = house.z - end.z;
  const slen = Math.hypot(sx, sz) || 1;
  sx /= slen; sz /= slen;

  // Centre 17 m off the road so the building never covers the tarmac
  const offset = 17;
  const cx = end.x + sx * offset;
  const cz = end.z + sz * offset;
  const rot = Math.atan2(end.x - cx, end.z - cz); // balcony (+Z) faces the road

  // Sit the plinth on the lowest nearby ground
  let gy = Infinity;
  const c = Math.cos(rot), s = Math.sin(rot);
  for (const [a, b] of [[-6, -4.5], [6, -4.5], [6, 4.5], [-6, 4.5], [0, 0]]) {
    const wx = cx + a * c - b * s;
    const wz = cz + a * s + b * c;
    gy = Math.min(gy, terrain.heightAt(wx, wz));
  }
  const cy = gy - 0.08;

  const geoms = buildChaletGeometry();
  const mats = {
    stone: new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.92, color: 0xf2ece4 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85, color: 0xe0b077 }),
    roof: new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.96, color: 0x3a3b40 }),
    windows: new THREE.MeshStandardMaterial({
      color: 0xffe1a8, emissive: 0xffb24a, emissiveIntensity: 0.85, roughness: 0.25, metalness: 0.05
    }),
    flowers: new THREE.MeshStandardMaterial({ color: 0xe0233a, roughness: 0.6, emissive: 0x4a0008, emissiveIntensity: 0.15 }),
    greenery: new THREE.MeshStandardMaterial({ color: 0x2f7a3a, roughness: 0.85 })
  };

  const group = new THREE.Group();
  group.position.set(cx, cy, cz);
  group.rotation.y = rot;
  for (const key of Object.keys(geoms)) {
    const mesh = new THREE.Mesh(geoms[key], mats[key]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  scene.add(group);

  // Wooden sign beside the road, on the approach, facing the rider
  const signX = end.x + sx * 6.2 - fx * 5;
  const signZ = end.z + sz * 6.2 - fz * 5;
  const signY = terrain.heightAt(signX, signZ);
  const signPost = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 2.4, 0.16),
    mats.wood
  );
  signPost.position.set(signX, signY + 1.2, signZ);
  signPost.castShadow = true;
  scene.add(signPost);
  const signBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.2),
    new THREE.MeshStandardMaterial({ map: makeSignTexture('Chalet', '7 rue Nouvelle'), roughness: 0.8 })
  );
  signBoard.position.set(signX, signY + 2.15, signZ);
  // Face the road, like the chalet facade, so it is readable on arrival and in close-ups
  signBoard.rotation.y = rot;
  signBoard.castShadow = true;
  scene.add(signBoard);
  const signBack = new THREE.Mesh(
    new THREE.BoxGeometry(2.45, 1.25, 0.08),
    mats.wood
  );
  signBack.position.copy(signBoard.position);
  signBack.rotation.y = signBoard.rotation.y;
  signBack.position.x += fx * 0.05;
  signBack.position.z += fz * 0.05;
  scene.add(signBack);

  // Banner on the roadside, before the chalet, so it does not cover the facade
  const bannerW = 3.6, bannerY = 3.2;
  const bx = end.x + sx * 6.0 - fx * 9;
  const bz = end.z + sz * 6.0 - fz * 9;
  const by = terrain.heightAt(bx, bz);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 });
  for (const side of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, bannerY + 0.3, 6), poleMat);
    // poles along the road direction
    pole.position.set(bx + fx * side * (bannerW / 2), by + (bannerY + 0.3) / 2, bz + fz * side * (bannerW / 2));
    pole.castShadow = true;
    scene.add(pole);
  }
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(bannerW, 0.85),
    new THREE.MeshStandardMaterial({ map: makeBannerTexture(), side: THREE.DoubleSide, roughness: 0.7 })
  );
  banner.position.set(bx, by + bannerY - 0.15, bz);
  banner.rotation.y = Math.atan2(fx, fz) + Math.PI / 2;
  banner.castShadow = true;
  scene.add(banner);

  if (terrain.houses) terrain.houses.push({ x: cx, z: cz });
  console.log(`Finish chalet at 7 rue Nouvelle, 17 m off the road (BAN ${BAN.lat.toFixed(6)}, ${BAN.lon.toFixed(6)})`);
  return { x: cx, y: cy, z: cz, rot };
}
