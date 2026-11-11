import { test } from '@playwright/test';

test.describe('Debug Terrain Check', () => {
  test('Check terrain loading and positioning', async ({ page }) => {
    // Capture console messages
    const consoleMessages = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log('BROWSER:', text);
    });
    
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
    await page.waitForTimeout(6000);
    
    // Check terrain status
    const terrainInfo = await page.evaluate(() => {
      const realTerrain = window._realTerrain;
      const camera = window.camera;
      const scene = window.scene;
      
      const info = {
        terrainLoaded: !!realTerrain && realTerrain.loaded,
        cameraPosition: camera ? {x: camera.position.x, y: camera.position.y, z: camera.position.z} : null,
        sceneChildren: scene ? scene.children.length : 0,
        chunks: {},
        origin: null
      };
      
      if (realTerrain) {
        info.origin = realTerrain.gpxOrigin;
        info.metadata = realTerrain.metadata;
        
        for (const [name, chunk] of realTerrain.chunks.entries()) {
          info.chunks[name] = {
            hasLod0: !!chunk.meshes.lod0,
            hasLod1: !!chunk.meshes.lod1,
            lod0Visible: chunk.meshes.lod0?.visible,
            lod1Visible: chunk.meshes.lod1?.visible,
            lod0Position: chunk.meshes.lod0 ? {
              x: chunk.meshes.lod0.position.x,
              y: chunk.meshes.lod0.position.y,
              z: chunk.meshes.lod0.position.z
            } : null,
            lod1Position: chunk.meshes.lod1 ? {
              x: chunk.meshes.lod1.position.x,
              y: chunk.meshes.lod1.position.y,
              z: chunk.meshes.lod1.position.z
            } : null
          };
        }
      }
      
      return info;
    });
    
    console.log('\n=== TERRAIN DEBUG INFO ===');
    console.log('Terrain loaded:', terrainInfo.terrainLoaded);
    console.log('Camera position:', terrainInfo.cameraPosition);
    console.log('Scene children:', terrainInfo.sceneChildren);
    console.log('GPX origin:', terrainInfo.origin);
    console.log('\nTerrain chunks:');
    for (const [name, chunk] of Object.entries(terrainInfo.chunks)) {
      console.log(`  ${name}:`, JSON.stringify(chunk, null, 2));
    }
    
    if (terrainInfo.metadata) {
      console.log('\nTerrain bbox:', terrainInfo.metadata.bbox);
    }
    
    console.log('\n=== CONSOLE MESSAGES ===');
    const relevantMessages = consoleMessages.filter(m => 
      m.includes('terrain') || m.includes('Chunk') || m.includes('origin') || m.includes('Loading')
    );
    relevantMessages.forEach(m => console.log(m));
  });
});
