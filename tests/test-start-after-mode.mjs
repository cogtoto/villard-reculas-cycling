// Regression: after choosing a ride mode (free or workout), the user must be
// able to reach Continue / Start ride on a short Android phone viewport
// (body is overflow:hidden for the canvas, so the intro overlay has to scroll)
// and the game must actually start. Also checks a PC viewport.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../dist', import.meta.url));
const OUT = '/workspace/v0537';
mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.bin': 'application/octet-stream',
  '.gpx': 'application/gpx+xml', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

if (!existsSync(join(ROOT, 'index.html'))) {
  console.error('dist/ is missing — run npm run build first');
  process.exit(1);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = join(ROOT, p);
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); res.end('no'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4180, '127.0.0.1', r));

const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 12; 2201117TG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36';

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function reachable(page, sel) {
  const loc = page.locator(sel);
  await loc.waitFor({ state: 'attached', timeout: 10000 });
  try {
    await loc.scrollIntoViewIfNeeded({ timeout: 3000 });
  } catch (_) { /* not in a scroll container; check box anyway */ }
  const box = await loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, width: r.width, height: r.height, vh: window.innerHeight, vw: window.innerWidth };
  });
  const inView = box.top >= 0 && box.bottom <= box.vh + 1 && box.width > 0 && box.height > 0;
  return { inView, box };
}

async function startRide(page, { mode = 'free', label, viewport, userAgent, isMobile }) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.addInitScript(() => {
    try { localStorage.setItem('vv.ftp', '160'); } catch {}
    try { localStorage.setItem('vv.route', 'villard'); } catch {}
  });
  await page.goto('http://127.0.0.1:4180/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#ftp-ok', { timeout: 30000 });

  await page.fill('#ftp-input', '160');
  const q = await page.$('#graphics-quality');
  if (q) await q.selectOption(isMobile ? 'low' : 'medium');
  await page.click('#ftp-ok');
  await page.waitForSelector('#mode-step', { state: 'visible', timeout: 10000 });

  await page.click(`input[name="mode"][value="${mode}"]`);
  const cont = await reachable(page, '#mode-ok');
  assert(cont.inView, `${label}: Continue is not reachable after choosing ${mode} (box=${JSON.stringify(cont.box)})`);
  await page.click('#mode-ok');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('route-step')).display !== 'none', null, { timeout: 10000 });

  const go = await reachable(page, '#ride-go');
  assert(go.inView, `${label}: Start ride is not reachable (box=${JSON.stringify(go.box)})`);
  await page.click('#ride-go');

  await page.waitForFunction(() => !document.getElementById('intro') && !!document.querySelector('canvas'), null, { timeout: 20000 });
  await page.waitForFunction(() => typeof window.veloTeleportKm === 'function', null, { timeout: 30000 });
  await page.waitForTimeout(800);

  const fatal = errors.filter((m) => !/WebSocket|8787/.test(m));
  // Shader warnings on swiftshader SpriteMaterial are pre-existing; they must not block start.
  const started = await page.evaluate(() => ({
    intro: !!document.getElementById('intro'),
    canvas: !!document.querySelector('canvas'),
    helpers: typeof window.veloTeleportKm === 'function'
  }));
  assert(!started.intro && started.canvas && started.helpers, `${label}: game did not start (${JSON.stringify(started)}); js errors: ${fatal.join(' | ')}`);
  const shot = `${OUT}/${label}.png`;
  await page.screenshot({ path: shot, timeout: 90000 });
  return { shot, errors: fatal };
}

console.log('Testing start-after-mode on mobile and PC viewports...\n');

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist']
});

const cases = [
  { label: 'mobile-free', mode: 'free', viewport: { width: 360, height: 560 }, userAgent: UA_ANDROID, isMobile: true },
  { label: 'mobile-workout', mode: 'sweet-spot', viewport: { width: 360, height: 560 }, userAgent: UA_ANDROID, isMobile: true },
  { label: 'pc-free', mode: 'free', viewport: { width: 1280, height: 800 }, isMobile: false },
  { label: 'pc-workout', mode: 'varied-threshold', viewport: { width: 1280, height: 800 }, isMobile: false }
];

for (const c of cases) {
  const page = await browser.newPage({
    viewport: c.viewport,
    userAgent: c.userAgent,
    hasTouch: !!c.isMobile,
    isMobile: !!c.isMobile
  });
  try {
    const r = await startRide(page, c);
    console.log(`✓ ${c.label}  ${r.shot}`);
    passed++;
  } catch (e) {
    console.error(`✗ ${c.label}: ${e.message}`);
    const fallback = `${OUT}/${c.label}-fail.png`;
    try { await page.screenshot({ path: fallback, timeout: 15000 }); console.log('  screenshot', fallback); } catch (_) {}
    failed++;
  }
  await page.close();
}

await browser.close();
server.close();
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
