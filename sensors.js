// Sources capteurs : 1) serveur Node WS (desktop, BLE via noble)  2) BLE direct (app Android / Chrome : plugin
// @capacitor-community/bluetooth-le, Web Bluetooth sur le web)  3) mock local si rien (l'app tourne sans serveur).
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';

const CPS = '00001818-0000-1000-8000-00805f9b34fb', CPM = '00002a63-0000-1000-8000-00805f9b34fb';   // Cycling Power
const FTMS = '00001826-0000-1000-8000-00805f9b34fb', IBD = '00002ad2-0000-1000-8000-00805f9b34fb'; // Fitness Machine / Indoor Bike Data
const FTMS_CP = '00002ad9-0000-1000-8000-00805f9b34fb'; // Fitness Machine Control Point (résistance / simulation)
const MOCK_AFTER_MS = 3000;
const dv = (arr) => new DataView(new Uint8Array(arr).buffer);

export function createSensors(onData, { onLog = () => {}, onShift = () => {} } = {}) {
  let viaCompanion = -1e9, lastData = 0, mode = 'init', ws = null, bleOn = false, trainer = null, simBusy = false, pendingGrade = null;
  const push = (d, source) => { lastData = performance.now(); mode = source; onData({ ...d, source }); };
  const native = Capacitor.isNativePlatform();

  // 1) WebSocket vers le serveur Node (seulement si servi par Vite/desktop)
  function connectWs() {
    if (native || bleOn) return;
    try { ws = new WebSocket(`ws://${location.hostname}:8787`); } catch { return; }
    ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.type === 'shift') return onShift(m.delta); if (bleOn || (m.type && m.type !== 'telemetry')) return; if (String(m.source || '').startsWith('companion')) viaCompanion = performance.now(); push(m, m.source || 'ws'); };
    ws.onclose = () => { ws = null; setTimeout(connectWs, 2000); };
  }
  connectWs();

  // 3) mock local (même profil que le serveur) si aucune donnée depuis 3 s
  const t0 = performance.now();
  setInterval(() => {
    if (performance.now() - lastData < MOCK_AFTER_MS && mode !== 'mock-local') return;
    if (bleOn || (ws && ws.readyState === 1 && performance.now() - lastData < MOCK_AFTER_MS)) return;
    const t = (performance.now() - t0) / 1000;
    mode = 'mock-local'; onData({ watts: 140 + 60 * Math.sin(t / 8), cadence: 75 + 10 * Math.sin(t / 5), source: 'mock local' });
  }, 250);

  // crank revolutions → cadence (CPS)
  let lastRevs = null, lastEvt = null;
  const crankCadence = (revs, evt) => {
    let c = null;
    if (lastRevs !== null) { const dr = (revs - lastRevs) & 0xffff, dt = ((evt - lastEvt) & 0xffff) / 1024; if (dt > 0) c = (dr / dt) * 60; }
    lastRevs = revs; lastEvt = evt; return c;
  };
  let cad = 0;
  function onCps(dv) {
    const flags = dv.getUint16(0, true), watts = dv.getInt16(2, true); let o = 4;
    if (flags & 0x1) o += 1; if (flags & 0x4) o += 2; if (flags & 0x10) o += 6;
    if (flags & 0x20) { const c = crankCadence(dv.getUint16(o, true), dv.getUint16(o + 2, true)); if (c !== null && c < 250) cad = c; }
    push({ watts, cadence: cad }, 'ble cps');
  }
  function onIbd(dv) {
    const f = dv.getUint16(0, true); let o = 2, watts = null, cadence = null;
    if (!(f & 0x1)) o += 2; if (f & 0x2) o += 2;
    if (f & 0x4) { cadence = dv.getUint16(o, true) / 2; o += 2; } if (f & 0x8) o += 2;
    if (f & 0x10) o += 3; if (f & 0x20) o += 2;
    if (f & 0x40) { watts = dv.getInt16(o, true); o += 2; }
    if (watts !== null) push({ watts, cadence: cadence ?? cad }, 'ble ftms');
  }

  // 2) BLE direct (bouton HUD) — Android natif ou Web Bluetooth
  async function connectBle() {
    await BleClient.initialize({ androidNeverForLocation: true });
    const dev = await BleClient.requestDevice({ optionalServices: [CPS, FTMS] });
    await BleClient.connect(dev.deviceId, () => { bleOn = false; mode = 'ble off'; });
    const svcs = (await BleClient.getServices(dev.deviceId)).map((s) => s.uuid.toLowerCase());
    if (svcs.includes(FTMS)) {
      await BleClient.startNotifications(dev.deviceId, FTMS, IBD, onIbd);
      try { // prise de contrôle FTMS → simulation de pente (pente GPX + vitesses virtuelles)
        await BleClient.startNotifications(dev.deviceId, FTMS, FTMS_CP, () => {});
        await BleClient.write(dev.deviceId, FTMS, FTMS_CP, dv([0x00])); // Request Control
        await BleClient.write(dev.deviceId, FTMS, FTMS_CP, dv([0x07])); // Start/Resume
        trainer = dev.deviceId;
      } catch (e) { onLog('FTMS control point unavailable: ' + e.message); }
    }
    else if (svcs.includes(CPS)) await BleClient.startNotifications(dev.deviceId, CPS, CPM, onCps);
    else throw new Error('No Cycling Power (0x1818) or FTMS (0x1826) on this sensor');
    bleOn = true; if (ws) ws.close();
    return dev.name || dev.deviceId;
  }

  return {
    connectBle,
    // FTMS « Set Indoor Bike Simulation » (0x11) : pente en 0,01 %, Crr 0,0001, CdA (cw) 0,01 kg/m
    async setSimulation(gradePct) {
      if (!trainer) { // home trainer piloté par le companion Android → consigne relayée par le serveur
        if (ws && ws.readyState === 1 && performance.now() - viaCompanion < 5000) ws.send(JSON.stringify({ type: 'sim', gradePct }));
        return;
      }
      if (simBusy) { pendingGrade = gradePct; return; } // une écriture GATT à la fois : on garde la dernière consigne
      simBusy = true;
      try {
        for (let g = gradePct; g !== null; g = pendingGrade, pendingGrade = null) {
          const a = new DataView(new ArrayBuffer(7));
          a.setUint8(0, 0x11); a.setInt16(1, 0, true); a.setInt16(3, Math.round(Math.max(-20, Math.min(20, g)) * 100), true); a.setUint8(5, 40); a.setUint8(6, 51);
          await BleClient.write(trainer, FTMS, FTMS_CP, a);
        }
      } catch (e) { onLog('sim: ' + e.message); } finally { simBusy = false; pendingGrade = null; }
    },
    sendRoute(gradePct, altM) { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'route', gradePct, altM })); },
  };
}
