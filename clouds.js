// Simple cloud sprites for Zwift-style sky (fluid on weak GPUs)
import * as THREE from 'three';

// Create a cloud texture (procedural soft white circle)
function createCloudTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  return new THREE.CanvasTexture(canvas);
}

// Add clouds around the sky dome (billboards facing camera)
export function addCloudsToSky(scene, center, radius, count = 8) {
  const cloudTexture = createCloudTexture();
  const cloudMaterial = new THREE.SpriteMaterial({
    map: cloudTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false, // Don't tone map clouds
    opacity: 0.85
  });
  
  const clouds = [];
  const minHeight = radius * 0.3;
  const maxHeight = radius * 0.6;
  
  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(cloudMaterial.clone());
    
    // Random position on sky dome hemisphere
    const phi = Math.random() * Math.PI * 2; // azimuth
    const theta = Math.PI * 0.15 + Math.random() * Math.PI * 0.25; // elevation (upper hemisphere)
    
    const dist = radius * 0.7;
    const x = center.x + Math.sin(theta) * Math.cos(phi) * dist;
    const y = center.y + Math.cos(theta) * dist;
    const z = center.z + Math.sin(theta) * Math.sin(phi) * dist;
    
    sprite.position.set(x, y, z);
    
    // Random cloud size
    const scale = 8000 + Math.random() * 6000;
    sprite.scale.set(scale, scale * 0.6, 1);
    
    sprite.renderOrder = -998; // Render after sky dome
    scene.add(sprite);
    clouds.push(sprite);
  }
  
  return clouds;
}
