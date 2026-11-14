import { test } from '@playwright/test';

test.describe('Debug Terrain Top-Down View', () => {
  test('Orthographic top-down view with road overlay', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    await page.fill('#ftp-input', '160');
    await page.selectOption('#graphics-quality', 'high');
    await page.click('#ftp-ok');
    
    await page.waitForSelector('#mode-step', { state: 'visible' });
    await page.click('input[name="mode"][value="free"]');
    await page.click('#mode-ok');
    
    await page.waitForSelector('#route-step', { state: 'visible' });
    await page.click('input[name="route"][value="villard"]');
    await page.click('#ride-go');
    
    await page.waitForFunction(() => {
      const watts = document.getElementById('watts');
      return watts && watts.textContent !== '—';
    }, { timeout: 10000 });
    
    // Wait for terrain to load
    await page.waitForTimeout(5000);
    
    // Switch to orthographic top-down view and draw GPX track
    await page.evaluate(() => {
      const scene = window.scene;
      const track = window.track;
      const realTerrain = window._realTerrain;
      
      if (!realTerrain || !realTerrain.loaded) {
        console.error('Real terrain not loaded!');
        return;
      }
      
      // Calculate terrain center
      const meta = realTerrain.metadata;
      const centerLat = (meta.bbox.minLat + meta.bbox.maxLat) / 2;
      const centerLon = (meta.bbox.minLon + meta.bbox.maxLon) / 2;
      
      const R = 6371000;
      const origin = realTerrain.gpxOrigin;
      const k = Math.cos((origin.lat0 * Math.PI) / 180);
      const centerX = ((centerLon - origin.lon0) * Math.PI / 180) * R * k;
      const centerZ = -((centerLat - origin.lat0) * Math.PI / 180) * R;
      
      console.log('Terrain center:', centerX, centerZ);
      
      // Make all terrain chunks visible for top-down view
      if (realTerrain.chunks) {
        for (const [name, chunk] of realTerrain.chunks.entries()) {
          if (chunk.meshes.lod0) {
            chunk.meshes.lod0.visible = true;
          }
          if (chunk.meshes.lod1) {
            chunk.meshes.lod1.visible = false;
          }
        }
      }
      
      // Import THREE from window (already loaded by main.js)
      const THREE = window.THREE;
      if (!THREE) {
        console.error('THREE.js not available');
        return;
      }
      
      // Draw GPX track as red line
      if (track && track.pts) {
        const points = track.pts.map(p => new THREE.Vector3(p.x, p.y + 10, p.z));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
          color: 0xff0000, 
          linewidth: 3,
          depthTest: false
        });
        const line = new THREE.Line(geometry, material);
        line.renderOrder = 999;
        scene.add(line);
        console.log('Added red GPX track line');
      }
      
      // Create true orthographic top-down camera
      const aspect = window.innerWidth / window.innerHeight;
      const size = 8000; // Show ±8km
      const ortho = new THREE.OrthographicCamera(
        -size * aspect, size * aspect,
        size, -size,
        1, 20000
      );
      
      // Position DIRECTLY above looking DOWN (-Y axis)
      ortho.position.set(centerX, 10000, centerZ);
      ortho.up.set(0, 0, -1); // Set up vector to point north (-Z)
      ortho.lookAt(centerX, 0, centerZ);
      ortho.updateProjectionMatrix();
      
      window.camera = ortho;
      
      console.log('Switched to TRUE top-down orthographic view');
      console.log('Camera position:', ortho.position);
      console.log('Camera looking at:', centerX, 0, centerZ);
    });
    
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.17-debug-topdown.png',
      fullPage: false
    });
  });
});
