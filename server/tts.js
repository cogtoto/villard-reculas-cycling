// Local Piper TTS for Le Commentateur.
// Runs on the companion HTTP server (port 8787). No network at request time.

import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { LINES, formatLine } from '../commentator.js';

export const DEFAULT_LENGTH_SCALE = 0.8;
export const DEFAULT_NOISE_SCALE = 0.8;
export const DEFAULT_NOISE_W = 0.95;

export const MAX_TEXT_CHARS = 400;
export const SYNTH_TIMEOUT_MS = 8000;

const HOME = process.env.HOME || os.homedir();

export function readPiperConfig() {
  try {
    const cfgPath = path.join(HOME, '.local/share/piper/config.json');
    if (fs.existsSync(cfgPath)) return JSON.parse(fs.readFileSync(cfgPath, 'utf8')) || {};
  } catch { /* ignore */ }
  return {};
}

export function defaultPiperBin() {
  if (process.env.PIPER_BIN) return process.env.PIPER_BIN;
  const candidates = [
    path.join(HOME, '.local/bin/piper'),
    path.join(HOME, '.local/share/piper/piper/piper'),
    path.join(HOME, '.local/share/piper/piper'),
    'piper'
  ];
  for (const c of candidates) {
    if (c === 'piper') return c;
    try { if (fs.existsSync(c)) return c; } catch { /* ignore */ }
  }
  return 'piper';
}

export function defaultModelPath() {
  if (process.env.PIPER_MODEL) return process.env.PIPER_MODEL;
  try {
    const cfgPath = path.join(HOME, '.local/share/piper/config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg.model && fs.existsSync(cfg.model)) return cfg.model;
    }
  } catch { /* ignore */ }
  const voices = path.join(HOME, '.local/share/piper/voices');
  const preferred = [
    'fr_FR-tom-medium.onnx',
    'fr_FR-gilles-low.onnx',
    'fr_FR-upmc-medium.onnx'
  ];
  for (const name of preferred) {
    const p = path.join(voices, name);
    if (fs.existsSync(p)) return p;
  }
  try {
    const first = fs.readdirSync(voices).find((f) => f.endsWith('.onnx'));
    if (first) return path.join(voices, first);
  } catch { /* ignore */ }
  return path.join(voices, 'fr_FR-tom-medium.onnx');
}

export function defaultCacheDir() {
  return process.env.PIPER_CACHE_DIR
    || path.join(HOME, '.cache/velo-virtuel/tts');
}

function numbered(envName, cfgVal, fallback, lo, hi) {
  const fromEnv = Number(process.env[envName]);
  if (Number.isFinite(fromEnv) && fromEnv >= lo && fromEnv <= hi) return fromEnv;
  const fromCfg = Number(cfgVal);
  if (Number.isFinite(fromCfg) && fromCfg >= lo && fromCfg <= hi) return fromCfg;
  return fallback;
}

export function lengthScale(cfg = readPiperConfig()) {
  return numbered('PIPER_LENGTH_SCALE', cfg.length_scale, DEFAULT_LENGTH_SCALE, 0.5, 1.5);
}

export function noiseScale(cfg = readPiperConfig()) {
  return numbered('PIPER_NOISE_SCALE', cfg.noise_scale, DEFAULT_NOISE_SCALE, 0.2, 1.5);
}

export function noiseW(cfg = readPiperConfig()) {
  return numbered('PIPER_NOISE_W', cfg.noise_w, DEFAULT_NOISE_W, 0.2, 1.5);
}

export function piperSpeaker(cfg = readPiperConfig()) {
  if (process.env.PIPER_SPEAKER != null && process.env.PIPER_SPEAKER !== '') {
    const n = Number(process.env.PIPER_SPEAKER);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  if (cfg.speaker != null && cfg.speaker !== '') {
    const n = Number(cfg.speaker);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return null;
}

export function normalizeTtsText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function ttsCacheKey(text, modelPath, scale, noise = DEFAULT_NOISE_SCALE, width = DEFAULT_NOISE_W, speaker = null) {
  const sp = speaker == null ? '' : String(speaker);
  const raw = `${path.basename(modelPath || '')}|${scale}|${noise}|${width}|${sp}|${normalizeTtsText(text)}`;
  return crypto.createHash('sha1').update(raw).digest('hex');
}

export function parseTtsTextFromUrl(url) {
  return normalizeTtsText(url.searchParams.get('text') || url.searchParams.get('q') || '');
}

export function ttsEndpointUrl(hostname, text, { port = 8787 } = {}) {
  const host = hostname || '127.0.0.1';
  return `http://${host}:${port}/tts?text=${encodeURIComponent(normalizeTtsText(text))}`;
}

export function ttsStatusUrl(hostname, { port = 8787 } = {}) {
  const host = hostname || '127.0.0.1';
  return `http://${host}:${port}/tts/status`;
}

export function warmupLines(lines = LINES, { maxKm = 21 } = {}) {
  const out = [];
  const seen = new Set();
  const add = (s) => {
    const t = normalizeTtsText(s);
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  const order = [
    'startVillard', 'start', 'startNormandy', 'attack', 'last500Villard', 'last500',
    'finishVillard', 'finish', 'steep', 'struggle', 'zoneRed', 'intervalHard',
    'intervalRecovery', 'hrHigh', 'verney', 'lacets', 'villardVillage', 'km', 'kmRemaining'
  ];
  const names = [...order, ...Object.keys(lines).filter((k) => !order.includes(k))];
  for (const name of names) {
    const pool = lines[name] || [];
    for (const tmpl of pool) {
      if (/\{km\}|\{\s*remain\s*\}/.test(tmpl)) {
        if (/\{km\}/.test(tmpl)) {
          for (let km = 1; km <= maxKm; km++) add(formatLine(tmpl, { km, remain: Math.max(1, maxKm - km) }));
        } else {
          for (let remain = 1; remain <= 5; remain++) add(formatLine(tmpl, { km: remain, remain }));
        }
      } else {
        add(tmpl);
      }
    }
  }
  return out;
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

export function createTtsEngine(opts = {}) {
  const cfg = opts.config || readPiperConfig();
  const bin = opts.bin || defaultPiperBin();
  const model = opts.model || defaultModelPath();
  const scale = opts.lengthScale != null ? opts.lengthScale : lengthScale(cfg);
  const nScale = opts.noiseScale != null ? opts.noiseScale : noiseScale(cfg);
  const nW = opts.noiseW != null ? opts.noiseW : noiseW(cfg);
  const speaker = opts.speaker !== undefined ? opts.speaker : piperSpeaker(cfg);
  const cacheDir = opts.cacheDir || defaultCacheDir();
  const timeoutMs = opts.timeoutMs || SYNTH_TIMEOUT_MS;
  const spawnFn = opts.spawnFn || spawn;
  const now = opts.now || (() => Date.now());

  const memory = new Map(); // key -> Buffer
  const inflight = new Map(); // key -> Promise<Buffer>
  const queue = [];
  let busy = false;
  let available = null; // { ok, reason, voice } | null (lazy)
  let warmup = { started: false, done: 0, total: 0, running: false };

  const pump = () => {
    if (busy) return;
    const item = queue.shift();
    if (!item) return;
    busy = true;
    Promise.resolve()
      .then(item.fn)
      .then(item.resolve, item.reject)
      .finally(() => { busy = false; pump(); });
  };

  const enqueue = (fn, urgent = false) => new Promise((resolve, reject) => {
    const item = { fn, resolve, reject };
    if (urgent) queue.unshift(item);
    else queue.push(item);
    pump();
  });

  const voiceId = () => path.basename(model, '.onnx');

  const ensureCacheDir = () => {
    fs.mkdirSync(cacheDir, { recursive: true });
  };

  const diskPath = (key) => path.join(cacheDir, `${key}.wav`);

  const isReady = () => {
    if (available) return available;
    const modelOk = fs.existsSync(model);
    const binOk = bin === 'piper' || fs.existsSync(bin);
    if (!modelOk) {
      available = { ok: false, reason: `Piper model not found: ${model}`, voice: voiceId(), bin, model };
    } else if (!binOk) {
      available = { ok: false, reason: `Piper binary not found: ${bin}`, voice: voiceId(), bin, model };
    } else {
      available = { ok: true, reason: 'ok', voice: voiceId(), bin, model, lengthScale: scale, noiseScale: nScale, noiseW: nW, speaker };
    }
    return available;
  };

  const status = () => {
    const st = isReady();
    return {
      ok: st.ok,
      engine: 'piper',
      voice: st.voice,
      lengthScale: scale,
      noiseScale: nScale,
      noiseW: nW,
      speaker,
      reason: st.reason,
      cached: memory.size,
      warmup
    };
  };

  const readDisk = (key) => {
    const p = diskPath(key);
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p);
    } catch { /* ignore */ }
    return null;
  };

  const writeDisk = (key, buf) => {
    try {
      ensureCacheDir();
      const tmp = diskPath(key) + '.tmp';
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, diskPath(key));
    } catch (err) {
      console.warn('[tts] cache write failed', err.message || err);
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const waitForWav = async (file, timeout) => {
    const t0 = Date.now();
    let last = -1, stable = 0;
    while (Date.now() - t0 < timeout) {
      try {
        if (fs.existsSync(file)) {
          const s = fs.statSync(file).size;
          if (s > 44 && s === last) {
            stable += 1;
            if (stable >= 3) return fs.readFileSync(file);
          } else {
            stable = 0;
            last = s;
          }
        }
      } catch { /* ignore transient stat */ }
      await sleep(20);
    }
    const err = new Error(`piper timed out after ${timeout} ms`);
    throw err;
  };

  let worker = null;
  let workerStderr = '';
  let persistentOk = opts.persistent !== false;

  const stopWorker = () => {
    if (!worker) return;
    const child = worker;
    worker = null;
    try { child.stdin.end(); } catch { /* ignore */ }
    try { child.kill('SIGKILL'); } catch { /* ignore */ }
  };

  const piperArgs = (extra) => {
    const args = [
      '--model', model,
      '--length_scale', String(scale),
      '--noise_scale', String(nScale),
      '--noise_w', String(nW)
    ];
    if (speaker != null) args.push('--speaker', String(speaker));
    args.push(...extra);
    return args;
  };

  const startWorker = () => {
    const child = spawnFn(bin, piperArgs(['--json-input', '--quiet']), { stdio: ['pipe', 'pipe', 'pipe'] });
    workerStderr = '';
    if (child.stderr && child.stderr.on) {
      child.stderr.on('data', (d) => { workerStderr += d.toString(); if (workerStderr.length > 4000) workerStderr = workerStderr.slice(-2000); });
    }
    const die = () => { if (worker === child) worker = null; };
    if (child.on) {
      child.on('error', die);
      child.on('close', die);
      child.on('exit', die);
    }
    worker = child;
    return child;
  };

  const runPiperPersistent = async (text, outFile) => {
    if (!worker) startWorker();
    const child = worker;
    if (!child || !child.stdin) throw new Error('piper worker has no stdin');
    try { fs.unlinkSync(outFile); } catch { /* ignore */ }
    const payload = JSON.stringify({ text, output_file: outFile }) + '\n';
    child.stdin.write(payload);
    return waitForWav(outFile, timeoutMs);
  };

  const runPiperOnce = (text, outFile) => new Promise((resolve, reject) => {
    const args = piperArgs(['--output_file', outFile]);
    const child = spawnFn(bin, args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stderr = '';
    let settled = false;
    const t = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
      reject(new Error(`piper timed out after ${timeoutMs} ms`));
    }, timeoutMs);
    if (child.stderr) child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      reject(err);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      if (code === 0 && fs.existsSync(outFile) && fs.statSync(outFile).size > 44) {
        resolve(fs.readFileSync(outFile));
      } else {
        reject(new Error(`piper exited ${code}: ${stderr.trim() || 'no wav produced'}`));
      }
    });
    try {
      child.stdin.write(text);
      child.stdin.end();
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(t);
        reject(err);
      }
    }
  });

  const runPiper = async (text, outFile) => {
    if (persistentOk) {
      try {
        return await runPiperPersistent(text, outFile);
      } catch (err) {
        console.warn('[tts] persistent piper failed, falling back to one-shot:', err.message || err);
        stopWorker();
        persistentOk = false;
      }
    }
    return runPiperOnce(text, outFile);
  };

  const synthesize = async (rawText, synthOpts = {}) => {
    const text = normalizeTtsText(rawText);
    if (!text) {
      const err = new Error('missing text');
      err.statusCode = 400;
      throw err;
    }
    if (text.length > MAX_TEXT_CHARS) {
      const err = new Error(`text too long (${text.length} > ${MAX_TEXT_CHARS})`);
      err.statusCode = 400;
      throw err;
    }
    const st = isReady();
    if (!st.ok) {
      const err = new Error(st.reason);
      err.statusCode = 503;
      throw err;
    }
    const key = ttsCacheKey(text, model, scale, nScale, nW, speaker);
    if (memory.has(key)) return memory.get(key);
    const disk = readDisk(key);
    if (disk) {
      memory.set(key, disk);
      return disk;
    }
    if (inflight.has(key)) return inflight.get(key);

    const job = enqueue(async () => {
      // Re-check cache: a warmup job may have finished while we waited.
      if (memory.has(key)) return memory.get(key);
      const again = readDisk(key);
      if (again) { memory.set(key, again); return again; }
      ensureCacheDir();
      const tmp = path.join(cacheDir, `${key}.${now()}.work.wav`);
      try {
        const buf = await runPiper(text, tmp);
        memory.set(key, buf);
        writeDisk(key, buf);
        return buf;
      } finally {
        try { fs.unlinkSync(tmp); } catch { /* ignore */ }
      }
    }, !synthOpts.warmup);
    const wrapped = job.finally(() => inflight.delete(key));
    inflight.set(key, wrapped);
    return wrapped;
  };

  const startWarmup = (texts) => {
    if (warmup.started) return warmup;
    const st = isReady();
    if (!st.ok) {
      console.warn('[tts] warmup skipped:', st.reason);
      return warmup;
    }
    const list = texts || warmupLines(LINES, { maxKm: 11 });
    warmup = { started: true, done: 0, total: list.length, running: true };
    const tick = async () => {
      for (const line of list) {
        try { await synthesize(line, { warmup: true }); }
        catch (err) { console.warn('[tts] warmup failed:', line.slice(0, 60), err.message || err); }
        warmup.done += 1;
      }
      warmup.running = false;
      console.log(`[tts] warmup done ${warmup.done}/${warmup.total} (${voiceId()}, length_scale=${scale}, noise_scale=${nScale}, noise_w=${nW})`);
    };
    setTimeout(() => tick().catch((err) => {
      warmup.running = false;
      console.warn('[tts] warmup aborted', err.message || err);
    }), 0);
    return warmup;
  };

  return { synthesize, status, startWarmup, isReady, cacheKey: (text) => ttsCacheKey(text, model, scale) };
}

export async function readRequestText(req, url) {
  if (req.method === 'GET' || req.method === 'HEAD') return parseTtsTextFromUrl(url);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString('utf8').trim();
  if (!body) return parseTtsTextFromUrl(url);
  const ctype = String(req.headers['content-type'] || '');
  if (ctype.includes('application/json')) {
    try {
      const j = JSON.parse(body);
      return normalizeTtsText(j.text || j.q || '');
    } catch {
      const err = new Error('invalid JSON body');
      err.statusCode = 400;
      throw err;
    }
  }
  return normalizeTtsText(body);
}

let defaultEngine = null;
export function getTtsEngine() {
  if (!defaultEngine) defaultEngine = createTtsEngine();
  return defaultEngine;
}

export async function handleTtsRequest(req, res, url, engine) {
  const tts = engine || getTtsEngine();
  const headers = corsHeaders();
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  if (url.pathname === '/tts/status' || url.pathname === '/tts/health') {
    const body = JSON.stringify(tts.status());
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(body);
    return;
  }
  if (url.pathname !== '/tts') {
    res.writeHead(404, { ...headers, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.writeHead(405, { ...headers, 'Allow': 'GET, POST, OPTIONS' });
    res.end();
    return;
  }
  try {
    const text = await readRequestText(req, url);
    const wav = await tts.synthesize(text);
    res.writeHead(200, {
      ...headers,
      'Content-Type': 'audio/wav',
      'Content-Length': wav.length,
      'Cache-Control': 'public, max-age=86400',
      'X-Tts-Engine': 'piper',
      'X-Tts-Voice': tts.status().voice || ''
    });
    res.end(wav);
  } catch (err) {
    const code = err.statusCode || 500;
    res.writeHead(code, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: err.message || String(err) }));
  }
}
