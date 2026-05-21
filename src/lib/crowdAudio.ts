// Procedural crowd noise via WebAudio — zero assets, looped pink-ish noise
// with low-pass filtering. Intensity 0..1 modulates volume. Bursts on goals.

let ctx: AudioContext | null = null;
let noiseSource: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let enabled = false;
let targetGain = 0;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function buildNoiseBuffer(c: AudioContext, seconds = 2) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const data = buf.getChannelData(0);
  // Pink-ish noise (Voss-McCartney approx)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buf;
}

export function startCrowd() {
  if (enabled) return;
  const c = ensureContext();
  if (!c) return;
  if (c.state === "suspended") c.resume();

  const buf = buildNoiseBuffer(c);
  noiseSource = c.createBufferSource();
  noiseSource.buffer = buf;
  noiseSource.loop = true;

  filterNode = c.createBiquadFilter();
  filterNode.type = "lowpass";
  filterNode.frequency.value = 900;
  filterNode.Q.value = 0.7;

  gainNode = c.createGain();
  gainNode.gain.value = 0;

  noiseSource.connect(filterNode).connect(gainNode).connect(c.destination);
  noiseSource.start();
  enabled = true;
  setIntensity(0.25);
}

export function stopCrowd() {
  if (!enabled) return;
  try { noiseSource?.stop(); } catch { /* already stopped */ }
  noiseSource?.disconnect();
  filterNode?.disconnect();
  gainNode?.disconnect();
  noiseSource = null; filterNode = null; gainNode = null;
  enabled = false;
  targetGain = 0;
}

export function setIntensity(level: number) {
  targetGain = Math.max(0, Math.min(1, level)) * 0.35;
  if (!gainNode || !ctx) return;
  gainNode.gain.cancelScheduledValues(ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.5);
}

export function goalBurst() {
  if (!gainNode || !filterNode || !ctx) return;
  const now = ctx.currentTime;
  // Roar: filter opens, gain spikes, then returns
  filterNode.frequency.cancelScheduledValues(now);
  filterNode.frequency.setValueAtTime(900, now);
  filterNode.frequency.linearRampToValueAtTime(2400, now + 0.15);
  filterNode.frequency.linearRampToValueAtTime(900, now + 2.5);

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.linearRampToValueAtTime(0.6, now + 0.12);
  gainNode.gain.linearRampToValueAtTime(targetGain, now + 2.6);
}

export function whistle() {
  const c = ensureContext();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.value = 2400;
  g.gain.value = 0;
  osc.connect(g).connect(c.destination);
  const t = c.currentTime;
  g.gain.linearRampToValueAtTime(0.18, t + 0.02);
  g.gain.linearRampToValueAtTime(0, t + 0.45);
  osc.start(t);
  osc.stop(t + 0.5);
}
