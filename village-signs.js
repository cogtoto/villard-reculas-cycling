// French village/hamlet road signs for both routes - using real OSM data
import * as THREE from 'three';

// Create an authentic French agglomeration sign
// White background, thick rounded red border, bold black text, rounded corners
function createVillageSign(name, isExit = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  const cornerRadius = 40;
  const borderThickness = 32;
  
  // Draw rounded rectangle path
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  
  // Subtle gradient background for depth
  const bgGradient = ctx.createLinearGradient(0, 0, 0, 512);
  bgGradient.addColorStop(0, '#fafafa');
  bgGradient.addColorStop(1, '#f0f0f0');
  ctx.fillStyle = bgGradient;
  roundRect(0, 0, 1024, 512, cornerRadius);
  ctx.fill();
  
  // White main background
  ctx.fillStyle = '#ffffff';
  roundRect(borderThickness / 2, borderThickness / 2, 
            1024 - borderThickness, 512 - borderThickness, cornerRadius - borderThickness / 2);
  ctx.fill();
  
  // Red border (thick, rounded, authentic French red)
  ctx.strokeStyle = '#e30613'; // Official French signage red
  ctx.lineWidth = borderThickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  roundRect(borderThickness / 2, borderThickness / 2, 
            1024 - borderThickness, 512 - borderThickness, cornerRadius - borderThickness / 2);
  ctx.stroke();
  
  // Village name - bold, clean font
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Scale font size based on name length
  let fontSize = 140;
  if (name.length > 15) fontSize = 110;
  if (name.length > 20) fontSize = 90;
  if (name.length > 25) fontSize = 75;
  
  ctx.font = `bold ${fontSize}px "Arial Black", sans-serif`;
  ctx.fillText(name, 512, 256);
  
  // If exit sign, add thick red diagonal bar (authentic exit style)
  if (isExit) {
    ctx.strokeStyle = '#e30613';
    ctx.lineWidth = 28;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(80, 80);
    ctx.lineTo(944, 432);
    ctx.stroke();
  }
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4; // Better filtering for readability
  
  return texture;
}

// Create a 3D sign post with the village name - authentic French double-sided design
function createSignPost(name, isEntry = true) {
  const group = new THREE.Group();
  
  // Sign dimensions (French standard agglomeration sign)
  const signWidth = 3.0;
  const signHeight = 1.5;
  const signThickness = 0.08;
  
  // Create textures for both faces
  const entryTexture = createVillageSign(name, false); // Entry: no diagonal bar
  const exitTexture = createVillageSign(name, true);   // Exit: with red diagonal bar
  
  // Sign board as a thin box with different textures on each face
  const signGeo = new THREE.BoxGeometry(signWidth, signHeight, signThickness);
  
  // Create materials array for the box faces
  // BoxGeometry face order: [right, left, top, bottom, front, back]
  const materials = [
    // Right edge (metal frame)
    new THREE.MeshStandardMaterial({ 
      color: 0xd0d0d0, 
      roughness: 0.4, 
      metalness: 0.6 
    }),
    // Left edge (metal frame)
    new THREE.MeshStandardMaterial({ 
      color: 0xd0d0d0, 
      roughness: 0.4, 
      metalness: 0.6 
    }),
    // Top edge (metal frame)
    new THREE.MeshStandardMaterial({ 
      color: 0xd0d0d0, 
      roughness: 0.4, 
      metalness: 0.6 
    }),
    // Bottom edge (metal frame)
    new THREE.MeshStandardMaterial({ 
      color: 0xd0d0d0, 
      roughness: 0.4, 
      metalness: 0.6 
    }),
    // Front face (entry side - rider approaching sees this)
    new THREE.MeshStandardMaterial({
      map: entryTexture,
      roughness: 0.5,
      metalness: 0.1,
      emissive: 0xffffff,
      emissiveIntensity: 0.15
    }),
    // Back face (exit side - rider leaving sees this)
    new THREE.MeshStandardMaterial({
      map: exitTexture,
      roughness: 0.5,
      metalness: 0.1,
      emissive: 0xffffff,
      emissiveIntensity: 0.15
    })
  ];
  
  const signBoard = new THREE.Mesh(signGeo, materials);
  signBoard.position.y = 2.2; // Height above ground
  signBoard.castShadow = true;
  signBoard.receiveShadow = true;
  group.add(signBoard);
  
  // Two galvanised steel posts (French standard: two posts on sides)
  const postRadius = 0.05;
  const postHeight = 3.2;
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0xa0a0a0, // Galvanised steel color
    roughness: 0.5,
    metalness: 0.7
  });
  
  // Left post
  const leftPost = new THREE.Mesh(
    new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 8),
    postMaterial
  );
  leftPost.position.set(-signWidth / 2 + 0.15, 1.6, 0);
  leftPost.castShadow = true;
  group.add(leftPost);
  
  // Right post
  const rightPost = new THREE.Mesh(
    new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 8),
    postMaterial
  );
  rightPost.position.set(signWidth / 2 - 0.15, 1.6, 0);
  rightPost.castShadow = true;
  group.add(rightPost);
  
  // Horizontal mounting brackets (subtle detail)
  const bracketGeo = new THREE.BoxGeometry(0.12, 0.06, signThickness + 0.04);
  const bracketMat = postMaterial;
  
  for (const x of [-signWidth / 2 + 0.15, signWidth / 2 - 0.15]) {
    const topBracket = new THREE.Mesh(bracketGeo, bracketMat);
    topBracket.position.set(x, 2.2 + signHeight / 2 - 0.1, 0);
    group.add(topBracket);
    
    const bottomBracket = new THREE.Mesh(bracketGeo, bracketMat);
    bottomBracket.position.set(x, 2.2 - signHeight / 2 + 0.1, 0);
    group.add(bottomBracket);
  }
  
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
          
          // Orient sign to face approaching rider from spawn (face backward toward prevPt)
          const angle = Math.atan2(dx, dz) + Math.PI;
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
        
        // Orient sign to face approaching rider (face backward toward prevPt)
        const angle = Math.atan2(dx, dz) + Math.PI;
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
        
        // Orient sign to face departing rider (face backward, rider sees it as they leave)
        const angle = Math.atan2(dx, dz) + Math.PI;
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
