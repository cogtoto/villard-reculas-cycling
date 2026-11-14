// BLE Heart Rate sensor — standard HR Service 0x180D
import { BleClient } from '@capacitor-community/bluetooth-le';

const HR_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

/**
 * Parse Heart Rate Measurement characteristic (0x2A37)
 * Spec: https://www.bluetooth.com/specifications/specs/heart-rate-service-1-0/
 * 
 * Byte 0: Flags
 *   bit 0: 0=uint8 HR, 1=uint16 HR
 *   bit 1-2: Sensor Contact Status
 *   bit 3: Energy Expended Status
 *   bit 4: RR-Interval
 *   
 * Returns: { bpm: number, contactDetected: boolean } or null if invalid
 */
export function parseHrMeasurement(dataView) {
  if (!dataView || dataView.byteLength < 2) return null;
  
  const flags = dataView.getUint8(0);
  const hrValueFormat = flags & 0x01; // 0 = UINT8, 1 = UINT16
  
  let bpm;
  if (hrValueFormat === 0) {
    // UINT8 format
    bpm = dataView.getUint8(1);
  } else {
    // UINT16 format
    if (dataView.byteLength < 3) return null;
    bpm = dataView.getUint16(1, true); // little-endian
  }
  
  // Sensor Contact Status (bits 1-2)
  const contactStatus = (flags >> 1) & 0x03;
  const contactDetected = contactStatus === 0x03; // 11 = contact detected
  
  // Validate BPM range
  if (bpm < 30 || bpm > 250) return null;
  
  return { bpm, contactDetected };
}

export function createHrSensor({ onData, onLog = () => {}, onDisconnect = () => {} }) {
  let deviceId = null;
  let lastBpm = 0;
  let deviceName = '';

  async function connect() {
    const t0 = Date.now();
    await BleClient.initialize({ androidNeverForLocation: true });
    
    // Request HR device
    const dev = await BleClient.requestDevice({
      services: [HR_SERVICE],
      optionalServices: [HR_SERVICE]
    });
    
    deviceName = dev.name || dev.deviceId;
    onLog(`[HR] Connecting to ${deviceName}...`);
    await BleClient.connect(dev.deviceId, () => { 
      deviceId = null; 
      onDisconnect(); 
    });
    onLog(`[HR] Connected. Discovering services...`);
    
    // Wait for service discovery
    let svcs = [];
    let attempt = 0;
    const maxAttempts = 20;
    const delayMs = 500;
    
    while (attempt < maxAttempts) {
      try {
        const services = await BleClient.getServices(dev.deviceId);
        svcs = services.map((s) => s.uuid.toLowerCase());
        
        if (svcs.includes(HR_SERVICE)) {
          onLog(`[HR] Discovery complete (attempt ${attempt + 1})`);
          break;
        }
        
        attempt++;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (e) {
        onLog(`[HR] getServices attempt ${attempt + 1} error: ${e.message}`);
        attempt++;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    if (!svcs.includes(HR_SERVICE)) {
      throw new Error('HR service not found after 10s');
    }
    
    deviceId = dev.deviceId;
    
    // Start notifications
    onLog(`[HR] Starting notifications...`);
    await BleClient.startNotifications(
      deviceId,
      HR_SERVICE,
      HR_MEASUREMENT,
      (value) => {
        const dv = new DataView(value.buffer);
        const hr = parseHrMeasurement(dv);
        if (hr) {
          lastBpm = hr.bpm;
          onData({ bpm: hr.bpm, contactDetected: hr.contactDetected });
        }
      }
    );
    
    onLog(`[HR] ${deviceName} ready`);
    
    return { name: deviceName };
  }

  async function disconnect() {
    if (deviceId) {
      try {
        await BleClient.disconnect(deviceId);
      } catch (e) {
        onLog(`[HR] Disconnect error: ${e.message}`);
      }
      deviceId = null;
    }
  }

  return {
    connect,
    disconnect,
    get connected() { return deviceId !== null; },
    get lastBpm() { return lastBpm; },
    get deviceName() { return deviceName; }
  };
}
