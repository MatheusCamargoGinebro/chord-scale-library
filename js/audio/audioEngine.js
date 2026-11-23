/**
 * Advanced Multi-Engine Web Audio Synthesizer — Chord & Scale Library
 *
 * 1. Physical Modeling Engine (Extended Karplus-Strong + Pick-Position Comb +
 *    Fractional Delay Interpolation + Acoustic Body Formants + Guitar Cab EQ + Stereo Room Reverb)
 *    for ultra-natural, realistic plucked acoustic & electric instruments.
 * 2. Diverse Digital Synthesizer Engines (FM Electric Piano, Analog Pad, EDM Pluck,
 *    DX7 Crystal Bell, 8-Bit Chiptune, Hammond B3 Drawbar Organ, Lo-Fi Tape Keys).
 * 3. Custom 8-step per-chord strumming cadences + melodic articulations.
 */

import { Theory } from '../core/theory.js';

export const TONE_PRESETS = [
  // --- Acústicos & Orgânicos (Modelagem Física Karplus-Strong) ---
  { id: 'nylon', name: 'Violão Nylon (Clássico)', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.42, damping: 0.9958, pickPos: 0.28, body: 'nylon', reverb: 0.28, drive: 0 },
  { id: 'acoustic', name: 'Violão Aço (Folk)', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.72, damping: 0.9964, pickPos: 0.16, body: 'steel', reverb: 0.24, drive: 0 },
  { id: 'twelve_string', name: 'Violão 12 Cordas', group: 'Acústicos & Orgânicos', engine: 'ks12', brightness: 0.78, damping: 0.9966, pickPos: 0.14, body: 'steel', reverb: 0.30, drive: 0 },
  { id: 'clean', name: 'Guitarra Clean (Strat)', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.68, damping: 0.9972, pickPos: 0.20, body: 'fender', reverb: 0.22, drive: 0 },
  { id: 'jazz', name: 'Jazz Hollowbody', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.32, damping: 0.9960, pickPos: 0.36, body: 'jazz', reverb: 0.25, drive: 0 },
  { id: 'overdrive', name: 'Blues Crunch (Valvulado)', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.74, damping: 0.9975, pickPos: 0.15, body: 'cab', reverb: 0.18, drive: 14 },
  { id: 'metal_lead', name: 'Rock / Metal High-Gain', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.85, damping: 0.9980, pickPos: 0.11, body: 'metal', reverb: 0.14, drive: 38 },
  { id: 'bass_finger', name: 'Baixo Elétrico (Finger)', group: 'Acústicos & Orgânicos', engine: 'ks', brightness: 0.35, damping: 0.9968, pickPos: 0.30, body: 'bass', reverb: 0.10, drive: 0, octaveShift: -12 },

  // --- Especiais & Modulados ---
  { id: 'chorus_dream', name: 'Clean Chorus Ambient', group: 'Modulados & Especiais', engine: 'ks', brightness: 0.70, damping: 0.9976, pickPos: 0.22, body: 'fender', reverb: 0.48, chorus: true, drive: 0 },
  { id: 'tremolo_surf', name: 'Vintage Surf Tremolo', group: 'Modulados & Especiais', engine: 'ks', brightness: 0.76, damping: 0.9970, pickPos: 0.14, body: 'fender', reverb: 0.45, tremolo: true, drive: 4 },
  { id: 'harp_pluck', name: 'Harpa / Koto Acústico', group: 'Modulados & Especiais', engine: 'ks', brightness: 0.62, damping: 0.9978, pickPos: 0.42, body: 'harp', reverb: 0.44, drive: 0 },

  // --- Digitais & Sintetizadores ---
  { id: 'epiano', name: 'Rhodes / Piano Elétrico', group: 'Digitais & Sintetizadores', engine: 'fm_epiano', reverb: 0.28 },
  { id: 'synth_pad', name: 'Synth Pad Analógico', group: 'Digitais & Sintetizadores', engine: 'analog_pad', reverb: 0.46 },
  { id: 'synth_pluck', name: 'Synth Pluck (EDM)', group: 'Digitais & Sintetizadores', engine: 'synth_pluck', reverb: 0.28 },
  { id: 'fm_bell', name: 'FM Crystal Bell (DX7)', group: 'Digitais & Sintetizadores', engine: 'fm_bell', reverb: 0.42 },
  { id: 'organ_b3', name: 'Órgão Hammond B3', group: 'Digitais & Sintetizadores', engine: 'organ_b3', reverb: 0.22 },
  { id: 'lofi_keys', name: 'Lo-Fi Tape Keys', group: 'Digitais & Sintetizadores', engine: 'lofi_keys', reverb: 0.32 },
  { id: 'chiptune', name: '8-Bit Chiptune (Retro)', group: 'Digitais & Sintetizadores', engine: 'chiptune', reverb: 0.06 },
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

/**
 * Pure-JS Extended Karplus-Strong Physical Plucked String Synthesizer.
 * Generates an organic plucked string waveform with fractional-delay tuning,
 * pick-position comb filtering, frequency-dependent natural damping & soft pick attack.
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

  // Compensate for the 2-point averaging filter phase shift so pitch is exact (< 1 cent) across all frets
  const compensatedPeriod = (sampleRate / safeFreq) + (1 - blend);
  const N = Math.max(8, Math.floor(compensatedPeriod));
  const frac = compensatedPeriod - N;
  const L = N + 1;

  // 1. Exciter: warm shaped noise burst + pluck body impulse
  const ring = new Float32Array(L);
  let lp = 0;
  const excAlpha = palmMute ? 0.18 : (0.14 + brightness * 0.62);
  for (let i = 0; i < L; i++) {
    const white = Math.random() * 2 - 1;
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
    combed[i] = ring[i] - 0.68 * ring[(i + pickDelay) % L];
  }
  for (let i = 0; i < L; i++) ring[i] = combed[i];

  // 3. Karplus-Strong feedback loop with exact fractional delay & natural high-freq damping
  let idx = 0;
  let prev = 0;
  const attackSamples = Math.floor(sampleRate * (legato ? 0.024 : 0.0028));

  for (let i = 0; i < totalSamples; i++) {
    const nextIdx = (idx + 1) % L;
    const nextIdx2 = (idx + 2) % L;
    // Delay N + frac: ring[idx] is (N+1) samples old, ring[nextIdx] is N samples old
    const curr = ring[idx] * frac + ring[nextIdx] * (1 - frac);
    const next = ring[nextIdx] * frac + ring[nextIdx2] * (1 - frac);

    const filtered = decay * (blend * curr + (1 - blend) * next);
    const sampleOut = palmMute ? (0.45 * filtered + 0.55 * prev) : filtered;
    prev = sampleOut;
    ring[idx] = sampleOut;

    let env = 1;
    if (i < attackSamples) env = i / attackSamples;
    else if (i > totalSamples - 1200) env = Math.max(0, (totalSamples - i) / 1200);

    out[i] = curr * env;
    idx = nextIdx;
  }

  // Normalize peak softly so every string has consistent musical presence
  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    const a = Math.abs(out[i]);
    if (a > peak) peak = a;
  }
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
    this.reverbNode = null;
    this.reverbGain = null;
    this.dryGain = null;
    this.tone = 'acoustic';
    this.volume = 0.76;
    this.muted = false;
    this.activeTimers = [];
    this.isLooping = false;
    this.chordCadence = 'down_up';
    this.melodicCadence = 'asc_desc';
    this.playbackSessionId = 0;
    this.ksBufferCache = new Map(); // LRU cache of synthesized Karplus-Strong AudioBuffers
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 1.0;

      // Synthesized Stereo Wooden Studio Room Reverb (100% offline!)
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.createRoomImpulse(this.ctx, 1.15, 2.8);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = 0.24;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -12;
      this.compressor.knee.value = 20;
      this.compressor.ratio.value = 3.5;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.16;

      this.dryGain.connect(this.compressor);
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Generates a natural stereo wooden room impulse response for the ConvolverNode.
   */
  createRoomImpulse(ctx, seconds = 1.15, decay = 2.8) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, decay);
        const n = (Math.random() * 2 - 1) * env;
        // Warm acoustic wall damping
        lp = lp + 0.22 * (n - lp);
        data[i] = lp;
      }
    }
    return impulse;
  }

  setTone(toneId) {
    const preset = getTonePreset(toneId);
    this.tone = preset.id;
    if (this.reverbGain && this.ctx) {
      this.reverbGain.gain.setTargetAtTime(preset.reverb ?? 0.22, this.ctx.currentTime, 0.05);
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
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  getCachedKSBuffer(ctx, preset, midi, palmMute, legato) {
    const key = `${preset.id}:${midi}:${palmMute ? 1 : 0}:${legato ? 1 : 0}`;
    if (this.ksBufferCache.has(key)) return this.ksBufferCache.get(key);

    const freq = Theory.midiToFreq(midi);
    const dur = palmMute ? 0.42 : 2.35;
    const samples = synthesizeKarplusStrongSamples(freq, ctx.sampleRate, dur, {
      brightness: preset.brightness,
      damping: preset.damping,
      pickPos: preset.pickPos,
      palmMute,
      legato,
    });

    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.getChannelData(0).set(samples);

    // Keep cache bounded (~180 notes max)
    if (this.ksBufferCache.size >= 180) {
      const oldest = this.ksBufferCache.keys().next().value;
      this.ksBufferCache.delete(oldest);
    }
    this.ksBufferCache.set(key, buffer);
    return buffer;
  }

  /**
   * Connects a note's output through realistic Acoustic Body Formants or Electric Amp Cabinet EQ.
   */
  routeThroughBody(ctx, inputNode, bodyType, drive, now, destinationDry, destinationWet) {
    let stage = inputNode;

    if (drive && drive > 0) {
      const preEq = ctx.createBiquadFilter();
      preEq.type = 'highpass';
      preEq.frequency.value = 135; // Tightens bass before overdrive like a Tube Screamer!
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.makeTubeCurve(drive);
      shaper.oversample = '4x';
      stage.connect(preEq);
      preEq.connect(shaper);
      stage = shaper;
    }

    if (bodyType === 'nylon') {
      const cavity = ctx.createBiquadFilter();
      cavity.type = 'peaking'; cavity.frequency.value = 115; cavity.Q.value = 2.0; cavity.gain.value = 4.2;
      const wood = ctx.createBiquadFilter();
      wood.type = 'peaking'; wood.frequency.value = 240; wood.Q.value = 1.6; wood.gain.value = 2.6;
      const soften = ctx.createBiquadFilter();
      soften.type = 'lowpass'; soften.frequency.value = 3400;
      stage.connect(cavity); cavity.connect(wood); wood.connect(soften);
      stage = soften;
    } else if (bodyType === 'steel') {
      const cavity = ctx.createBiquadFilter();
      cavity.type = 'peaking'; cavity.frequency.value = 105; cavity.Q.value = 1.9; cavity.gain.value = 3.2;
      const sparkle = ctx.createBiquadFilter();
      sparkle.type = 'highshelf'; sparkle.frequency.value = 3200; sparkle.gain.value = 2.4;
      const air = ctx.createBiquadFilter();
      air.type = 'lowpass'; air.frequency.value = 6800;
      stage.connect(cavity); cavity.connect(sparkle); sparkle.connect(air);
      stage = air;
    } else if (bodyType === 'fender') {
      const scoop = ctx.createBiquadFilter();
      scoop.type = 'peaking'; scoop.frequency.value = 500; scoop.Q.value = 1.0; scoop.gain.value = -2.5;
      const chime = ctx.createBiquadFilter();
      chime.type = 'peaking'; chime.frequency.value = 2600; chime.Q.value = 1.2; chime.gain.value = 3.0;
      const cab = ctx.createBiquadFilter();
      cab.type = 'lowpass'; cab.frequency.value = 5400;
      stage.connect(scoop); scoop.connect(chime); chime.connect(cab);
      stage = cab;
    } else if (bodyType === 'jazz') {
      const warm = ctx.createBiquadFilter();
      warm.type = 'peaking'; warm.frequency.value = 280; warm.Q.value = 1.2; warm.gain.value = 3.5;
      const roll = ctx.createBiquadFilter();
      roll.type = 'lowpass'; roll.frequency.value = 2050;
      stage.connect(warm); warm.connect(roll);
      stage = roll;
    } else if (bodyType === 'cab' || bodyType === 'metal') {
      const lowPunch = ctx.createBiquadFilter();
      lowPunch.type = 'peaking'; lowPunch.frequency.value = 130; lowPunch.Q.value = 1.4; lowPunch.gain.value = bodyType === 'metal' ? 4.5 : 2.5;
      const midShape = ctx.createBiquadFilter();
      midShape.type = 'peaking'; midShape.frequency.value = bodyType === 'metal' ? 680 : 900; midShape.Q.value = 1.1; midShape.gain.value = bodyType === 'metal' ? -4.0 : 2.2;
      const cabRoll = ctx.createBiquadFilter();
      cabRoll.type = 'lowpass'; cabRoll.frequency.value = bodyType === 'metal' ? 4300 : 4000; cabRoll.Q.value = 1.4;
      stage.connect(lowPunch); lowPunch.connect(midShape); midShape.connect(cabRoll);
      stage = cabRoll;
    } else if (bodyType === 'bass') {
      const sub = ctx.createBiquadFilter();
      sub.type = 'lowshelf'; sub.frequency.value = 140; sub.gain.value = 5.5;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1450;
      stage.connect(sub); sub.connect(lp);
      stage = lp;
    } else if (bodyType === 'harp') {
      const shimmer = ctx.createBiquadFilter();
      shimmer.type = 'highshelf'; shimmer.frequency.value = 2800; shimmer.gain.value = 3.0;
      stage.connect(shimmer);
      stage = shimmer;
    }

    stage.connect(destinationDry);
    stage.connect(destinationWet);
  }

  /**
   * Warm asymmetric tube saturation curve (much smoother than harsh digital clipping).
   */
  makeTubeCurve(amount) {
    const n = 512;
    const curve = new Float32Array(n);
    const k = amount;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      // Soft tanh-like asymmetric saturation for rich even+odd tube harmonics
      curve[i] = Math.tanh((x + 0.08) * (1 + k * 0.14)) - Math.tanh(0.08 * (1 + k * 0.14));
    }
    return curve;
  }

  /**
   * Plays a single note using the active tone preset (Physical Modeling OR Digital Synth).
   */
  playNote(midi, duration = 1.8, delaySec = 0, velocity = 0.82, { palmMute = false, legato = false } = {}) {
    if (this.muted || midi === null || midi === undefined) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime + delaySec;
    const preset = getTonePreset(this.tone);
    const shiftedMidi = midi + (preset.octaveShift || 0);

    // Ensure reverb blend matches current preset
    this.reverbGain.gain.setTargetAtTime(preset.reverb ?? 0.22, ctx.currentTime, 0.04);

    if (preset.engine === 'ks' || preset.engine === 'ks12') {
      this.playPhysicalPluck(ctx, preset, shiftedMidi, duration, now, velocity, { palmMute, legato });
      if (preset.engine === 'ks12') {
        // 12-string second course: octave up on lower 4 strings, detuned unison on top 2 strings
        const pairMidi = shiftedMidi < 57 ? shiftedMidi + 12 : shiftedMidi;
        this.playPhysicalPluck(ctx, preset, pairMidi, duration * 0.95, now + 0.007, velocity * 0.55, {
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
    const buffer = this.getCachedKSBuffer(ctx, preset, midi, palmMute, legato);
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    // Subtle organic humanization (+ optional chorus/12-string detune)
    const humanDetune = (Math.random() - 0.5) * 2.4 + detuneCents;
    src.detune.setValueAtTime(humanDetune, now);

    const actualDur = palmMute ? Math.min(duration, 0.32) : Math.min(duration + 0.45, buffer.duration);

    const env = ctx.createGain();
    const gainLevel = 0.48 * velocity * (preset.drive > 20 ? 0.72 : 1);
    env.gain.setValueAtTime(gainLevel, now);
    env.gain.setValueAtTime(gainLevel, now + Math.max(0.05, actualDur - 0.14));
    env.gain.exponentialRampToValueAtTime(0.0008, now + actualDur);

    let outNode = env;
    src.connect(env);

    // Optional Chorus doubling voice
    if (preset.chorus) {
      const src2 = ctx.createBufferSource();
      src2.buffer = buffer;
      src2.detune.setValueAtTime(humanDetune + 11, now);
      const g2 = ctx.createGain();
      g2.gain.value = 0.52;
      src2.connect(g2);
      g2.connect(env);
      src2.start(now + 0.011);
      src2.stop(now + actualDur + 0.03);
    }

    // Optional Vintage Tremolo LFO
    if (preset.tremolo) {
      const tremGain = ctx.createGain();
      tremGain.gain.value = 0.78;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.6;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.24;
      lfo.connect(lfoDepth);
      lfoDepth.connect(tremGain.gain);
      env.connect(tremGain);
      lfo.start(now);
      lfo.stop(now + actualDur + 0.05);
      outNode = tremGain;
    }

    this.routeThroughBody(ctx, outNode, preset.body, preset.drive, now, this.dryGain, this.reverbNode);

    src.start(now);
    src.stop(now + actualDur + 0.04);
  }

  /**
   * Rich Digital Synthesizer Engines (Rhodes FM, Analog Pad, EDM Pluck, DX7 Bell, Organ B3, Lo-Fi, Chiptune).
   */
  playDigitalSynth(ctx, preset, midi, duration, now, velocity, { palmMute = false, legato = false } = {}) {
    const freq = Theory.midiToFreq(midi);
    const dur = palmMute ? Math.min(duration, 0.26) : Math.max(0.55, duration);
    const env = ctx.createGain();
    env.connect(this.dryGain);
    env.connect(this.reverbNode);

    if (preset.engine === 'fm_epiano') {
      // Rhodes Electric Piano: Carrier sine + Modulator at 1:14 tine ratio decaying fast + warm 2nd harmonic
      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const body2 = ctx.createOscillator();
      const body2Gain = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(freq, now);
      mod.type = 'sine';
      mod.frequency.setValueAtTime(freq * 7, now);
      modGain.gain.setValueAtTime(freq * (palmMute ? 0.5 : 1.8), now);
      modGain.gain.exponentialRampToValueAtTime(0.5, now + 0.22);

      body2.type = 'triangle';
      body2.frequency.setValueAtTime(freq * 2, now);
      body2Gain.gain.setValueAtTime(0.12, now);
      body2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(env);
      body2.connect(body2Gain);
      body2Gain.connect(env);

      const peak = 0.28 * velocity;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + (legato ? 0.025 : 0.006));
      env.gain.exponentialRampToValueAtTime(peak * 0.45, now + 0.25);
      env.gain.exponentialRampToValueAtTime(0.0008, now + dur);

      [carrier, mod, body2].forEach((o) => { o.start(now); o.stop(now + dur + 0.05); });
      return;
    }

    if (preset.engine === 'analog_pad') {
      // Warm detuned 3-oscillator analog supersaw pad with silky slow lowpass swell
      const detunes = [-10, 0, 10];
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 1.4;
      filter.frequency.setValueAtTime(palmMute ? 550 : 420, now);
      filter.frequency.exponentialRampToValueAtTime(palmMute ? 300 : 2100, now + Math.min(0.45, dur * 0.45));
      filter.frequency.exponentialRampToValueAtTime(650, now + dur);
      filter.connect(env);

      const oscs = detunes.map((dt) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(freq, now);
        o.detune.setValueAtTime(dt, now);
        const g = ctx.createGain();
        g.gain.value = 0.33;
        o.connect(g);
        g.connect(filter);
        o.start(now);
        o.stop(now + dur + 0.08);
        return o;
      });

      const peak = 0.20 * velocity;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + (palmMute ? 0.015 : 0.14));
      env.gain.setValueAtTime(peak * 0.85, now + Math.max(0.16, dur * 0.7));
      env.gain.exponentialRampToValueAtTime(0.0008, now + dur + 0.06);
      void oscs;
      return;
    }

    if (preset.engine === 'synth_pluck') {
      // Punchy EDM / Future Bass resonant filter-pluck
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o1.type = 'sawtooth'; o1.frequency.setValueAtTime(freq, now);
      o2.type = 'square'; o2.frequency.setValueAtTime(freq, now); o2.detune.setValueAtTime(7, now);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 4.2;
      filter.frequency.setValueAtTime(palmMute ? 1200 : 5400, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(220, freq * 1.15), now + (palmMute ? 0.12 : 0.32));

      const g2 = ctx.createGain(); g2.gain.value = 0.35;
      o1.connect(filter); o2.connect(g2); g2.connect(filter);
      filter.connect(env);

      const peak = 0.24 * velocity;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0008, now + Math.min(dur, 0.9));

      o1.start(now); o2.start(now);
      o1.stop(now + Math.min(dur, 0.95) + 0.04); o2.stop(now + Math.min(dur, 0.95) + 0.04);
      return;
    }

    if (preset.engine === 'fm_bell') {
      // Classic DX7 Crystal Bell (non-integer 3.5x FM ratio)
      const car = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modG = ctx.createGain();
      car.type = 'sine'; car.frequency.setValueAtTime(freq, now);
      mod.type = 'sine'; mod.frequency.setValueAtTime(freq * 3.5, now);
      modG.gain.setValueAtTime(freq * 3.8, now);
      modG.gain.exponentialRampToValueAtTime(1, now + Math.min(1.1, dur));

      mod.connect(modG); modG.connect(car.frequency); car.connect(env);
      const peak = 0.25 * velocity;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0008, now + dur);

      car.start(now); mod.start(now);
      car.stop(now + dur + 0.05); mod.stop(now + dur + 0.05);
      return;
    }

    if (preset.engine === 'organ_b3') {
      // Hammond B3 additive drawbars (16', 8', 5 1/3', 4', 2')
      const drawbars = [
        { mult: 0.5, gain: 0.26 },
        { mult: 1.0, gain: 0.42 },
        { mult: 1.5, gain: 0.16 },
        { mult: 2.0, gain: 0.24 },
        { mult: 4.0, gain: 0.10 },
      ];
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = palmMute ? 1200 : 3200;
      lp.connect(env);

      drawbars.forEach((db) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq * db.mult, now);
        const g = ctx.createGain(); g.gain.value = db.gain;
        o.connect(g); g.connect(lp);
        o.start(now); o.stop(now + dur + 0.04);
      });

      const peak = 0.24 * velocity;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + 0.012);
      env.gain.setValueAtTime(peak * 0.9, now + Math.max(0.06, dur - 0.08));
      env.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      return;
    }

    if (preset.engine === 'lofi_keys') {
      // Cozy Lo-Fi Tape Keys (warm triangle + sine, gentle pitch wow/flutter LFO, tape lowpass)
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o1.type = 'triangle'; o1.frequency.setValueAtTime(freq, now);
      o2.type = 'sine'; o2.frequency.setValueAtTime(freq * 2, now);

      // Tape wobble LFO
      const wow = ctx.createOscillator();
      wow.frequency.value = 2.4;
      const wowG = ctx.createGain(); wowG.gain.value = 9; // ±9 cents tape flutter
      wow.connect(wowG); wowG.connect(o1.detune); wowG.connect(o2.detune);

      const g2 = ctx.createGain(); g2.gain.value = 0.15;
      const tapeFilter = ctx.createBiquadFilter();
      tapeFilter.type = 'lowpass';
      tapeFilter.frequency.setValueAtTime(palmMute ? 680 : 1450, now);
      tapeFilter.Q.value = 1.6;

      o1.connect(tapeFilter); o2.connect(g2); g2.connect(tapeFilter);
      tapeFilter.connect(env);

      const peak = 0.28 * velocity;
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(peak, now + 0.022);
      env.gain.exponentialRampToValueAtTime(peak * 0.55, now + 0.35);
      env.gain.exponentialRampToValueAtTime(0.0008, now + dur);

      [o1, o2, wow].forEach((o) => { o.start(now); o.stop(now + dur + 0.05); });
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

    const peak = 0.15 * velocity;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.004);
    env.gain.exponentialRampToValueAtTime(peak * 0.5, now + 0.14);
    env.gain.exponentialRampToValueAtTime(0.0008, now + Math.min(dur, 0.85));
    sq.start(now);
    sq.stop(now + Math.min(dur, 0.9) + 0.04);
  }

  /**
   * Percussive muted guitar chuck ("X") sound.
   */
  playPercussiveMute() {
    if (this.muted) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const bufSize = Math.floor(ctx.sampleRate * 0.055);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.22));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
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
    src.start(now);
  }

  playChord(midis, { strumMs = 30, direction = 'down', duration = 2.0, arpeggiate = false, palmMute = false } = {}) {
    const valid = midis.filter((m) => m !== null && m !== undefined);
    if (!valid.length) return;
    const ordered = direction === 'up' ? valid.slice().reverse() : valid.slice();
    const stepSec = (arpeggiate ? 120 : strumMs) / 1000;
    ordered.forEach((m, i) => {
      this.playNote(m, duration, i * stepSec, 0.84 - i * 0.03, { palmMute });
    });
  }

  triggerStroke(midis, stroke, stepIdx, eighthSec) {
    if (!midis.length || stroke === '-') return;
    if (stroke === 'D') {
      this.playChord(midis, { direction: 'down', strumMs: 22, duration: Math.max(0.6, eighthSec * 2.3) });
    } else if (stroke === 'U') {
      this.playChord(midis.slice(-4), { direction: 'up', strumMs: 16, duration: Math.max(0.48, eighthSec * 1.9) });
    } else if (stroke === 'PM') {
      const chunk = stepIdx % 4 === 0 ? midis : midis.slice(0, Math.min(4, midis.length));
      this.playChord(chunk, { direction: 'down', strumMs: 12, duration: 0.24, palmMute: true });
    } else if (stroke === 'ARP') {
      const seq = [...midis, ...midis.slice(1, -1).reverse()];
      const target = seq[stepIdx % seq.length];
      this.playNote(target, Math.max(0.7, eighthSec * 2.9), 0, stepIdx === 0 ? 0.9 : 0.78);
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
  }
}

export const AudioEngine = new GuitarAudioEngine();
