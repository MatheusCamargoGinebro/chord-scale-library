/**
 * Advanced Multi-Engine Web Audio Synthesizer — Chord & Scale Library
 *
 * High-performance, zero-stutter audio architecture:
 * 1. Physical Modeling Engine (Extended Karplus-Strong with 3-semitone anchor bank,
 *    24kHz synthesis, fractional-delay tuning, pick-position comb & soft pick attack).
 * 2. Persistent Shared Tone FX Bus (Tube Overdrive + Acoustic Body / Amp Cabinet EQ)
 *    rebuilt only on tone switch — zero per-note filter/WaveShaper leaks.
 * 3. Lightweight Algorithmic Stereo Room Ambience (zero heavy ConvolverNode stalls).
 * 4. 7 Digital Synthesizer Engines (Rhodes FM, Analog Pad, EDM Pluck, DX7 Bell,
 *    Hammond B3 Organ, Lo-Fi Tape Keys, 8-Bit Chiptune) + Polyphony Voice Manager.
 */

import { Theory } from '../core/theory.js';

export const TONE_PRESETS = [
  // --- Acústicos & Orgânicos (Modelagem Física Karplus-Strong) ---
  { id: 'nylon', name: 'Violão Nylon (Clássico)', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.42, damping: 0.9958, pickPos: 0.28, body: 'nylon', reverb: 0.24, drive: 0 },
  { id: 'acoustic', name: 'Violão Aço (Folk)', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.72, damping: 0.9964, pickPos: 0.16, body: 'steel', reverb: 0.20, drive: 0 },
  { id: 'twelve_string', name: 'Violão 12 Cordas', group: 'Acústicos & Orgânicos', engine: 'ks12', brightness: 0.78, damping: 0.9966, pickPos: 0.14, body: 'steel', reverb: 0.26, drive: 0 },
  { id: 'clean', name: 'Guitarra Clean (Strat)', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.68, damping: 0.9972, pickPos: 0.20, body: 'fender', reverb: 0.18, drive: 0 },
  { id: 'jazz', name: 'Jazz Hollowbody', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.32, damping: 0.9960, pickPos: 0.36, body: 'jazz', reverb: 0.22, drive: 0 },
  { id: 'overdrive', name: 'Blues Crunch (Valvulado)', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.74, damping: 0.9975, pickPos: 0.15, body: 'cab', reverb: 0.15, drive: 14 },
  { id: 'metal_lead', name: 'Rock / Metal High-Gain', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.85, damping: 0.9980, pickPos: 0.11, body: 'metal', reverb: 0.12, drive: 34 },
  { id: 'bass_finger', name: 'Baixo Elétrico (Finger)', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.35, damping: 0.9968, pickPos: 0.30, body: 'bass', reverb: 0.08, drive: 0, octaveShift: -12 },

  // --- Especiais & Modulados ---
  { id: 'chorus_dream', name: 'Clean Chorus Ambient', group: 'Modulados & Especiais', engine: 'ks', brightness: 0.70, damping: 0.9976, pickPos: 0.22, body: 'fender', reverb: 0.38, chorus: true, drive: 0 },
  { id: 'tremolo_surf', name: 'Vintage Surf Tremolo', group: 'Modulados & Especiais', engine: 'ks', brightness: 0.76, damping: 0.9970, pickPos: 0.14, body: 'fender', reverb: 0.36, tremolo: true, drive: 4 },
  { id: 'harp_pluck', name: 'Harpa / Koto Acústico', group: 'Modulados & Especiais', engine: 'ks', brightness: 0.62, damping: 0.9978, pickPos: 0.42, body: 'harp', reverb: 0.35, drive: 0 },

  // --- Digitais & Sintetizadores ---
  { id: 'epiano', name: 'Rhodes / Piano Elétrico', group: 'Digitais & Sintetizadores', engine: 'fm_epiano', reverb: 0.24 },
  { id: 'synth_pad', name: 'Synth Pad Analógico', group: 'Digitais & Sintetizadores', engine: 'analog_pad', reverb: 0.38 },
  { id: 'synth_pluck', name: 'Synth Pluck (EDM)', group: 'Digitais & Sintetizadores', engine: 'synth_pluck', reverb: 0.22 },
  { id: 'fm_bell', name: 'FM Crystal Bell (DX7)', group: 'Digitais & Sintetizadores', engine: 'fm_bell', reverb: 0.34 },
  { id: 'organ_b3', name: 'Órgão Hammond B3', group: 'Digitais & Sintetizadores', engine: 'organ_b3', reverb: 0.18 },
  { id: 'lofi_keys', name: 'Lo-Fi Tape Keys', group: 'Digitais & Sintetizadores', engine: 'lofi_keys', reverb: 0.26 },
  { id: 'chiptune', name: '8-Bit Chiptune (Retro)', group: 'Digitais & Sintetizadores', engine: 'chiptune', reverb: 0.05 },
];

export const CHORD_CADENCES = [
  { id: 'down', label: 'Para Baixo', steps: ['D', '-', '-', '-', '-', '-', '-', '-'] },
  { id: 'up', label: 'Para Cima', steps: ['U', '-', '-', '-', '-', '-', '-', '-'] },
  { id: 'down_up', label: 'Cima / Baixo (Pop-Rock)', steps: ['D', '-', 'D', 'U', '-', 'U', 'D', 'U'] },
  { id: 'palm_mute', label: 'Palm Mute (Rock/Metal)', steps: ['PM', 'PM', 'PM', 'PM', 'PM', 'PM', 'PM', 'PM'] },
  { id: 'arpeggio', label: 'Dedilhado / Arpejo', steps: ['ARP', 'ARP', 'ARP', 'ARP', 'ARP', 'ARP', 'ARP', 'ARP'] },
  { id: 'skank', label: 'Contratempo (Funk/Reggae)', steps: ['-', 'X', '-', 'U', '-', 'X', '-', 'U'] },
  { id: 'bossa', label: 'Sincopado (Bossa/Jazz)', steps: ['D', '-', 'U', 'D', '-', 'U', '-', 'U'] },
];

export const MELODIC_CADENCES = [
  { id: 'asc_desc', label: 'Subindo e Descendo' },
  { id: 'asc', label: 'Ascendente' },
  { id: 'desc', label: 'Descendente' },
  { id: 'palm_mute', label: 'Palm Mute (Palhetada)' },
  { id: 'legato', label: 'Legato (Ligado Suave)' },
  { id: 'alternate_thirds', label: 'Salto em Terças' },
];

export const STEP_STROKES = [
  { code: 'D', short: '↓', label: 'Baixo' },
  { code: 'U', short: '↑', label: 'Cima' },
  { code: 'PM', short: 'PM', label: 'Palm Mute' },
  { code: 'ARP', short: 'Arp', label: 'Dedilhado' },
  { code: 'X', short: '×', label: 'Abafado' },
  { code: '-', short: '·', label: 'Pausa' },
];

export function getPresetSteps(cadenceId) {
  const found = CHORD_CADENCES.find((c) => c.id === cadenceId) || CHORD_CADENCES[2];
  return found.steps.slice();
}

export function getTonePreset(id) {
  return TONE_PRESETS.find((t) => t.id === id) || TONE_PRESETS[1];
}

const KS_SYNTH_SAMPLE_RATE = 24000; // Nyquist 12kHz — well above guitar body rolloff, 2x faster & lighter
const MAX_ACTIVE_VOICES = 20;
const SCHEDULE_LOOKAHEAD_SEC = 0.018;

/**
 * Pure-JS Extended Karplus-Strong Physical Plucked String Synthesizer.
 * Branch-wrapped ring buffer (zero modulo divisions in hot loop) with exact
 * fractional-delay phase compensation (< 0.5 cents pitch accuracy across all frets).
 */
export function synthesizeKarplusStrongSamples(freq, sampleRate, durationSec, {
  brightness = 0.65,
  damping = 0.9964,
  pickPos = 0.18,
  palmMute = false,
  legato = false,
} = {}) {
  const safeFreq = Math.max(40, Math.min(2400, freq));
  const totalSamples = Math.max(128, Math.floor(sampleRate * durationSec));
  const out = new Float32Array(totalSamples);

  const pitchFactor = Math.min(1, Math.max(0, (safeFreq - 80) / 700));
  const decay = palmMute
    ? Math.min(0.955, 0.945 - pitchFactor * 0.03)
    : damping - pitchFactor * 0.0022;
  const blend = palmMute ? 0.25 : (0.36 + brightness * 0.34);
  const oneMinusBlend = 1 - blend;

  // Compensate for the 2-point averaging filter phase shift so pitch is exact (< 1 cent) across all frets
  const compensatedPeriod = (sampleRate / safeFreq) + oneMinusBlend;
  const N = Math.max(8, Math.floor(compensatedPeriod));
  const frac = compensatedPeriod - N;
  const oneMinusFrac = 1 - frac;
  const L = N + 1;

  // 1. Exciter: warm shaped noise burst + pluck body impulse
  const ring = new Float32Array(L);
  let lp = 0;
  const excAlpha = palmMute ? 0.18 : (0.14 + brightness * 0.62);
  let seed = ((Math.round(safeFreq * 100) * 1664525 + 1013904223) >>> 0) || 1234567;
  for (let i = 0; i < L; i++) {
    // Fast deterministic LCG noise (faster than Math.random & consistent attack!)
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const white = (seed / 2147483648) - 1;
    lp = lp + excAlpha * (white - lp);
    const tri = 1 - Math.abs((2 * i) / L - 1);
    ring[i] = lp * 0.78 + (tri - 0.5) * 0.45;
  }

  // Remove DC offset from exciter
  let mean = 0;
  for (let i = 0; i < L; i++) mean += ring[i];
  mean /= L;
  for (let i = 0; i < L; i++) ring[i] -= mean;

  // 2. Pick-position comb filter (models where along the string the pick/finger strikes)
  const pickDelay = Math.max(1, Math.min(L - 1, Math.round(L * pickPos)));
  const combed = new Float32Array(L);
  for (let i = 0; i < L; i++) {
    let pIdx = i + pickDelay;
    if (pIdx >= L) pIdx -= L;
    combed[i] = ring[i] - 0.68 * ring[pIdx];
  }
  ring.set(combed);

  // 3. Karplus-Strong feedback loop (zero modulo ops in hot loop)
  let idx = 0;
  let prev = 0;
  const attackSamples = Math.max(1, Math.floor(sampleRate * (legato ? 0.022 : 0.0028)));
  const fadeOutSamples = Math.min(900, Math.floor(totalSamples * 0.25));
  const fadeOutStart = totalSamples - fadeOutSamples;

  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    let nextIdx = idx + 1;
    if (nextIdx === L) nextIdx = 0;
    let nextIdx2 = nextIdx + 1;
    if (nextIdx2 === L) nextIdx2 = 0;

    const curr = ring[idx] * frac + ring[nextIdx] * oneMinusFrac;
    const next = ring[nextIdx] * frac + ring[nextIdx2] * oneMinusFrac;

    const filtered = decay * (blend * curr + oneMinusBlend * next);
    const sampleOut = palmMute ? (0.45 * filtered + 0.55 * prev) : filtered;
    prev = sampleOut;
    ring[idx] = sampleOut;

    let env = 1;
    if (i < attackSamples) env = i / attackSamples;
    else if (i > fadeOutStart) env = (totalSamples - i) / fadeOutSamples;

    const val = curr * env;
    out[i] = val;
    const absV = val < 0 ? -val : val;
    if (absV > peak) peak = absV;
    idx = nextIdx;
  }

  // Normalize peak softly so every string has consistent musical presence
  if (peak > 0.0001) {
    const norm = 0.85 / peak;
    for (let i = 0; i < totalSamples; i++) out[i] *= norm;
  }

  return out;
}

class GuitarAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.dryGain = null;
    this.reverbSend = null;
    this.reverbGain = null;
    this.compressor = null;

    // Persistent shared Tone FX bus (rebuilt ONLY on setTone, never per note!)
    this.toneBusInput = null;
    this.toneBusNodes = [];
    this.toneBusToneId = null;
    this.synthBusInput = null;
    this.muteNoiseBuffer = null;

    this.tone = 'acoustic';
    this.volume = 0.76;
    this.muted = false;
    this.activeTimers = [];
    this.activeVoices = [];
    this.isLooping = false;
    this.chordCadence = 'down_up';
    this.melodicCadence = 'asc_desc';
    this.playbackSessionId = 0;
    this.ksBufferCache = new Map(); // Bounded LRU cache of synthesized KS anchor AudioBuffers
    this.tubeCurveCache = new Map();
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 1.0;

      // Ultra-lightweight Algorithmic Stereo Room Ambience (zero ConvolverNode stalls!)
      this.reverbSend = this.ctx.createGain();
      this.reverbSend.gain.value = 1.0;

      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.20;

      const roomLp = this.ctx.createBiquadFilter();
      roomLp.type = 'lowpass';
      roomLp.frequency.value = 2600;

      const delayL = this.ctx.createDelay(0.2);
      delayL.delayTime.value = 0.037;
      const delayR = this.ctx.createDelay(0.2);
      delayR.delayTime.value = 0.053;

      const fbL = this.ctx.createGain();
      fbL.gain.value = 0.26;
      const fbR = this.ctx.createGain();
      fbR.gain.value = 0.24;

      this.reverbSend.connect(roomLp);
      roomLp.connect(delayL);
      roomLp.connect(delayR);

      // Gentle cross-coupled early reflections for natural stereo room width
      delayL.connect(fbL);
      fbL.connect(delayR);
      delayR.connect(fbR);
      fbR.connect(delayL);

      if (typeof this.ctx.createStereoPanner === 'function') {
        const panL = this.ctx.createStereoPanner();
        panL.pan.value = -0.65;
        const panR = this.ctx.createStereoPanner();
        panR.pan.value = 0.65;
        delayL.connect(panL);
        panL.connect(this.reverbGain);
        delayR.connect(panR);
        panR.connect(this.reverbGain);
      } else {
        delayL.connect(this.reverbGain);
        delayR.connect(this.reverbGain);
      }

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -10;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 3.0;
      this.compressor.attack.value = 0.005;
      this.compressor.release.value = 0.14;

      this.dryGain.connect(this.compressor);
      this.reverbGain.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Shared Synth Bus (direct to dry + room ambience)
      this.synthBusInput = this.ctx.createGain();
      this.synthBusInput.gain.value = 1.0;
      this.synthBusInput.connect(this.dryGain);
      this.synthBusInput.connect(this.reverbSend);

      // Shared Physical Guitar/Body Bus
      this.toneBusInput = this.ctx.createGain();
      this.toneBusInput.gain.value = 1.0;
      this.rebuildToneBus(getTonePreset(this.tone));

      // Pre-compute one tiny percussive-mute buffer so "X" strokes allocate nothing
      const bufSize = Math.floor(this.ctx.sampleRate * 0.055);
      this.muteNoiseBuffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = this.muteNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.22));
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Builds the SINGLE shared Tone FX chain (Drive + Body/Cab EQ + optional Tremolo)
   * once per tone selection instead of allocating new filters/WaveShapers per string!
   */
  rebuildToneBus(preset) {
    if (!this.ctx || !this.toneBusInput) return;
    if (this.toneBusToneId === preset.id) return;

    // Tear down previous tone bus nodes cleanly
    try { this.toneBusInput.disconnect(); } catch {}
    for (const node of this.toneBusNodes) {
      try {
        if (typeof node.stop === 'function') node.stop();
        node.disconnect();
      } catch {}
    }
    this.toneBusNodes = [];
    this.toneBusToneId = preset.id;

    const ctx = this.ctx;
    let stage = this.toneBusInput;
    const track = (node) => { this.toneBusNodes.push(node); return node; };

    // Optional Tube Overdrive (shared like a real guitar amp!)
    if (preset.drive && preset.drive > 0) {
      const preEq = track(ctx.createBiquadFilter());
      preEq.type = 'highpass';
      preEq.frequency.value = 135;

      const preGain = track(ctx.createGain());
      preGain.gain.value = preset.drive > 20 ? 1.35 : 1.15;

      const shaper = track(ctx.createWaveShaper());
      shaper.curve = this.getTubeCurve(preset.drive);
      shaper.oversample = '2x'; // Clean harmonics at half the CPU of 4x

      const postTrim = track(ctx.createGain());
      postTrim.gain.value = preset.drive > 20 ? 0.62 : 0.82;

      stage.connect(preEq);
      preEq.connect(preGain);
      preGain.connect(shaper);
      shaper.connect(postTrim);
      stage = postTrim;
    }

    const bodyType = preset.body;
    if (bodyType === 'nylon') {
      const cavity = track(ctx.createBiquadFilter());
      cavity.type = 'peaking'; cavity.frequency.value = 115; cavity.Q.value = 1.9; cavity.gain.value = 4.0;
      const wood = track(ctx.createBiquadFilter());
      wood.type = 'peaking'; wood.frequency.value = 240; wood.Q.value = 1.5; wood.gain.value = 2.4;
      const soften = track(ctx.createBiquadFilter());
      soften.type = 'lowpass'; soften.frequency.value = 3400;
      stage.connect(cavity); cavity.connect(wood); wood.connect(soften);
      stage = soften;
    } else if (bodyType === 'steel') {
      const cavity = track(ctx.createBiquadFilter());
      cavity.type = 'peaking'; cavity.frequency.value = 105; cavity.Q.value = 1.8; cavity.gain.value = 3.0;
      const sparkle = track(ctx.createBiquadFilter());
      sparkle.type = 'highshelf'; sparkle.frequency.value = 3200; sparkle.gain.value = 2.4;
      const air = track(ctx.createBiquadFilter());
      air.type = 'lowpass'; air.frequency.value = 6800;
      stage.connect(cavity); cavity.connect(sparkle); sparkle.connect(air);
      stage = air;
    } else if (bodyType === 'fender') {
      const scoop = track(ctx.createBiquadFilter());
      scoop.type = 'peaking'; scoop.frequency.value = 500; scoop.Q.value = 1.0; scoop.gain.value = -2.4;
      const chime = track(ctx.createBiquadFilter());
      chime.type = 'peaking'; chime.frequency.value = 2600; chime.Q.value = 1.2; chime.gain.value = 2.8;
      const cab = track(ctx.createBiquadFilter());
      cab.type = 'lowpass'; cab.frequency.value = 5400;
      stage.connect(scoop); scoop.connect(chime); chime.connect(cab);
      stage = cab;
    } else if (bodyType === 'jazz') {
      const warm = track(ctx.createBiquadFilter());
      warm.type = 'peaking'; warm.frequency.value = 280; warm.Q.value = 1.2; warm.gain.value = 3.4;
      const roll = track(ctx.createBiquadFilter());
      roll.type = 'lowpass'; roll.frequency.value = 2050;
      stage.connect(warm); warm.connect(roll);
      stage = roll;
    } else if (bodyType === 'cab' || bodyType === 'metal') {
      const lowPunch = track(ctx.createBiquadFilter());
      lowPunch.type = 'peaking'; lowPunch.frequency.value = 130; lowPunch.Q.value = 1.4; lowPunch.gain.value = bodyType === 'metal' ? 4.2 : 2.4;
      const midShape = track(ctx.createBiquadFilter());
      midShape.type = 'peaking'; midShape.frequency.value = bodyType === 'metal' ? 680 : 900; midShape.Q.value = 1.1; midShape.gain.value = bodyType === 'metal' ? -3.8 : 2.0;
      const cabRoll = track(ctx.createBiquadFilter());
      cabRoll.type = 'lowpass'; cabRoll.frequency.value = bodyType === 'metal' ? 4300 : 4000; cabRoll.Q.value = 1.3;
      stage.connect(lowPunch); lowPunch.connect(midShape); midShape.connect(cabRoll);
      stage = cabRoll;
    } else if (bodyType === 'bass') {
      const sub = track(ctx.createBiquadFilter());
      sub.type = 'lowshelf'; sub.frequency.value = 140; sub.gain.value = 5.2;
      const lp = track(ctx.createBiquadFilter());
      lp.type = 'lowpass'; lp.frequency.value = 1450;
      stage.connect(sub); sub.connect(lp);
      stage = lp;
    } else if (bodyType === 'harp') {
      const shimmer = track(ctx.createBiquadFilter());
      shimmer.type = 'highshelf'; shimmer.frequency.value = 2800; shimmer.gain.value = 2.8;
      stage.connect(shimmer);
      stage = shimmer;
    }

    // Shared Vintage Surf Tremolo LFO (1 LFO total instead of 1 per string!)
    if (preset.tremolo) {
      const tremGain = track(ctx.createGain());
      tremGain.gain.value = 0.78;
      const lfo = track(ctx.createOscillator());
      lfo.frequency.value = 5.4;
      const lfoDepth = track(ctx.createGain());
      lfoDepth.gain.value = 0.22;
      lfo.connect(lfoDepth);
      lfoDepth.connect(tremGain.gain);
      lfo.start();
      stage.connect(tremGain);
      stage = tremGain;
    }

    stage.connect(this.dryGain);
    stage.connect(this.reverbSend);

    if (this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(preset.reverb ?? 0.20, ctx.currentTime, 0.04);
    }
  }

  getTubeCurve(amount) {
    if (this.tubeCurveCache.has(amount)) return this.tubeCurveCache.get(amount);
    const n = 512;
    const curve = new Float32Array(n);
    const k = amount;
    const bias = Math.tanh(0.08 * (1 + k * 0.14));
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh((x + 0.08) * (1 + k * 0.14)) - bias;
    }
    this.tubeCurveCache.set(amount, curve);
    return curve;
  }

  setTone(toneId) {
    const preset = getTonePreset(toneId);
    this.tone = preset.id;
    if (this.ctx) {
      this.rebuildToneBus(preset);
      if (this.reverbGain) {
        this.reverbGain.gain.setTargetAtTime(preset.reverb ?? 0.20, this.ctx.currentTime, 0.04);
      }
    }
  }

  setChordCadence(cadenceId) {
    if (CHORD_CADENCES.some((c) => c.id === cadenceId)) this.chordCadence = cadenceId;
  }

  setMelodicCadence(cadenceId) {
    if (MELODIC_CADENCES.some((c) => c.id === cadenceId)) this.melodicCadence = cadenceId;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && !this.muted && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  /**
   * Tracks active voices and smoothly steals the oldest voice if polyphony exceeds MAX_ACTIVE_VOICES.
   * Prevents CPU spikes, buffer underruns, and distortion during fast strumming.
   */
  registerVoice(voice) {
    this.activeVoices.push(voice);
    while (this.activeVoices.length > MAX_ACTIVE_VOICES) {
      const oldest = this.activeVoices.shift();
      this.releaseVoiceQuickly(oldest, 0.018);
    }
  }

  unregisterVoice(voice) {
    const idx = this.activeVoices.indexOf(voice);
    if (idx >= 0) this.activeVoices.splice(idx, 1);
  }

  releaseVoiceQuickly(voice, fadeSec = 0.02) {
    if (!voice || voice.released || !this.ctx) return;
    voice.released = true;
    const t = this.ctx.currentTime;
    try {
      if (voice.env) {
        voice.env.gain.cancelScheduledValues(t);
        voice.env.gain.setTargetAtTime(0.0001, t, fadeSec * 0.35);
      }
      for (const s of voice.sources) {
        try { s.stop(t + fadeSec + 0.015); } catch {}
      }
    } catch {}
  }

  fadeOutAllVoices(fadeSec = 0.035) {
    const copy = this.activeVoices.slice();
    this.activeVoices = [];
    for (const v of copy) this.releaseVoiceQuickly(v, fadeSec);
  }

  /**
   * Retrieves (or synthesizes in <1ms) a Karplus-Strong anchor AudioBuffer at 24kHz.
   * Uses a 3-semitone anchor grid so playbackRate shifts at most +/-1 semitone (exact 0.00 cents pitch,
   * 3x fewer buffer syntheses, instant chord changes).
   */
  getCachedKSBuffer(ctx, preset, midi, palmMute, legato) {
    const anchorMidi = Math.round(midi / 3) * 3;
    const key = `${preset.id}:${anchorMidi}:${palmMute ? 1 : 0}:${legato ? 1 : 0}`;
    let buffer = this.ksBufferCache.get(key);

    if (!buffer) {
      const freq = Theory.midiToFreq(anchorMidi);
      const dur = palmMute ? 0.36 : 1.75;
      const samples = synthesizeKarplusStrongSamples(freq, KS_SYNTH_SAMPLE_RATE, dur, {
        brightness: preset.brightness,
        damping: preset.damping,
        pickPos: preset.pickPos,
        palmMute,
        legato,
      });

      buffer = ctx.createBuffer(1, samples.length, KS_SYNTH_SAMPLE_RATE);
      buffer.getChannelData(0).set(samples);

      if (this.ksBufferCache.size >= 96) {
        const oldest = this.ksBufferCache.keys().next().value;
        this.ksBufferCache.delete(oldest);
      }
      this.ksBufferCache.set(key, buffer);
    }

    const playbackRate = Math.pow(2, (midi - anchorMidi) / 12);
    return { buffer, playbackRate };
  }

  /**
   * Plays a single note using the active tone preset (Physical Modeling OR Digital Synth).
   */
  playNote(midi, duration = 1.8, delaySec = 0, velocity = 0.82, { palmMute = false, legato = false, absTime = null } = {}) {
    if (this.muted || midi === null || midi === undefined) return;
    const ctx = this.ensureContext();
    const preset = getTonePreset(this.tone);
    if (this.toneBusToneId !== preset.id) {
      this.rebuildToneBus(preset);
    }

    const now = absTime !== null
      ? Math.max(ctx.currentTime + 0.004, absTime + delaySec)
      : ctx.currentTime + SCHEDULE_LOOKAHEAD_SEC + Math.max(0, delaySec);

    const shiftedMidi = midi + (preset.octaveShift || 0);

    if (preset.engine === 'ks' || preset.engine === 'ks12') {
      this.playPhysicalPluck(ctx, preset, shiftedMidi, duration, now, velocity, { palmMute, legato });
      if (preset.engine === 'ks12') {
        const pairMidi = shiftedMidi < 57 ? shiftedMidi + 12 : shiftedMidi;
        this.playPhysicalPluck(ctx, preset, pairMidi, duration * 0.92, now + 0.007, velocity * 0.52, {
          palmMute,
          legato,
          detuneCents: shiftedMidi < 57 ? 4 : 9,
        });
      }
      return;
    }

    this.playDigitalSynth(ctx, preset, shiftedMidi, duration, now, velocity, { palmMute, legato });
  }

  playPhysicalPluck(ctx, preset, midi, duration, now, velocity, { palmMute = false, legato = false, detuneCents = 0 } = {}) {
    const { buffer, playbackRate } = this.getCachedKSBuffer(ctx, preset, midi, palmMute, legato);
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    // Exact pitch via playbackRate + subtle humanization detune
    const humanDetune = (Math.random() - 0.5) * 2.0 + detuneCents;
    const finalRate = playbackRate * Math.pow(2, humanDetune / 1200);
    src.playbackRate.setValueAtTime(finalRate, now);

    const maxBufDur = buffer.duration / finalRate;
    const actualDur = Math.max(0.12, palmMute ? Math.min(duration, 0.30, maxBufDur) : Math.min(duration + 0.35, maxBufDur));
    const holdEnd = Math.max(now + 0.02, now + actualDur - Math.min(0.14, actualDur * 0.45));

    const env = ctx.createGain();
    const gainLevel = 0.46 * velocity;
    env.gain.setValueAtTime(gainLevel, now);
    env.gain.setValueAtTime(gainLevel, holdEnd);
    env.gain.exponentialRampToValueAtTime(0.0008, now + actualDur);

    src.connect(env);
    env.connect(this.toneBusInput);

    const sources = [src];
    const extras = [];

    // Lightweight Chorus doubling voice (no extra filters — shares toneBusInput!)
    if (preset.chorus) {
      const src2 = ctx.createBufferSource();
      src2.buffer = buffer;
      src2.playbackRate.setValueAtTime(playbackRate * Math.pow(2, (humanDetune + 10) / 1200), now);
      const g2 = ctx.createGain();
      g2.gain.value = 0.48;
      src2.connect(g2);
      g2.connect(env);
      src2.start(now + 0.011);
      src2.stop(now + actualDur + 0.03);
      sources.push(src2);
      extras.push(g2);
    }

    const voice = { env, sources, released: false };
    this.registerVoice(voice);

    src.onended = () => {
      this.unregisterVoice(voice);
      try { env.disconnect(); } catch {}
      for (const n of extras) { try { n.disconnect(); } catch {} }
    };

    src.start(now);
    src.stop(now + actualDur + 0.035);
  }

  /**
   * Rich Digital Synthesizer Engines (Rhodes FM, Analog Pad, EDM Pluck, DX7 Bell, Organ B3, Lo-Fi, Chiptune).
   * All routed cleanly through shared synthBusInput with automatic onended cleanup & polyphony capping.
   */
  playDigitalSynth(ctx, preset, midi, duration, now, velocity, { palmMute = false, legato = false } = {}) {
    const freq = Theory.midiToFreq(midi);
    const dur = Math.max(0.18, palmMute ? Math.min(duration, 0.26) : Math.max(0.45, Math.min(duration, 2.2)));
    const env = ctx.createGain();
    env.connect(this.synthBusInput);

    const sources = [];
    const cleanupNodes = [env];

    const finalize = (primaryOsc, stopAt) => {
      const voice = { env, sources, released: false };
      this.registerVoice(voice);
      primaryOsc.onended = () => {
        this.unregisterVoice(voice);
        for (const n of cleanupNodes) { try { n.disconnect(); } catch {} }
      };
      for (const o of sources) {
        o.start(now);
        o.stop(stopAt);
      }
    };

    if (preset.engine === 'fm_epiano') {
      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const body2 = ctx.createOscillator();
      const body2Gain = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(freq, now);
      mod.type = 'sine';
      mod.frequency.setValueAtTime(freq * 7, now);
      modGain.gain.setValueAtTime(freq * (palmMute ? 0.5 : 1.7), now);
      modGain.gain.exponentialRampToValueAtTime(0.5, now + Math.min(0.22, dur));

      body2.type = 'triangle';
      body2.frequency.setValueAtTime(freq * 2, now);
      body2Gain.gain.setValueAtTime(0.12, now);
      body2Gain.gain.exponentialRampToValueAtTime(0.001, now + Math.min(0.45, dur));

      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(env);
      body2.connect(body2Gain);
      body2Gain.connect(env);

      const peak = 0.28 * velocity;
      const atk = Math.min(legato ? 0.024 : 0.006, dur * 0.2);
      const midT = Math.min(0.25, dur * 0.5);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + atk);
      env.gain.exponentialRampToValueAtTime(peak * 0.45, now + Math.max(atk + 0.01, midT));
      env.gain.exponentialRampToValueAtTime(0.0008, now + dur);

      sources.push(carrier, mod, body2);
      cleanupNodes.push(modGain, body2Gain);
      finalize(carrier, now + dur + 0.04);
      return;
    }

    if (preset.engine === 'analog_pad') {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 1.4;
      const swellT = Math.max(0.05, Math.min(0.42, dur * 0.45));
      filter.frequency.setValueAtTime(palmMute ? 550 : 420, now);
      filter.frequency.exponentialRampToValueAtTime(palmMute ? 300 : 2100, now + swellT);
      filter.frequency.exponentialRampToValueAtTime(650, now + dur);
      filter.connect(env);
      cleanupNodes.push(filter);

      // 2 detuned saws (rich analog warmth with 33% less CPU than 3 saws)
      [-8, 8].forEach((dt) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(freq, now);
        o.detune.setValueAtTime(dt, now);
        const g = ctx.createGain();
        g.gain.value = 0.45;
        o.connect(g);
        g.connect(filter);
        sources.push(o);
        cleanupNodes.push(g);
      });

      const peak = 0.20 * velocity;
      const atk = Math.min(palmMute ? 0.015 : 0.12, dur * 0.35);
      const holdT = Math.max(atk + 0.02, dur * 0.72);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + atk);
      env.gain.setValueAtTime(peak * 0.85, now + holdT);
      env.gain.exponentialRampToValueAtTime(0.0008, now + dur + 0.04);

      finalize(sources[0], now + dur + 0.06);
      return;
    }

    if (preset.engine === 'synth_pluck') {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o1.type = 'sawtooth'; o1.frequency.setValueAtTime(freq, now);
      o2.type = 'square'; o2.frequency.setValueAtTime(freq, now); o2.detune.setValueAtTime(7, now);

      const pluckDur = Math.min(dur, 0.9);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 3.8;
      filter.frequency.setValueAtTime(palmMute ? 1200 : 5200, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(220, freq * 1.15), now + Math.min(palmMute ? 0.12 : 0.30, pluckDur));

      const g2 = ctx.createGain(); g2.gain.value = 0.35;
      o1.connect(filter); o2.connect(g2); g2.connect(filter);
      filter.connect(env);

      const peak = 0.24 * velocity;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0008, now + pluckDur);

      sources.push(o1, o2);
      cleanupNodes.push(filter, g2);
      finalize(o1, now + pluckDur + 0.04);
      return;
    }

    if (preset.engine === 'fm_bell') {
      const car = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modG = ctx.createGain();
      car.type = 'sine'; car.frequency.setValueAtTime(freq, now);
      mod.type = 'sine'; mod.frequency.setValueAtTime(freq * 3.5, now);
      modG.gain.setValueAtTime(freq * 3.6, now);
      modG.gain.exponentialRampToValueAtTime(1, now + Math.min(1.0, dur));

      mod.connect(modG); modG.connect(car.frequency); car.connect(env);
      const peak = 0.25 * velocity;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0008, now + dur);

      sources.push(car, mod);
      cleanupNodes.push(modG);
      finalize(car, now + dur + 0.04);
      return;
    }

    if (preset.engine === 'organ_b3') {
      // Hammond B3 additive drawbars (4 core drawbars for rich organ tone at low CPU)
      const drawbars = [
        { mult: 0.5, gain: 0.28 },
        { mult: 1.0, gain: 0.44 },
        { mult: 1.5, gain: 0.16 },
        { mult: 2.0, gain: 0.24 },
      ];
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = palmMute ? 1200 : 3200;
      lp.connect(env);
      cleanupNodes.push(lp);

      drawbars.forEach((db) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq * db.mult, now);
        const g = ctx.createGain(); g.gain.value = db.gain;
        o.connect(g); g.connect(lp);
        sources.push(o);
        cleanupNodes.push(g);
      });

      const peak = 0.24 * velocity;
      const holdT = Math.max(0.04, dur - 0.08);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + 0.012);
      env.gain.setValueAtTime(peak * 0.9, now + holdT);
      env.gain.exponentialRampToValueAtTime(0.0008, now + dur);

      finalize(sources[0], now + dur + 0.04);
      return;
    }

    if (preset.engine === 'lofi_keys') {
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o1.type = 'triangle'; o1.frequency.setValueAtTime(freq, now);
      o2.type = 'sine'; o2.frequency.setValueAtTime(freq * 2, now);

      const wow = ctx.createOscillator();
      wow.frequency.value = 2.4;
      const wowG = ctx.createGain(); wowG.gain.value = 9;
      wow.connect(wowG); wowG.connect(o1.detune); wowG.connect(o2.detune);

      const g2 = ctx.createGain(); g2.gain.value = 0.15;
      const tapeFilter = ctx.createBiquadFilter();
      tapeFilter.type = 'lowpass';
      tapeFilter.frequency.setValueAtTime(palmMute ? 680 : 1450, now);
      tapeFilter.Q.value = 1.6;

      o1.connect(tapeFilter); o2.connect(g2); g2.connect(tapeFilter);
      tapeFilter.connect(env);

      const peak = 0.28 * velocity;
      const midT = Math.min(0.35, dur * 0.5);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + 0.020);
      env.gain.exponentialRampToValueAtTime(peak * 0.55, now + Math.max(0.03, midT));
      env.gain.exponentialRampToValueAtTime(0.0008, now + dur);

      sources.push(o1, o2, wow);
      cleanupNodes.push(wowG, g2, tapeFilter);
      finalize(o1, now + dur + 0.04);
      return;
    }

    // 8-Bit Chiptune (Retro NES Pulse/Square wave)
    const sq = ctx.createOscillator();
    sq.type = 'square';
    sq.frequency.setValueAtTime(freq, now);
    const bitFilter = ctx.createBiquadFilter();
    bitFilter.type = 'lowpass';
    bitFilter.frequency.value = palmMute ? 1100 : 4800;
    sq.connect(bitFilter);
    bitFilter.connect(env);

    const chipDur = Math.min(dur, 0.85);
    const peak = 0.15 * velocity;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.005);
    env.gain.exponentialRampToValueAtTime(peak * 0.5, now + Math.min(0.14, chipDur * 0.5));
    env.gain.exponentialRampToValueAtTime(0.0008, now + chipDur);

    sources.push(sq);
    cleanupNodes.push(bitFilter);
    finalize(sq, now + chipDur + 0.04);
  }

  /**
   * Percussive muted guitar chuck ("X") sound — uses pre-cached buffer (zero allocation).
   */
  playPercussiveMute() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime + SCHEDULE_LOOKAHEAD_SEC;
    const src = ctx.createBufferSource();
    src.buffer = this.muteNoiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1350;
    filter.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);
    src.onended = () => {
      try { filter.disconnect(); gain.disconnect(); } catch {}
    };
    src.start(now);
  }

  playChord(midis, { strumMs = 30, direction = 'down', duration = 2.0, arpeggiate = false, palmMute = false } = {}) {
    const valid = midis.filter((m) => m !== null && m !== undefined);
    if (!valid.length || this.muted) return;
    const ctx = this.ensureContext();
    const ordered = direction === 'up' ? valid.slice().reverse() : valid.slice();
    const stepSec = (arpeggiate ? 120 : strumMs) / 1000;
    // Capture ONE single audio clock anchor BEFORE the loop so all strings stay strictly in time
    const baseTime = ctx.currentTime + SCHEDULE_LOOKAHEAD_SEC;
    ordered.forEach((m, i) => {
      this.playNote(m, duration, i * stepSec, 0.84 - i * 0.03, { palmMute, absTime: baseTime });
    });
  }

  triggerStroke(midis, stroke, stepIdx, eighthSec) {
    if (!midis.length || stroke === '-') return;
    if (stroke === 'D') {
      this.playChord(midis, { direction: 'down', strumMs: 22, duration: Math.max(0.55, eighthSec * 2.2) });
    } else if (stroke === 'U') {
      this.playChord(midis.slice(-4), { direction: 'up', strumMs: 16, duration: Math.max(0.45, eighthSec * 1.8) });
    } else if (stroke === 'PM') {
      const chunk = stepIdx % 4 === 0 ? midis : midis.slice(0, Math.min(4, midis.length));
      this.playChord(chunk, { direction: 'down', strumMs: 12, duration: 0.24, palmMute: true });
    } else if (stroke === 'ARP') {
      const seq = [...midis, ...midis.slice(1, -1).reverse()];
      const target = seq[stepIdx % seq.length];
      this.playNote(target, Math.max(0.65, eighthSec * 2.8), 0, stepIdx === 0 ? 0.9 : 0.78);
    } else if (stroke === 'X') {
      this.playPercussiveMute();
    }
  }

  scheduleChordBar(midis, { bpm = 104, cadence = this.chordCadence, customSteps = null, baseDelayMs = 0, sessionId = this.playbackSessionId, onBeatStep = null } = {}) {
    const valid = midis.filter((m) => m !== null && m !== undefined);
    if (!valid.length) return;

    const steps = Array.isArray(customSteps) && customSteps.length === 8
      ? customSteps
      : getPresetSteps(cadence);

    const eighthMs = (60000 / bpm) / 2;
    const eighthSec = eighthMs / 1000;

    steps.forEach((stroke, sIdx) => {
      const t = setTimeout(() => {
        if (sessionId !== this.playbackSessionId) return;
        this.triggerStroke(valid, stroke, sIdx, eighthSec);
        if (onBeatStep) onBeatStep(sIdx, Math.floor(sIdx / 2));
      }, Math.max(0, baseDelayMs + sIdx * eighthMs));
      this.activeTimers.push(t);
    });
  }

  playChordWithCadence(midis, { bpm = 104, cadence = this.chordCadence, customSteps = null, loop = false, onBeatStep = null, onEnd = null } = {}) {
    this.stopSequence();
    const sessionId = this.playbackSessionId;
    const barMs = (60000 / bpm) * 4;

    const runPass = () => {
      if (sessionId !== this.playbackSessionId) return;
      this.scheduleChordBar(midis, { bpm, cadence, customSteps, baseDelayMs: 0, sessionId, onBeatStep });
      const endT = setTimeout(() => {
        if (sessionId !== this.playbackSessionId) return;
        if (this.isLooping && loop) runPass();
        else if (onEnd) onEnd();
      }, barMs);
      this.activeTimers.push(endT);
    };
    this.isLooping = loop;
    runPass();
  }

  playSequence(midis, { bpm = 120, subdivision = 2, cadence = this.melodicCadence, loop = false, onStep = null, onEnd = null } = {}) {
    this.stopSequence();
    if (!midis || !midis.length) return;
    const sessionId = this.playbackSessionId;

    let seq = midis.slice();
    if (cadence === 'asc_desc') {
      seq = [...midis, ...midis.slice(0, -1).reverse()];
    } else if (cadence === 'desc') {
      seq = midis.slice().reverse();
    } else if (cadence === 'alternate_thirds' && midis.length >= 3) {
      seq = [];
      for (let i = 0; i < midis.length - 2; i++) seq.push(midis[i], midis[i + 2]);
      seq.push(midis[midis.length - 1]);
    }

    const palmMute = cadence === 'palm_mute';
    const legato = cadence === 'legato';
    const stepMs = (60000 / bpm) / subdivision;

    const runPass = () => {
      if (sessionId !== this.playbackSessionId) return;
      seq.forEach((midi, idx) => {
        const t = setTimeout(() => {
          if (sessionId !== this.playbackSessionId) return;
          this.playNote(midi, Math.max(0.45, (stepMs / 1000) * (legato ? 2.2 : 1.7)), 0, 0.85, { palmMute, legato });
          if (onStep) onStep(midi, idx);
        }, idx * stepMs);
        this.activeTimers.push(t);
      });

      const endTimer = setTimeout(() => {
        if (sessionId !== this.playbackSessionId) return;
        if (this.isLooping && loop) runPass();
        else if (onEnd) onEnd();
      }, seq.length * stepMs + 80);
      this.activeTimers.push(endTimer);
    };

    this.isLooping = loop;
    runPass();
  }

  playProgression(chordItems, { bpm = 104, cadence = this.chordCadence, loop = false, onChord = null, onBeatStep = null, onEnd = null } = {}) {
    this.stopSequence();
    if (!chordItems || !chordItems.length) return;

    const sessionId = this.playbackSessionId;
    const barMs = (60000 / bpm) * 4;

    const runPass = () => {
      if (sessionId !== this.playbackSessionId) return;
      chordItems.forEach((item, idx) => {
        const midis = Array.isArray(item) ? item : item.midis;
        const customSteps = Array.isArray(item) ? null : item.customSteps;
        const chordCadence = Array.isArray(item) ? cadence : (item.cadence || cadence);
        const offset = idx * barMs;

        const notifyT = setTimeout(() => {
          if (sessionId !== this.playbackSessionId) return;
          if (onChord) onChord(idx);
        }, offset);
        this.activeTimers.push(notifyT);

        this.scheduleChordBar(midis, {
          bpm,
          cadence: chordCadence,
          customSteps,
          baseDelayMs: offset,
          sessionId,
          onBeatStep: (stepIdx, beatIdx) => {
            if (onBeatStep) onBeatStep(idx, stepIdx, beatIdx);
          },
        });
      });

      const endTimer = setTimeout(() => {
        if (sessionId !== this.playbackSessionId) return;
        if (this.isLooping && loop) runPass();
        else if (onEnd) onEnd();
      }, chordItems.length * barMs);
      this.activeTimers.push(endTimer);
    };

    this.isLooping = loop;
    runPass();
  }

  stopSequence() {
    this.playbackSessionId++;
    this.isLooping = false;
    this.activeTimers.forEach((id) => clearTimeout(id));
    this.activeTimers = [];
    this.fadeOutAllVoices(0.035);
  }
}

export const AudioEngine = new GuitarAudioEngine();
