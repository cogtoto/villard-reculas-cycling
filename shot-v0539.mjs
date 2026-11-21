import { chromium } from 'playwright';
import { mkdirSync, readFileSync, existsSync, statSync } from 'fs';
import { createServer } from 'http';
import { extname, join } from 'path';

const ROOT = process.env.ROOT || '/workspace/vrc-road/dist';
const OUT = process.env.OUTDIR || '/workspace/roadfinal';
const TAG = process.env.TAG || 'before';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.bin': 'application/octet-stream', '.gpx': 'application/gpx+xml', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let p = decodeURIComponent(url.pathname); if (p === '/') p = '/index.html';
  const file = join(ROOT, p);
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file));
});
const PORT = 4180 + Math.floor(Math.random() * 50);
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { const t = m.text(); if (/Road|error|ReferenceError/i.test(t) && !/WebSocket/.test(t)) console.log('LOG', t); });
await page.addInitScript((VARIANT) => { try { localStorage.setItem('vv.ftp', '160'); localStorage.setItem('vv.route', 'villard'); localStorage.setItem('vv.commentator', 'off'); localStorage.setItem('vv.roadVariant', VARIANT); } catch {} }, process.env.VARIANT || 'B');
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForSelector('#ftp-ok'); await page.fill('#ftp-input', '160');
const q = await page.$('#graphics-quality'); if (q) await q.selectOption('medium');
await page.click('#ftp-ok'); await page.waitForSelector('#mode-ok');
await page.click('input[name="mode"][value="free"]'); await page.click('#mode-ok');
await page.waitForSelector('#ride-go'); await page.click('input[name="route"][value="villard"]');
let fenceKm = [];
page.on('console', (m) => { const t = m.text(); const mm = t.match(/Road fence runs km: (.*)/); if (mm) fenceKm = mm[1].split(',').map(Number).filter(Boolean); });
const gpxOk = page.waitForEvent('console', { predicate: (m) => /GPX villard/i.test(m.text()), timeout: 60000 });
await page.click('#ride-go');
await page.waitForFunction(() => typeof window.veloTeleportKm === 'function' && window.THREE, { timeout: 30000 });
await gpxOk;
await page.waitForEvent('console', { predicate: (m) => /Trees:/i.test(m.text()), timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1500);

async function teleport(km) {
  await page.evaluate((km) => { window.veloClearView && window.veloClearView(); window.veloTeleportKm(km); }, km);
  await page.waitForFunction((km) => { const d = parseFloat(document.getElementById('dist')?.textContent || ''); return Number.isFinite(d) && Math.abs(d - km) < 0.2; }, km, { timeout: 45000 });
  await page.waitForTimeout(600);
}
async function shot(name) { const f = `${OUT}/${name}-${TAG}.png`; await page.screenshot({ path: f, timeout: 90000 }); console.log('SHOT', f); }
// low camera next to the road edge looking forward along the road
async function edgeView(sign, h, off, ahead) {
  return page.evaluate(({ sign, h, off, ahead }) => {
    if (!window.veloSideView(0, 0, 1)) return false;
    const o = window._cameraOverride; const px = o.lx, pz = o.lz, py = o.ly - 0.4;
    const dx = (px - o.x) / 3, dz = (pz - o.z) / 3, nx = -dz * sign, nz = dx * sign;
    window._cameraOverride = { x: px + nx * off - dx * 2, y: py + h, z: pz + nz * off - dz * 2, lx: px + nx * (off + 0.6) + dx * ahead, ly: py, lz: pz + nz * (off + 0.6) + dz * ahead };
    return true;
  }, { sign, h, off, ahead });
}
const plan = process.env.KMS ? process.env.KMS.split(',').map((k, n) => ({ id: 'km' + Number(k).toFixed(2), km: Number(k), views: [['chase'], ['edge', 1, 1.3, 0, 22]] })) : [
  { id: '01', km: 0.9, views: [['chase']] },
  { id: '02', km: 4.45, views: [['chase'], ['side', 2.6, 14, 1]] },
  { id: '03', km: 9.5, views: [['chase'], ['side', 2.6, 14, 1]] },
  { id: '04', km: 2.2, views: [['edge', 1, 0.9, 1.4, 14]] },
  { id: '05', km: 6.65, views: [['edge', -1, 1.2, 1.6, 18]] }
];
if (process.env.FENCE) { const k = fenceKm.find((x) => x > 1.5 && x < 9) ?? fenceKm[0]; console.log('fence km', fenceKm.join(','), '->', k); plan.push({ id: '06', km: k + 0.01, views: [['chase'], ['edge', Number(process.env.FENCE), 1.0, 1.5, 16]] }); }
for (const p of plan) {
  if (ONLY && !ONLY.includes(p.id)) continue;
  await teleport(p.km);
  for (const v of p.views) {
    let name = p.id;
    if (v[0] === 'side') { await page.evaluate(([h, d, s]) => window.veloSideView(h, d, s), v.slice(1)); name += '-side'; }
    if (v[0] === 'edge') { await edgeView(...v.slice(1)); name += v[3] === 0 ? '-low' : '-edge'; }
    await page.waitForTimeout(500);
    await shot(name);
    await page.evaluate(() => window.veloClearView && window.veloClearView());
  }
}
await browser.close(); server.close(); console.log('DONE');
