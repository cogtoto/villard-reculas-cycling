// Simplified Alpine chalets - classic style: stone base, wood upper, wide dark roof, balcony
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE } from './palette.js';

let seed = 4242;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// Simple procedural textures
function canvasTex(size, draw) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d'), size);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  t.repeat.set(2, 2);
  return t;
}

// Warm wood texture (horizontal planks)
const woodTex = () => canvasTex(256, (g, S) => {
  g.fillStyle = '#b8956a';
  g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 20) {
    const shade = 180 + rand() * 40;
    g.fillStyle = `rgb(${shade}, ${shade * 0.85}, ${shade * 0.7})`;
    g.fillRect(0, y, S, 18);
    g.fillStyle = 'rgba(50, 30, 15, 0.3)';
    g.fillRect(0, y + 18, S, 2);
  }
});

// Stone/white render texture
const stoneTex = () => canvasTex(256, (g, S) => {
  g.fillStyle = '#e8e4dc';
  g.fillRect(0, 0, S, S);
  for (let k = 0; k < 80; k++) {
    const x = rand() * S, y = rand() * S;
    const w = 10 + rand() * 20, h = 8 + rand() * 12;
    const v = 200 + rand() * 40;
    g.fillStyle = `rgb(${v}, ${v * 0.98}, ${v * 0.95})`;
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(100, 95, 85, 0.3)';
    g.lineWidth = 1;
    g.strokeRect(x, y, w, h);
  }
});

// Dark roof texture (slate/shingles)
const roofTex = () => canvasTex(256, (g, S) => {
  g.fillStyle = '#3a3a3c';
  g.fillRect(0, 0, S, S);
  const rowH = 16;
  for (let r = 0; r < S / rowH; r++) {
    for (let x = -(r % 2) * 10; x < S; x += 20) {
      const v = 50 + rand() * 30;
      g.fillStyle = `rgb(${v}, ${v}, ${v + 5})`;
      g.fillRect(x + 1, r * rowH, 18, rowH - 2);
    }
  }
});

// Simple box with UV
function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

// Create one chalet variant
function createChaletGeometry(variant) {
  const { W, D, baseH, upperH, roofPitch } = variant;
  
  const parts = {
    stone: [],
    wood: [],
    roof: [],
    windows: []
  };
  
  // Stone/white base (ground floor)
  parts.stone.push(box(W, baseH, D, 0, baseH / 2, 0));
  
  // Wood upper storey
  parts.wood.push(box(W - 0.2, upperH, D - 0.2, 0, baseH + upperH / 2, 0));
  
  // Balcony (simple platform + railings on front)
  const balconyD = 1.5;
  parts.wood.push(box(W, 0.15, balconyD, 0, baseH + upperH - 0.5, D / 2 + balconyD / 2));
  // Railing posts
  for (let x = -W / 2 + 0.5; x <= W / 2 - 0.5; x += 1.5) {
    parts.wood.push(box(0.08, 1.0, 0.08, x, baseH + upperH, D / 2 + balconyD - 0.1));
  }
  // Horizontal rail
  parts.wood.push(box(W - 0.3, 0.08, 0.08, 0, baseH + upperH + 0.5, D / 2 + balconyD - 0.1));
  
  // Roof (two slopes with overhang)
  const overhang = 1.2;
  const roofH = (D / 2) * Math.tan(roofPitch);
  const roofTop = baseH + upperH + roofH;
  const roofW = W + overhang * 2;
  const roofL = (D / 2 + overhang) / Math.cos(roofPitch);
  const thick = 0.2;
  
  for (const side of [-1, 1]) {
    const g = new THREE.BoxGeometry(roofW, thick, roofL);
    g.rotateX(side * roofPitch);
    g.translate(0, roofTop - Math.sin(roofPitch) * roofL / 2, side * Math.cos(roofPitch) * roofL / 2);
    parts.roof.push(g);
  }
  
  // Windows (simple frames)
  const windowW = 0.8, windowH = 1.2;
  // Front (balcony side)
  for (let x = -W / 3; x <= W / 3; x += W / 3) {
    parts.windows.push(box(windowW, windowH, 0.05, x, baseH + upperH / 2, D / 2 + 0.05));
  }
  // Side windows
  for (const side of [-1, 1]) {
    parts.windows.push(box(0.05, windowH, windowW, side * (W / 2 + 0.05), baseH + upperH / 2, 0));
  }
  
  // Merge geometries
  const merged = {};
  for (const key in parts) {
    if (parts[key].length > 0) {
      merged[key] = mergeGeometries(parts[key]);
    }
  }
  
  return merged;
}

// Three chalet variants
const VARIANTS = [
  { W: 7, D: 6, baseH: 2.5, upperH: 2.5, roofPitch: Math.PI / 7 }, // Small chalet
  { W: 9, D: 7.5, baseH: 2.5, upperH: 3.0, roofPitch: Math.PI / 8 }, // Medium chalet
  { W: 11, D: 9, baseH: 3.0, upperH: 3.5, roofPitch: Math.PI / 8 } // Large chalet
];

// Place chalets around start and along route
export function addChalets(scene, track, terrain, { village = 30, hamlets = 50 } = {}) {
  const { pts, cum, length } = track;
  const list = [];
  
  // Check if position is suitable
  const isOk = (x, z) => {
    if (terrain.distTo(x, z) < 12) return false; // Too close to road
    if (terrain.slopeAt(x, z) > 0.5) return false; // Too steep
    if (terrain.waterAt && terrain.waterAt(x, z)) return false; // In water
    if (terrain.classify(x, z) === 'rock' || terrain.classify(x, z) === 'snow') return false;
    // Check distance from other chalets
    for (const other of list) {
      const dx = other.x - x, dz = other.z - z;
      if (dx * dx + dz * dz < 250) return false; // Min 15m apart
    }
    return true;
  };
  
  // Find nearest road point
  const nearestRoad = (x, z) => {
    let best = pts[0], bestDist = Infinity;
    for (const p of pts) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  };
  
  // Add chalet to list
  const addChalet = (x, z) => {
    const road = nearestRoad(x, z);
    const dx = road.x - x, dz = road.z - z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    
    // Rotation: face toward road
    const rot = Math.atan2(-dz / dist, dx / dist) + (rand() - 0.5) * 0.3;
    
    // Variant selection
    const variantIdx = rand() < 0.4 ? 0 : rand() < 0.7 ? 1 : 2;
    const variant = VARIANTS[variantIdx];
    
    // Ground height (lowest corner)
    const c = Math.cos(rot), s = Math.sin(rot);
    let y = Infinity;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const lx = a * variant.W / 2, lz = b * variant.D / 2;
      const wx = x + lx * c - lz * s;
      const wz = z + lx * s + lz * c;
      y = Math.min(y, terrain.heightAt(wx, wz));
    }
    
    list.push({
      x, z, y: y - 0.1,
      rot,
      variant: variantIdx,
      woodShade: rand(), // Color variation
      roofShade: rand()
    });
  };
  
  // Village around spawn
  const spawn = pts[0];
  for (let attempts = 0; attempts < 2000 && list.length < village; attempts++) {
    const angle = rand() * Math.PI * 2;
    const r = 20 + rand() * 200;
    const x = spawn.x + Math.cos(angle) * r;
    const z = spawn.z + Math.sin(angle) * r;
    if (isOk(x, z)) addChalet(x, z);
  }
  
  console.log(`Placed ${list.length} chalets in starting village`);
  
  // Hamlets along route
  const villageCount = list.length;
  for (let dist = 800; dist < length - 400 && list.length - villageCount < hamlets; dist += 1200 + rand() * 1400) {
    const hamletSize = 2 + Math.floor(rand() * 5);
    for (let i = 0; i < hamletSize * 3 && list.length - villageCount < hamlets; i++) {
      // Find position along track
      let idx = 0;
      for (let j = 0; j < cum.length; j++) {
        if (cum[j] >= dist) {
          idx = j;
          break;
        }
      }
      
      const pt = pts[idx];
      const nextPt = pts[Math.min(idx + 5, pts.length - 1)];
      const tx = nextPt.x - pt.x, tz = nextPt.z - pt.z;
      const tlen = Math.sqrt(tx * tx + tz * tz) || 1;
      
      // Offset to side
      const side = rand() < 0.5 ? 1 : -1;
      const offset = 15 + rand() * 25;
      const x = pt.x - (tz / tlen) * side * offset;
      const z = pt.z + (tx / tlen) * side * offset;
      
      if (isOk(x, z)) addChalet(x, z);
    }
  }
  
  console.log(`Placed ${list.length - villageCount} chalets in hamlets, total: ${list.length}`);
  
  // Create materials
  const materials = {
    stone: new THREE.MeshStandardMaterial({
      map: stoneTex(),
      roughness: 0.9,
      color: 0xf5f0e8
    }),
    wood: new THREE.MeshStandardMaterial({
      map: woodTex(),
      roughness: 0.85
    }),
    roof: new THREE.MeshStandardMaterial({
      map: roofTex(),
      roughness: 0.95,
      color: 0x2a2a2c
    }),
    windows: new THREE.MeshStandardMaterial({
      color: 0x1a2530,
      roughness: 0.3,
      metalness: 0.1
    })
  };
  
  // Wood color variations (honey to weathered)
  const woodTints = [
    new THREE.Color(0xd4a76a),
    new THREE.Color(0xb8956a),
    new THREE.Color(0x9d7a4a),
    new THREE.Color(0x8a6a3a)
  ];
  
  // Roof color variations (dark gray to black)
  const roofTints = [
    new THREE.Color(0x3a3a3c),
    new THREE.Color(0x2a2a2c),
    new THREE.Color(0x1a1a1c)
  ];
  
  // Create geometry for each variant once
  const variantGeometries = VARIANTS.map(v => createChaletGeometry(v));
  
  // Create instanced meshes
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  
  for (let vi = 0; vi < VARIANTS.length; vi++) {
    const instances = list.filter(c => c.variant === vi);
    if (instances.length === 0) continue;
    
    const geoms = variantGeometries[vi];
    
    for (const partName in geoms) {
      const geom = geoms[partName];
      const mat = materials[partName];
      const mesh = new THREE.InstancedMesh(geom, mat, instances.length);
      
      instances.forEach((chalet, i) => {
        quat.setFromAxisAngle(up, chalet.rot);
        pos.set(chalet.x, chalet.y, chalet.z);
        matrix.compose(pos, quat, scale);
        mesh.setMatrixAt(i, matrix);
        
        // Apply color variation
        if (partName === 'wood') {
          const tintIdx = Math.floor(chalet.woodShade * woodTints.length);
          mesh.setColorAt(i, woodTints[tintIdx]);
        } else if (partName === 'roof') {
          const tintIdx = Math.floor(chalet.roofShade * roofTints.length);
          mesh.setColorAt(i, roofTints[tintIdx]);
        }
      });
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
  }
  
  // Store in terrain.houses for other systems
  if (terrain.houses) {
    terrain.houses.push(...list);
  }
  
  return { village: villageCount, hamlets: list.length - villageCount };
}
