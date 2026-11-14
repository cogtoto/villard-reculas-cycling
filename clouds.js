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

// Add clouds that follow camera (inside camera.far)
export function addCloudsToSky(scene, center, radius, count = 8) {
  const cloudTexture = createCloudTexture();
  const cloudMaterial = new THREE.SpriteMaterial({
    map: cloudTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 0.85
  });
  
  const clouds = [];
  
  for (let i = 0; i < count; i++) {
    const sprite = new THREE.Sprite(cloudMaterial.clone());
    
    // Random position in upper hemisphere (relative offsets)
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.PI * 0.15 + Math.random() * Math.PI * 0.25;
    
    // Small radius relative to camera (will be repositioned each frame)
    const dist = 60 + Math.random() * 20;
    const x = Math.sin(theta) * Math.cos(phi) * dist;
    const y = Math.cos(theta) * dist;
    const z = Math.sin(theta) * Math.sin(phi) * dist;
    
    sprite.position.set(x, y, z);
    sprite.userData.offset = { x, y, z }; // Store offset for camera following
    
    // Cloud size
    const scale = 15 + Math.random() * 10;
    sprite.scale.set(scale, scale * 0.6, 1);
    
    sprite.renderOrder = -998;
    scene.add(sprite);
    clouds.push(sprite);
  }
  
  // Store reference for camera following
  window._skyClouds = clouds;
  
  return clouds;
}
