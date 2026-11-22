/**
 * Web Audio API Plucked Guitar Synthesizer & Playback Engine
 * Synthesizes warm acoustic, clean electric, jazz hollowbody, and crunch guitar tones
 * with zero external audio files (100% offline-ready).
 */

import { Theory } from '../core/theory.js';

class GuitarAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.tone = 'acoustic'; // 'acoustic' | 'clean' | 'jazz' | 'overdrive'
    this.volume = 0.7;
    this.muted = false;
    this.activeTimers = [];
    this.loopTimer = null;
    this.isLooping = false;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;

      // Subtle compressor for commercial-grade loudness & anti-clipping
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

  /**
   * Plays a single realistic plucked guitar string note at given MIDI pitch.
   */
  playNote(midi, duration = 1.6, delaySec = 0, velocity = 0.8) {
    if (this.muted || midi === null || midi === undefined) return;
    const ctx = this.ensureContext();
    const now = ctx.currentTime + delaySec;
    const freq = Theory.midiToFreq(midi);

    // String harmonics mix depending on tone preset
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
    osc2.frequency.setValueAtTime(freq * 2, now); // 2nd harmonic
    osc2.detune.setValueAtTime(3, now);
    osc3.frequency.setValueAtTime(freq, now);
    osc3.detune.setValueAtTime(-4, now);

    const g1 = ctx.createGain();
    const g2 = ctx.createGain();
    const g3 = ctx.createGain();
    g1.gain.value = p.g1;
    g2.gain.value = p.g2;
    g3.gain.value = p.g3;

    // Plucked string dynamic lowpass filter (bright attack -> warm sustain)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = this.tone === 'acoustic' ? 1.8 : 1.1;
    filter.frequency.setValueAtTime(Math.min(9000, p.cutoff + freq * 2.5), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(260, freq * 1.6), now + Math.min(duration, p.decay));

    const env = ctx.createGain();
    const peak = 0.24 * velocity;
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(peak, now + 0.008);
    env.gain.exponentialRampToValueAtTime(peak * 0.48, now + 0.14);
    env.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc1.connect(g1);
    osc2.connect(g2);
    osc3.connect(g3);

    let stage = filter;
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

    stage.connect(env);
    env.connect(this.masterGain);

    // Subtle pick transient click for acoustic/clean realism
    if (this.tone === 'acoustic' || this.tone === 'clean') {
      const bufSize = Math.floor(ctx.sampleRate * 0.015);
      const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.value = 2800;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.07 * velocity, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.masterGain);
      noise.start(now);
    }

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + duration + 0.05);
    osc2.stop(now + duration + 0.05);
    osc3.stop(now + duration + 0.05);
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

  /**
   * Strums or arpeggiates a chord given an array of MIDI notes.
   */
  playChord(midis, { strumMs = 34, direction = 'down', duration = 2.1, arpeggiate = false } = {}) {
    const valid = midis.filter((m) => m !== null && m !== undefined);
    if (!valid.length) return;
    const ordered = direction === 'up' ? valid.slice().reverse() : valid.slice();
    const stepSec = (arpeggiate ? 160 : strumMs) / 1000;
    ordered.forEach((m, i) => {
      this.playNote(m, duration, i * stepSec, 0.82 - i * 0.03);
    });
  }

  /**
   * Plays a melodic sequence (scale or arpeggio) with optional visual step callback and loop.
   */
  playSequence(midis, { bpm = 120, subdivision = 2, ascendingAndDescending = false, loop = false, onStep = null, onEnd = null } = {}) {
    this.stopSequence();
    if (!midis || !midis.length) return;

    const seq = ascendingAndDescending
      ? [...midis, ...midis.slice(0, -1).reverse()]
      : midis.slice();

    const stepMs = (60000 / bpm) / subdivision;

    const runPass = () => {
      seq.forEach((midi, idx) => {
        const t = setTimeout(() => {
          this.playNote(midi, Math.max(0.45, (stepMs / 1000) * 1.8), 0, 0.85);
          if (onStep) onStep(midi, idx);
        }, idx * stepMs);
        this.activeTimers.push(t);
      });

      const endTimer = setTimeout(() => {
        if (this.isLooping && loop) {
          runPass();
        } else if (onEnd) {
          onEnd();
        }
      }, seq.length * stepMs + 80);
      this.activeTimers.push(endTimer);
    };

    this.isLooping = loop;
    runPass();
  }

  /**
   * Plays a chord progression with optional looping and active chord callback.
   */
  playProgression(chordMidisList, { bpm = 100, beatsPerChord = 4, loop = false, onChord = null, onEnd = null } = {}) {
    this.stopSequence();
    if (!chordMidisList || !chordMidisList.length) return;

    const chordMs = (60000 / bpm) * beatsPerChord;

    const runPass = () => {
      chordMidisList.forEach((midis, idx) => {
        const t = setTimeout(() => {
          this.playChord(midis, { strumMs: 28, duration: (chordMs / 1000) * 1.15 });
          // Add gentle rhythmic upbeat strum on beat 3
          if (beatsPerChord >= 4) {
            const t2 = setTimeout(() => {
              this.playChord(midis.slice(-4), { strumMs: 18, direction: 'up', duration: (chordMs / 1000) * 0.6 });
            }, chordMs * 0.5);
            this.activeTimers.push(t2);
          }
          if (onChord) onChord(idx);
        }, idx * chordMs);
        this.activeTimers.push(t);
      });

      const endTimer = setTimeout(() => {
        if (this.isLooping && loop) {
          runPass();
        } else if (onEnd) {
          onEnd();
        }
      }, chordMidisList.length * chordMs);
      this.activeTimers.push(endTimer);
    };

    this.isLooping = loop;
    runPass();
  }

  stopSequence() {
    this.isLooping = false;
    this.activeTimers.forEach((id) => clearTimeout(id));
    this.activeTimers = [];
  }
}

export const AudioEngine = new GuitarAudioEngine();
