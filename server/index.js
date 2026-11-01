import http from 'http';
import { WebSocketServer } from 'ws';
import { createBleSource } from './ble.js';
import { steadySpeed } from '../physics.js';

const PORT = 8787;
const USE_BLE = process.env.VELO_BLE !== '0';

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('velo-virtuel sensor server\n');
});
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try { const m = JSON.parse(raw); if (m.type === 'route') { clientGrade = Number(m.gradePct) || 0; clientAlt = Number(m.altM) || 0; } } catch {}
  });
});

// Vitesse d'équilibre physique (air + roulement + gravité) ; pente/altitude envoyées par le client (GPX)
let clientGrade = 0, clientAlt = 0;
function speedFromWatts(watts, gradePct = clientGrade) {
  return steadySpeed(watts, gradePct, clientAlt) * 3.6;
}

let live = {
  watts: 0,
  cadence: 0,
  gradePct: 2,
  speedKmh: 0,
  source: 'mock',
  ts: Date.now(),
};

const t0 = Date.now();
function mockSample() {
  const t = (Date.now() - t0) / 1000;
  const watts = 140 + 60 * Math.sin(t / 8);
  const cadence = 75 + 10 * Math.sin(t / 5);
  const gradePct = clientGrade; // pente réelle du GPX (envoyée par le client)
  return {
    type: 'telemetry',
    source: 'mock',
    watts,
    cadence,
    gradePct,
    speedKmh: speedFromWatts(watts, gradePct),
    ts: Date.now(),
  };
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(data);
  }
}

let bleOk = false;
if (USE_BLE) {
  const ble = createBleSource();
  ble.bus.on('log', (m) => console.log('[ble]', m));
  ble.bus.on('error', (e) => console.warn('[ble]', e.message || e));
  ble.bus.on('telemetry', (t) => {
    bleOk = true;
    live = {
      type: 'telemetry',
      watts: t.watts ?? live.watts,
      cadence: t.cadence ?? live.cadence,
      gradePct: clientGrade,
      speedKmh: speedFromWatts(t.watts ?? live.watts, clientGrade),
      source: 'ble',
      ts: Date.now(),
    };
    broadcast(live);
  });
  ble.start().then((ok) => {
    if (!ok) console.warn('[ble] unavailable — using mock');
  });
}

setInterval(() => {
  if (bleOk) return; // BLE is pushing
  live = mockSample();
  broadcast(live);
}, 200);

wss.on('connection', (ws) => {
  ws.send(JSON.stringify(live));
});

server.listen(PORT, () => {
  console.log(`Sensor server ws://localhost:${PORT} (BLE=${USE_BLE ? 'on' : 'off'}, mock fallback)`);
});
