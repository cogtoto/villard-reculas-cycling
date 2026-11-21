// Verify road is never covered by terrain
export function verifyRoadClearance(track, terrain, roadWidth = 4) {
  const { pts } = track;
  const violations = [];
  const halfWidth = roadWidth / 2 + 1; // Include shoulders
  
  // Sample every point along track
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    const roadHeight = p.y + 0.2; // Road is lifted 20cm
    
    // Check terrain height at road center and edges
    const checkPoints = [
      { x: p.x, z: p.z, label: 'center' },
    ];
    
    // Add perpendicular edge checks if we have direction
    if (i < pts.length - 1) {
      const next = pts[i + 1];
      let tx = next.x - p.x;
      let tz = next.z - p.z;
      const L = Math.hypot(tx, tz) || 1;
      tx /= L; tz /= L;
      const nx = -tz, nz = tx;
      
      checkPoints.push(
        { x: p.x + nx * halfWidth, z: p.z + nz * halfWidth, label: 'left' },
        { x: p.x - nx * halfWidth, z: p.z - nz * halfWidth, label: 'right' }
      );
    }
    
    for (const cp of checkPoints) {
      const terrainHeight = terrain.heightAt(cp.x, cp.z);
      if (terrainHeight > roadHeight - 0.05) {
        violations.push({
          index: i,
          position: { x: cp.x, z: cp.z },
          roadHeight,
          terrainHeight,
          excess: terrainHeight - roadHeight,
          location: cp.label
        });
      }
    }
  }
  
  return violations;
}
