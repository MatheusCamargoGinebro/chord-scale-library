/**
 * Precision Web Audio Metronome, 16-Step Drum Machine & Study Loop Controller
 */

import { AudioEngine } from './audioEngine.js';

export const DRUM_PRESETS = {
  rock: {
    name: 'Rock',
    bpm: 118,
    kick:  [1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    ride:  [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,1],
  },
  blues: {
    name: 'Blues',
    bpm: 92,
    kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,0,1, 1,0,0,1, 1,0,0,1, 1,0,0,1],
    ride:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
  },
  funk: {
    name: 'Funk',
    bpm: 106,
    kick:  [1,0,0,1, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,1, 0,1,0,0, 1,0,0,0],
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    ride:  [0,0,1,0, 0,0,0,0, 0,0,1,0, 0,0,1,0],
  },
  jazz: {
    name: 'Jazz',
    bpm: 128,
    kick:  [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
    snare: [0,0,0,0, 0,0,0,1, 0,0,0,0, 0,0,1,0],
    hihat: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    ride:  [1,0,0,0, 1,0,0,1, 1,0,0,0, 1,0,0,1],
  },
  metal: {
    name: 'Metal',
    bpm: 148,
    kick:  [1,0,1,0, 0,0,1,0, 1,0,1,0, 1,0,1,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    ride:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
  },
  pop: {
    name: 'Pop',
    bpm: 112,
    kick:  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    ride:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
  },
};

class RhythmEngineClass {
  constructor() {
    this.bpm = 104;
    this.metronomeOn = false;
    this.drumsOn = false;
    this.timeSignature = 4;
    this.currentStep = 0; // 0..15 (16th notes)
    this.nextNoteTime = 0;
    this.timerId = null;
    this.listeners = new Set();
    this.tapTimes = [];
    this.pattern = this.clonePreset('rock');
    this.presetKey = 'rock';
  }

  clonePreset(key) {
    const p = DRUM_PRESETS[key] || DRUM_PRESETS.rock;
    return {
      kick: p.kick.slice(),
      snare: p.snare.slice(),
      hihat: p.hihat.slice(),
      ride: p.ride.slice(),
    };
  }

  loadPreset(key) {
    if (!DRUM_PRESETS[key]) return;
    this.presetKey = key;
    this.pattern = this.clonePreset(key);
    this.bpm = DRUM_PRESETS[key].bpm;
    this.emit('preset', { key, bpm: this.bpm, pattern: this.pattern });
  }

  toggleStep(track, stepIdx) {
    if (!this.pattern[track]) return;
    this.pattern[track][stepIdx] = this.pattern[track][stepIdx] ? 0 : 1;
    this.emit('pattern', this.pattern);
  }

  setBpm(bpm) {
    this.bpm = Math.max(40, Math.min(220, Math.round(bpm)));
    this.emit('bpm', this.bpm);
  }

  tapTempo() {
    const now = performance.now();
    if (this.tapTimes.length && now - this.tapTimes[this.tapTimes.length - 1] > 2000) {
      this.tapTimes = [];
    }
    this.tapTimes.push(now);
    if (this.tapTimes.length > 5) this.tapTimes.shift();
    if (this.tapTimes.length >= 2) {
      let sum = 0;
      for (let i = 1; i < this.tapTimes.length; i++) {
        sum += this.tapTimes[i] - this.tapTimes[i - 1];
      }
      const avgMs = sum / (this.tapTimes.length - 1);
      this.setBpm(60000 / avgMs);
    }
    return this.bpm;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(type, payload) {
    this.listeners.forEach((fn) => fn(type, payload));
  }

  isRunning() {
    return this.metronomeOn || this.drumsOn;
  }

  toggleMetronome() {
    this.metronomeOn = !this.metronomeOn;
    this.syncScheduler();
    this.emit('state', this.getState());
    return this.metronomeOn;
  }

  toggleDrums() {
    this.drumsOn = !this.drumsOn;
    this.syncScheduler();
    this.emit('state', this.getState());
    return this.drumsOn;
  }

  stop() {
    this.metronomeOn = false;
    this.drumsOn = false;
    this.syncScheduler();
    this.emit('state', this.getState());
  }

  getState() {
    return {
      bpm: this.bpm,
      metronomeOn: this.metronomeOn,
      drumsOn: this.drumsOn,
      currentStep: this.currentStep,
      presetKey: this.presetKey,
    };
  }

  syncScheduler() {
    if (this.isRunning() && !this.timerId) {
      const ctx = AudioEngine.ensureContext();
      this.currentStep = 0;
      this.nextNoteTime = ctx.currentTime + 0.04;
      this.timerId = setInterval(() => this.scheduler(), 25);
    } else if (!this.isRunning() && this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      this.currentStep = 0;
      this.emit('step', -1);
    }
  }

  scheduler() {
    const ctx = AudioEngine.ensureContext();
    const lookahead = 0.1;
    while (this.nextNoteTime < ctx.currentTime + lookahead) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      const secondsPer16th = (60 / this.bpm) / 4;
      this.nextNoteTime += secondsPer16th;
      this.currentStep = (this.currentStep + 1) % 16;
    }
  }

  scheduleStep(step, time) {
    const ctx = AudioEngine.ensureContext();
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isRunning()) this.emit('step', step);
    }, delayMs);

    if (AudioEngine.muted) return;

    // Metronome click on quarter notes (steps 0, 4, 8, 12)
    if (this.metronomeOn && step % 4 === 0) {
      this.playClick(time, step === 0);
    }

    // Drum machine hits
    if (this.drumsOn) {
      if (this.pattern.kick[step]) this.playKick(time);
      if (this.pattern.snare[step]) this.playSnare(time);
      if (this.pattern.hihat[step]) this.playHiHat(time);
      if (this.pattern.ride[step]) this.playRide(time);
    }
  }

  playClick(time, accent) {
    const ctx = AudioEngine.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 1480 : 980, time);
    gain.gain.setValueAtTime(accent ? 0.25 : 0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
    osc.connect(gain);
    gain.connect(AudioEngine.masterGain);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  playKick(time) {
    const ctx = AudioEngine.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.13);
    gain.gain.setValueAtTime(0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.26);
    osc.connect(gain);
    gain.connect(AudioEngine.masterGain);
    osc.start(time);
    osc.stop(time + 0.27);
  }

  playSnare(time) {
    const ctx = AudioEngine.ctx;
    // Noise burst
    const bufLen = Math.floor(ctx.sampleRate * 0.14);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) ch[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1100;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(AudioEngine.masterGain);
    src.start(time);

    // Body tone
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(195, time);
    osc.frequency.exponentialRampToValueAtTime(105, time + 0.08);
    og.gain.setValueAtTime(0.22, time);
    og.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
    osc.connect(og);
    og.connect(AudioEngine.masterGain);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  playHiHat(time) {
    const ctx = AudioEngine.ctx;
    const bufLen = Math.floor(ctx.sampleRate * 0.055);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) ch[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.14, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(AudioEngine.masterGain);
    src.start(time);
  }

  playRide(time) {
    const ctx = AudioEngine.ctx;
    const bufLen = Math.floor(ctx.sampleRate * 0.24);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) ch[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5400;
    filter.Q.value = 1.6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.13, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(AudioEngine.masterGain);
    src.start(time);
  }
}

export const RhythmEngine = new RhythmEngineClass();
