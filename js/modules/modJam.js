/**
 * Module 11: Jam Mode (Estúdio de Improvisação em Tempo Real)
 * Dedicated full-featured improvisation & backing-track studio:
 * - Backing track from Progression Library (all genres/keys) OR User's Composer Songs
 * - Synchronized 3-piece band playback: Chords (any cadence) + Auto Bassline + Drum Machine + Optional Count-in & Speed Trainer
 * - Real-time synchronized 24-fret improvisation fretboard:
 *     1) Scale + Live Chord Target Tones highlighted dynamically on every chord change
 *     2) Auto Chord-Scale (AI picks best scale per chord in real time)
 *     3) Live Chord Arpeggio (pure chord-tone soloing)
 *     4) Fixed Key Scale
 * - CAGED box / neck region focus lock + Left-Handed & 7-string support
 * - Live Now / Next Chord Teleprompter + Beat Pulse + Guide-Tone Resolution Coach
 * - Fullscreen Stage Jam Mode
 */

import { Theory } from '../core/theory.js';
import { ChordEngine } from '../core/chordEngine.js';
import { ScaleEngine } from '../core/scaleEngine.js';
import { HarmonyAI } from '../core/harmonyAI.js';
import { Storage } from '../core/storage.js';
import { AudioEngine, CHORD_CADENCES, getPresetSteps } from '../audio/audioEngine.js';
import { RhythmEngine, DRUM_PRESETS } from '../audio/rhythmEngine.js';
import { renderFretboard } from '../ui/fretboard.js';
import { renderVerticalChordSVG } from '../ui/chordDiagram.js';
import { icon } from '../ui/icons.js';

export const ModJam = {
  id: 'jam',
  state: {
    sourceType: 'progression', // 'progression' | 'song'
    keyPc: 9, // A
    genre: 'Todos',
    progId: 'blues_minor',
    songId: null,

    // Improvisation Guide Settings
    guideMode: 'scale_targets', // 'scale_targets' | 'auto_scale' | 'arpeggio' | 'fixed_scale'
    scaleId: 'pentatonic_minor',
    displayMode: 'notes', // 'notes' | 'intervals' | 'degrees'
    neckFocus: 'full', // 'full' | '0-12' | '5-12' | '12-24' | 'C' | 'A' | 'G' | 'E' | 'D'

    // Backing Track Band Mixer
    bpm: 96,
    cadenceId: 'down_up',
    chordsOn: true,
    bassOn: true,
    drumsOn: true,
    drumPreset: 'blues',
    countIn: true,
    speedTrainer: false,
    speedStepBpm: 4,
    speedEveryLoops: 2,
    speedMaxBpm: 160,

    // Runtime Playback State
    isPlaying: false,
    isCountingIn: false,
    countInBeat: 0,
    activeChordIdx: 0,
    activeBeat: -1,
    activeStep: -1,
    loopCount: 0,
    stageMode: false,
    sessionToken: 0,
    timers: [],
  },

  applyExternal(opts = {}) {
    this.stopJam();
    if (opts.keyPc !== undefined) this.state.keyPc = Theory.mod12(opts.keyPc);
    if (opts.progId) {
      this.state.sourceType = 'progression';
      this.state.progId = opts.progId;
    }
    if (opts.songId) {
      this.state.sourceType = 'song';
      this.state.songId = opts.songId;
    }
  },

  getShareParams() {
    return {
      m: 'jam',
      k: this.state.keyPc,
      p: this.state.progId,
      sc: this.state.scaleId,
      gm: this.state.guideMode,
    };
  },

  applyShareParams(p) {
    if (p.k !== undefined) this.state.keyPc = Theory.mod12(Number(p.k));
    if (p.p) this.state.progId = p.p;
    if (p.sc) this.state.scaleId = p.sc;
    if (p.gm) this.state.guideMode = p.gm;
  },

  /**
   * Resolves the active chord timeline from either a Progression or a Composer Song.
   */
  getTimeline(tuning = Theory.getTuning()) {
    if (this.state.sourceType === 'song') {
      const songs = Storage.getSongs();
      const song = songs.find((s) => s.id === this.state.songId) || songs[0];
      if (song) {
        this.state.songId = song.id;
        const items = [];
        song.sections.forEach((sec) => {
          const reps = Math.max(1, Math.min(16, Number(sec.repeats) || 1));
          for (let r = 0; r < reps; r++) {
            sec.chords.forEach((ch) => {
              const pool = ChordEngine.getVoicings(ch.rootPc, ch.type, tuning);
              const voicing = pool[ch.shapeIdx || 0] || pool[0] || null;
              items.push({
                rootPc: Theory.mod12(ch.rootPc),
                type: ch.type,
                roman: sec.type,
                symbol: Theory.getChordDisplayName(ch.rootPc, ch.type),
                voicing,
                sectionScaleId: sec.scaleId,
                sectionScaleRoot: sec.scaleRootPc,
              });
            });
          }
        });
        if (items.length) {
          return {
            title: song.title,
            keyPc: song.keyPc,
            suggestedBpm: song.bpm || 104,
            items,
          };
        }
      }
    }

    const allProgs = Theory.getProgressions();
    const prog = allProgs.find((p) => p.id === this.state.progId) || allProgs[0];
    this.state.progId = prog.id;
    const vl = HarmonyAI.computeVoiceLeading(this.state.keyPc, prog.chords, tuning);

    const items = prog.chords.map((ch, idx) => {
      const cRoot = Theory.mod12(this.state.keyPc + ch.degree);
      return {
        rootPc: cRoot,
        type: ch.type,
        roman: ch.roman,
        symbol: Theory.getChordDisplayName(cRoot, ch.type),
        voicing: vl.shapes[idx] || ChordEngine.getVoicings(cRoot, ch.type, tuning)[0] || null,
      };
    });

    const keyName = Theory.pcToNote(this.state.keyPc, Theory.useFlatsForRoot(this.state.keyPc));
    return {
      title: `${prog.name} (${keyName})`,
      keyPc: this.state.keyPc,
      suggestedBpm: prog.bpm,
      items,
    };
  },

  /**
   * Computes the exact fretboard positions & guide-tone coaching tip for the currently playing chord!
   */
  computeJamFretboardData(timeline, chordIdx, tuning) {
    const safeIdx = chordIdx >= 0 && chordIdx < timeline.items.length ? chordIdx : 0;
    const curChord = timeline.items[safeIdx];
    const nextChord = timeline.items[(safeIdx + 1) % timeline.items.length];
    const ct = Theory.getChordType(curChord.type);
    const chordPcs = new Set(ct.intervals.map((iv) => Theory.mod12(curChord.rootPc + iv)));

    // Determine active scale for the chosen guide mode
    let activeScaleRoot = timeline.keyPc;
    let activeScaleId = this.state.scaleId;
    let activeScaleLabel = '';

    if (this.state.guideMode === 'auto_scale') {
      const ai = HarmonyAI.suggestScalesForChord(curChord.rootPc, curChord.type);
      if (ai.length) {
        activeScaleRoot = ai[0].rootPc;
        activeScaleId = ai[0].scaleId;
      }
    } else if (this.state.sourceType === 'song' && curChord.sectionScaleId && this.state.guideMode === 'scale_targets') {
      activeScaleRoot = curChord.sectionScaleRoot ?? timeline.keyPc;
      activeScaleId = curChord.sectionScaleId;
    }

    const sc = Theory.getScale(activeScaleId);
    const scRootName = Theory.pcToNote(activeScaleRoot, Theory.useFlatsForRoot(activeScaleRoot));
    activeScaleLabel = `${scRootName} ${sc.name}`;

    // Build fretboard positions according to guideMode
    let positions = [];
    let cagedBoxes = null;

    if (this.state.guideMode === 'arpeggio') {
      positions = ScaleEngine.getFretboardPositions(curChord.rootPc, ct.intervals, tuning, 24).map((p) => ({
        ...p,
        ring: p.isRoot,
      }));
      activeScaleLabel = `Arpejo ${curChord.symbol} (${ct.formula})`;
    } else {
      const scalePos = ScaleEngine.getFretboardPositions(activeScaleRoot, sc.intervals, tuning, 24);
      if (this.state.guideMode === 'fixed_scale') {
        positions = scalePos;
      } else {
        // 'scale_targets' or 'auto_scale': highlight LIVE chord tones brightly inside the scale!
        const map = new Map();
        scalePos.forEach((p) => {
          const isChordTone = chordPcs.has(p.pc);
          const chordIv = Theory.mod12(p.pc - curChord.rootPc);
          const isChordRoot = chordIv === 0;
          map.set(`${p.stringIdx}:${p.fret}`, {
            ...p,
            short: isChordTone ? Theory.getIntervalInfo(chordIv).short : p.short,
            isRoot: isChordRoot,
            ring: isChordTone && !isChordRoot,
            customColor: isChordRoot
              ? '#f59e0b' // Gold = Chord Root!
              : isChordTone
                ? '#10b981' // Emerald = Live Chord Target Tone (3rd, 5th, 7th)!
                : '#334155', // Muted slate = safe scale passing note
          });
        });

        // Also ensure any chord tone outside the chosen pentatonic/scale is still clearly visible as a target!
        const chordPos = ScaleEngine.getFretboardPositions(curChord.rootPc, ct.intervals, tuning, 24);
        chordPos.forEach((cp) => {
          const k = `${cp.stringIdx}:${cp.fret}`;
          if (!map.has(k)) {
            map.set(k, {
              ...cp,
              ring: true,
              customColor: cp.isRoot ? '#f59e0b' : '#38bdf8', // Sky blue = chord color tone outside basic scale
            });
          }
        });
        positions = [...map.values()];
      }
    }

    // Apply Neck Focus (CAGED box or Fret Window)
    let startFret = 0;
    let endFret = 24;
    if (['0-12', '5-12', '12-24'].includes(this.state.neckFocus)) {
      [startFret, endFret] = this.state.neckFocus.split('-').map(Number);
    } else if (['C', 'A', 'G', 'E', 'D'].includes(this.state.neckFocus)) {
      const boxes = ScaleEngine.getCagedBoxes(activeScaleRoot, sc.intervals, tuning);
      const box = boxes.find((b) => b.letter === this.state.neckFocus);
      if (box) {
        cagedBoxes = [box];
        positions = positions.filter((p) => p.fret >= box.startFret && p.fret <= box.endFret);
      }
    }

    // Compute live guide-tone resolution tip (3rd/7th of current -> closest tone in next chord)
    const curNotes = Theory.getChordNotes(curChord.rootPc, curChord.type);
    const nextNotes = Theory.getChordNotes(nextChord.rootPc, nextChord.type);
    const guideSource = curNotes.find((n) => [3, 4, 10, 11].includes(n.interval)) || curNotes[0];
    let bestTarget = nextNotes[0];
    let minSemi = 12;
    nextNotes.forEach((nn) => {
      const dist = Math.min(Theory.mod12(nn.pc - guideSource.pc), Theory.mod12(guideSource.pc - nn.pc));
      if (dist < minSemi) {
        minSemi = dist;
        bestTarget = nn;
      }
    });

    const coachTip = curChord.symbol === nextChord.symbol
      ? `Explore notas-alvo de ${curChord.symbol}: ${curNotes.map((n) => `${n.note} (${n.short})`).join(', ')}.`
      : minSemi === 0
        ? `Nota pivô: segure ${guideSource.note} (${guideSource.short} de ${curChord.symbol}) — ela vira ${bestTarget.short} em ${nextChord.symbol}!`
        : `Resolução suave: ligue ${guideSource.note} (${guideSource.short} de ${curChord.symbol}) → ${bestTarget.note} (${bestTarget.short} de ${nextChord.symbol}, ${minSemi} semitom${minSemi > 1 ? 's' : ''}).`;

    return {
      curChord,
      nextChord,
      curNotes,
      activeScaleLabel,
      positions,
      cagedBoxes,
      startFret,
      endFret,
      coachTip,
    };
  },

  /**
   * Plays a warm organic bass note (fundamental / fifth) for the backing track.
   */
  playBassNote(rootPc, interval = 0, durationSec = 0.8) {
    if (AudioEngine.muted) return;
    const ctx = AudioEngine.ensureContext();
    const now = ctx.currentTime + 0.018;
    // Keep bass in warm electric bass register E1..E2 (MIDI 28..40)
    let midi = 36 + Theory.mod12(rootPc + interval);
    if (midi > 45) midi -= 12;
    const freq = Theory.midiToFreq(midi);

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc.type = 'triangle';
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);

    const g2 = ctx.createGain();
    g2.gain.value = 0.22;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(520, now);
    lp.frequency.exponentialRampToValueAtTime(190, now + Math.min(durationSec, 0.5));

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.32, now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(lp);
    osc2.connect(g2);
    g2.connect(lp);
    lp.connect(env);
    env.connect(AudioEngine.masterGain);

    osc.onended = () => {
      try { g2.disconnect(); lp.disconnect(); env.disconnect(); } catch {}
    };

    osc.start(now);
    osc2.start(now);
    osc.stop(now + durationSec + 0.04);
    osc2.stop(now + durationSec + 0.04);
  },

  scheduleDrumHitFor16th(step16) {
    if (!this.state.drumsOn || AudioEngine.muted) return;
    const ctx = AudioEngine.ensureContext();
    const preset = DRUM_PRESETS[this.state.drumPreset] || DRUM_PRESETS.rock;
    const t = ctx.currentTime + 0.008;
    if (preset.kick[step16]) RhythmEngine.playKick(t);
    if (preset.snare[step16]) RhythmEngine.playSnare(t);
    if (preset.hihat[step16]) RhythmEngine.playHiHat(t);
    if (preset.ride[step16]) RhythmEngine.playRide(t);
  },

  clearTimers() {
    this.state.timers.forEach((id) => clearTimeout(id));
    this.state.timers = [];
  },

  stopJam(container = null) {
    this.state.sessionToken++;
    this.clearTimers();
    AudioEngine.stopSequence();
    this.state.isPlaying = false;
    this.state.isCountingIn = false;
    this.state.countInBeat = 0;
    this.state.activeBeat = -1;
    this.state.activeStep = -1;
    this.state.loopCount = 0;
    if (container) {
      this.updateLivePlayButtons(container);
      container.querySelectorAll('.beat-dot').forEach((d) => d.classList.remove('on'));
      const bar = container.querySelector('#jam-bar-progress');
      if (bar) bar.style.width = '0%';
    }
  },

  updateLivePlayButtons(container) {
    const html = `${icon(this.state.isPlaying ? 'stop' : 'play', 14)}<span>${this.state.isPlaying ? 'Parar Jam' : 'Iniciar Jam'}</span>`;
    const b1 = container.querySelector('#jam-play-btn');
    const b2 = container.querySelector('#stage-jam-play');
    if (b1) b1.innerHTML = html;
    if (b2) b2.innerHTML = html;
  },

  /**
   * Live DOM update on chord change — re-renders ONLY the fretboard & teleprompter cards cleanly without page flicker!
   */
  updateLiveStageDOM(container, timeline, chordIdx) {
    const tuning = Theory.getTuning();
    const data = this.computeJamFretboardData(timeline, chordIdx, tuning);

    // Highlight active chord in timeline bar
    container.querySelectorAll('[data-jam-ch-idx]').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.jamChIdx) === chordIdx);
    });

    // Update Now & Next Teleprompter (normal + stage mode)
    const setTxt = (sel, txt) => container.querySelectorAll(sel).forEach((el) => { el.textContent = txt; });
    setTxt('.jam-now-symbol', data.curChord.symbol);
    setTxt('.jam-now-roman', data.curChord.roman);
    setTxt('.jam-next-symbol', data.nextChord.symbol);
    setTxt('.jam-next-roman', data.nextChord.roman);
    setTxt('.jam-active-scale-lbl', data.activeScaleLabel);
    setTxt('.jam-coach-text', data.coachTip);
    setTxt('.jam-bpm-live', `${this.state.bpm} BPM`);

    const nowDiag = container.querySelector('#jam-now-diagram');
    if (nowDiag) {
      nowDiag.innerHTML = data.curChord.voicing ? renderVerticalChordSVG(data.curChord.voicing, { compact: true }) : '';
    }
    const nowNotesEl = container.querySelector('#jam-now-notes');
    if (nowNotesEl) {
      nowNotesEl.innerHTML = data.curNotes
        .map((n) => `<span class="note-pill" style="background:${n.color}22;color:${n.color};border-color:${n.color}55">${n.note} <small>${n.short}</small></span>`)
        .join('');
    }

    // Re-render live fretboard (normal & stage mode mount if open)
    const mounts = [
      container.querySelector('#jam-fretboard-mount'),
      container.querySelector('#stage-jam-fretboard-mount'),
    ].filter(Boolean);

    mounts.forEach((mount, mIdx) => {
      renderFretboard(mount, {
        id: `jam-fb-svg-${mIdx}`,
        tuning,
        startFret: data.startFret,
        endFret: data.endFret,
        displayMode: this.state.displayMode,
        positions: data.positions,
        cagedBoxes: data.cagedBoxes,
        interactive: true,
      });
    });
  },

  startJam(container, app) {
    this.stopJam(container);
    const token = this.state.sessionToken;
    const tuning = Theory.getTuning();
    const timeline = this.getTimeline(tuning);
    if (!timeline.items.length) {
      app.toast('Nenhum acorde disponível para a Jam.');
      return;
    }

    this.state.isPlaying = true;
    this.state.loopCount = 0;
    this.updateLivePlayButtons(container);

    const schedulePass = (passStartDelayMs = 0) => {
      if (token !== this.state.sessionToken) return;
      const bpm = this.state.bpm;
      const sixteenthMs = (60000 / bpm) / 4;
      const barMs = sixteenthMs * 16;
      const steps8 = getPresetSteps(this.state.cadenceId);

      timeline.items.forEach((item, cIdx) => {
        const chordOffset = passStartDelayMs + cIdx * barMs;
        const midis = item.voicing
          ? item.voicing.stringNotes.filter((n) => !n.muted).map((n) => n.midi)
          : Theory.getChordType(item.type).intervals.map((iv) => 48 + item.rootPc + iv);

        // Chord change visual trigger
        this.state.timers.push(setTimeout(() => {
          if (token !== this.state.sessionToken) return;
          this.state.activeChordIdx = cIdx;
          this.updateLiveStageDOM(container, timeline, cIdx);
        }, chordOffset));

        // 16 sixteenth-note ticks per bar driving Drums + Bass + Chords + Beat Pulse in tight sync!
        for (let s16 = 0; s16 < 16; s16++) {
          const tickDelay = chordOffset + s16 * sixteenthMs;
          this.state.timers.push(setTimeout(() => {
            if (token !== this.state.sessionToken) return;

            // 1. Drums
            this.scheduleDrumHitFor16th(s16);

            // 2. Guitar Chords (on 8th-note boundaries: s16 = 0,2,4,6,8,10,12,14)
            if (this.state.chordsOn && s16 % 2 === 0) {
              const s8 = s16 / 2;
              AudioEngine.triggerStroke(midis, steps8[s8], s8, (sixteenthMs * 2) / 1000);
            }

            // 3. Auto Bassline (Root on beat 1, subtle octave/5th groove on beat 3 & 4.5)
            if (this.state.bassOn) {
              const beatSec = (sixteenthMs * 4) / 1000;
              if (s16 === 0) this.playBassNote(item.rootPc, 0, beatSec * 1.9);
              else if (s16 === 8) this.playBassNote(item.rootPc, 7, beatSec * 1.1);
              else if (s16 === 14) this.playBassNote(item.rootPc, 0, beatSec * 0.55);
            }

            // 4. Visual Beat Pulse & Progress Bar
            if (s16 % 4 === 0) {
              const beatIdx = s16 / 4;
              this.state.activeBeat = beatIdx;
              container.querySelectorAll('.beat-dot').forEach((d, bi) => d.classList.toggle('on', bi === beatIdx));
            }
            const progBar = container.querySelector('#jam-bar-progress');
            if (progBar) progBar.style.width = `${Math.round(((s16 + 1) / 16) * 100)}%`;
          }, tickDelay));
        }
      });

      // Schedule next loop (+ optional Speed Trainer BPM bump!)
      const passTotalMs = passStartDelayMs + timeline.items.length * barMs;
      this.state.timers.push(setTimeout(() => {
        if (token !== this.state.sessionToken) return;
        this.state.loopCount++;
        if (
          this.state.speedTrainer &&
          this.state.loopCount % this.state.speedEveryLoops === 0 &&
          this.state.bpm < this.state.speedMaxBpm
        ) {
          this.state.bpm = Math.min(this.state.speedMaxBpm, this.state.bpm + this.state.speedStepBpm);
          const bpmRange = container.querySelector('#jam-bpm-range');
          const bpmNum = container.querySelector('#jam-bpm-num');
          if (bpmRange) bpmRange.value = this.state.bpm;
          if (bpmNum) bpmNum.value = this.state.bpm;
          app.toast(`Speed Trainer: acelerado para ${this.state.bpm} BPM!`);
        }
        schedulePass(0);
      }, passTotalMs));
    };

    // Optional 4-beat Count-In before starting the backing track!
    if (this.state.countIn) {
      const beatMs = 60000 / this.state.bpm;
      this.state.isCountingIn = true;
      for (let b = 0; b < 4; b++) {
        this.state.timers.push(setTimeout(() => {
          if (token !== this.state.sessionToken) return;
          this.state.countInBeat = b + 1;
          const ctx = AudioEngine.ensureContext();
          RhythmEngine.playClick(ctx.currentTime + 0.005, b === 0 ? 'strong' : 'beat');
          container.querySelectorAll('.beat-dot').forEach((d, bi) => d.classList.toggle('on', bi === b));
          const lbl = container.querySelector('.jam-coach-text');
          if (lbl) lbl.textContent = `Prepare-se... Contagem: ${b + 1} / 4`;
        }, b * beatMs));
      }
      this.state.timers.push(setTimeout(() => {
        this.state.isCountingIn = false;
      }, 4 * beatMs));
      schedulePass(4 * beatMs);
    } else {
      schedulePass(0);
    }
  },

  restartIfPlaying(container, app) {
    const wasPlaying = this.state.isPlaying;
    if (wasPlaying) this.stopJam(container);
    this.render(container, app);
    if (wasPlaying) this.startJam(container, app);
  },

  render(container, app) {
    const tuning = Theory.getTuning();
    const timeline = this.getTimeline(tuning);
    if (this.state.activeChordIdx >= timeline.items.length) this.state.activeChordIdx = 0;
    const data = this.computeJamFretboardData(timeline, this.state.activeChordIdx, tuning);

    const genres = ['Todos', ...Theory.getGenres()];
    const allProgs = Theory.getProgressions();
    const visibleProgs = this.state.genre === 'Todos' ? allProgs : allProgs.filter((p) => p.genre === this.state.genre);
    const songs = Storage.getSongs();

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Jam Mode — Estúdio de Improvisação</h2>
          <p class="module-subtitle">Banda completa (Acordes + Baixo + Bateria) tocando em loop enquanto o braço destaca as notas-alvo de cada acorde ao vivo.</p>
        </div>
        <div class="action-bar stable-actions">
          <button id="jam-play-btn" class="btn btn-primary btn-play-toggle">${icon(this.state.isPlaying ? 'stop' : 'play', 14)}<span>${this.state.isPlaying ? 'Parar Jam' : 'Iniciar Jam'}</span></button>
          <button id="jam-stage-btn" class="btn btn-ghost btn-sm">${icon('maximize', 14)} Tela Cheia</button>
        </div>
      </div>

      <!-- Backing Track & Band Mixer Card -->
      <section class="card jam-controls-card">
        <div class="controls-split" style="margin-bottom:12px;">
          <div class="segmented-tabs compact">
            <button class="seg-tab ${this.state.sourceType === 'progression' ? 'active' : ''}" data-jam-src="progression">Progressões Prontas</button>
            <button class="seg-tab ${this.state.sourceType === 'song' ? 'active' : ''}" data-jam-src="song">Minhas Músicas (${songs.length})</button>
          </div>

          <!-- Band Mixer Toggles -->
          <div class="action-bar">
            <button id="jam-tog-chords" class="btn ${this.state.chordsOn ? 'btn-gold-active' : 'btn-ghost'} btn-xs">${icon('guitar', 13)} Base</button>
            <button id="jam-tog-bass" class="btn ${this.state.bassOn ? 'btn-gold-active' : 'btn-ghost'} btn-xs">${icon('musicNote', 13)} Baixo</button>
            <button id="jam-tog-drums" class="btn ${this.state.drumsOn ? 'btn-gold-active' : 'btn-ghost'} btn-xs">${icon('drum', 13)} Bateria</button>
            <button id="jam-tog-countin" class="btn ${this.state.countIn ? 'btn-secondary' : 'btn-ghost'} btn-xs">${icon('metronome', 13)} Contagem 1-4</button>
            <button id="jam-tog-speed" class="btn ${this.state.speedTrainer ? 'btn-accent-active' : 'btn-ghost'} btn-xs">${icon('arpeggios', 13)} Speed Trainer</button>
          </div>
        </div>

        ${this.state.sourceType === 'progression' ? `
          <div class="jam-picker-grid">
            <div class="inline-control">
              <label class="field-label">Tom</label>
              <select id="jam-key-sel" class="select-control select-sm">
                ${Theory.getAllRoots().map((r) => `<option value="${r.pc}" ${r.pc === this.state.keyPc ? 'selected' : ''}>${r.label}</option>`).join('')}
              </select>
            </div>
            <div class="inline-control">
              <label class="field-label">Estilo</label>
              <select id="jam-genre-sel" class="select-control select-sm">
                ${genres.map((g) => `<option value="${g}" ${g === this.state.genre ? 'selected' : ''}>${g}</option>`).join('')}
              </select>
            </div>
            <div class="inline-control" style="flex:1;min-width:220px;">
              <label class="field-label">Progressão da Jam</label>
              <select id="jam-prog-sel" class="select-control select-sm">
                ${visibleProgs.map((p) => `<option value="${p.id}" ${p.id === this.state.progId ? 'selected' : ''}>[${p.genre}] ${p.name}</option>`).join('')}
              </select>
            </div>
          </div>
        ` : `
          <div class="jam-picker-grid">
            ${songs.length ? `
              <div class="inline-control" style="flex:1;min-width:260px;">
                <label class="field-label">Música do Compositor</label>
                <select id="jam-song-sel" class="select-control select-sm">
                  ${songs.map((s) => `<option value="${s.id}" ${s.id === this.state.songId ? 'selected' : ''}>${s.title} (${s.bpm} BPM)</option>`).join('')}
                </select>
              </div>
            ` : `
              <div class="jam-empty-songs">
                <span class="muted-text small">Você ainda não salvou nenhuma música no Compositor.</span>
                <button type="button" id="jam-go-composer" class="btn btn-secondary btn-xs">${icon('composer', 13)} Abrir Compositor</button>
              </div>
            `}
          </div>
        `}

        <!-- Tempo, Cadence & Drum Style Bar -->
        <div class="inline-playback-bar" style="margin-top:12px;">
          <div class="pb-field">
            <label class="pb-label" for="jam-bpm-num">${icon('metronome', 13)} BPM</label>
            <div class="pb-bpm-group">
              <input type="range" id="jam-bpm-range" class="pb-range" min="40" max="200" value="${this.state.bpm}">
              <input type="number" id="jam-bpm-num" class="pb-num mono-text" min="40" max="200" value="${this.state.bpm}">
            </div>
          </div>

          <div class="pb-field">
            <label class="pb-label" for="jam-cad-sel">Levada</label>
            <select id="jam-cad-sel" class="select-control select-xs">
              ${CHORD_CADENCES.map((c) => `<option value="${c.id}" ${c.id === this.state.cadenceId ? 'selected' : ''}>${c.label}</option>`).join('')}
            </select>
          </div>

          <div class="pb-field">
            <label class="pb-label" for="jam-drum-sel">Bateria</label>
            <select id="jam-drum-sel" class="select-control select-xs">
              ${Object.entries(DRUM_PRESETS).map(([k, v]) => `<option value="${k}" ${k === this.state.drumPreset ? 'selected' : ''}>${v.name}</option>`).join('')}
            </select>
          </div>

          ${this.state.speedTrainer ? `
            <div class="pb-field">
              <span class="badge badge-accent">+${this.state.speedStepBpm} BPM a cada ${this.state.speedEveryLoops} voltas (até ${this.state.speedMaxBpm})</span>
            </div>
          ` : ''}
        </div>
      </section>

      <!-- Live Now / Next Chord Teleprompter + Progression Strip -->
      <section class="card jam-teleprompter-card">
        <div class="jam-now-next-grid">
          <div class="subcard jam-now-box">
            <div class="jam-now-top">
              <div>
                <span class="field-label" style="margin-bottom:2px;">Acorde Atual</span>
                <div class="jam-big-chord-row">
                  <span class="roman-badge jam-now-roman">${data.curChord.roman}</span>
                  <strong class="jam-now-symbol">${data.curChord.symbol}</strong>
                </div>
                <div class="pill-wrap" id="jam-now-notes" style="margin-top:8px;">
                  ${data.curNotes.map((n) => `<span class="note-pill" style="background:${n.color}22;color:${n.color};border-color:${n.color}55">${n.note} <small>${n.short}</small></span>`).join('')}
                </div>
              </div>
              <div id="jam-now-diagram" class="jam-mini-diag">
                ${data.curChord.voicing ? renderVerticalChordSVG(data.curChord.voicing, { compact: true }) : ''}
              </div>
            </div>

            <div class="jam-beat-row">
              <div class="stage-beat-dots">
                <span class="beat-dot ${this.state.activeBeat === 0 ? 'on' : ''}">1</span>
                <span class="beat-dot ${this.state.activeBeat === 1 ? 'on' : ''}">2</span>
                <span class="beat-dot ${this.state.activeBeat === 2 ? 'on' : ''}">3</span>
                <span class="beat-dot ${this.state.activeBeat === 3 ? 'on' : ''}">4</span>
              </div>
              <div class="jam-progress-track">
                <div id="jam-bar-progress" class="jam-progress-fill" style="width:0%"></div>
              </div>
            </div>
          </div>

          <div class="subcard jam-next-box">
            <span class="field-label">Próximo Acorde</span>
            <div class="jam-next-chord-row">
              <span class="roman-badge jam-next-roman">${data.nextChord.roman}</span>
              <strong class="jam-next-symbol">${data.nextChord.symbol}</strong>
            </div>

            <div class="jam-coach-box">
              <span class="field-label icon-label" style="margin-bottom:4px;">${icon('sparkles', 12, 'text-gold')} Dica de Fraseado ao Vivo</span>
              <p class="small jam-coach-text" style="margin:0;color:var(--text-primary);">${data.coachTip}</p>
            </div>
          </div>
        </div>

        <!-- Clickable Progression Strip -->
        <div class="jam-timeline-strip">
          ${timeline.items.map((it, idx) => `
            <button type="button" class="jam-ch-pill ${idx === this.state.activeChordIdx ? 'active' : ''}" data-jam-ch-idx="${idx}">
              <span class="small muted-text">${it.roman}</span>
              <strong>${it.symbol}</strong>
            </button>
          `).join('')}
        </div>
      </section>

      <!-- Live Synchronized 24-Fret Improvisation Board -->
      <section class="card">
        <div class="controls-split" style="margin-bottom:10px;">
          <div>
            <h3 class="section-title icon-label" style="margin-bottom:6px;">
              ${icon('radio', 16, 'text-gold')} Guia no Braço: <span class="text-gold jam-active-scale-lbl">${data.activeScaleLabel}</span>
            </h3>
            <div class="segmented-tabs compact">
              <button class="seg-tab ${this.state.guideMode === 'scale_targets' ? 'active' : ''}" data-jam-gm="scale_targets">Escala + Notas-Alvo</button>
              <button class="seg-tab ${this.state.guideMode === 'auto_scale' ? 'active' : ''}" data-jam-gm="auto_scale">IA por Acorde</button>
              <button class="seg-tab ${this.state.guideMode === 'arpeggio' ? 'active' : ''}" data-jam-gm="arpeggio">Só Arpejo</button>
              <button class="seg-tab ${this.state.guideMode === 'fixed_scale' ? 'active' : ''}" data-jam-gm="fixed_scale">Escala Fixa</button>
            </div>
          </div>

          <div class="action-bar">
            ${this.state.guideMode === 'scale_targets' || this.state.guideMode === 'fixed_scale' ? `
              <select id="jam-scale-sel" class="select-control select-xs" aria-label="Escala da jam">
                ${Theory.getScales().filter((s) => s.id !== 'chromatic').map((s) => `<option value="${s.id}" ${s.id === this.state.scaleId ? 'selected' : ''}>${s.name}</option>`).join('')}
              </select>
            ` : ''}
            <select id="jam-focus-sel" class="select-control select-xs" aria-label="Região ou CAGED">
              <option value="full" ${this.state.neckFocus === 'full' ? 'selected' : ''}>Braço Inteiro (0–24)</option>
              <option value="0-12" ${this.state.neckFocus === '0-12' ? 'selected' : ''}>Casas 0–12</option>
              <option value="5-12" ${this.state.neckFocus === '5-12' ? 'selected' : ''}>Casas 5–12</option>
              <option value="12-24" ${this.state.neckFocus === '12-24' ? 'selected' : ''}>Casas 12–24</option>
              ${['C', 'A', 'G', 'E', 'D'].map((l) => `<option value="${l}" ${this.state.neckFocus === l ? 'selected' : ''}>Box CAGED ${l}</option>`).join('')}
            </select>
            <select id="jam-disp-sel" class="select-control select-xs" aria-label="Rótulo das notas">
              <option value="notes" ${this.state.displayMode === 'notes' ? 'selected' : ''}>Notas</option>
              <option value="intervals" ${this.state.displayMode === 'intervals' ? 'selected' : ''}>Intervalos</option>
              <option value="degrees" ${this.state.displayMode === 'degrees' ? 'selected' : ''}>Graus</option>
            </select>
          </div>
        </div>

        <div class="fretboard-scroll" id="jam-fretboard-mount"></div>

        <div class="fretboard-legend">
          <div class="legend-items">
            <span class="legend-dot"><i style="background:#f59e0b"></i> Tônica do Acorde Atual</span>
            <span class="legend-dot"><i style="background:#10b981"></i> Notas-Alvo do Acorde (3ª, 5ª, 7ª)</span>
            <span class="legend-dot"><i style="background:#38bdf8"></i> Nota de Cor do Acorde</span>
            <span class="legend-dot"><i style="background:#475569"></i> Notas de Passagem da Escala</span>
          </div>
        </div>
      </section>

      <!-- Fullscreen Stage Jam Mode -->
      ${this.state.stageMode ? `
        <div class="stage-overlay" role="dialog" aria-modal="true" aria-label="Jam Mode — Tela Cheia">
          <div class="stage-header">
            <div>
              <h2 class="stage-title">${timeline.title}</h2>
              <div class="stage-beat-dots">
                <span class="beat-dot ${this.state.activeBeat === 0 ? 'on' : ''}">1</span>
                <span class="beat-dot ${this.state.activeBeat === 1 ? 'on' : ''}">2</span>
                <span class="beat-dot ${this.state.activeBeat === 2 ? 'on' : ''}">3</span>
                <span class="beat-dot ${this.state.activeBeat === 3 ? 'on' : ''}">4</span>
                <span class="mono-text muted-text jam-bpm-live" style="margin-left:10px;">${this.state.bpm} BPM</span>
                <span class="badge badge-gold jam-active-scale-lbl" style="margin-left:8px;">${data.activeScaleLabel}</span>
              </div>
            </div>
            <div class="action-bar stable-actions">
              <button id="stage-jam-play" class="btn btn-primary btn-play-toggle">${icon(this.state.isPlaying ? 'stop' : 'play', 14)}<span>${this.state.isPlaying ? 'Parar Jam' : 'Iniciar Jam'}</span></button>
              <button id="stage-jam-close" class="btn btn-ghost">${icon('minimize', 15)} Sair da Tela Cheia</button>
            </div>
          </div>

          <div class="jam-stage-banner">
            <div class="jam-stage-now">
              <span class="field-label">TOCANDO AGORA</span>
              <div class="jam-big-chord-row">
                <span class="roman-badge jam-now-roman">${data.curChord.roman}</span>
                <strong class="jam-now-symbol" style="font-size:44px;">${data.curChord.symbol}</strong>
              </div>
            </div>
            <div class="jam-stage-coach">
              <span class="field-label">DICA DE FRASEADO</span>
              <p class="jam-coach-text" style="margin:0;font-size:15px;">${data.coachTip}</p>
            </div>
            <div class="jam-stage-next">
              <span class="field-label">PRÓXIMO</span>
              <div class="jam-next-chord-row">
                <span class="roman-badge jam-next-roman">${data.nextChord.roman}</span>
                <strong class="jam-next-symbol" style="font-size:32px;">${data.nextChord.symbol}</strong>
              </div>
            </div>
          </div>

          <div class="card" style="padding:18px;">
            <div class="fretboard-scroll" id="stage-jam-fretboard-mount"></div>
          </div>
        </div>
      ` : ''}
    `;

    // Render fretboards immediately
    const fbOpts = {
      tuning,
      startFret: data.startFret,
      endFret: data.endFret,
      displayMode: this.state.displayMode,
      positions: data.positions,
      cagedBoxes: data.cagedBoxes,
      interactive: true,
    };
    renderFretboard(container.querySelector('#jam-fretboard-mount'), { ...fbOpts, id: 'jam-fb-svg-0' });
    const stageFb = container.querySelector('#stage-jam-fretboard-mount');
    if (stageFb) renderFretboard(stageFb, { ...fbOpts, id: 'jam-fb-svg-1' });

    this.bindEvents(container, app, timeline);
  },

  bindEvents(container, app, timeline) {
    const togglePlay = () => {
      if (this.state.isPlaying) this.stopJam(container);
      else this.startJam(container, app);
    };
    container.querySelector('#jam-play-btn')?.addEventListener('click', togglePlay);
    container.querySelector('#stage-jam-play')?.addEventListener('click', togglePlay);

    container.querySelector('#jam-stage-btn')?.addEventListener('click', () => {
      this.state.stageMode = true;
      this.render(container, app);
    });
    container.querySelector('#stage-jam-close')?.addEventListener('click', () => {
      this.state.stageMode = false;
      this.render(container, app);
    });

    container.querySelectorAll('[data-jam-src]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.sourceType = btn.dataset.jamSrc;
        this.state.activeChordIdx = 0;
        this.restartIfPlaying(container, app);
      });
    });

    container.querySelector('#jam-key-sel')?.addEventListener('change', (e) => {
      this.state.keyPc = Number(e.target.value);
      this.restartIfPlaying(container, app);
    });

    container.querySelector('#jam-genre-sel')?.addEventListener('change', (e) => {
      this.state.genre = e.target.value;
      const list = this.state.genre === 'Todos'
        ? Theory.getProgressions()
        : Theory.getProgressions().filter((p) => p.genre === this.state.genre);
      if (list.length && !list.some((p) => p.id === this.state.progId)) {
        this.state.progId = list[0].id;
        this.state.bpm = list[0].bpm;
        const gKey = list[0].genre.toLowerCase();
        if (DRUM_PRESETS[gKey]) this.state.drumPreset = gKey;
      }
      this.state.activeChordIdx = 0;
      this.restartIfPlaying(container, app);
    });

    container.querySelector('#jam-prog-sel')?.addEventListener('change', (e) => {
      this.state.progId = e.target.value;
      const prog = Theory.getProgressions().find((p) => p.id === this.state.progId);
      if (prog) {
        this.state.bpm = prog.bpm;
        const gKey = prog.genre.toLowerCase();
        if (DRUM_PRESETS[gKey]) this.state.drumPreset = gKey;
      }
      this.state.activeChordIdx = 0;
      this.restartIfPlaying(container, app);
    });

    container.querySelector('#jam-song-sel')?.addEventListener('change', (e) => {
      this.state.songId = e.target.value;
      const s = Storage.getSongs().find((x) => x.id === this.state.songId);
      if (s && s.bpm) this.state.bpm = s.bpm;
      this.state.activeChordIdx = 0;
      this.restartIfPlaying(container, app);
    });

    container.querySelector('#jam-go-composer')?.addEventListener('click', () => {
      app.navigate('composer');
    });

    // Mixer toggles
    container.querySelector('#jam-tog-chords')?.addEventListener('click', () => { this.state.chordsOn = !this.state.chordsOn; this.render(container, app); });
    container.querySelector('#jam-tog-bass')?.addEventListener('click', () => { this.state.bassOn = !this.state.bassOn; this.render(container, app); });
    container.querySelector('#jam-tog-drums')?.addEventListener('click', () => { this.state.drumsOn = !this.state.drumsOn; this.render(container, app); });
    container.querySelector('#jam-tog-countin')?.addEventListener('click', () => { this.state.countIn = !this.state.countIn; this.render(container, app); });
    container.querySelector('#jam-tog-speed')?.addEventListener('click', () => { this.state.speedTrainer = !this.state.speedTrainer; this.render(container, app); });

    // BPM / Cadence / Drums
    const syncBpmInputs = (val) => {
      this.state.bpm = Math.max(40, Math.min(200, Math.round(Number(val) || 100)));
      const r = container.querySelector('#jam-bpm-range');
      const n = container.querySelector('#jam-bpm-num');
      if (r) r.value = this.state.bpm;
      if (n) n.value = this.state.bpm;
      container.querySelectorAll('.jam-bpm-live').forEach((el) => { el.textContent = `${this.state.bpm} BPM`; });
    };
    container.querySelector('#jam-bpm-range')?.addEventListener('input', (e) => syncBpmInputs(e.target.value));
    container.querySelector('#jam-bpm-range')?.addEventListener('change', (e) => {
      syncBpmInputs(e.target.value);
      if (this.state.isPlaying) this.startJam(container, app);
    });
    container.querySelector('#jam-bpm-num')?.addEventListener('change', (e) => {
      syncBpmInputs(e.target.value);
      if (this.state.isPlaying) this.startJam(container, app);
    });

    container.querySelector('#jam-cad-sel')?.addEventListener('change', (e) => {
      this.state.cadenceId = e.target.value;
      if (this.state.isPlaying) this.startJam(container, app);
    });
    container.querySelector('#jam-drum-sel')?.addEventListener('change', (e) => {
      this.state.drumPreset = e.target.value;
    });

    // Fretboard Guide settings (apply live without stopping jam!)
    container.querySelectorAll('[data-jam-gm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.guideMode = btn.dataset.jamGm;
        this.render(container, app);
      });
    });
    container.querySelector('#jam-scale-sel')?.addEventListener('change', (e) => {
      this.state.scaleId = e.target.value;
      this.updateLiveStageDOM(container, timeline, this.state.activeChordIdx);
    });
    container.querySelector('#jam-focus-sel')?.addEventListener('change', (e) => {
      this.state.neckFocus = e.target.value;
      this.updateLiveStageDOM(container, timeline, this.state.activeChordIdx);
    });
    container.querySelector('#jam-disp-sel')?.addEventListener('change', (e) => {
      this.state.displayMode = e.target.value;
      this.updateLiveStageDOM(container, timeline, this.state.activeChordIdx);
    });

    // Click any chord pill in timeline to inspect & audition it
    container.querySelectorAll('[data-jam-ch-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.jamChIdx);
        this.state.activeChordIdx = idx;
        this.updateLiveStageDOM(container, timeline, idx);
        const item = timeline.items[idx];
        if (!this.state.isPlaying && item && item.voicing) {
          AudioEngine.playChord(item.voicing.stringNotes.filter((n) => !n.muted).map((n) => n.midi));
        }
      });
    });
  },
};
