// Normandy cows in pasture fields - white coat with brown/dark patches, dark 'spectacles'
import * as THREE from 'three';

let seed = 7777;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// Create a single low-poly Normandy cow
function createCowGeometry() {
  const parts = [];
  
  // Body (elongated box)
  const body = new THREE.BoxGeometry(1.4, 0.8, 0.6);
  body.translate(0, 0.9, 0);
  parts.push(body);
  
  // Head (smaller box, slightly angled down)
  const head = new THREE.BoxGeometry(0.5, 0.4, 0.4);
  head.translate(0.85, 1.0, 0);
  parts.push(head);
  
  // Neck connection
  const neck = new THREE.BoxGeometry(0.25, 0.5, 0.45);
  neck.translate(0.6, 0.95, 0);
  parts.push(neck);
  
  // Legs (4 simple cylinders)
  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6);
  for (const [x, z] of [[0.45, 0.22], [0.45, -0.22], [-0.45, 0.22], [-0.45, -0.22]]) {
    const leg = legGeo.clone();
    leg.translate(x, 0.35, z);
    parts.push(leg);
  }
  
  // Udder (small sphere under back)
  const udder = new THREE.SphereGeometry(0.18, 8, 6);
  udder.translate(-0.3, 0.65, 0);
  udder.scale(1, 0.7, 1.2);
  parts.push(udder);
  
  // Tail (thin cylinder)
  const tail = new THREE.CylinderGeometry(0.03, 0.02, 0.6, 4);
  tail.rotateZ(Math.PI / 3);
  tail.translate(-0.7, 1.0, 0);
  parts.push(tail);
  
  // Ears (small triangular flaps)
  for (const side of [-1, 1]) {
    const ear = new THREE.ConeGeometry(0.08, 0.15, 4);
    ear.rotateZ(Math.PI / 2);
    ear.translate(1.0, 1.15, side * 0.15);
    parts.push(ear);
  }
  
  // Merge all parts
  const merged = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];
  
  parts.forEach(geom => {
    geom.computeVertexNormals();
    const pos = geom.attributes.position;
    const norm = geom.attributes.normal;
    
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
    }
  });
  
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  
  return merged;
}

// Create cow texture with white base and brown/black patches
function createCowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // White base
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(0, 0, 256, 256);
  
  // Random brown/black patches
  const patchCount = 8 + Math.floor(rand() * 6);
  for (let i = 0; i < patchCount; i++) {
    const isDark = rand() > 0.6;
    ctx.fillStyle = isDark ? '#2a1810' : '#6a4a3a';
    
    const x = rand() * 256;
    const y = rand() * 256;
    const w = 30 + rand() * 60;
    const h = 30 + rand() * 60;
    
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Create a simple fence post
function createFencePost() {
  const post = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6);
  post.translate(0, 0.7, 0);
  return post;
}

// Create a fence line
function createFence(x1, z1, x2, z2, heightFn) {
  const group = new THREE.Group();
  
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.sqrt(dx * dx + dz * dz);
  const postCount = Math.floor(length / 2.5) + 1;
  
  const postGeo = createFencePost();
  const railGeo = new THREE.CylinderGeometry(0.04, 0.04, length, 6);
  railGeo.rotateZ(Math.PI / 2);
  
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8b7355,
    roughness: 0.9
  });
  
  // Posts
  for (let i = 0; i <= postCount; i++) {
    const t = i / postCount;
    const x = x1 + dx * t;
    const z = z1 + dz * t;
    const y = heightFn(x, z);
    
    const post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(x, y, z);
    group.add(post);
  }
  
  // Rails (2 horizontal)
  const angle = Math.atan2(dz, dx);
  for (const yOffset of [0.5, 1.0]) {
    const rail = new THREE.Mesh(railGeo, woodMat);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const midY = heightFn(midX, midZ) + yOffset;
    
    rail.position.set(midX, midY, midZ);
    rail.rotation.y = angle;
    group.add(rail);
  }
  
  return group;
}

// Add Normandy cows in pasture fields along the route
export function addNormandyCows(scene, track, terrain) {
  const { pts, cum, length } = track;
  const fields = [];
  const cows = [];
  
  // Find suitable pasture locations along route
  const isGoodPasture = (x, z) => {
    if (terrain.distTo(x, z) < 20) return false; // Not too close to road
    if (terrain.distTo(x, z) > 80) return false; // Closer to road for visibility
    if (terrain.slopeAt(x, z) > 0.25) return false; // Relatively flat
    if (terrain.waterAt && terrain.waterAt(x, z)) return false;
    const classif = terrain.classify(x, z);
    return classif !== 'rock' && classif !== 'sea' && classif !== 'town';
  };
  
  // Create 6-8 pasture fields (more for visibility)
  // First field MUST be within first 300m for visibility test
  const fieldTargets = [
    150 + rand() * 100, // First field at 150-250m
  ];
  
  // Add 5-7 more fields distributed along route
  const additionalFields = 5 + Math.floor(rand() * 3);
  for (let f = 0; f < additionalFields; f++) {
    const targetDist = 1000 + (f * (length - 2000) / additionalFields) + (rand() - 0.5) * 800;
    if (targetDist > 500 && targetDist < length - 800) {
      fieldTargets.push(targetDist);
    }
  }
  
  for (let f = 0; f < fieldTargets.length; f++) {
    const targetDist = fieldTargets[f];
    
    let idx = 0;
    for (let i = 0; i < cum.length; i++) {
      if (cum[i] >= targetDist) {
        idx = i;
        break;
      }
    }
    
    const pt = pts[idx];
    const nextPt = pts[Math.min(idx + 10, pts.length - 1)];
    const tx = nextPt.x - pt.x;
    const tz = nextPt.z - pt.z;
    const tlen = Math.sqrt(tx * tx + tz * tz) || 1;
    
    // Try to place field on either side of road - closer for visibility
    const side = rand() < 0.5 ? 1 : -1;
    const offset = 25 + rand() * 25; // Reduced offset for better visibility
    const centerX = pt.x - (tz / tlen) * side * offset;
    const centerZ = pt.z + (tx / tlen) * side * offset;
    
    if (!isGoodPasture(centerX, centerZ)) continue;
    
    // Create rectangular field
    const fieldW = 30 + rand() * 25;
    const fieldD = 25 + rand() * 20;
    const fieldAngle = Math.atan2(tz, tx) + (rand() - 0.5) * 0.5;
    
    const centerY = terrain.heightAt(centerX, centerZ);
    
    fields.push({
      x: centerX,
      z: centerZ,
      y: centerY,
      width: fieldW,
      depth: fieldD,
      angle: fieldAngle
    });
    
    console.log(`Pasture field ${fields.length} at ${(targetDist / 1000).toFixed(1)} km`);
    
    // Add fence around field
    const cos = Math.cos(fieldAngle);
    const sin = Math.sin(fieldAngle);
    const hw = fieldW / 2, hd = fieldD / 2;
    
    const corners = [
      [centerX + hw * cos - hd * sin, centerZ + hw * sin + hd * cos],
      [centerX + hw * cos + hd * sin, centerZ + hw * sin - hd * cos],
      [centerX - hw * cos + hd * sin, centerZ - hw * sin - hd * cos],
      [centerX - hw * cos - hd * sin, centerZ - hw * sin + hd * cos]
    ];
    
    for (let i = 0; i < 4; i++) {
      const [x1, z1] = corners[i];
      const [x2, z2] = corners[(i + 1) % 4];
      const fence = createFence(x1, z1, x2, z2, terrain.heightAt);
      scene.add(fence);
    }
    
    // Add cows to this field
    const cowCount = 3 + Math.floor(rand() * 6);
    
    for (let c = 0; c < cowCount; c++) {
      // Random position within field
      const localX = (rand() - 0.5) * (fieldW - 6);
      const localZ = (rand() - 0.5) * (fieldD - 6);
      
      const cowX = centerX + localX * cos - localZ * sin;
      const cowZ = centerZ + localX * sin + localZ * cos;
      const cowY = terrain.heightAt(cowX, cowZ);
      
      // Random rotation (grazing direction)
      const cowRot = rand() * Math.PI * 2;
      
      // Random pose variation (standing, grazing, lying down)
      const pose = rand();
      let scale = 1.2; // Increased base scale for better visibility
      let yOffset = 0;
      
      if (pose < 0.7) {
        // Standing/grazing
        scale = 1.1 + rand() * 0.3; // Larger cows
      } else {
        // Lying down
        scale = 1.0 + rand() * 0.2;
        yOffset = -0.3;
      }
      
      cows.push({
        x: cowX,
        y: cowY + yOffset,
        z: cowZ,
        rotation: cowRot,
        scale: scale,
        lying: pose >= 0.7,
        patternSeed: rand()
      });
    }
  }
  
  console.log(`Created ${fields.length} pasture fields with ${cows.length} Normandy cows`);
  
  if (cows.length === 0) return { fields: 0, cows: 0 };
  
  // Create cow geometry once
  const cowGeo = createCowGeometry();
  
  // Create material with cow texture
  const cowMat = new THREE.MeshStandardMaterial({
    roughness: 0.85,
    metalness: 0.0
  });
  
  // Create instanced mesh for all cows
  const cowMesh = new THREE.InstancedMesh(cowGeo, cowMat, cows.length);
  
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  
  cows.forEach((cow, i) => {
    position.set(cow.x, cow.y, cow.z);
    quaternion.setFromAxisAngle(up, cow.rotation);
    
    if (cow.lying) {
      // Rotate to lying position
      const lyingQuat = new THREE.Quaternion();
      lyingQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 3);
      quaternion.multiply(lyingQuat);
    }
    
    scale.set(cow.scale, cow.scale, cow.scale);
    
    matrix.compose(position, quaternion, scale);
    cowMesh.setMatrixAt(i, matrix);
    
    // Color variation (white with darker patches)
    const baseShade = 0.95 + rand() * 0.05;
    const color = new THREE.Color(baseShade, baseShade, baseShade - 0.05);
    cowMesh.setColorAt(i, color);
  });
  
  cowMesh.castShadow = true;
  cowMesh.receiveShadow = true;
  scene.add(cowMesh);
  
  // Debug: log cow positions
  console.log('\n=== Normandy Cows Debug ===');
  const spawn = pts[0];
  cows.slice(0, 5).forEach((cow, i) => {
    const distToSpawn = Math.sqrt((cow.x - spawn.x) ** 2 + (cow.z - spawn.z) ** 2);
    console.log(`Cow ${i + 1}: pos (${cow.x.toFixed(1)}, ${cow.y.toFixed(1)}, ${cow.z.toFixed(1)}), dist: ${distToSpawn.toFixed(0)}m, scale: ${cow.scale.toFixed(2)}`);
  });
  console.log(`CowMesh in scene: visible=${cowMesh.visible}, castShadow=${cowMesh.castShadow}`);
  console.log('=========================\n');
  
  // Add a few apple trees in some fields (simplified)
  const treeMat = new THREE.MeshStandardMaterial({
    color: 0x4a6b3a,
    roughness: 0.9
  });
  
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4a3a2a,
    roughness: 0.95
  });
  
  fields.forEach(field => {
    if (rand() > 0.6) return; // Not all fields have trees
    
    const treeCount = 1 + Math.floor(rand() * 3);
    
    for (let t = 0; t < treeCount; t++) {
      const localX = (rand() - 0.5) * (field.width - 10);
      const localZ = (rand() - 0.5) * (field.depth - 10);
      
      const cos = Math.cos(field.angle);
      const sin = Math.sin(field.angle);
      
      const treeX = field.x + localX * cos - localZ * sin;
      const treeZ = field.z + localX * sin + localZ * cos;
      const treeY = terrain.heightAt(treeX, treeZ);
      
      // Simple tree: trunk + spherical canopy
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 3, 8),
        trunkMat
      );
      trunk.position.set(treeX, treeY + 1.5, treeZ);
      scene.add(trunk);
      
      const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(2.5, 8, 6),
        treeMat
      );
      canopy.position.set(treeX, treeY + 4, treeZ);
      canopy.scale.set(1, 0.9, 1);
      scene.add(canopy);
    }
  });
  
  return { fields: fields.length, cows: cows.length };
}
