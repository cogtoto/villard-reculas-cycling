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
    const t0 = Date.now();
    await BleClient.initialize({ androidNeverForLocation: true });
    
    // Request device with service filters to show only trainers/power meters
    const dev = await BleClient.requestDevice({
      services: [FTMS, CPS], // Filter picker to trainers only
      optionalServices: [FTMS, CPS]
    });
    
    onLog(`[+${Date.now()-t0}ms] Connecting to ${dev.name || dev.deviceId}...`);
    await BleClient.connect(dev.deviceId, () => { deviceId = null; control = false; onDisconnect(); });
    onLog(`[+${Date.now()-t0}ms] Connected. Waiting for service discovery...`);
    
    // Android needs explicit time for GATT service discovery to complete
    // Discovery happens automatically after connect but takes 500-2000ms
    // Poll getServices() until we find FTMS or CPS (up to 10 seconds)
    let svcs = [];
    let attempt = 0;
    const maxAttempts = 20; // 20 attempts × 500ms = 10 seconds max
    const delayMs = 500;
    
    while (attempt < maxAttempts) {
      try {
        const services = await BleClient.getServices(dev.deviceId);
        svcs = services.map((s) => s.uuid.toLowerCase());
        
        if (svcs.includes(FTMS) || svcs.includes(CPS)) {
          onLog(`[+${Date.now()-t0}ms] Discovery complete: found ${svcs.length} services (attempt ${attempt + 1})`);
          break;
        }
        
        if (attempt === 0 && svcs.length === 0) {
          onLog(`[+${Date.now()-t0}ms] Services not ready yet, waiting...`);
        }
        
        attempt++;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (e) {
        onLog(`[+${Date.now()-t0}ms] getServices attempt ${attempt + 1} error: ${e.message}`);
        attempt++;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    // If still no services after 10 seconds, try disconnect/reconnect once
    if (!svcs.includes(FTMS) && !svcs.includes(CPS)) {
      onLog(`[+${Date.now()-t0}ms] Service discovery timeout. Trying disconnect/reconnect...`);
      try {
        await BleClient.disconnect(dev.deviceId);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await BleClient.connect(dev.deviceId, () => { deviceId = null; control = false; onDisconnect(); });
        onLog(`[+${Date.now()-t0}ms] Reconnected. Checking services...`);
        
        // Wait a bit and try once more
        await new Promise(resolve => setTimeout(resolve, 1500));
        const services = await BleClient.getServices(dev.deviceId);
        svcs = services.map((s) => s.uuid.toLowerCase());
        onLog(`[+${Date.now()-t0}ms] After reconnect: ${svcs.length} services found`);
      } catch (e) {
        onLog(`[+${Date.now()-t0}ms] Reconnect failed: ${e.message}`);
      }
    }
    
    // Now try to connect to FTMS or CPS based on discovered services
    let connectedService = null;
    
    if (svcs.includes(FTMS)) {
      try {
        onLog(`[+${Date.now()-t0}ms] Starting FTMS notifications...`);
        await BleClient.startNotifications(dev.deviceId, FTMS, IBD, onIbd);
        connectedService = 'FTMS';
        onLog(`[+${Date.now()-t0}ms] FTMS data notifications started`);
        
        // Try to enable FTMS control point for ERG mode
        try {
          await BleClient.startNotifications(dev.deviceId, FTMS, FTMS_CP, () => {});
          await BleClient.write(dev.deviceId, FTMS, FTMS_CP, bytes([0x00])); // Request Control
          await BleClient.write(dev.deviceId, FTMS, FTMS_CP, bytes([0x07])); // Start/Resume
          control = true;
          onLog(`[+${Date.now()-t0}ms] FTMS control point enabled (ERG mode)`);
        } catch (e) {
          onLog(`[+${Date.now()-t0}ms] FTMS control unavailable: ${e.message}`);
        }
      } catch (e) {
        throw new Error(`FTMS service found but startNotifications failed: ${e.message}`);
      }
    } else if (svcs.includes(CPS)) {
      try {
        onLog(`[+${Date.now()-t0}ms] Starting Cycling Power notifications...`);
        await BleClient.startNotifications(dev.deviceId, CPS, CPM, onCps);
        connectedService = 'CPS';
        onLog(`[+${Date.now()-t0}ms] Cycling Power notifications started`);
      } catch (e) {
        throw new Error(`CPS service found but startNotifications failed: ${e.message}`);
      }
    } else {
      // Neither service found after all attempts
      const deviceInfo = `${dev.name || 'Unknown'} (${dev.deviceId})`;
      const serviceList = svcs.length > 0 
        ? svcs.map(s => s.slice(4, 8)).join(', ')
        : 'none';
      throw new Error(
        `[+${Date.now()-t0}ms] No FTMS or CPS service found after ${attempt} attempts. ` +
        `Device: ${deviceInfo}. Found services: ${serviceList}. ` +
        `Expected: 1826 (FTMS) or 1818 (CPS). ` +
        `Try: Power cycle trainer, unpair in Bluetooth settings, retry.`
      );
    }
    
    deviceId = dev.deviceId;
    onLog(`[+${Date.now()-t0}ms] ✓ Connected via ${connectedService}`);
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
