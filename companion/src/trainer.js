// BLE home trainer — parsers & FTMS control adapted from ../velo-virtuel/sensors.js
import { BleClient } from '@capacitor-community/bluetooth-le';

const CPS = '00001818-0000-1000-8000-00805f9b34fb', CPM = '00002a63-0000-1000-8000-00805f9b34fb';
const FTMS = '00001826-0000-1000-8000-00805f9b34fb', IBD = '00002ad2-0000-1000-8000-00805f9b34fb';
const FTMS_CP = '00002ad9-0000-1000-8000-00805f9b34fb';
const bytes = (arr) => new DataView(new Uint8Array(arr).buffer);

export function createTrainer({ onData, onLog = () => {}, onDisconnect = () => {} }) {
  let deviceId = null, control = false, simBusy = false, pendingGrade = null;
  let lastRevs = null, lastEvt = null, cad = 0;
  const crankCadence = (revs, evt) => {
    let c = null;
    if (lastRevs !== null) { const dr = (revs - lastRevs) & 0xffff, dt = ((evt - lastEvt) & 0xffff) / 1024; if (dt > 0) c = (dr / dt) * 60; }
    lastRevs = revs; lastEvt = evt; return c;
  };
  function onCps(dv) {
    const flags = dv.getUint16(0, true), watts = dv.getInt16(2, true); let o = 4;
    if (flags & 0x1) o += 1; if (flags & 0x4) o += 2; if (flags & 0x10) o += 6;
    if (flags & 0x20) { const c = crankCadence(dv.getUint16(o, true), dv.getUint16(o + 2, true)); if (c !== null && c < 250) cad = c; }
    onData({ watts, cadence: cad, sensor: 'cps' });
  }
  function onIbd(dv) {
    const f = dv.getUint16(0, true); let o = 2, watts = null, cadence = null;
    if (!(f & 0x1)) o += 2; if (f & 0x2) o += 2;
    if (f & 0x4) { cadence = dv.getUint16(o, true) / 2; o += 2; } if (f & 0x8) o += 2;
    if (f & 0x10) o += 3; if (f & 0x20) o += 2;
    if (f & 0x40) { watts = dv.getInt16(o, true); o += 2; }
    if (watts !== null) onData({ watts, cadence: cadence ?? cad, sensor: 'ftms' });
  }

  async function connect() {
    await BleClient.initialize({ androidNeverForLocation: true });
    const dev = await BleClient.requestDevice({ optionalServices: [CPS, FTMS] });
    await BleClient.connect(dev.deviceId, () => { deviceId = null; control = false; onDisconnect(); });
    const svcs = (await BleClient.getServices(dev.deviceId)).map((s) => s.uuid.toLowerCase());
    if (svcs.includes(FTMS)) {
      await BleClient.startNotifications(dev.deviceId, FTMS, IBD, onIbd);
      try {
        await BleClient.startNotifications(dev.deviceId, FTMS, FTMS_CP, () => {});
        await BleClient.write(dev.deviceId, FTMS, FTMS_CP, bytes([0x00])); // Request Control
        await BleClient.write(dev.deviceId, FTMS, FTMS_CP, bytes([0x07])); // Start/Resume
        control = true;
      } catch (e) { onLog('FTMS control point unavailable: ' + e.message); }
    } else if (svcs.includes(CPS)) await BleClient.startNotifications(dev.deviceId, CPS, CPM, onCps);
    else throw new Error('No Cycling Power (0x1818) or FTMS (0x1826) service');
    deviceId = dev.deviceId;
    return { name: dev.name || dev.deviceId, control };
  }

  // FTMS Set Indoor Bike Simulation (0x11): grade 0.01 %, Crr 0.0001, Cw 0.01 kg/m
  async function setSimulation(gradePct) {
    if (!deviceId || !control) return;
    if (simBusy) { pendingGrade = gradePct; return; }
    simBusy = true;
    try {
      for (let g = gradePct; g !== null; g = pendingGrade, pendingGrade = null) {
        const a = new DataView(new ArrayBuffer(7));
        a.setUint8(0, 0x11); a.setInt16(1, 0, true); a.setInt16(3, Math.round(Math.max(-20, Math.min(20, g)) * 100), true); a.setUint8(5, 40); a.setUint8(6, 51);
        await BleClient.write(deviceId, FTMS, FTMS_CP, a);
      }
    } catch (e) { onLog('sim: ' + e.message); } finally { simBusy = false; pendingGrade = null; }
  }

  return { connect, setSimulation, get connected() { return !!deviceId; } };
}
