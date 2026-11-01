// Sources capteurs : 1) serveur Node WS (desktop, BLE via noble)  2) BLE direct (app Android / Chrome : plugin
// @capacitor-community/bluetooth-le, Web Bluetooth sur le web)  3) mock local si rien (l'app tourne sans serveur).
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';

const CPS = '00001818-0000-1000-8000-00805f9b34fb', CPM = '00002a63-0000-1000-8000-00805f9b34fb';   // Cycling Power
const FTMS = '00001826-0000-1000-8000-00805f9b34fb', IBD = '00002ad2-0000-1000-8000-00805f9b34fb'; // Fitness Machine / Indoor Bike Data
const FTMS_CP = '00002ad9-0000-1000-8000-00805f9b34fb'; // Fitness Machine Control Point (résistance / simulation)
// Zwift Click / Play (boutons de vitesses virtuelles pour Zwift Cog) — service propriétaire BLE
const ZW_SVC = '00000001-19ca-4651-86e5-fa29dcdd09d1', ZW_ASYNC = '00000002-19ca-4651-86e5-fa29dcdd09d1', ZW_SYNC_RX = '00000003-19ca-4651-86e5-fa29dcdd09d1', ZW_SYNC_TX = '00000004-19ca-4651-86e5-fa29dcdd09d1';
const RIDE_ON = [0x52, 0x69, 0x64, 0x65, 0x4f, 0x6e]; // "RideOn" (handshake)
const MOCK_AFTER_MS = 3000;
const dv = (arr) => new DataView(new Uint8Array(arr).buffer);

export function createSensors(onData, { onShift = () => {}, onLog = () => {} } = {}) {
  let lastData = 0, mode = 'init', ws = null, bleOn = false, trainer = null, simBusy = false;
  const push = (d, source) => { lastData = performance.now(); mode = source; onData({ ...d, source }); };
  const native = Capacitor.isNativePlatform();

  // 1) WebSocket vers le serveur Node (seulement si servi par Vite/desktop)
  function connectWs() {
    if (native || bleOn) return;
    try { ws = new WebSocket(`ws://${location.hostname}:8787`); } catch { return; }
    ws.onmessage = (ev) => { if (bleOn) return; const m = JSON.parse(ev.data); push(m, m.source || 'ws'); };
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
      } catch (e) { onLog('FTMS control point indisponible : ' + e.message); }
    }
    else if (svcs.includes(CPS)) await BleClient.startNotifications(dev.deviceId, CPS, CPM, onCps);
    else throw new Error('Ni Cycling Power (0x1818) ni FTMS (0x1826) sur ce capteur');
    bleOn = true; if (ws) ws.close();
    return dev.name || dev.deviceId;
  }

  // Zwift Click / Play : handshake "RideOn" puis notifications de boutons (+ / −) → changement de vitesse virtuelle.
  // Message Click : 0x37 + protobuf { 1: plus, 2: minus } (0 = appuyé). Firmwares récents chiffrés : non géré (log brut).
  const btnPrev = { plus: 1, minus: 1 };
  function onZwift(d) {
    const b = new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
    if (b[0] === 0x37) {
      const f = {}; for (let i = 1; i < b.length;) { const key = b[i++], fld = key >> 3; let v = 0, sh = 0, c; do { c = b[i++]; v |= (c & 0x7f) << sh; sh += 7; } while (c & 0x80); f[fld] = v; }
      for (const [k, fld, dir] of [['plus', 1, 1], ['minus', 2, -1]]) if (fld in f) { if (f[fld] === 0 && btnPrev[k] !== 0) onShift(dir); btnPrev[k] = f[fld]; }
    } else if (b[0] !== 0x15 && b[0] !== 0x19) onLog('Zwift msg ' + Array.from(b.slice(0, 12), (x) => x.toString(16).padStart(2, '0')).join(' '));
  }
  async function connectZwift() {
    await BleClient.initialize({ androidNeverForLocation: true });
    const dev = await BleClient.requestDevice({ optionalServices: [ZW_SVC] });
    await BleClient.connect(dev.deviceId);
    await BleClient.startNotifications(dev.deviceId, ZW_SVC, ZW_ASYNC, onZwift);
    try { await BleClient.startNotifications(dev.deviceId, ZW_SVC, ZW_SYNC_TX, onZwift); } catch {}
    await BleClient.write(dev.deviceId, ZW_SVC, ZW_SYNC_RX, dv(RIDE_ON));
    return dev.name || dev.deviceId;
  }

  return {
    connectBle, connectZwift,
    // FTMS « Set Indoor Bike Simulation » (0x11) : pente en 0,01 %, Crr 0,0001, CdA (cw) 0,01 kg/m
    async setSimulation(gradePct) {
      if (!trainer || simBusy) return; simBusy = true;
      const g = Math.round(Math.max(-20, Math.min(20, gradePct)) * 100), a = new DataView(new ArrayBuffer(7));
      a.setUint8(0, 0x11); a.setInt16(1, 0, true); a.setInt16(3, g, true); a.setUint8(5, 40); a.setUint8(6, 51);
      try { await BleClient.write(trainer, FTMS, FTMS_CP, a); } catch (e) { onLog('sim: ' + e.message); } finally { simBusy = false; }
    },
    sendRoute(gradePct, altM) { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'route', gradePct, altM })); },
  };
}
