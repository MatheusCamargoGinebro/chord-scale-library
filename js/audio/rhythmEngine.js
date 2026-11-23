/**
 * Precision Web Audio Metronome (Multi-Meter & Subdivisions) + 16-Step Drum Machine
 */

import { AudioEngine } from './audioEngine.js';

export const METRONOME_RHYTHMS = [
  { id: '4_4', name: '4/4 Padrão (1-2-3-4)', beats: 4, sub: 1, beatUnit: 1, accents: [0] },
  { id: '4_4_8th', name: '4/4 Colcheias (1 e 2 e)', beats: 4, sub: 2, beatUnit: 1, accents: [0] },
  { id: '4_4_16th', name: '4/4 Semicolcheias (16x)', beats: 4, sub: 4, beatUnit: 1, accents: [0] },
  { id: '4_4_triplet', name: '4/4 Tercinas (Shuffle)', beats: 4, sub: 3, beatUnit: 1, accents: [0] },
  { id: '3_4', name: '3/4 Valsa (1-2-3)', beats: 3, sub: 1, beatUnit: 1, accents: [0] },
  { id: '2_4', name: '2/4 Samba / Marcha (1-2)', beats: 2, sub: 1, beatUnit: 1, accents: [0] },
  { id: '6_8', name: '6/8 Composto (1-2-3 4-5-6)', beats: 6, sub: 1, beatUnit: 0.5, accents: [0, 3] },
  { id: '5_4', name: '5/4 Ímpar (Take Five)', beats: 5, sub: 1, beatUnit: 1, accents: [0, 3] },
  { id: '7_8', name: '7/8 Prog / Fusion (2+2+3)', beats: 7, sub: 1, beatUnit: 0.5, accents: [0, 2, 4] },
];

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
    this.metroRhythmId = '4_4';

    // Drum scheduler state (16th notes)
    this.currentStep = 0;
    this.nextDrumTime = 0;
    this.drumTimerId = null;

    // Dedicated Metronome scheduler state (supports any meter & subdivision cleanly)
    this.metroTick = 0;
    this.nextMetroTime = 0;
    this.metroTimerId = null;

    this.listeners = new Set();
    this.tapTimes = [];
    this.pattern = this.clonePreset('rock');
    this.presetKey = 'rock';
  }

  getMetronomeRhythm() {
    return METRONOME_RHYTHMS.find((r) => r.id === this.metroRhythmId) || METRONOME_RHYTHMS[0];
  }

  setMetronomeRhythm(id) {
    if (!METRONOME_RHYTHMS.some((r) => r.id === id)) return;
    this.metroRhythmId = id;
    this.metroTick = 0;
    if (this.metronomeOn) {
      const ctx = AudioEngine.ensureContext();
      this.nextMetroTime = ctx.currentTime + 0.04;
    }
    this.emit('metroRhythm', this.getMetronomeRhythm());
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
      for (let i = 1; i < this.tapTimes.length; i++) sum += this.tapTimes[i] - this.tapTimes[i - 1];
      this.setBpm(60000 / (sum / (this.tapTimes.length - 1)));
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
    this.syncSchedulers();
    this.emit('state', this.getState());
    return this.metronomeOn;
  }

  toggleDrums() {
    this.drumsOn = !this.drumsOn;
    this.syncSchedulers();
    this.emit('state', this.getState());
    return this.drumsOn;
  }

  stop() {
    this.metronomeOn = false;
    this.drumsOn = false;
    this.syncSchedulers();
    this.emit('state', this.getState());
  }

  getState() {
    return {
      bpm: this.bpm,
      metronomeOn: this.metronomeOn,
      drumsOn: this.drumsOn,
      currentStep: this.currentStep,
      presetKey: this.presetKey,
      metroRhythmId: this.metroRhythmId,
    };
  }

  syncSchedulers() {
    const ctx = (this.metronomeOn || this.drumsOn) ? AudioEngine.ensureContext() : null;

    // Metronome scheduler
    if (this.metronomeOn && !this.metroTimerId) {
      this.metroTick = 0;
      this.nextMetroTime = ctx.currentTime + 0.04;
      this.metroTimerId = setInterval(() => this.metroScheduler(), 25);
    } else if (!this.metronomeOn && this.metroTimerId) {
      clearInterval(this.metroTimerId);
      this.metroTimerId = null;
      this.metroTick = 0;
      this.emit('metroBeat', -1);
    }

    // Drum scheduler
    if (this.drumsOn && !this.drumTimerId) {
      this.currentStep = 0;
      this.nextDrumTime = ctx.currentTime + 0.04;
      this.drumTimerId = setInterval(() => this.drumScheduler(), 25);
    } else if (!this.drumsOn && this.drumTimerId) {
      clearInterval(this.drumTimerId);
      this.drumTimerId = null;
      this.currentStep = 0;
      this.emit('step', -1);
    }
  }

  metroScheduler() {
    const ctx = AudioEngine.ensureContext();
    const lookahead = 0.1;
    const rhythm = this.getMetronomeRhythm();
    const totalTicks = rhythm.beats * rhythm.sub;
    const secPerTick = ((60 / this.bpm) * rhythm.beatUnit) / rhythm.sub;

    while (this.nextMetroTime < ctx.currentTime + lookahead) {
      this.scheduleMetroTick(this.metroTick, rhythm, this.nextMetroTime);
      this.nextMetroTime += secPerTick;
      this.metroTick = (this.metroTick + 1) % totalTicks;
    }
  }

  scheduleMetroTick(tick, rhythm, time) {
    const ctx = AudioEngine.ctx;
    const beatIdx = Math.floor(tick / rhythm.sub);
    const isSub = (tick % rhythm.sub) !== 0;

    if (!isSub) {
      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
      setTimeout(() => {
        if (this.metronomeOn) this.emit('metroBeat', beatIdx);
      }, delayMs);
    }

    if (AudioEngine.muted) return;

    let level = 'beat';
    if (isSub) level = 'sub';
    else if (beatIdx === 0) level = 'strong';
    else if (rhythm.accents.includes(beatIdx)) level = 'accent2';

    this.playClick(time, level);
  }

  drumScheduler() {
    const ctx = AudioEngine.ensureContext();
    const lookahead = 0.1;
    while (this.nextDrumTime < ctx.currentTime + lookahead) {
      this.scheduleDrumStep(this.currentStep, this.nextDrumTime);
      const secondsPer16th = (60 / this.bpm) / 4;
      this.nextDrumTime += secondsPer16th;
      this.currentStep = (this.currentStep + 1) % 16;
    }
  }

  scheduleDrumStep(step, time) {
    const ctx = AudioEngine.ctx;
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.drumsOn) this.emit('step', step);
    }, delayMs);

    if (AudioEngine.muted) return;

    if (this.pattern.kick[step]) this.playKick(time);
    if (this.pattern.snare[step]) this.playSnare(time);
    if (this.pattern.hihat[step]) this.playHiHat(time);
    if (this.pattern.ride[step]) this.playRide(time);
  }

  playClick(time, level = 'beat') {
    const ctx = AudioEngine.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = level === 'sub' ? 'sine' : 'triangle';

    const cfg = {
      strong:  { freq: 1580, amp: 0.28, dur: 0.048 },
      accent2: { freq: 1260, amp: 0.21, dur: 0.044 },
      beat:    { freq: 980,  amp: 0.16, dur: 0.040 },
      sub:     { freq: 720,  amp: 0.085, dur: 0.028 },
    }[level] || { freq: 980, amp: 0.16, dur: 0.04 };

    osc.frequency.setValueAtTime(cfg.freq, time);
    gain.gain.setValueAtTime(cfg.amp, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + cfg.dur);
    osc.connect(gain);
    gain.connect(AudioEngine.masterGain);
    osc.start(time);
    osc.stop(time + cfg.dur + 0.01);
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
