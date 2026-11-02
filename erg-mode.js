// ERG mode control via FTMS (Fitness Machine Service)
// Sends 'Set Target Power' commands to smart trainers
// Supports both Web Bluetooth and @capacitor-community/bluetooth-le

const FTMS_SERVICE = '00001826-0000-1000-8000-00805f9b34fb';
const FTMS_CONTROL_POINT = '00001826-0000-1000-8000-00805f9b34fb'; // Control Point characteristic
const FTMS_CONTROL_POINT_CHAR = '00002ad9-0000-1000-8000-00805f9b34fb';

let ergModeActive = false;
let controlRequested = false;
let currentTargetWatts = 0;
let bluetoothType = null; // 'web' or 'capacitor'
let webDevice = null;
let webControlChar = null;
let capacitorDeviceId = null;

// Request control of the trainer (required before sending commands)
async function requestControl() {
  if (controlRequested) return true;
  
  try {
    // FTMS Control Point: Request Control (op code 0x00)
    const command = new Uint8Array([0x00]);
    
    if (bluetoothType === 'web' && webControlChar) {
      await webControlChar.writeValue(command);
      console.log('ERG: Requested control via Web Bluetooth');
    } else if (bluetoothType === 'capacitor' && capacitorDeviceId) {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.write({
        deviceId: capacitorDeviceId,
        service: FTMS_SERVICE,
        characteristic: FTMS_CONTROL_POINT_CHAR,
        value: command
      });
      console.log('ERG: Requested control via Capacitor BLE');
    } else {
      console.warn('ERG: No Bluetooth connection for control request');
      return false;
    }
    
    controlRequested = true;
    return true;
  } catch (err) {
    console.error('ERG: Failed to request control:', err);
    return false;
  }
}

// Set target power in watts (FTMS op code 0x05)
async function setTargetPower(watts) {
  if (!ergModeActive) return false;
  if (watts === currentTargetWatts) return true; // No change needed
  
  try {
    // Ensure we have control
    if (!controlRequested) {
      const controlled = await requestControl();
      if (!controlled) return false;
    }
    
    // FTMS Control Point: Set Target Power (op code 0x05)
    // Format: [0x05, power_lsb, power_msb] (power in watts, little-endian int16)
    const powerInt = Math.max(0, Math.min(4000, Math.round(watts))); // Clamp 0-4000W
    const command = new Uint8Array([
      0x05,
      powerInt & 0xFF,
      (powerInt >> 8) & 0xFF
    ]);
    
    if (bluetoothType === 'web' && webControlChar) {
      await webControlChar.writeValue(command);
    } else if (bluetoothType === 'capacitor' && capacitorDeviceId) {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.write({
        deviceId: capacitorDeviceId,
        service: FTMS_SERVICE,
        characteristic: FTMS_CONTROL_POINT_CHAR,
        value: command
      });
    } else {
      console.warn('ERG: No Bluetooth connection for power command');
      return false;
    }
    
    currentTargetWatts = powerInt;
    console.log(`ERG: Set target power to ${powerInt}W`);
    return true;
  } catch (err) {
    console.error('ERG: Failed to set target power:', err);
    return false;
  }
}

// Initialize ERG mode with a Bluetooth connection
export async function initializeERGMode(device, type = 'web') {
  bluetoothType = type;
  
  if (type === 'web') {
    webDevice = device;
    try {
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(FTMS_SERVICE);
      webControlChar = await service.getCharacteristic(FTMS_CONTROL_POINT_CHAR);
      console.log('ERG: Initialized with Web Bluetooth');
      return true;
    } catch (err) {
      console.error('ERG: Failed to initialize Web Bluetooth:', err);
      return false;
    }
  } else if (type === 'capacitor') {
    capacitorDeviceId = device; // device is deviceId string
    console.log('ERG: Initialized with Capacitor BLE');
    return true;
  }
  
  return false;
}

// Start ERG mode (activate target power control)
export async function startERGMode() {
  ergModeActive = true;
  controlRequested = false;
  currentTargetWatts = 0;
  console.log('ERG mode: ACTIVATED');
  
  // Request control immediately
  return await requestControl();
}

// Stop ERG mode (release control, restore normal resistance)
export async function stopERGMode() {
  if (!ergModeActive) return;
  
  ergModeActive = false;
  controlRequested = false;
  currentTargetWatts = 0;
  
  // Optional: Reset control (op code 0x01)
  try {
    const command = new Uint8Array([0x01]);
    if (bluetoothType === 'web' && webControlChar) {
      await webControlChar.writeValue(command);
    } else if (bluetoothType === 'capacitor' && capacitorDeviceId) {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.write({
        deviceId: capacitorDeviceId,
        service: FTMS_SERVICE,
        characteristic: FTMS_CONTROL_POINT_CHAR,
        value: command
      });
    }
    console.log('ERG mode: DEACTIVATED, control reset');
  } catch (err) {
    console.warn('ERG: Failed to reset control:', err);
  }
}

// Update target power (called every interval change)
export async function updateTargetPower(watts) {
  if (!ergModeActive) return false;
  return await setTargetPower(watts);
}

// Adjust target power by delta (for +/- gear buttons during workout)
export async function adjustTargetPower(delta) {
  if (!ergModeActive || currentTargetWatts === 0) return false;
  const newTarget = currentTargetWatts + delta;
  return await setTargetPower(newTarget);
}

// Get current ERG state
export function getERGState() {
  return {
    active: ergModeActive,
    targetWatts: currentTargetWatts,
    hasControl: controlRequested,
    bluetoothType
  };
}

// Check if ERG mode is active
export function isERGActive() {
  return ergModeActive;
}
