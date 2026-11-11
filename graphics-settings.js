// Graphics quality settings with auto-detection for weak GPUs
import * as THREE from 'three';

const SETTINGS_KEY = 'vv.graphics';

// Detect weak GPU (Radeon R7, Intel HD, mobile)
function detectWeakGPU() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return true; // No WebGL = weak
  
  try {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
      console.log('GPU detected:', renderer);
      
      // Weak GPU patterns
      if (renderer.includes('intel hd') ||
          renderer.includes('intel(r) hd') ||
          renderer.includes('radeon r5') ||
          renderer.includes('radeon r7') ||
          renderer.includes('adreno 3') || // Older Adreno GPUs
          renderer.includes('adreno 4') ||
          renderer.includes('mali-4') ||
          renderer.includes('mali-t7') ||
          renderer.includes('swiftshader')) {
        return true;
      }
    }
  } catch (e) {
    console.warn('Could not detect GPU:', e);
  }
  
  return false;
}

// Detect mobile device
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Default quality based on platform
function getDefaultQuality() {
  if (isMobile()) return 'low';
  if (detectWeakGPU()) return 'low';
  return 'medium';
}

// Quality presets
const PRESETS = {
  low: {
    pixelRatio: 1.0,
    viewDistance: 3000,
    fogNear: 100,
    fogFar: 1200,
    shadows: true, // Zwift-style: shadows on all levels
    skyType: 'simple', // Simple Sky shader
    terrainLOD: 1, // Single LOD
    textureSize: 512,
    anisotropy: 1,
    toneMapping: true,
  },
  medium: {
    pixelRatio: Math.min(window.devicePixelRatio, 1.5),
    viewDistance: 8000,
    fogNear: 150,
    fogFar: 2500,
    shadows: true, // Zwift-style: shadows on all levels
    skyType: 'simple',
    terrainLOD: 2,
    textureSize: 1024,
    anisotropy: 2,
    toneMapping: true,
  },
  high: {
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    viewDistance: 20000,
    fogNear: 300,
    fogFar: 6000,
    shadows: true, // Only rider shadow
    skyType: 'hdri', // HDRI environment (if available)
    terrainLOD: 3,
    textureSize: 2048,
    anisotropy: 4,
    toneMapping: true,
  }
};

class GraphicsSettings {
  constructor() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    this.quality = saved || getDefaultQuality();
    this.showFPS = false;
    console.log(`Graphics quality: ${this.quality} (${saved ? 'saved' : 'auto-detected'})`);
  }
  
  getPreset() {
    return PRESETS[this.quality] || PRESETS.medium;
  }
  
  setQuality(quality) {
    if (!PRESETS[quality]) {
      console.warn(`Unknown quality: ${quality}`);
      return;
    }
    this.quality = quality;
    localStorage.setItem(SETTINGS_KEY, quality);
    console.log(`Graphics quality set to: ${quality}`);
  }
  
  toggleFPS() {
    this.showFPS = !this.showFPS;
    return this.showFPS;
  }
  
  // Apply settings to renderer
  applyToRenderer(renderer) {
    const preset = this.getPreset();
    renderer.setPixelRatio(preset.pixelRatio);
    renderer.shadowMap.enabled = preset.shadows;
    
    if (preset.toneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.85; // Less washed-out
    }
    
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  
  // Get fog settings for route
  getFogSettings(routeType) {
    const preset = this.getPreset();
    
    if (routeType === 'villard') {
      // Mountain haze - deeper blue matching sky horizon
      return {
        color: new THREE.Color(0x88a8c8),
        near: preset.fogNear * 0.8,
        far: preset.fogFar * 0.9
      };
    } else if (routeType === 'normandy') {
      // Softer countryside fog - warmer but less washed-out
      return {
        color: new THREE.Color(0xc8d4e0),
        near: preset.fogNear * 1.2,
        far: preset.fogFar * 1.1
      };
    }
    
    // Default
    return {
      color: new THREE.Color(0xcfe4ff),
      near: preset.fogNear,
      far: preset.fogFar
    };
  }
  
  // Camera far plane based on quality
  getCameraFar() {
    return this.getPreset().viewDistance;
  }
}

// FPS counter
class FPSCounter {
  constructor() {
    this.fps = 0;
    this.frames = 0;
    this.lastTime = performance.now();
    this.element = null;
  }
  
  show() {
    if (this.element) return;
    
    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.7);
      color: #0f0;
      font: bold 16px monospace;
      padding: 8px 12px;
      border-radius: 6px;
      z-index: 1000;
      pointer-events: none;
    `;
    this.element.textContent = 'FPS: --';
    document.body.appendChild(this.element);
  }
  
  hide() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
  
  update() {
    if (!this.element) return;
    
    this.frames++;
    const now = performance.now();
    const delta = now - this.lastTime;
    
    if (delta >= 1000) {
      this.fps = Math.round((this.frames * 1000) / delta);
      this.element.textContent = `FPS: ${this.fps}`;
      this.frames = 0;
      this.lastTime = now;
    }
  }
  
  getFPS() {
    return this.fps;
  }
}

export const graphicsSettings = new GraphicsSettings();
export const fpsCounter = new FPSCounter();
