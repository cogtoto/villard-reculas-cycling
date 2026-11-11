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
    
    // Request device with service filters to show only trainers/power meters
    const dev = await BleClient.requestDevice({
      services: [FTMS, CPS], // Filter picker to trainers only
      optionalServices: [FTMS, CPS]
    });
    
    onLog(`Connecting to ${dev.name || dev.deviceId}...`);
    await BleClient.connect(dev.deviceId, () => { deviceId = null; control = false; onDisconnect(); });
    onLog('Connected, discovering services...');
    
    // On Android, getServices() returns cached data and may be empty
    // We know from advertisement that FTMS/CPS exists, so try direct connection
    // Strategy: Try FTMS first (preferred), then fall back to CPS
    let connectedService = null;
    
    try {
      // Try FTMS Indoor Bike Data characteristic
      onLog('Attempting FTMS connection...');
      await BleClient.startNotifications(dev.deviceId, FTMS, IBD, onIbd);
      connectedService = 'FTMS';
      onLog('FTMS data notifications started');
      
      // Try to enable FTMS control point for ERG mode
      try {
        await BleClient.startNotifications(dev.deviceId, FTMS, FTMS_CP, () => {});
        await BleClient.write(dev.deviceId, FTMS, FTMS_CP, bytes([0x00])); // Request Control
        await BleClient.write(dev.deviceId, FTMS, FTMS_CP, bytes([0x07])); // Start/Resume
        control = true;
        onLog('FTMS control point enabled (ERG mode available)');
      } catch (e) {
        onLog('FTMS control point unavailable (power data only): ' + e.message);
      }
    } catch (ftmsError) {
      onLog('FTMS not available: ' + ftmsError.message);
      
      // Fall back to Cycling Power Service
      try {
        onLog('Attempting Cycling Power connection...');
        await BleClient.startNotifications(dev.deviceId, CPS, CPM, onCps);
        connectedService = 'CPS';
        onLog('Cycling Power notifications started');
      } catch (cpsError) {
        onLog('Cycling Power not available: ' + cpsError.message);
        
        // Both failed - provide diagnostic info
        // Try getServices for diagnostic purposes only
        let svcs = [];
        try {
          const services = await BleClient.getServices(dev.deviceId);
          svcs = services.map((s) => s.uuid.toLowerCase());
        } catch (e) {
          onLog('getServices also failed: ' + e.message);
        }
        
        const deviceInfo = `${dev.name || 'Unknown'} (${dev.deviceId})`;
        const serviceList = svcs.length > 0 
          ? svcs.map(s => s.slice(4, 8)).join(', ')
          : 'none (getServices returned empty)';
        
        throw new Error(
          `Device ${deviceInfo} connection failed. ` +
          `Advertisement showed FTMS/CPS but characteristics not accessible. ` +
          `FTMS error: ${ftmsError.message}. CPS error: ${cpsError.message}. ` +
          `Services from getServices: ${serviceList}. ` +
          `Try: Turn trainer off/on, unpair in phone Bluetooth settings, then retry.`
        );
      }
    }
    
    deviceId = dev.deviceId;
    onLog(`Successfully connected via ${connectedService}`);
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
