// Norman village churches
import * as THREE from 'three';

// Create a simple Norman church (stone nave, slate roof, modest bell tower)
function createNormanChurch() {
  const church = new THREE.Group();
  
  // Nave (main body) - stone
  const naveGeo = new THREE.BoxGeometry(6, 5, 10);
  const naveMat = new THREE.MeshStandardMaterial({
    color: 0xb8b0a0, // Light stone
    roughness: 0.9,
    metalness: 0
  });
  const nave = new THREE.Mesh(naveGeo, naveMat);
  nave.position.y = 2.5;
  nave.castShadow = true;
  nave.receiveShadow = true;
  church.add(nave);
  
  // Roof (slate) - steep Norman style
  const roofGeo = new THREE.ConeGeometry(5, 3.5, 4);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a45, // Dark slate
    roughness: 0.7,
    metalness: 0.1
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 6.75;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  church.add(roof);
  
  // Bell tower (modest, square)
  const towerGeo = new THREE.BoxGeometry(2.5, 6, 2.5);
  const tower = new THREE.Mesh(towerGeo, naveMat);
  tower.position.set(0, 3, -4);
  tower.castShadow = true;
  church.add(tower);
  
  // Tower roof (pointed)
  const towerRoofGeo = new THREE.ConeGeometry(2, 2.5, 4);
  const towerRoof = new THREE.Mesh(towerRoofGeo, roofMat);
  towerRoof.position.set(0, 7.25, -4);
  towerRoof.rotation.y = Math.PI / 4;
  towerRoof.castShadow = true;
  church.add(towerRoof);
  
  // Door (dark wood)
  const doorGeo = new THREE.BoxGeometry(1.5, 2.5, 0.3);
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    roughness: 0.8
  });
  const door = new THREE.Mesh(doorGeo, doorMat);
  door.position.set(0, 1.25, 5.15);
  church.add(door);
  
  // Small cross on tower roof
  const crossVertGeo = new THREE.BoxGeometry(0.15, 1.2, 0.15);
  const crossMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.3
  });
  const crossVert = new THREE.Mesh(crossVertGeo, crossMat);
  crossVert.position.set(0, 9.1, -4);
  church.add(crossVert);
  
  const crossHorizGeo = new THREE.BoxGeometry(0.7, 0.15, 0.15);
  const crossHoriz = new THREE.Mesh(crossHorizGeo, crossMat);
  crossHoriz.position.set(0, 8.7, -4);
  church.add(crossHoriz);
  
  return church;
}

// Add churches in Normandy villages
export function addNormandyChurches(scene, track, terrain) {
  if (!terrain.houses || terrain.houses.length === 0) {
    console.log('No villages found for churches');
    return 0;
  }
  
  let churchCount = 0;
  
  // Group houses into village clusters
  const villages = [];
  const visitedHouses = new Set();
  
  terrain.houses.forEach((house, i) => {
    if (visitedHouses.has(i)) return;
    
    // Find nearby houses (within 100m = village)
    const cluster = [house];
    visitedHouses.add(i);
    
    terrain.houses.forEach((other, j) => {
      if (i === j || visitedHouses.has(j)) return;
      const dist = Math.hypot(house.x - other.x, house.z - other.z);
      if (dist < 100) {
        cluster.push(other);
        visitedHouses.add(j);
      }
    });
    
    if (cluster.length >= 2) { // Only villages with 2+ houses get a church
      villages.push(cluster);
    }
  });
  
  console.log(`Found ${villages.length} villages for churches`);
  
  // Place one church per village
  villages.forEach((cluster, idx) => {
    // Find center of village
    const centerX = cluster.reduce((sum, h) => sum + h.x, 0) / cluster.length;
    const centerZ = cluster.reduce((sum, h) => sum + h.z, 0) / cluster.length;
    
    // Offset slightly from center (avoid exact overlap)
    const offsetX = (Math.random() - 0.5) * 30;
    const offsetZ = (Math.random() - 0.5) * 30;
    
    const churchX = centerX + offsetX;
    const churchZ = centerZ + offsetZ;
    
    // Check not too close to road or other buildings
    const distToRoad = terrain.distTo(churchX, churchZ);
    if (distToRoad < 15) return; // Too close to road
    
    const tooClose = cluster.some(h => {
      const d = Math.hypot(h.x - churchX, h.z - churchZ);
      return d < 12; // Min 12m from houses
    });
    if (tooClose) return;
    
    const churchY = terrain.heightAt(churchX, churchZ);
    const slope = terrain.slopeAt(churchX, churchZ);
    if (slope > 0.2) return; // Too steep
    
    // Create and place church
    const church = createNormanChurch();
    church.position.set(churchX, churchY, churchZ);
    
    // Random rotation
    church.rotation.y = Math.random() * Math.PI * 2;
    
    scene.add(church);
    churchCount++;
    
    console.log(`Church ${churchCount} in village ${idx + 1} at (${churchX.toFixed(0)}, ${churchZ.toFixed(0)}), ${distToRoad.toFixed(0)}m from road`);
  });
  
  return churchCount;
}
