// Sky system without Three.js Sky addon (removed to avoid ACES washing)
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

let currentHDRI = null;

// createProceduralSky removed - custom gradient domes are created in alpine/normandy atmosphere functions

// Load and setup HDRI environment (High quality only)
export async function loadHDRIEnvironment(scene, renderer, hdriPath) {
  return new Promise((resolve, reject) => {
    const loader = new RGBELoader();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    loader.load(
      hdriPath,
      (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        texture.dispose();
        pmremGenerator.dispose();
        
        // Set as scene environment and background
        scene.environment = envMap;
        scene.background = envMap;
        
        currentHDRI = envMap;
        
        console.log('HDRI environment loaded:', hdriPath);
        resolve(envMap);
      },
      undefined,
      (error) => {
        console.warn('Failed to load HDRI:', error);
        reject(error);
      }
    );
  });
}

// Setup lighting based on quality and route (Zwift-style sunny with shadows)
export function setupLighting(scene, renderer, quality, routeType) {
  // Clear existing lights
  const lights = scene.children.filter(obj => obj.isLight);
  lights.forEach(light => scene.remove(light));
  
  // Zwift-style: 30-35° sun from side creating shadows across road
  const sunDirection = new THREE.Vector3(0.6, 0.55, 0.4).normalize(); // ~33° elevation
  
  // Warm sunny directional light
  const sun = new THREE.DirectionalLight(0xfff6e8, 2.6);
  sun.position.copy(sunDirection).multiplyScalar(1000);
  
  // Enable shadows on all quality levels (Zwift-style)
  sun.castShadow = true;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  
  // Shadow map size based on quality
  if (quality === 'high') {
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
  } else if (quality === 'medium') {
    sun.shadow.mapSize.width = 1536;
    sun.shadow.mapSize.height = 1536;
  } else {
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
  }
  
  // Wide shadow frustum around rider (±60m) for long tree shadows
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 150;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  
  scene.add(sun);
  scene.add(sun.target); // Target must be in scene for shadow camera to work
  
  // Bright hemisphere light for fill (vivid colors)
  const skyColor = 0x87CEEB;  // Vivid sky blue
  const groundColor = 0x8fae55; // Bright grass green
  const ambient = new THREE.HemisphereLight(skyColor, groundColor, 1.6);
  scene.add(ambient);
  
  // Sky dome is now created in route-specific atmosphere functions (alpine/normandy)
  
  // Brighter tone mapping for vivid colors
  renderer.toneMappingExposure = 1.1;
  
  return { sun, sunDirection };
}

// Cleanup
export function cleanupSky(scene) {
  if (currentHDRI) {
    currentHDRI.dispose();
    currentHDRI = null;
  }
  
  scene.environment = null;
  // Don't clear scene.background - route atmosphere sets it
}
