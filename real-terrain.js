// Real terrain system using chunked heightmaps with LOD
import * as THREE from 'three';

class TerrainChunk {
  constructor(name, heightData, metadata, chunkMeta) {
    this.name = name;
    this.heightData = heightData; // Int16Array
    this.metadata = metadata;
    this.chunkMeta = chunkMeta;
    this.meshes = {}; // LOD levels: { lod0: mesh, lod1: mesh }
  }
  
  // Generate terrain mesh at specified LOD
  // LOD 0: full resolution, LOD 1: half resolution
  generateMesh(lodLevel = 0) {
    const skip = Math.pow(2, lodLevel);
    const nx = Math.floor(this.chunkMeta.chunkSizeX / skip);
    const ny = Math.floor(this.chunkMeta.chunkSizeY / skip);
    
    const geometry = new THREE.PlaneGeometry(1, 1, nx - 1, ny - 1);
    const positions = geometry.attributes.position.array;
    
    // Scale to real-world coordinates
    const latSpan = (this.metadata.bbox.maxLat - this.metadata.bbox.minLat) / 2; // 2x2 chunks
    const lonSpan = (this.metadata.bbox.maxLon - this.metadata.bbox.minLon) / 2;
    const sizeX = lonSpan * 76000; // ~76km per degree longitude at this latitude
    const sizeY = latSpan * 111000; // ~111km per degree latitude
    
    // Apply elevation
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const srcX = x * skip;
        const srcY = y * skip;
        const srcIdx = srcY * this.chunkMeta.chunkSizeX + srcX;
        const elevation = this.heightData[srcIdx];
        
        const idx = (y * nx + x) * 3;
        positions[idx] = (x / (nx - 1) - 0.5) * sizeX;
        positions[idx + 1] = elevation;
        positions[idx + 2] = (y / (ny - 1) - 0.5) * sizeY;
      }
    }
    
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    
    // Simple material with vertex colors based on elevation
    const material = new THREE.MeshStandardMaterial({
      color: 0x8a9a7a,
      roughness: 0.9,
      metalness: 0.0,
      vertexColors: false
    });
    
    // Add vertex colors based on elevation (grass/rock/snow)
    const colors = new Float32Array(positions.length);
    const minElev = this.metadata.minElevation;
    const maxElev = this.metadata.maxElevation;
    
    for (let i = 0; i < positions.length / 3; i++) {
      const elev = positions[i * 3 + 1];
      const t = (elev - minElev) / (maxElev - minElev);
      
      // Color gradient: green lowlands → brown mid → gray/white peaks
      let r, g, b;
      if (t < 0.3) {
        // Green grass
        r = 0.54 * (1 - t * 2);
        g = 0.60 + t * 0.2;
        b = 0.48 * (1 - t * 2);
      } else if (t < 0.7) {
        // Brown/gray rock
        r = 0.5 + (t - 0.3) * 0.5;
        g = 0.5 + (t - 0.3) * 0.3;
        b = 0.4 + (t - 0.3) * 0.4;
      } else {
        // Gray/white peaks
        r = 0.7 + (t - 0.7) * 1.0;
        g = 0.7 + (t - 0.7) * 1.0;
        b = 0.7 + (t - 0.7) * 1.0;
      }
      
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    material.vertexColors = true;
    
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
  
  async load(scene, basePath) {
    console.log('Loading real terrain from:', basePath);
    
    // Load metadata
    const metaResponse = await fetch(`${basePath}/metadata.json`);
    this.metadata = await metaResponse.json();
    
    console.log('Terrain metadata:', this.metadata);
    
    // Load all chunks
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
        this.metadata.chunks
      );
      
      this.chunks.set(name, chunk);
      console.log(`  Loaded chunk ${name}: ${heightData.length} points`);
    }
    
    // Generate LOD meshes for all chunks
    this.generateAllMeshes(scene);
    
    this.loaded = true;
    console.log('Real terrain loaded successfully');
    
    return this.metadata;
  }
  
  generateAllMeshes(scene) {
    const chunkOrder = [
      { name: 'nw', x: -1, z: -1 },
      { name: 'ne', x: 1, z: -1 },
      { name: 'sw', x: -1, z: 1 },
      { name: 'se', x: 1, z: 1 }
    ];
    
    const latSpan = (this.metadata.bbox.maxLat - this.metadata.bbox.minLat) / 2;
    const lonSpan = (this.metadata.bbox.maxLon - this.metadata.bbox.minLon) / 2;
    const chunkSizeX = lonSpan * 76000 / 2; // meters
    const chunkSizeZ = latSpan * 111000 / 2; // meters
    
    for (const pos of chunkOrder) {
      const chunk = this.chunks.get(pos.name);
      if (!chunk) continue;
      
      // Generate LOD 0 (high detail)
      const lod0 = chunk.generateMesh(0);
      lod0.position.set(pos.x * chunkSizeX, 0, pos.z * chunkSizeZ);
      chunk.meshes.lod0 = lod0;
      scene.add(lod0);
      
      // Generate LOD 1 (low detail) - same position, will swap based on distance
      const lod1 = chunk.generateMesh(1);
      lod1.position.copy(lod0.position);
      lod1.visible = false; // Start with high detail
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
  
  // Get height at world position (for road flattening and collision)
  getHeightAt(worldX, worldZ) {
    if (!this.loaded) return 0;
    
    // Convert world position to lat/lon grid coordinates
    const latSpan = this.metadata.bbox.maxLat - this.metadata.bbox.minLat;
    const lonSpan = this.metadata.bbox.maxLon - this.metadata.bbox.minLon;
    
    // Determine which chunk
    const chunkSizeX = lonSpan * 76000 / 4; // 2x2 chunks
    const chunkSizeZ = latSpan * 111000 / 4;
    
    const chunkX = worldX >= 0 ? 1 : 0; // 0 = west, 1 = east
    const chunkZ = worldZ >= 0 ? 1 : 0; // 0 = north, 1 = south
    
    const chunkNames = [
      ['nw', 'ne'],
      ['sw', 'se']
    ];
    
    const chunkName = chunkNames[chunkZ][chunkX];
    const chunk = this.chunks.get(chunkName);
    
    if (!chunk) return 0;
    
    // Sample height from chunk data (bilinear interpolation would be better)
    const localX = ((worldX + chunkSizeX * 2) % (chunkSizeX * 2)) / (chunkSizeX * 2);
    const localZ = ((worldZ + chunkSizeZ * 2) % (chunkSizeZ * 2)) / (chunkSizeZ * 2);
    
    const gridX = Math.floor(localX * this.metadata.chunks.chunkSizeX);
    const gridZ = Math.floor(localZ * this.metadata.chunks.chunkSizeY);
    
    const idx = gridZ * this.metadata.chunks.chunkSizeX + gridX;
    
    return chunk.heightData[idx] || 0;
  }
}
