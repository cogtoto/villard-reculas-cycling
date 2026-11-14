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
// Companion Android : se signale par {type:'hello', role:'companion'}, puis pousse {type:'companion', watts, cadence}
// et {type:'shift', delta}. Le serveur relaie la télémétrie / les vitesses aux navigateurs, et renvoie au
// companion les consignes {type:'sim', gradePct} émises par le navigateur (simulation FTMS).
let companionOk = false, companionTs = 0;
const companions = () => [...wss.clients].filter((c) => c.isCompanion && c.readyState === 1);
const viewers = () => [...wss.clients].filter((c) => !c.isCompanion && c.readyState === 1);
wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.type === 'hello' && m.role === 'companion') {
      ws.isCompanion = true; console.log('[companion] connected', m.device || '');
      ws.send(JSON.stringify({ type: 'welcome', gradePct: clientGrade }));
      ws.on('close', () => { console.log('[companion] disconnected'); if (!companions().length) companionOk = false; });
      return;
    }
    if (m.type === 'route') { clientGrade = Number(m.gradePct) || 0; clientAlt = Number(m.altM) || 0; }
    else if (m.type === 'sim') { const d = JSON.stringify({ type: 'sim', gradePct: Number(m.gradePct) || 0 }); for (const c of companions()) c.send(d); }
    else if (m.type === 'erg') { const d = JSON.stringify({ type: 'erg', targetWatts: Number(m.targetWatts) || 0 }); for (const c of companions()) c.send(d); }
    else if (ws.isCompanion && m.type === 'companion') {
      companionOk = true; companionTs = Date.now();
      const watts = Number(m.watts) || 0;
      live = { type: 'telemetry', watts, cadence: Number(m.cadence) || 0, gradePct: clientGrade,
        speedKmh: speedFromWatts(watts, clientGrade), source: 'companion' + (m.sensor ? ' ' + m.sensor : ''), ts: Date.now() };
      // Include optional HR if present
      if (m.hr !== null && m.hr !== undefined && Number(m.hr) > 0) {
        live.hr = Number(m.hr);
      }
      broadcast(live);
    }
    else if (ws.isCompanion && m.type === 'shift') { const d = JSON.stringify({ type: 'shift', delta: Math.sign(Number(m.delta) || 0) }); for (const c of viewers()) c.send(d); }
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
  for (const client of viewers()) {
    if (client.readyState === 1) client.send(data);
  }
}

let bleOk = false;
if (USE_BLE) {
  const ble = createBleSource();
  ble.bus.on('log', (m) => console.log('[ble]', m));
  ble.bus.on('error', (e) => console.warn('[ble]', e.message || e));
  ble.bus.on('telemetry', (t) => {
    if (companionOk && Date.now() - companionTs < 3000) return; // le companion a priorité
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
  if (companionOk && Date.now() - companionTs < 3000) return; // companion is pushing
  if (bleOk) return; // BLE is pushing
  live = mockSample();
  broadcast(live);
}, 200);

wss.on('connection', (ws) => {
  ws.send(JSON.stringify(live));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sensor server ws://0.0.0.0:${PORT} (companion: ws://<PC-IP>:${PORT}) (BLE=${USE_BLE ? 'on' : 'off'}, mock fallback)`);
});
