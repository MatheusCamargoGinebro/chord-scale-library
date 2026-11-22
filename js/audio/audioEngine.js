/**
 * Web Audio API Plucked Guitar Synthesizer & Custom Cadence Playback Engine
 * Supports standard presets + custom 8-step per-chord strumming patterns
 * ('D' = Down, 'U' = Up, 'PM' = Palm Mute, 'ARP' = Arpeggio/Fingerstyle, 'X' = Mute/Percussive, '-' = Rest)
 * with live beat/step callbacks for synchronized visual rhythm indicators.
 */

import { Theory } from '../core/theory.js';

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

class GuitarAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.tone = 'acoustic';
    this.volume = 0.72;
    this.muted = false;
    this.activeTimers = [];
    this.isLooping = false;
    this.chordCadence = 'down_up';
    this.melodicCadence = 'asc_desc';
    this.playbackSessionId = 0;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.005;
      this.compressor.release.value = 0.15;

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setTone(tone) {
    this.tone = tone;
  }

  setChordCadence(cadenceId) {
    if (CHORD_CADENCES.some((c) => c.id === cadenceId)) {
      this.chordCadence = cadenceId;
    }
  }

  setMelodicCadence(cadenceId) {
    if (MELODIC_CADENCES.some((c) => c.id === cadenceId)) {
      this.melodicCadence = cadenceId;
    }
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

  playNote(midi, duration = 1.6, delaySec = 0, velocity = 0.8, { palmMute = false, legato = false } = {}) {
    if (this.muted || midi === null || midi === undefined) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime + delaySec;
    const freq = Theory.midiToFreq(midi);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    const tonePresets = {
      acoustic: { t1: 'triangle', t2: 'sawtooth', t3: 'sine', g1: 0.55, g2: 0.28, g3: 0.18, cutoff: 3400, decay: 1.9, drive: 0 },
      clean: { t1: 'sine', t2: 'triangle', t3: 'sawtooth', g1: 0.5, g2: 0.35, g3: 0.14, cutoff: 4200, decay: 2.1, drive: 0 },
      jazz: { t1: 'sine', t2: 'triangle', t3: 'sine', g1: 0.65, g2: 0.3, g3: 0.1, cutoff: 1450, decay: 1.6, drive: 0 },
      overdrive: { t1: 'sawtooth', t2: 'square', t3: 'triangle', g1: 0.45, g2: 0.25, g3: 0.2, cutoff: 2600, decay: 2.0, drive: 18 },
    };
    const p = tonePresets[this.tone] || tonePresets.acoustic;

    osc1.type = p.t1;
    osc2.type = p.t2;
    osc3.type = p.t3;

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);
    osc2.detune.setValueAtTime(3, now);
    osc3.frequency.setValueAtTime(freq, now);
    osc3.detune.setValueAtTime(-4, now);

    const g1 = ctx.createGain();
    const g2 = ctx.createGain();
    const g3 = ctx.createGain();
    g1.gain.value = p.g1;
    g2.gain.value = palmMute ? p.g2 * 0.45 : p.g2;
    g3.gain.value = p.g3;

    const actualDuration = palmMute ? Math.min(duration, 0.24) : duration;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = palmMute ? 2.4 : (this.tone === 'acoustic' ? 1.8 : 1.1);
    const startCut = palmMute
      ? Math.min(1150, Math.max(380, freq * 2.1))
      : Math.min(9000, p.cutoff + freq * 2.5);
    const endCut = palmMute ? Math.max(180, freq * 0.9) : Math.max(260, freq * 1.6);

    filter.frequency.setValueAtTime(startCut, now);
    filter.frequency.exponentialRampToValueAtTime(endCut, now + Math.min(actualDuration, palmMute ? 0.14 : p.decay));

    const env = ctx.createGain();
    const peak = (palmMute ? 0.28 : 0.24) * velocity;
    const attack = legato ? 0.032 : 0.007;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + attack);
    if (palmMute) {
      env.gain.exponentialRampToValueAtTime(0.0008, now + actualDuration);
    } else {
      env.gain.exponentialRampToValueAtTime(peak * 0.48, now + 0.14);
      env.gain.exponentialRampToValueAtTime(0.0008, now + actualDuration);
    }

    osc1.connect(g1);
    osc2.connect(g2);
    osc3.connect(g3);

    if (p.drive > 0) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.makeDistortionCurve(p.drive);
      shaper.oversample = '2x';
      g1.connect(shaper);
      g2.connect(shaper);
      g3.connect(shaper);
      shaper.connect(filter);
    } else {
      g1.connect(filter);
      g2.connect(filter);
      g3.connect(filter);
    }

    filter.connect(env);
    env.connect(this.masterGain);

    if (!legato && (this.tone === 'acoustic' || this.tone === 'clean' || palmMute)) {
      const bufSize = Math.floor(ctx.sampleRate * 0.016);
      const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.28));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.value = palmMute ? 750 : 2800;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime((palmMute ? 0.12 : 0.07) * velocity, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.016);
      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now);
    }

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + actualDuration + 0.05);
    osc2.stop(now + actualDuration + 0.05);
    osc3.stop(now + actualDuration + 0.05);
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
    filter.frequency.value = 1400;
    filter.Q.value = 1.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }

  makeDistortionCurve(amount) {
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
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

  /**
   * Executes one 8th-note step of a strumming pattern on a chord.
   */
  triggerStroke(midis, stroke, stepIdx, eighthSec) {
    if (!midis.length || stroke === '-') return;
    if (stroke === 'D') {
      this.playChord(midis, { direction: 'down', strumMs: 22, duration: Math.max(0.55, eighthSec * 2.2) });
    } else if (stroke === 'U') {
      this.playChord(midis.slice(-4), { direction: 'up', strumMs: 16, duration: Math.max(0.45, eighthSec * 1.8) });
    } else if (stroke === 'PM') {
      const chunk = stepIdx % 4 === 0 ? midis : midis.slice(0, Math.min(4, midis.length));
      this.playChord(chunk, { direction: 'down', strumMs: 12, duration: 0.22, palmMute: true });
    } else if (stroke === 'ARP') {
      const seq = [...midis, ...midis.slice(1, -1).reverse()];
      const target = seq[stepIdx % seq.length];
      this.playNote(target, Math.max(0.65, eighthSec * 2.8), 0, stepIdx === 0 ? 0.9 : 0.78);
    } else if (stroke === 'X') {
      this.playPercussiveMute();
    }
  }

  /**
   * Schedules an 8-step (4-beat, 8th-note) custom or preset cadence bar for a chord.
   */
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
      for (let i = 0; i < midis.length - 2; i++) {
        seq.push(midis[i], midis[i + 2]);
      }
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
          this.playNote(midi, Math.max(0.42, (stepMs / 1000) * (legato ? 2.2 : 1.7)), 0, 0.85, { palmMute, legato });
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

  /**
   * Plays a progression where each chord can have its OWN custom 8-step cadence array and BPM!
   * chordItems: array of { midis: number[], customSteps?: string[], cadence?: string } OR plain number[][]
   */
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
