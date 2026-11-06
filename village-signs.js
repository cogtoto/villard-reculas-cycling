// French village/hamlet road signs for both routes - using real OSM data
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
  
  // Sign board - larger for better visibility (3m wide x 1.5m high, French standard)
  const signWidth = 3.0;
  const signHeight = 1.5;
  const signTexture = createVillageSign(name, isExit);
  
  const signBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(signWidth, signHeight),
    new THREE.MeshStandardMaterial({
      map: signTexture,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
      emissive: 0xffffff,
      emissiveIntensity: 0.2 // Slight glow to ensure visibility
    })
  );
  signBoard.position.y = 2.0; // Height above ground (sign center)
  signBoard.castShadow = true;
  signBoard.receiveShadow = true;
  
  // Metal post (7cm diameter, 3m tall)
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 3.0, 8),
    new THREE.MeshStandardMaterial({
      color: 0x707070,
      roughness: 0.6,
      metalness: 0.4
    })
  );
  post.position.y = 1.5; // Post base to center
  post.castShadow = true;
  post.receiveShadow = true;
  
  group.add(signBoard, post);
  return group;
}

// Place village signs along the track using OSM data with entry/exit km
export function placeVillageSigns(scene, track, villagesData, groundHeightFn) {
  const signs = [];
  
  // Use track.pts for the actual track points
  const samples = track.pts || track.samples || [];
  if (samples.length === 0) {
    console.error('No track points available for village signs');
    return signs;
  }
  
  // Calculate cumulative distances
  const cumDist = [0];
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    const dx = curr.x - prev.x;
    const dz = curr.z - prev.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    cumDist.push(cumDist[i - 1] + dist);
  }
  
  const totalDist = cumDist[cumDist.length - 1];
  
  console.log(`Placing village signs from ${villagesData.length} OSM entries`);
  
  for (const village of villagesData) {
    const entryDistM = village.entry_km * 1000;
    const exitDistM = village.exit_km * 1000;
    
    // Find track indices for entry and exit
    let entryIdx = cumDist.findIndex(d => d >= entryDistM);
    let exitIdx = cumDist.findIndex(d => d >= exitDistM);
    
    if (entryIdx === -1) entryIdx = 0;
    if (exitIdx === -1) exitIdx = samples.length - 1;
    
    const passInfo = village.pass ? ` (pass ${village.pass})` : '';
    console.log(`  ${village.name}${passInfo}: entry ${village.entry_km} km (idx ${entryIdx}), exit ${village.exit_km} km (idx ${exitIdx})`);
    
    // Place entry sign
    // Special handling for km 0: place sign 35m ahead of spawn so it's visible
    if (entryIdx === 0 && entryDistM === 0) {
      // Find a point ~35m ahead on the track
      let aheadIdx = 0;
      let aheadDist = 0;
      for (let i = 1; i < cumDist.length; i++) {
        if (cumDist[i] >= 35) {
          aheadIdx = i;
          aheadDist = cumDist[i];
          break;
        }
      }
      
      if (aheadIdx > 0) {
        const signPt = samples[aheadIdx];
        const prevPt = samples[Math.max(0, aheadIdx - 5)];
        
        // Calculate direction vector (approach direction from spawn)
        const dx = signPt.x - prevPt.x;
        const dz = signPt.z - prevPt.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        
        if (len > 0) {
          // Perpendicular offset (4.5m to the right, further from road edge)
          const perpX = -dz / len;
          const perpZ = dx / len;
          
          const signX = signPt.x + perpX * 4.5;
          const signZ = signPt.z + perpZ * 4.5;
          const signY = groundHeightFn(signX, signZ) + 0.1; // Slight elevation to avoid burial
          
          const entrySign = createSignPost(village.name, false);
          entrySign.position.set(signX, signY, signZ);
          
          // Orient sign to face approaching rider from spawn
          const angle = Math.atan2(dx, dz);
          entrySign.rotation.y = angle;
          
          scene.add(entrySign);
          console.log(`  → Start sign placed at ${aheadDist.toFixed(0)}m ahead, world pos: (${signX.toFixed(1)}, ${signY.toFixed(1)}, ${signZ.toFixed(1)})`);
          signs.push({
            name: village.name,
            type: 'entry',
            position: { x: signPt.x, z: signPt.z },
            distanceM: aheadDist,
            announced: false,
            pass: village.pass
          });
        }
      }
    } else if (entryIdx > 0) {
      // Normal entry sign placement (not at spawn)
      const entryPt = samples[entryIdx];
      const prevPt = samples[Math.max(0, entryIdx - 5)];
      
      // Calculate direction vector (approach direction)
      const dx = entryPt.x - prevPt.x;
      const dz = entryPt.z - prevPt.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      
      if (len > 0) {
        // Perpendicular offset (4.5m to the right when approaching)
        const perpX = -dz / len;
        const perpZ = dx / len;
        
        const signX = entryPt.x + perpX * 4.5;
        const signZ = entryPt.z + perpZ * 4.5;
        const signY = groundHeightFn(signX, signZ) + 0.1; // Slight elevation
        
        const entrySign = createSignPost(village.name, false);
        entrySign.position.set(signX, signY, signZ);
        
        // Orient sign to face approaching rider
        const angle = Math.atan2(dx, dz);
        entrySign.rotation.y = angle;
        
        scene.add(entrySign);
        console.log(`  → Entry sign at ${village.entry_km} km, world pos: (${signX.toFixed(1)}, ${signY.toFixed(1)}, ${signZ.toFixed(1)})`);
        signs.push({
          name: village.name,
          type: 'entry',
          position: { x: entryPt.x, z: entryPt.z },
          distanceM: entryDistM,
          announced: false,
          pass: village.pass
        });
      }
    }
    
    // Place exit sign
    if (exitIdx < samples.length - 1) {
      const exitPt = samples[exitIdx];
      const nextPt = samples[Math.min(samples.length - 1, exitIdx + 5)];
      
      // Calculate direction vector (departure direction)
      const dx = nextPt.x - exitPt.x;
      const dz = nextPt.z - exitPt.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      
      if (len > 0) {
        // Perpendicular offset (4.5m to the right when departing)
        const perpX = -dz / len;
        const perpZ = dx / len;
        
        const signX = exitPt.x + perpX * 4.5;
        const signZ = exitPt.z + perpZ * 4.5;
        const signY = groundHeightFn(signX, signZ) + 0.1;
        
        const exitSign = createSignPost(village.name, true);
        exitSign.position.set(signX, signY, signZ);
        
        // Orient sign to face departing rider
        const angle = Math.atan2(dx, dz);
        exitSign.rotation.y = angle;
        
        scene.add(exitSign);
        console.log(`  → Exit sign at ${village.exit_km} km, world pos: (${signX.toFixed(1)}, ${signY.toFixed(1)}, ${signZ.toFixed(1)})`);
        signs.push({
          name: village.name,
          type: 'exit',
          position: { x: exitPt.x, z: exitPt.z },
          distanceM: exitDistM,
          announced: false,
          pass: village.pass
        });
      }
    }
  }
  
  console.log(`✓ Placed ${signs.length} village signs total`);
  
  // Debug summary: show sign positions vs nearest road point
  console.log('\n=== Village Signs Summary ===');
  signs.forEach((s, i) => {
    const roadPt = samples.find(pt => 
      Math.abs(pt.x - s.position.x) < 10 && Math.abs(pt.z - s.position.z) < 10
    ) || samples[0];
    const distToRoad = Math.sqrt(
      (s.position.x - roadPt.x) ** 2 + (s.position.z - roadPt.z) ** 2
    );
    console.log(`${i + 1}. ${s.name} (${s.type}) at ${(s.distanceM / 1000).toFixed(2)} km`);
    console.log(`   Sign world pos: (${s.position.x.toFixed(1)}, ?, ${s.position.z.toFixed(1)})`);
    console.log(`   Nearest road: (${roadPt.x.toFixed(1)}, ?, ${roadPt.z.toFixed(1)}), dist: ${distToRoad.toFixed(1)}m`);
  });
  console.log('=========================\n');
  
  return signs;
}

// Check if rider is near any sign (for toast notifications)
export function checkSignProximity(riderPos, signs, distanceAlongTrack) {
  const ANNOUNCE_DISTANCE = 50; // meters
  const announcements = [];
  
  for (const sign of signs) {
    if (!sign.announced && sign.type === 'entry') {
      const dx = riderPos.x - sign.position.x;
      const dz = riderPos.z - sign.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist < ANNOUNCE_DISTANCE) {
        sign.announced = true;
        const passInfo = sign.pass ? ` (${sign.pass}${sign.pass === 1 ? 'st' : sign.pass === 2 ? 'nd' : sign.pass === 3 ? 'rd' : 'th'} time)` : '';
        announcements.push(`Entering ${sign.name}${passInfo}`);
      }
    }
  }
  
  return announcements;
}

// Reset announcement flags (e.g., when starting a new ride)
export function resetSignAnnouncements(signs) {
  for (const sign of signs) {
    sign.announced = false;
  }
}
