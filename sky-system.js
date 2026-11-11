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
  // Zwift-style: beautiful deep blue sky, clear day
  skyUniforms['turbidity'].value = 1.5;  // Very clear
  skyUniforms['rayleigh'].value = 4.5;   // Deep blue
  skyUniforms['mieCoefficient'].value = 0.002;
  skyUniforms['mieDirectionalG'].value = 0.7;
  
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

// Setup lighting based on quality and route (Zwift-style sunny with shadows)
export function setupLighting(scene, renderer, quality, routeType) {
  // Clear existing lights
  const lights = scene.children.filter(obj => obj.isLight);
  lights.forEach(light => scene.remove(light));
  
  // Zwift-style: low warm sun creating beautiful shadows
  const sunDirection = new THREE.Vector3(0.5, 0.4, 0.7).normalize();
  
  // Warm sunny directional light
  const sun = new THREE.DirectionalLight(0xfff6e8, 2.4);
  sun.position.copy(sunDirection).multiplyScalar(1000);
  
  // Enable shadows on all quality levels (Zwift-style)
  sun.castShadow = true;
  sun.shadow.bias = -0.0001;
  sun.shadow.normalBias = 0.02;
  
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
  
  // Shadow frustum follows rider (updated in tick)
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 100;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  
  scene.add(sun);
  
  // Bright hemisphere light for fill (vivid colors)
  const skyColor = 0x87CEEB;  // Vivid sky blue
  const groundColor = 0x8fae55; // Bright grass green
  const ambient = new THREE.HemisphereLight(skyColor, groundColor, 1.6);
  scene.add(ambient);
  
  // Setup sky - always procedural for deep blue
  createProceduralSky(scene, sunDirection);
  
  // Brighter tone mapping for vivid colors
  renderer.toneMappingExposure = 1.1;
  
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
