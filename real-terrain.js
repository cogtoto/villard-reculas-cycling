// Real terrain system using chunked heightmaps with LOD
import * as THREE from 'three';
import { PALETTE } from './palette.js';

// Noise functions for procedural coloring
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }

class TerrainChunk {
  constructor(name, heightData, metadata, chunkMeta, orthoTexture, terrainSystem) {
    this.name = name;
    this.heightData = heightData; // Int16Array
    this.metadata = metadata;
    this.chunkMeta = chunkMeta;
    this.orthoTexture = orthoTexture; // Three.js Texture
    this.terrainSystem = terrainSystem; // Parent system for procedural coloring
    this.meshes = {}; // LOD levels: { lod0: mesh, lod1: mesh }
  }
  
  // Generate terrain mesh at specified LOD
  // LOD 0: full resolution, LOD 1: half resolution
  generateMesh(lodLevel = 0, sizeX, sizeZ) {
    const skip = Math.pow(2, lodLevel);
    const nx = Math.floor(this.chunkMeta.chunkSizeX / skip);
    const ny = Math.floor(this.chunkMeta.chunkSizeY / skip);
    
    const geometry = new THREE.PlaneGeometry(1, 1, nx - 1, ny - 1);
    const positions = geometry.attributes.position.array;
    
    // Apply elevation and scale to real-world size
    // DEM format: "row 0 = north", so row 0 should be at -Z (north)
    // PlaneGeometry: vertices go from front to back (increasing Z)
    // So we need to flip the Y index when reading from DEM
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const srcX = x * skip;
        // Flip Y: geometry row 0 (front, -Z, north) should read from DEM row 0 (north)
        // But PlaneGeometry V goes 0 (back/south) to 1 (front/north)
        // So we need: srcY = (ny - 1 - y) * skip to flip it
        const srcY = ((this.chunkMeta.chunkSizeY / skip) - 1 - y) * skip;
        const srcIdx = srcY * this.chunkMeta.chunkSizeX + srcX;
        const elevation = this.heightData[srcIdx];
        
        const idx = (y * nx + x) * 3;
        positions[idx] = (x / (nx - 1) - 0.5) * sizeX;
        positions[idx + 1] = elevation;
        positions[idx + 2] = (y / (ny - 1) - 0.5) * sizeZ;
      }
    }
    
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    // DEBUG: Check UV attribute
    if (!geometry.attributes.uv) {
      console.warn('Terrain geometry missing UV attribute!');
    } else {
      console.log(`Chunk ${this.name} LOD${lodLevel}: UVs present, ${geometry.attributes.uv.count} points`);
    }
    
    // Material: procedural vertex colors OR orthoimagery texture
    let material;
    if (this.orthoTexture) {
      console.log(`Chunk ${this.name} LOD${lodLevel}: Using ortho texture`);
      material = new THREE.MeshStandardMaterial({
        map: this.orthoTexture,
        roughness: 1.0,
        metalness: 0.0,
        emissive: 0xffffff,
        emissiveMap: this.orthoTexture,
        emissiveIntensity: 0.3,
        side: THREE.FrontSide
      });
      if (this.orthoTexture.image) {
        this.orthoTexture.needsUpdate = true;
      }
    } else {
      console.log(`Chunk ${this.name} LOD${lodLevel}: Using procedural vertex colors`);
      material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.FrontSide
      });
    }
    
    // Generate procedural vertex colors if no ortho texture
    if (!this.orthoTexture) {
      const colors = new Float32Array(positions.length);
      const COL = PALETTE.terrain;
      const C = (h) => [(h >> 16) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
      const meadow = C(COL.meadow), meadow2 = C(COL.meadow2);
      const forest = C(COL.forest), forest2 = C(COL.forest2);
      const rock = C(COL.rock), rock2 = C(COL.rock2);
      const snow = C(COL.snow), snowShade = C(COL.snowShade);
      
      for (let i = 0; i < ny; i++) {
        for (let j = 0; j < nx; j++) {
          const idx = (i * nx + j) * 3;
          const x = positions[idx];
          const y = positions[idx + 1];
          const z = positions[idx + 2];
          
          // World position
          const wx = x + this.chunkMeta[this.name].centerX;
          const wz = z + this.chunkMeta[this.name].centerZ;
          
          // Calculate slope from neighbors
          let slope = 0;
          if (j > 0 && j < nx - 1 && i > 0 && i < ny - 1) {
            const dx = positions[idx + 3] - positions[idx - 3];
            const dzElev = positions[(i + 1) * nx * 3 + j * 3 + 1] - positions[(i - 1) * nx * 3 + j * 3 + 1];
            slope = Math.sqrt(dx * dx + dzElev * dzElev) / (2 * (sizeX / (nx - 1)));
          }
          
          // Procedural classification by altitude and slope
          const n = fbm(wx * 0.004, wz * 0.004, 3);
          const microGrass = fbm(wx * 0.15, wz * 0.15, 2) * 0.15;
          const microRock = fbm(wx * 0.08, wz * 0.08, 3) * 0.2;
          
          let col;
          const snowLine = 2150 + (n - 0.5) * 350;
          if (y > snowLine || y > 2400) {
            // Snow
            const t = hash(j, i) * 0.5 + n * 0.3;
            col = [
              snow[0] + (snowShade[0] - snow[0]) * t,
              snow[1] + (snowShade[1] - snow[1]) * t,
              snow[2] + (snowShade[2] - snow[2]) * t
            ];
          } else if (slope > 0.9 || y > 2250 + n * 200) {
            // Rock
            const t = n * 0.7 + microRock * 0.3;
            col = [
              rock[0] + (rock2[0] - rock[0]) * t,
              rock[1] + (rock2[1] - rock[1]) * t,
              rock[2] + (rock2[2] - rock[2]) * t
            ];
          } else if (y < 2000 && fbm(wx * 0.0018, wz * 0.0018, 4) > 0.47 && slope < 0.7) {
            // Forest
            const t = hash(j, i) * 0.6 + microGrass * 0.4;
            col = [
              forest[0] + (forest2[0] - forest[0]) * t,
              forest[1] + (forest2[1] - forest[1]) * t,
              forest[2] + (forest2[2] - forest[2]) * t
            ];
          } else {
            // Meadow
            const altBlend = Math.min(1, n * 0.8 + Math.max(0, (y - 1700) / 600));
            const t = altBlend + microGrass * 0.3;
            col = [
              meadow[0] + (meadow2[0] - meadow[0]) * t,
              meadow[1] + (meadow2[1] - meadow[1]) * t,
              meadow[2] + (meadow2[2] - meadow[2]) * t
            ];
          }
          
          // Brightness variation
          const v = 0.88 + hash(j, i) * 0.18;
          colors[idx] = Math.min(1, col[0] * v);
          colors[idx + 1] = Math.min(1, col[1] * v);
          colors[idx + 2] = Math.min(1, col[2] * v);
        }
      }
      
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    
    return mesh;
  }
}

export class RealTerrainSystem {
  constructor() {
    this.chunks = new Map();
    this.metadata = null;
    this.loaded = false;
  }
  
  async load(scene, basePath, gpxOrigin, useProceduralColor = false) {
    console.log('Loading real terrain from:', basePath);
    console.log('GPX origin:', gpxOrigin);
    console.log('Use procedural color:', useProceduralColor);
    
    this.gpxOrigin = gpxOrigin;
    this.useProceduralColor = useProceduralColor;
    
    // Load metadata
    const metaResponse = await fetch(`${basePath}/metadata.json`);
    this.metadata = await metaResponse.json();
    
    console.log('Terrain metadata:', this.metadata);
    
    // Load orthoimagery textures only if not using procedural color
    const orthoTextures = {};
    
    if (!useProceduralColor && this.metadata.orthoimagery) {
      console.log('Loading orthoimagery textures...');
      
      const textureLoader = new THREE.TextureLoader();
      const texturePromises = this.metadata.orthoimagery.map(ortho => {
        return new Promise((resolve) => {
          const texturePath = `${basePath}/${ortho.file}`;
          console.log(`  Loading texture from: ${texturePath}`);
          
          textureLoader.load(
            texturePath,
            (texture) => {
              console.log(`  ✓ Texture loaded: ${ortho.file}, image: ${texture.image?.width}×${texture.image?.height}`);
              
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.wrapS = THREE.ClampToEdgeWrapping;
              texture.wrapT = THREE.ClampToEdgeWrapping;
              texture.minFilter = THREE.LinearMipmapLinearFilter;
              texture.magFilter = THREE.LinearFilter;
              texture.generateMipmaps = true;
              texture.needsUpdate = true;
              
              const name = ortho.file.replace('ortho-', '').replace('.webp', '');
              orthoTextures[name] = texture;
              console.log(`  ✓ Stored texture as '${name}'`);
              resolve();
            },
            (progress) => {
              if (progress.lengthComputable) {
                console.log(`  Progress ${ortho.file}: ${(progress.loaded / progress.total * 100).toFixed(0)}%`);
              }
            },
            (err) => {
              console.error(`  ✗ Failed to load ${ortho.file}:`, err);
              resolve();
            }
          );
        });
      });
      
      await Promise.all(texturePromises);
      console.log('All textures loaded:', Object.keys(orthoTextures));
    } else if (useProceduralColor) {
      console.log('Using procedural coloring (no orthoimagery)');
    }
    
    // Load all chunks with textures
    const chunkNames = ['nw', 'ne', 'sw', 'se'];
    
    for (const name of chunkNames) {
      const heightmapPath = `${basePath}/heightmap-${name}.bin`;
      const response = await fetch(heightmapPath);
      const buffer = await response.arrayBuffer();
      const heightData = new Int16Array(buffer);
      
      const chunk = new TerrainChunk(
        name,
        heightData,
        this.metadata,
        this.metadata.chunks,
        orthoTextures[name] || null,
        this
      );
      
      this.chunks.set(name, chunk);
      console.log(`  Loaded chunk ${name}: ${heightData.length} points`);
    }
    
    // Generate LOD meshes for all chunks
    // Get quality from global settings (will be set by main.js)
    const quality = window._terrainQuality || 'medium';
    this.generateAllMeshes(scene, quality);
    
    this.loaded = true;
    console.log('Real terrain loaded successfully');
    
    return this.metadata;
  }
  
  generateAllMeshes(scene, quality = 'medium') {
    // Use same equirectangular projection as GPX loader
    const R = 6371000;
    const k = Math.cos((this.gpxOrigin.lat0 * Math.PI) / 180);
    
    // Convert lat/lon bbox to local coordinates (same as GPX)
    const latToZ = (lat) => -((lat - this.gpxOrigin.lat0) * Math.PI / 180) * R;
    const lonToX = (lon) => ((lon - this.gpxOrigin.lon0) * Math.PI / 180) * R * k;
    
    // Calculate chunk positions in local coordinates
    for (const ortho of this.metadata.orthoimagery) {
      const chunk = this.chunks.get(ortho.bbox.name);
      if (!chunk) continue;
      
      // Center of this chunk's bbox
      const centerLat = (ortho.bbox.minLat + ortho.bbox.maxLat) / 2;
      const centerLon = (ortho.bbox.minLon + ortho.bbox.maxLon) / 2;
      const centerX = lonToX(centerLon);
      const centerZ = latToZ(centerLat);
      
      // Size of chunk in meters
      const latSpan = ortho.bbox.maxLat - ortho.bbox.minLat;
      const lonSpan = ortho.bbox.maxLon - ortho.bbox.minLon;
      const sizeX = lonSpan * Math.PI / 180 * R * k;
      const sizeZ = latSpan * Math.PI / 180 * R;
      
      console.log(`Chunk ${ortho.bbox.name}: center (${centerX.toFixed(0)}, ${centerZ.toFixed(0)}), size ${sizeX.toFixed(0)} × ${sizeZ.toFixed(0)} m`);
      
      // Generate LOD 0 (high detail) - skip on Low quality
      if (quality !== 'low') {
        const lod0 = chunk.generateMesh(0, sizeX, sizeZ);
        lod0.position.set(centerX, 0, centerZ);
        chunk.meshes.lod0 = lod0;
        scene.add(lod0);
      }
      
      // Generate LOD 1 (low detail) - always generate
      const lod1 = chunk.generateMesh(1, sizeX, sizeZ);
      lod1.position.set(centerX, 0, centerZ);
      lod1.visible = quality === 'low' ? true : false; // Visible on Low, hidden otherwise
      chunk.meshes.lod1 = lod1;
      scene.add(lod1);
    }
  }
  
  // Update LOD based on camera distance
  updateLOD(cameraPosition, quality) {
    if (!this.loaded) return;
    
    // LOD distance thresholds based on quality
    let lodDistance;
    if (quality === 'low') {
      lodDistance = 1500;
    } else if (quality === 'medium') {
      lodDistance = 2500;
    } else {
      lodDistance = 4000;
    }
    
    for (const chunk of this.chunks.values()) {
      if (!chunk.meshes.lod0) continue;
      
      const distance = cameraPosition.distanceTo(chunk.meshes.lod0.position);
      
      if (distance < lodDistance) {
        chunk.meshes.lod0.visible = true;
        chunk.meshes.lod1.visible = false;
      } else {
        chunk.meshes.lod0.visible = false;
        chunk.meshes.lod1.visible = true;
      }
    }
  }
  
  // Get height at world position with bilinear interpolation (for camera, rider, road)
  getHeightAt(worldX, worldZ) {
    if (!this.loaded) return 0;
    
    // World coordinates are relative to GPX origin (lat0, lon0)
    // Each chunk is chunkSizeX × chunkSizeY meters
    const chunkSizeX = this.metadata.chunks.chunkSizeX;
    const chunkSizeY = this.metadata.chunks.chunkSizeY;
    const realSizeX = this.metadata.chunks.realSizeX;
    const realSizeZ = this.metadata.chunks.realSizeZ;
    
    // Determine which chunk based on world position
    // Chunks are arranged: nw (x<0, z<0), ne (x>=0, z<0), sw (x<0, z>=0), se (x>=0, z>=0)
    let chunkName;
    if (worldZ < 0) {
      chunkName = worldX < 0 ? 'nw' : 'ne';
    } else {
      chunkName = worldX < 0 ? 'sw' : 'se';
    }
    
    const chunk = this.chunks.get(chunkName);
    if (!chunk) {
      console.warn(`Chunk ${chunkName} not found for position (${worldX.toFixed(1)}, ${worldZ.toFixed(1)})`);
      return 0;
    }
    
    // Convert world position to chunk-local grid coordinates
    // Each chunk mesh is centered at its chunk center
    const chunkCenterX = this.metadata.chunks[chunkName].centerX;
    const chunkCenterZ = this.metadata.chunks[chunkName].centerZ;
    
    // Local position within chunk mesh (-realSizeX/2 to +realSizeX/2)
    const localX = worldX - chunkCenterX;
    const localZ = worldZ - chunkCenterZ;
    
    // Convert to grid coordinates (0 to chunkSizeX-1, 0 to chunkSizeY-1)
    const gridX = (localX / realSizeX + 0.5) * chunkSizeX;
    const gridZ = (localZ / realSizeZ + 0.5) * chunkSizeY;
    
    // Bilinear interpolation
    const x0 = Math.floor(gridX);
    const z0 = Math.floor(gridZ);
    const x1 = Math.min(x0 + 1, chunkSizeX - 1);
    const z1 = Math.min(z0 + 1, chunkSizeY - 1);
    
    const fx = gridX - x0;
    const fz = gridZ - z0;
    
    // Clamp to valid range
    const x0c = Math.max(0, Math.min(x0, chunkSizeX - 1));
    const x1c = Math.max(0, Math.min(x1, chunkSizeX - 1));
    const z0c = Math.max(0, Math.min(z0, chunkSizeY - 1));
    const z1c = Math.max(0, Math.min(z1, chunkSizeY - 1));
    
    const h00 = chunk.heightData[z0c * chunkSizeX + x0c] || 0;
    const h10 = chunk.heightData[z0c * chunkSizeX + x1c] || 0;
    const h01 = chunk.heightData[z1c * chunkSizeX + x0c] || 0;
    const h11 = chunk.heightData[z1c * chunkSizeX + x1c] || 0;
    
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    
    return h0 * (1 - fz) + h1 * fz;
  }
  
  // Alias for compatibility with procedural terrain
  heightAt(x, z) {
    return this.getHeightAt(x, z);
  }
}
