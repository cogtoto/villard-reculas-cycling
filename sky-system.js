// Sky system with Three.js Sky shader and optional HDRI
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

let currentSky = null;
let currentHDRI = null;

// Create Three.js Sky shader matched to directional sun
export function createProceduralSky(scene, sunDirection) {
  // Clean up old sky
  if (currentSky) {
    scene.remove(currentSky);
    currentSky.geometry?.dispose();
    currentSky.material?.dispose();
  }
  
  const sky = new Sky();
  sky.scale.setScalar(450000);
  
  const skyUniforms = sky.material.uniforms;
  // Less turbidity for clearer, deeper blue
  skyUniforms['turbidity'].value = 3;
  // Higher rayleigh for deeper blue scattering
  skyUniforms['rayleigh'].value = 3.5;
  skyUniforms['mieCoefficient'].value = 0.005;
  skyUniforms['mieDirectionalG'].value = 0.8;
  
  // Match sun position to directional light
  const phi = Math.acos(sunDirection.y);
  const theta = Math.atan2(sunDirection.x, sunDirection.z);
  const sunPosition = new THREE.Vector3();
  sunPosition.setFromSphericalCoords(1, phi, theta);
  skyUniforms['sunPosition'].value.copy(sunPosition);
  
  scene.add(sky);
  currentSky = sky;
  
  return sky;
}

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
        
        // Remove procedural sky if present
        if (currentSky) {
          scene.remove(currentSky);
          currentSky.geometry?.dispose();
          currentSky.material?.dispose();
          currentSky = null;
        }
        
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

// Setup lighting based on quality and route
export function setupLighting(scene, renderer, quality, routeType) {
  // Clear existing lights
  const lights = scene.children.filter(obj => obj.isLight);
  lights.forEach(light => scene.remove(light));
  
  // Sun direction (morning light, slightly from side)
  const sunDirection = new THREE.Vector3(0.3, 0.6, 0.8).normalize();
  
  // Directional sun light
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.8);
  sun.position.copy(sunDirection).multiplyScalar(1000);
  sun.castShadow = quality === 'high';
  
  if (sun.castShadow) {
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.bias = -0.001;
  }
  
  scene.add(sun);
  
  // Ambient hemisphere light (softer than before for better contrast)
  let skyColor, groundColor;
  if (routeType === 'villard') {
    skyColor = 0xb8d8ff;  // Cool alpine sky
    groundColor = 0x8a9080; // Rocky ground
  } else {
    skyColor = 0xdce8ff;  // Warmer sky
    groundColor = 0x7a8a60; // Grass
  }
  
  const ambient = new THREE.HemisphereLight(skyColor, groundColor, 0.6);
  scene.add(ambient);
  
  // Setup sky based on quality
  if (quality === 'high') {
    // Try to load HDRI, fallback to procedural
    loadHDRIEnvironment(scene, renderer, '/hdri/kloofendal_1k.hdr')
      .catch(() => {
        console.log('HDRI not available, using procedural sky');
        createProceduralSky(scene, sunDirection);
      });
  } else {
    // Low/Medium: procedural sky
    createProceduralSky(scene, sunDirection);
  }
  
  return { sun, sunDirection };
}

// Cleanup
export function cleanupSky(scene) {
  if (currentSky) {
    scene.remove(currentSky);
    currentSky.geometry?.dispose();
    currentSky.material?.dispose();
    currentSky = null;
  }
  
  if (currentHDRI) {
    currentHDRI.dispose();
    currentHDRI = null;
  }
  
  scene.environment = null;
  scene.background = null;
}
