// French village/hamlet road signs for both routes
import * as THREE from 'three';

// Create a French-style village entry sign
// White rectangle with red border, black text
function createVillageSign(name, isExit = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 256);
  
  // Red border (8px thick)
  ctx.strokeStyle = '#e30613';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 496, 240);
  
  // Black text - village name
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Scale font size based on name length
  let fontSize = 72;
  if (name.length > 15) fontSize = 56;
  if (name.length > 20) fontSize = 48;
  
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillText(name, 256, 128);
  
  // If exit sign, add red diagonal bar
  if (isExit) {
    ctx.strokeStyle = '#e30613';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(40, 40);
    ctx.lineTo(472, 216);
    ctx.stroke();
  }
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  
  return texture;
}

// Create a 3D sign post with the village name
function createSignPost(name, isExit = false) {
  const group = new THREE.Group();
  
  // Sign board (2:1 ratio, ~2m wide)
  const signWidth = 2.0;
  const signHeight = 1.0;
  const signTexture = createVillageSign(name, isExit);
  
  const signBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(signWidth, signHeight),
    new THREE.MeshStandardMaterial({
      map: signTexture,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide
    })
  );
  signBoard.position.y = 1.8; // Height above ground
  signBoard.castShadow = true;
  signBoard.receiveShadow = true;
  
  // Metal post (5cm diameter, 2.5m tall)
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8),
    new THREE.MeshStandardMaterial({
      color: 0x707070,
      roughness: 0.6,
      metalness: 0.4
    })
  );
  post.position.y = 1.25;
  post.castShadow = true;
  
  group.add(signBoard);
  group.add(post);
  
  return group;
}

// Place signs along the track based on village data
export function placeVillageSigns(scene, track, villagesData, groundHeightFn) {
  const signs = [];
  const villages = villagesData.villages;
  
  if (!villages || villages.length === 0) return signs;
  
  // Convert lat/lon to world coordinates
  const origin = track.origin;
  const R = 6371000;
  const kLat = Math.cos((origin.lat0 * Math.PI) / 180);
  
  const toWorld = (lat, lon) => {
    const dLat = (origin.lat0 - lat) * Math.PI / 180;
    const dLon = (lon - origin.lon0) * Math.PI / 180;
    const x = dLon * R * kLat;
    const z = -dLat * R;
    return { x, z };
  };
  
  // For each village, find the closest point on the track
  villages.forEach(village => {
    const villagePos = toWorld(village.lat, village.lon);
    
    let closestDist = Infinity;
    let closestIdx = 0;
    let closestPoint = null;
    
    // Find closest track point
    track.pts.forEach((pt, idx) => {
      const dx = pt.x - villagePos.x;
      const dz = pt.z - villagePos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
        closestPoint = pt;
      }
    });
    
    // Only place sign if village is reasonably close to track (within 2km)
    if (closestDist > 2000) return;
    
    // Get direction at this point
    const nextIdx = Math.min(closestIdx + 1, track.pts.length - 1);
    const prevIdx = Math.max(closestIdx - 1, 0);
    const dir = new THREE.Vector3(
      track.pts[nextIdx].x - track.pts[prevIdx].x,
      0,
      track.pts[nextIdx].z - track.pts[prevIdx].z
    ).normalize();
    
    // Place entry sign slightly before the closest point
    const entryDistance = -50; // 50m before
    const entryIdx = Math.max(0, closestIdx + Math.floor(entryDistance / 10));
    const entryPoint = track.pts[entryIdx];
    
    // Calculate perpendicular offset (to the right of the road)
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    const offset = 3.5; // 3.5m from road center
    
    // Entry sign
    const entrySign = createSignPost(village.name, false);
    const entryX = entryPoint.x + perp.x * offset;
    const entryZ = entryPoint.z + perp.z * offset;
    const entryY = groundHeightFn ? groundHeightFn(entryX, entryZ) : entryPoint.y;
    
    entrySign.position.set(entryX, entryY, entryZ);
    
    // Rotate to face the direction of travel
    const angle = Math.atan2(dir.x, dir.z);
    entrySign.rotation.y = angle;
    
    scene.add(entrySign);
    signs.push({
      type: 'entry',
      name: village.name,
      position: { x: entryX, y: entryY, z: entryZ },
      trackDistance: closestIdx * 10, // Approximate distance along track
      mesh: entrySign
    });
    
    // Exit sign slightly after the closest point
    const exitDistance = 150; // 150m after entry
    const exitIdx = Math.min(track.pts.length - 1, closestIdx + Math.floor(exitDistance / 10));
    const exitPoint = track.pts[exitIdx];
    
    const exitSign = createSignPost(village.name, true);
    const exitX = exitPoint.x + perp.x * offset;
    const exitZ = exitPoint.z + perp.z * offset;
    const exitY = groundHeightFn ? groundHeightFn(exitX, exitZ) : exitPoint.y;
    
    exitSign.position.set(exitX, exitY, exitZ);
    exitSign.rotation.y = angle;
    
    scene.add(exitSign);
    signs.push({
      type: 'exit',
      name: village.name,
      position: { x: exitX, y: exitY, z: exitZ },
      trackDistance: (closestIdx + 15) * 10,
      mesh: exitSign
    });
  });
  
  return signs;
}

// Check if rider is near a sign and should show toast
let lastAnnouncedSign = null;

export function checkSignProximity(riderPos, signs, distanceAlongTrack) {
  // Find signs within 20m ahead
  const proximityRange = 20;
  
  for (const sign of signs) {
    if (sign.type !== 'entry') continue;
    
    const dx = riderPos.x - sign.position.x;
    const dz = riderPos.z - sign.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    // If we're within range and haven't announced this sign yet
    if (dist < proximityRange && lastAnnouncedSign !== sign.name) {
      lastAnnouncedSign = sign.name;
      return {
        shouldShow: true,
        message: `Entering ${sign.name}`
      };
    }
  }
  
  // Reset if we're far from all signs
  let anyNear = false;
  for (const sign of signs) {
    const dx = riderPos.x - sign.position.x;
    const dz = riderPos.z - sign.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 100) {
      anyNear = true;
      break;
    }
  }
  
  if (!anyNear) {
    lastAnnouncedSign = null;
  }
  
  return { shouldShow: false };
}

export function resetSignAnnouncements() {
  lastAnnouncedSign = null;
}
