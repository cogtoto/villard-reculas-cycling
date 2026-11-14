// Verify sky pixels with sanity checks - must have terrain/road visible
import sharp from 'sharp';

async function checkSkyPixels(imagePath) {
  console.log(`\nChecking ${imagePath}...`);
  
  const img = sharp(imagePath);
  const metadata = await img.metadata();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  
  function getPixel(x, y) {
    const idx = (y * info.width + x) * info.channels;
    return {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2]
    };
  }
  
  // Sample points
  const zenith = getPixel(512, 40);
  const horizon = getPixel(512, 210);
  const lowerLeft = getPixel(300, 450);
  const lowerRight = getPixel(700, 450);
  
  console.log(`  Zenith (512, 40):     R=${zenith.r} G=${zenith.g} B=${zenith.b}`);
  console.log(`  Horizon (512, 210):   R=${horizon.r} G=${horizon.g} B=${horizon.b}`);
  console.log(`  Lower left (300, 450):  R=${lowerLeft.r} G=${lowerLeft.g} B=${lowerLeft.b}`);
  console.log(`  Lower right (700, 450): R=${lowerRight.r} G=${lowerRight.g} B=${lowerRight.b}`);
  
  // Test 1: Sky gradient must exist (zenith != horizon)
  const gradientExists = Math.abs(zenith.r - horizon.r) > 5 || 
                         Math.abs(zenith.g - horizon.g) > 5 || 
                         Math.abs(zenith.b - horizon.b) > 5;
  
  // Test 2: Zenith deep blue (target range)
  const zenithBlueDeep = zenith.b >= 220 && zenith.b <= 255 &&
                         zenith.r >= 40 && zenith.r <= 90 &&
                         zenith.g >= 110 && zenith.g <= 160;
  
  // Test 3: Zenith blue dominant (B > R+40)
  const zenithBlueDominant = zenith.b > zenith.r + 40;
  
  // Test 4: Lower frame has terrain/road (green or grey, NOT sky blue)
  const hasTerrainLeft = (lowerLeft.g > lowerLeft.b + 20) || // Green terrain
                         (Math.abs(lowerLeft.r - lowerLeft.g) < 30 && lowerLeft.r < 150); // Grey road
  const hasTerrainRight = (lowerRight.g > lowerRight.b + 20) || 
                          (Math.abs(lowerRight.r - lowerRight.g) < 30 && lowerRight.r < 150);
  
  // Test 5: Frame is NOT uniform (must have variation)
  const isUniform = Math.abs(zenith.r - lowerLeft.r) < 10 &&
                    Math.abs(zenith.g - lowerLeft.g) < 10 &&
                    Math.abs(zenith.b - lowerLeft.b) < 10;
  
  console.log(`  Sky gradient exists (zenith ≠ horizon): ${gradientExists ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`  Zenith deep blue (40-90, 110-160, 220-255): ${zenithBlueDeep ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`  Zenith blue dominant (B > R+40): ${zenithBlueDominant ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`  Terrain/road visible in lower frame: ${(hasTerrainLeft || hasTerrainRight) ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`  Frame NOT uniform (has variation): ${!isUniform ? 'PASS ✓' : 'FAIL ✗ BROKEN'}`);
  
  const allPass = gradientExists && zenithBlueDeep && zenithBlueDominant && 
                  (hasTerrainLeft || hasTerrainRight) && !isUniform;
  
  return { 
    pass: allPass,
    gradientExists,
    zenithBlueDeep,
    zenithBlueDominant,
    hasTerrain: hasTerrainLeft || hasTerrainRight,
    notUniform: !isUniform
  };
}

const images = [
  '/opt/cursor/artifacts/v0.5.27-normandy-road-low.png',
  '/opt/cursor/artifacts/v0.5.27-normandy-road-high.png',
  '/opt/cursor/artifacts/v0.5.27-villard-start-low.png',
  '/opt/cursor/artifacts/v0.5.27-villard-hairpins-low.png'
];

let allPass = true;
for (const img of images) {
  try {
    const result = await checkSkyPixels(img);
    if (!result.pass) allPass = false;
  } catch (err) {
    console.error(`Failed to check ${img}:`, err.message);
    allPass = false;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Overall: ${allPass ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
console.log('='.repeat(60));

process.exit(allPass ? 0 : 1);
