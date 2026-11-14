// Unit tests for Heart Rate Measurement characteristic parser
import { parseHrMeasurement } from './hr-sensor.js';

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    return true;
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
    return false;
  }
}

function assertEquals(actual, expected, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)} ${message}`);
  }
}

// Test UINT8 format (flags bit 0 = 0)
test('parseHrMeasurement: UINT8 format with valid HR', () => {
  // Flags = 0x00 (UINT8, no contact), HR = 142
  const buffer = new Uint8Array([0x00, 142]);
  const dv = new DataView(buffer.buffer);
  const result = parseHrMeasurement(dv);
  assertEquals(result.bpm, 142);
  assertEquals(result.contactDetected, false);
});

test('parseHrMeasurement: UINT8 format with contact detected', () => {
  // Flags = 0x06 (UINT8, contact detected = bits 1-2 = 11), HR = 85
  const buffer = new Uint8Array([0x06, 85]);
  const dv = new DataView(buffer.buffer);
  const result = parseHrMeasurement(dv);
  assertEquals(result.bpm, 85);
  assertEquals(result.contactDetected, true);
});

// Test UINT16 format (flags bit 0 = 1)
test('parseHrMeasurement: UINT16 format with valid HR', () => {
  // Flags = 0x01 (UINT16, no contact), HR = 178 (0x00B2 little-endian)
  const buffer = new Uint8Array([0x01, 0xB2, 0x00]);
  const dv = new DataView(buffer.buffer);
  const result = parseHrMeasurement(dv);
  assertEquals(result.bpm, 178);
  assertEquals(result.contactDetected, false);
});

test('parseHrMeasurement: UINT16 format with contact detected', () => {
  // Flags = 0x07 (UINT16 + contact detected), HR = 142
  const buffer = new Uint8Array([0x07, 0x8E, 0x00]);
  const dv = new DataView(buffer.buffer);
  const result = parseHrMeasurement(dv);
  assertEquals(result.bpm, 142);
  assertEquals(result.contactDetected, true);
});

// Test edge cases
test('parseHrMeasurement: rejects too-low HR', () => {
  const buffer = new Uint8Array([0x00, 29]); // 29 bpm < 30
  const dv = new DataView(buffer.buffer);
  const result = parseHrMeasurement(dv);
  assertEquals(result, null);
});

test('parseHrMeasurement: rejects too-high HR', () => {
  const buffer = new Uint8Array([0x00, 251]); // 251 bpm > 250
  const dv = new DataView(buffer.buffer);
  const result = parseHrMeasurement(dv);
  assertEquals(result, null);
});

test('parseHrMeasurement: accepts boundary HR values', () => {
  // 30 bpm (minimum valid)
  let buffer = new Uint8Array([0x00, 30]);
  let dv = new DataView(buffer.buffer);
  let result = parseHrMeasurement(dv);
  assertEquals(result.bpm, 30);
  
  // 250 bpm (maximum valid)
  buffer = new Uint8Array([0x00, 250]);
  dv = new DataView(buffer.buffer);
  result = parseHrMeasurement(dv);
  assertEquals(result.bpm, 250);
});

test('parseHrMeasurement: rejects null/undefined', () => {
  assertEquals(parseHrMeasurement(null), null);
  assertEquals(parseHrMeasurement(undefined), null);
});

test('parseHrMeasurement: rejects buffer too short for UINT8', () => {
  const buffer = new Uint8Array([0x00]); // Missing HR byte
  const dv = new DataView(buffer.buffer);
  assertEquals(parseHrMeasurement(dv), null);
});

test('parseHrMeasurement: rejects buffer too short for UINT16', () => {
  const buffer = new Uint8Array([0x01, 0x8E]); // Missing second byte
  const dv = new DataView(buffer.buffer);
  assertEquals(parseHrMeasurement(dv), null);
});

// Test with additional data (RR intervals, etc.) - should ignore and parse HR correctly
test('parseHrMeasurement: UINT8 with trailing data', () => {
  // Flags with RR interval bit set, but we only care about HR
  const buffer = new Uint8Array([0x10, 145, 0x12, 0x34]); // Extra RR data
  const dv = new DataView(buffer.buffer);
  const result = parseHrMeasurement(dv);
  assertEquals(result.bpm, 145);
});

console.log('\n=== HR Parser Unit Tests Complete ===');
