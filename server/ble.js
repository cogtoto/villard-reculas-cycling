/**
 * BLE cycling sensors (FTMS / Cycling Power / CSC).
 * Falls back gracefully if noble cannot start (no adapter / permissions).
 */
import EventEmitter from 'events';

const UUID = {
  cyclingPower: '1818',
  cyclingPowerMeasurement: '2a63',
  csc: '1816',
  cscMeasurement: '2a5b',
  ftms: '1826',
  indoorBikeData: '2ad2',
};

function strip(u) {
  return String(u).toLowerCase().replace(/-/g, '').replace(/^0+/, '');
}

function matchUuid(a, b) {
  return strip(a).endsWith(strip(b));
}

export function createBleSource() {
  const bus = new EventEmitter();
  let noble;
  let state = { watts: null, cadence: null, source: 'ble-idle' };

  async function start() {
    try {
      noble = (await import('@abandonware/noble')).default;
    } catch (err) {
      bus.emit('error', err);
      return false;
    }

    noble.on('stateChange', async (s) => {
      bus.emit('log', `ble adapter: ${s}`);
      if (s === 'poweredOn') {
        try {
          await noble.startScanningAsync([], true);
          bus.emit('log', 'ble scanning…');
        } catch (err) {
          bus.emit('error', err);
        }
      } else {
        try { await noble.stopScanningAsync(); } catch (_) {}
      }
    });

    noble.on('discover', (peripheral) => {
      const name = peripheral.advertisement?.localName || '';
      const uuids = peripheral.advertisement?.serviceUuids || [];
      const interesting = uuids.some((u) =>
        [UUID.cyclingPower, UUID.csc, UUID.ftms].some((t) => matchUuid(u, t))
      );
      if (!interesting && !/zwift|kickr|wahoo|elite|tacx|stages|rover|click|play/i.test(name)) {
        return;
      }
      bus.emit('log', `found ${name || peripheral.id}`);
      connect(peripheral).catch((err) => bus.emit('error', err));
    });

    return true;
  }

  async function connect(peripheral) {
    if (peripheral.state === 'connected' || peripheral.state === 'connecting') return;
    try {
      await noble.stopScanningAsync();
    } catch (_) {}
    await peripheral.connectAsync();
    bus.emit('log', `connected ${peripheral.advertisement?.localName || peripheral.id}`);
    const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync(
      [UUID.cyclingPower, UUID.csc, UUID.ftms],
      [UUID.cyclingPowerMeasurement, UUID.cscMeasurement, UUID.indoorBikeData]
    );

    for (const ch of characteristics) {
      const id = strip(ch.uuid);
      await ch.subscribeAsync();
      ch.on('data', (data) => {
        if (id.endsWith(UUID.cyclingPowerMeasurement)) parsePower(data);
        else if (id.endsWith(UUID.indoorBikeData)) parseFtms(data);
        else if (id.endsWith(UUID.cscMeasurement)) parseCsc(data);
        bus.emit('telemetry', { ...state, source: 'ble', ts: Date.now() });
      });
    }

    peripheral.once('disconnect', () => {
      bus.emit('log', 'ble disconnected — rescan');
      state.source = 'ble-idle';
      noble.startScanningAsync([], true).catch(() => {});
    });
  }

  function parsePower(buf) {
    if (buf.length < 4) return;
    const flags = buf.readUInt16LE(0);
    state.watts = buf.readInt16LE(2);
    // optional cadence accumulates differently per flag; keep simple
    if (flags & 0x20 && buf.length >= 6) {
      // wheel? skip detailed for MVP
    }
  }

  function parseFtms(buf) {
    // Indoor Bike Data — flags at 0
    if (buf.length < 3) return;
    let o = 2;
    const flags = buf.readUInt16LE(0);
    if (flags & 0x01) o += 2; // more data
    if (flags & 0x02) { // instantaneous cadence (uint16, 1/2 rpm)
      if (buf.length >= o + 2) state.cadence = buf.readUInt16LE(o) / 2;
      o += 2;
    }
    if (flags & 0x04) o += 2;
    if (flags & 0x08) o += 2;
    if (flags & 0x10) o += 3;
    if (flags & 0x20) o += 3;
    if (flags & 0x40) { // power
      if (buf.length >= o + 2) state.watts = buf.readInt16LE(o);
    }
  }

  let lastCrank = null;
  let lastCrankTime = null;
  function parseCsc(buf) {
    if (buf.length < 1) return;
    const flags = buf[0];
    let o = 1;
    if (flags & 0x01) o += 6; // wheel
    if (flags & 0x02 && buf.length >= o + 4) {
      const crank = buf.readUInt16LE(o);
      const time = buf.readUInt16LE(o + 2); // 1/1024 s
      if (lastCrank != null && lastCrankTime != null) {
        let dRevs = (crank - lastCrank + 65536) % 65536;
        let dTime = (time - lastCrankTime + 65536) % 65536;
        if (dTime > 0 && dRevs < 100) {
          state.cadence = (dRevs / (dTime / 1024)) * 60;
        }
      }
      lastCrank = crank;
      lastCrankTime = time;
    }
  }

  return { start, bus, getState: () => state };
}
