// Verify sky pixels in screenshots - check B > R+40 at zenith
import { readFileSync } from 'fs';
import sharp from 'sharp';

async function checkSkyPixels(imagePath) {
  console.log(`\nChecking ${imagePath}...`);
  
  const img = sharp(imagePath);
  const metadata = await img.metadata();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  
  // Sample points
  const zenith = { x: 512, y: 40 };
  const horizon = { x: 512, y: 210 };
  
  function getPixel(x, y) {
    const idx = (y * info.width + x) * info.channels;
    return {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2]
    };
  }
  
  const zenithPx = getPixel(zenith.x, zenith.y);
  const horizonPx = getPixel(horizon.x, horizon.y);
  
  console.log(`  Zenith (${zenith.x}, ${zenith.y}):   R=${zenithPx.r} G=${zenithPx.g} B=${zenithPx.b}`);
  console.log(`  Horizon (${horizon.x}, ${horizon.y}): R=${horizonPx.r} G=${horizonPx.g} B=${horizonPx.b}`);
  
  const zenithPass = zenithPx.b > zenithPx.r + 40;
  const horizonBlue = horizonPx.b > horizonPx.r;
  
  console.log(`  Zenith blue dominant (B > R+40): ${zenithPass ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`  Horizon blue tint (B > R): ${horizonBlue ? 'PASS ✓' : 'FAIL ✗'}`);
  
  return { zenithPass, horizonBlue };
}

const images = [
  '/opt/cursor/artifacts/v0.5.26-normandy-road-low.png',
  '/opt/cursor/artifacts/v0.5.26-normandy-road-high.png',
  '/opt/cursor/artifacts/v0.5.26-villard-start-low.png',
  '/opt/cursor/artifacts/v0.5.26-villard-hairpins-low.png'
];

let allPass = true;
for (const img of images) {
  const result = await checkSkyPixels(img);
  if (!result.zenithPass) allPass = false;
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Overall: ${allPass ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
console.log('='.repeat(60));

process.exit(allPass ? 0 : 1);
