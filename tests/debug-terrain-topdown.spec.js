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
    
    // Switch to orthographic top-down view
    await page.evaluate(() => {
      // Get camera and terrain info
      const camera = window.camera;
      const realTerrain = window._realTerrain;
      
      if (!realTerrain || !realTerrain.loaded) {
        console.error('Real terrain not loaded!');
        return;
      }
      
      // Calculate terrain center
      const meta = realTerrain.metadata;
      const centerLat = (meta.bbox.minLat + meta.bbox.maxLat) / 2;
      const centerLon = (meta.bbox.minLon + meta.bbox.maxLon) / 2;
      
      // Convert to local coords using GPX origin
      const R = 6371000;
      const origin = realTerrain.gpxOrigin;
      const k = Math.cos((origin.lat0 * Math.PI) / 180);
      const centerX = ((centerLon - origin.lon0) * Math.PI / 180) * R * k;
      const centerZ = -((centerLat - origin.lat0) * Math.PI / 180) * R;
      
      console.log('Terrain center local coords:', centerX, centerZ);
      console.log('Terrain bbox:', meta.bbox);
      console.log('GPX origin:', origin);
      
      // Switch to orthographic camera
      const aspect = window.innerWidth / window.innerHeight;
      const size = 8000; // Show ±8km
      const ortho = new THREE.OrthographicCamera(
        -size * aspect, size * aspect,
        size, -size,
        1, 20000
      );
      
      // Position camera looking straight down
      ortho.position.set(centerX, 5000, centerZ);
      ortho.lookAt(centerX, 0, centerZ);
      ortho.updateProjectionMatrix();
      
      // Replace camera
      window.camera = ortho;
      
      console.log('Switched to orthographic top-down view');
      console.log('Camera position:', ortho.position);
      
      // Log visible terrain chunks
      if (realTerrain.chunks) {
        for (const [name, chunk] of realTerrain.chunks.entries()) {
          if (chunk.meshes.lod0) {
            console.log(`Chunk ${name} LOD0: pos (${chunk.meshes.lod0.position.x.toFixed(0)}, ${chunk.meshes.lod0.position.z.toFixed(0)}), visible: ${chunk.meshes.lod0.visible}`);
          }
          if (chunk.meshes.lod1) {
            console.log(`Chunk ${name} LOD1: pos (${chunk.meshes.lod1.position.x.toFixed(0)}, ${chunk.meshes.lod1.position.z.toFixed(0)}), visible: ${chunk.meshes.lod1.visible}`);
          }
        }
      }
    });
    
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '/opt/cursor/artifacts/v0.5.17-debug-topdown.png',
      fullPage: false
    });
  });
});
