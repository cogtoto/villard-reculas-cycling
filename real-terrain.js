// Real terrain system using chunked heightmaps with LOD
import * as THREE from 'three';

class TerrainChunk {
  constructor(name, heightData, metadata, chunkMeta, orthoTexture) {
    this.name = name;
    this.heightData = heightData; // Int16Array
    this.metadata = metadata;
    this.chunkMeta = chunkMeta;
    this.orthoTexture = orthoTexture; // Three.js Texture
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
    
    // Material with real orthoimagery texture
    // Use MeshStandardMaterial with emissive to ensure visibility
    let material;
    if (this.orthoTexture) {
      console.log(`Chunk ${this.name} LOD${lodLevel}: Creating material with texture`, this.orthoTexture.image?.width, 'x', this.orthoTexture.image?.height);
      material = new THREE.MeshStandardMaterial({
        map: this.orthoTexture,
        roughness: 1.0,
        metalness: 0.0,
        emissive: 0xffffff,
        emissiveMap: this.orthoTexture,
        emissiveIntensity: 0.3,
        side: THREE.FrontSide
      });
      // Force texture update
      if (this.orthoTexture.image) {
        this.orthoTexture.needsUpdate = true;
      }
      console.log(`Material map set:`, material.map !== null, 'needsUpdate:', this.orthoTexture.needsUpdate);
    } else {
      console.warn(`Chunk ${this.name} LOD${lodLevel}: No texture! Using fallback color`);
      material = new THREE.MeshStandardMaterial({
        color: 0xff00ff, // Bright magenta to make it obvious
        roughness: 1.0,
        metalness: 0.0
      });
    }
    
    // If ortho texture is available, use it; otherwise fallback to vertex colors
    if (!this.orthoTexture) {
      material.color.set(0x8a9a7a);
      material.vertexColors = true;
      
      // Add vertex colors based on elevation (fallback)
      const colors = new Float32Array(positions.length);
      const minElev = this.metadata.minElevation;
      const maxElev = this.metadata.maxElevation;
      
      for (let i = 0; i < positions.length / 3; i++) {
        const elev = positions[i * 3 + 1];
        const t = (elev - minElev) / (maxElev - minElev);
        
        let r, g, b;
        if (t < 0.3) {
          r = 0.54 * (1 - t * 2);
          g = 0.60 + t * 0.2;
          b = 0.48 * (1 - t * 2);
        } else if (t < 0.7) {
          r = 0.5 + (t - 0.3) * 0.5;
          g = 0.5 + (t - 0.3) * 0.3;
          b = 0.4 + (t - 0.3) * 0.4;
        } else {
          r = 0.7 + (t - 0.7) * 1.0;
          g = 0.7 + (t - 0.7) * 1.0;
          b = 0.7 + (t - 0.7) * 1.0;
        }
        
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
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
  
  async load(scene, basePath, gpxOrigin) {
    console.log('Loading real terrain from:', basePath);
    console.log('GPX origin:', gpxOrigin);
    
    this.gpxOrigin = gpxOrigin;
    
    // Load metadata
    const metaResponse = await fetch(`${basePath}/metadata.json`);
    this.metadata = await metaResponse.json();
    
    console.log('Terrain metadata:', this.metadata);
    
    // Load orthoimagery textures
    const textureLoader = new THREE.TextureLoader();
    const orthoTextures = {};
    
    if (this.metadata.orthoimagery) {
      console.log('Loading orthoimagery textures...');
      
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
        orthoTextures[name] || null
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
