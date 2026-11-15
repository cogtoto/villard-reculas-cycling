// Unit tests for Piper TTS helpers, cache, and speech fallback
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  DEFAULT_LENGTH_SCALE, DEFAULT_NOISE_SCALE, DEFAULT_NOISE_W, MAX_TEXT_CHARS,
  normalizeTtsText, ttsCacheKey, parseTtsTextFromUrl, ttsEndpointUrl,
  warmupLines, corsHeaders, createTtsEngine
} from '../server/tts.js';
import { LINES, ttsAudioUrl, ttsStatusUrl, ttsBaseUrl, createSpeechOutput, PIPER_PLAYBACK_RATE } from '../commentator.js';

let passed = 0, failed = 0;

function assert(cond, message = 'assertion failed') {
  if (!cond) throw new Error(message);
}
function assertEquals(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)} ${message}`);
  }
}

async function run(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

console.log('Testing Piper TTS helpers...\n');

await run('default length_scale is slightly faster than 1.0', () => {
  assertEquals(DEFAULT_LENGTH_SCALE, 0.8);
  assertEquals(DEFAULT_NOISE_SCALE, 0.8);
  assertEquals(DEFAULT_NOISE_W, 0.95);
  assertEquals(PIPER_PLAYBACK_RATE, 1.05);
});

await run('normalizeTtsText trims and collapses space', () => {
  assertEquals(normalizeTtsText('  Vincent   met une plaque !  '), 'Vincent met une plaque !');
});

await run('ttsCacheKey is stable for the same line and changes with voice or scale', () => {
  const a = ttsCacheKey('Vincent met une plaque !', '/voices/fr_FR-tom-medium.onnx', 0.9);
  const b = ttsCacheKey('  Vincent met une plaque !  ', 'fr_FR-tom-medium.onnx', 0.9);
  const c = ttsCacheKey('Vincent met une plaque !', 'fr_FR-gilles-low.onnx', 0.9);
  const d = ttsCacheKey('Vincent met une plaque !', 'fr_FR-tom-medium.onnx', 1.0);
  assertEquals(a, b);
  assert(a !== c, 'voice must affect the key');
  assert(a !== d, 'length_scale must affect the key');
  const e = ttsCacheKey('Vincent met une plaque !', 'fr_FR-tom-medium.onnx', 0.9, 0.7, 0.95);
  assert(a !== e, 'noise_scale must affect the key');
  assertEquals(a.length, 40);
});

await run('parseTtsTextFromUrl and ttsEndpointUrl round-trip a French line', () => {
  const line = "Vincent met une plaque ! Quelle relance !";
  const href = ttsEndpointUrl('127.0.0.1', line);
  assert(href.startsWith('http://127.0.0.1:8787/tts?text='), href);
  const url = new URL(href);
  assertEquals(parseTtsTextFromUrl(url), line);
  assertEquals(ttsAudioUrl('127.0.0.1', line), href);
  assertEquals(ttsStatusUrl('10.0.0.5'), 'http://10.0.0.5:8787/tts/status');
  assertEquals(ttsBaseUrl('10.0.0.5', 8787), 'http://10.0.0.5:8787');
});

await run('warmupLines covers the start / attack pools first and expands km templates', () => {
  const lines = warmupLines(LINES, { maxKm: 3 });
  assert(lines[0].includes('Vincent'), lines[0]);
  const attacks = LINES.attack.filter((l) => lines.includes(l));
  assertEquals(attacks.length, LINES.attack.length);
  const kmHits = lines.filter((l) => /[Kk]ilomètre 3|\b3,/.test(l) || l.includes(' 3'));
  assert(kmHits.length >= 1, 'expected expanded km 3 lines');
  assert(lines.every((l) => !l.includes('{km}') && !l.includes('{remain}')));
  assert(new Set(lines).size === lines.length, 'no duplicate warmup lines');
});

await run('corsHeaders allow the game on another port to call /tts', () => {
  const h = corsHeaders();
  assertEquals(h['Access-Control-Allow-Origin'], '*');
  assert(/GET/.test(h['Access-Control-Allow-Methods']));
});

await run('engine reports 503 when piper is missing, then synthesizes through a mock binary', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vv-tts-'));
  try {
    const missing = createTtsEngine({
      bin: path.join(dir, 'no-piper'),
      model: path.join(dir, 'no-model.onnx'),
      cacheDir: path.join(dir, 'cache')
    });
    assertEquals(missing.status().ok, false);
    let err = null;
    try { await missing.synthesize('bonjour'); } catch (e) { err = e; }
    assert(err && err.statusCode === 503, 'expected 503');

    const bin = path.join(dir, 'piper');
    const model = path.join(dir, 'fr_FR-tom-medium.onnx');
    fs.writeFileSync(bin, '');
    fs.writeFileSync(model, 'x');
    const wav = Buffer.from('RIFF' + 'x'.repeat(80));
    const spawnFn = (cmd, args) => {
      assertEquals(cmd, bin);
      assert(args.includes('--length_scale'));
      assert(args.includes('0.9'));
      assert(args.includes('--noise_scale'));
      assert(args.includes('--noise_w'));
      const out = args[args.indexOf('--output_file') + 1];
      return {
        stdin: { write() {}, end() {} },
        stderr: { on() {} },
        on(ev, cb) {
          if (ev === 'close') setImmediate(() => { fs.writeFileSync(out, wav); cb(0); });
        }
      };
    };
    const tts = createTtsEngine({ bin, model, cacheDir: path.join(dir, 'cache2'), spawnFn, lengthScale: 0.9, persistent: false });
    assertEquals(tts.status().ok, true);
    assertEquals(tts.status().voice, 'fr_FR-tom-medium');
    const a = await tts.synthesize('  Vincent met une plaque !  ');
    assert(Buffer.isBuffer(a) && a.length === wav.length);
    const b = await tts.synthesize('Vincent met une plaque !');
    assert(a.equals(b), 'second call must be a cache hit');
    const cached = fs.readdirSync(path.join(dir, 'cache2')).filter((f) => f.endsWith('.wav'));
    assertEquals(cached.length, 1);

    let shortErr = null;
    try { await tts.synthesize(''); } catch (e) { shortErr = e; }
    assert(shortErr && shortErr.statusCode === 400, 'empty text');
    let longErr = null;
    try { await tts.synthesize('x'.repeat(MAX_TEXT_CHARS + 1)); } catch (e) { longErr = e; }
    assert(longErr && longErr.statusCode === 400, 'too long');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

await run('createSpeechOutput prefers Piper audio and falls back to speechSynthesis', async () => {
  const spoken = [];
  const fakeSynth = {
    cancel() { spoken.push('cancel'); },
    getVoices() { return [{ lang: 'fr-FR', name: 'French', localService: true, default: true }]; },
    speak(u) { spoken.push(u.text); if (u.onend) setImmediate(() => u.onend()); }
  };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };

  let allowPiper = true;
  const fetchImpl = async (href) => {
    if (String(href).includes('/tts/status')) {
      return { ok: true, json: async () => ({ ok: allowPiper, voice: 'fr_FR-tom-medium' }) };
    }
    if (!allowPiper) return { ok: false, status: 503 };
    return { ok: true, status: 200, blob: async () => new Blob(['WAV']) };
  };
  const plays = [];
  class FakeAudio {
    constructor(src) { this.src = src; this.onended = null; this.onerror = null; this.onplay = null; }
    play() { plays.push({ src: this.src, rate: this.playbackRate }); setImmediate(() => this.onended && this.onended()); return Promise.resolve(); }
    pause() {}
    removeAttribute() {}
  }

  const out = createSpeechOutput({
    getSynth: () => fakeSynth,
    ttsBase: 'http://127.0.0.1:8787',
    fetchImpl,
    AudioCtor: FakeAudio
  });
  await new Promise((resolve) => out.speak('Vincent met une plaque ! Quelle relance !', { onend: resolve }));
  assert(plays.length === 1, 'expected Piper playback');
  assertEquals(plays[0].rate, 1.05);
  assert(!spoken.includes('Vincent met une plaque ! Quelle relance !'), 'must not use speechSynthesis when Piper works');

  allowPiper = false;
  const out2 = createSpeechOutput({
    getSynth: () => fakeSynth,
    ttsBase: 'http://127.0.0.1:8787',
    fetchImpl,
    AudioCtor: FakeAudio
  });
  await new Promise((resolve) => out2.speak('Il est dans le dur, Vincent, ça fait mal aux jambes !', { onend: resolve }));
  assert(spoken.includes('Il est dans le dur, Vincent, ça fait mal aux jambes !'), 'fallback to speechSynthesis');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
