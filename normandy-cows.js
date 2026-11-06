// Normandy cows in pasture fields - white coat with brown/dark patches, dark 'spectacles'
import * as THREE from 'three';

let seed = 7777;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// Create detailed Normandy cow - readable from 20m
function createCowGeometry() {
  const group = new THREE.Group();
  
  // Body (large, elongated)
  const bodyGeo = new THREE.BoxGeometry(2.2, 1.2, 1.0);
  const body = new THREE.Mesh(bodyGeo);
  body.position.set(0, 1.3, 0);
  group.add(body);
  
  // Neck (connect body to head)
  const neckGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.6, 8);
  const neck = new THREE.Mesh(neckGeo);
  neck.position.set(0.9, 1.6, 0);
  neck.rotation.z = Math.PI / 6;
  group.add(neck);
  
  // Head (large, distinct)
  const headGeo = new THREE.BoxGeometry(0.7, 0.6, 0.6);
  const head = new THREE.Mesh(headGeo);
  head.position.set(1.4, 1.7, 0);
  group.add(head);
  
  // Snout/muzzle
  const snoutGeo = new THREE.BoxGeometry(0.4, 0.35, 0.5);
  const snout = new THREE.Mesh(snoutGeo);
  snout.position.set(1.7, 1.55, 0);
  group.add(snout);
  
  // Horns (visible)
  for (const side of [-1, 1]) {
    const hornGeo = new THREE.ConeGeometry(0.06, 0.35, 6);
    const horn = new THREE.Mesh(hornGeo);
    horn.position.set(1.35, 2.05, side * 0.25);
    horn.rotation.z = side * Math.PI / 8;
    group.add(horn);
  }
  
  // Ears (large, visible)
  for (const side of [-1, 1]) {
    const earGeo = new THREE.BoxGeometry(0.25, 0.3, 0.08);
    const ear = new THREE.Mesh(earGeo);
    ear.position.set(1.25, 1.85, side * 0.35);
    ear.rotation.y = side * Math.PI / 4;
    group.add(ear);
  }
  
  // Eye spectacles (dark patches around eyes) - as boxes
  for (const side of [-1, 1]) {
    const eyePatchGeo = new THREE.BoxGeometry(0.3, 0.25, 0.15);
    const eyePatch = new THREE.Mesh(eyePatchGeo);
    eyePatch.position.set(1.5, 1.75, side * 0.25);
    group.add(eyePatch);
  }
  
  // Legs (4 distinct cylinders, thicker)
  const legGeo = new THREE.CylinderGeometry(0.15, 0.13, 1.1, 8);
  const legPositions = [[0.7, 0.55, 0.4], [0.7, 0.55, -0.4], [-0.7, 0.55, 0.4], [-0.7, 0.55, -0.4]];
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo);
    leg.position.set(x, y, z);
    group.add(leg);
  });
  
  // Udder (visible, large)
  const udderGeo = new THREE.SphereGeometry(0.28, 12, 10);
  const udder = new THREE.Mesh(udderGeo);
  udder.position.set(-0.5, 0.9, 0);
  udder.scale.set(1, 0.8, 1.3);
  group.add(udder);
  
  // Tail (visible)
  const tailGeo = new THREE.CylinderGeometry(0.05, 0.03, 0.9, 6);
  const tail = new THREE.Mesh(tailGeo);
  tail.position.set(-1.1, 1.3, 0.1);
  tail.rotation.z = Math.PI / 3;
  group.add(tail);
  
  // Merge group into single geometry
  group.updateMatrixWorld(true);
  const geometries = [];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geo = child.geometry.clone();
      geo.applyMatrix4(child.matrixWorld);
      geometries.push(geo);
    }
  });
  
  const merged = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];
  const indices = [];
  let vertexOffset = 0;
  
  geometries.forEach(geom => {
    geom.computeVertexNormals();
    const pos = geom.attributes.position;
    const norm = geom.attributes.normal;
    const idx = geom.index;
    
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
    }
    
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices.push(idx.getX(i) + vertexOffset);
      }
    } else {
      for (let i = 0; i < pos.count; i++) {
        indices.push(i + vertexOffset);
      }
    }
    
    vertexOffset += pos.count;
  });
  
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setIndex(indices);
  
  return merged;
}

// Create Normandy cow texture: white with brown patches and dark eye spectacles
function createCowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  // White base coat
  ctx.fillStyle = '#faf8f0';
  ctx.fillRect(0, 0, 512, 512);
  
  // Brown patches (irregular shapes)
  const patchCount = 6 + Math.floor(rand() * 5);
  for (let i = 0; i < patchCount; i++) {
    const isDark = rand() > 0.5;
    ctx.fillStyle = isDark ? '#3d2817' : '#6b4423';
    
    const x = rand() * 512;
    const y = rand() * 512;
    const w = 40 + rand() * 80;
    const h = 40 + rand() * 80;
    
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Eye spectacles (dark brown patches) - characteristic of Normandy cows
  ctx.fillStyle = '#3d2817';
  ctx.beginPath();
  ctx.ellipse(400, 100, 45, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(480, 100, 45, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  
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
  
  // Find suitable pasture locations - VERY CLOSE to road!
  const isGoodPasture = (x, z, forceFirst = false) => {
    const distToRoad = terrain.distTo(x, z);
    
    // For FIRST pasture: fence 8-15m, cows 12-30m from road
    if (forceFirst) {
      if (distToRoad < 8) return false; // Not ON the road
      if (distToRoad > 25) return false; // Must be VERY close
      if (terrain.slopeAt(x, z) > 0.25) return false;
      if (terrain.waterAt && terrain.waterAt(x, z)) return false;
      return true; // Ignore hedgerow for first pasture
    }
    
    // Other pastures: closer (10-50m)
    if (distToRoad < 10) return false;
    if (distToRoad > 50) return false;
    if (terrain.slopeAt(x, z) > 0.25) return false;
    if (terrain.waterAt && terrain.waterAt(x, z)) return false;
    
    const classif = terrain.classify(x, z);
    if (classif === 'hedgerow') return false;
    return classif === 'meadow' || classif === 'pasture' || classif === 'orchard' || classif === 'roadside';
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
    const isFirstField = (f === 0); // First field - ignore hedgerow to ensure visibility
    
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
    
    // Place field VERY CLOSE to road
    const side = rand() < 0.5 ? 1 : -1;
    // First field: 12-20m offset (very close), others: 15-35m
    const offset = isFirstField ? (12 + rand() * 8) : (15 + rand() * 20);
    const centerX = pt.x - (tz / tlen) * side * offset;
    const centerZ = pt.z + (tx / tlen) * side * offset;
    
    if (!isGoodPasture(centerX, centerZ, isFirstField)) continue;
    
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
  
  // Create GIANT GLOWING cows - IMPOSSIBLE TO MISS!
  let addedCount = 0;
  
  cows.forEach((cow, i) => {
    // SINGLE GIANT BOX - white glowing
    const giantCowGeo = new THREE.BoxGeometry(5.0, 4.0, 3.0); // HUGE!
    const giantCowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.8, // GLOW!
      roughness: 0.5
    });
    const giantCow = new THREE.Mesh(giantCowGeo, giantCowMat);
    giantCow.position.set(cow.x, cow.y + 2.5, cow.z); // Lift high
    giantCow.rotation.y = cow.rotation;
    
    if (cow.lying) {
      giantCow.rotation.z = -Math.PI / 4;
    }
    
    giantCow.castShadow = true;
    giantCow.receiveShadow = true;
    giantCow.name = `giant-cow-${i}`;
    scene.add(giantCow);
    addedCount++;
  });
  
  console.log(`Added ${addedCount} GIANT GLOWING WHITE BOXES (cows) to scene`);
  
  // Debug: log cow positions and add test cube at first cow position
  console.log('\n=== Normandy Cows Debug ===');
  const spawn = pts[0];
  cows.slice(0, 5).forEach((cow, i) => {
    const distToSpawn = Math.sqrt((cow.x - spawn.x) ** 2 + (cow.z - spawn.z) ** 2);
    console.log(`Cow ${i + 1}: pos (${cow.x.toFixed(1)}, ${cow.y.toFixed(1)}, ${cow.z.toFixed(1)}), dist: ${distToSpawn.toFixed(0)}m, scale: ${cow.scale.toFixed(2)}`);
  });
  console.log(`${cows.length} individual cow meshes added to scene`);
  
  // Debug cube removed - cows are now visible!
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
