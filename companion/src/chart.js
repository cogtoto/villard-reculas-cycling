// Garmin Edge–style power chart: 1 bar per second, last 180 s, colored by Coggan zones (same as velo-virtuel)
export const POWER_ZONES = [
  { z: 'Z1', max: 55, bg: '#9e9e9e', fg: '#111' }, { z: 'Z2', max: 75, bg: '#2e86de', fg: '#fff' },
  { z: 'Z3', max: 90, bg: '#27ae60', fg: '#fff' }, { z: 'Z4', max: 105, bg: '#f1c40f', fg: '#111' },
  { z: 'Z5', max: 120, bg: '#e67e22', fg: '#111' }, { z: 'Z6', max: 150, bg: '#e74c3c', fg: '#fff' },
  { z: 'Z7', max: Infinity, bg: '#8e44ad', fg: '#fff' },
];
export const zoneFor = (w, ftp) => POWER_ZONES.find((z) => (w / ftp) * 100 < z.max);

export function createPowerChart(canvas, getFtp, seconds = 180) {
  const samples = []; // one averaged value per second
  let acc = 0, n = 0;
  const add = (w) => { acc += w; n++; };
  setInterval(() => { samples.push(n ? acc / n : (samples.at(-1) ?? 0) * 0); acc = 0; n = 0; if (samples.length > seconds) samples.shift(); draw(); }, 1000);

  function draw() {
    const dpr = devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
    if (canvas.width !== W * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
    const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const ftp = getFtp(), top = Math.max(ftp * 1.5, ...samples) * 1.05, bw = W / seconds, y = (w) => H - (w / top) * H;
    samples.forEach((w, i) => { const x = W - (samples.length - i) * bw; g.fillStyle = zoneFor(w, ftp).bg; g.fillRect(x, y(w), Math.ceil(bw), H - y(w)); });
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(0, y(ftp)); g.lineTo(W, y(ftp)); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#aaa'; g.font = '10px system-ui'; g.fillText(`FTP ${ftp}`, 3, y(ftp) - 3);
    if (samples.length) { const avg = samples.reduce((a, b) => a + b, 0) / samples.length; g.textAlign = 'right'; g.fillText(`avg ${Math.round(avg)} W`, W - 3, 11); g.textAlign = 'left'; }
  }
  addEventListener('resize', draw);
  return { add, draw };
}
