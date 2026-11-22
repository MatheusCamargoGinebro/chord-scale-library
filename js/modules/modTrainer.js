/**
 * Module 8: Interactive Music Trainer / Quiz (Treinador Interativo)
 * Modes: Note Identification, Chord Identification, Scale Identification, Interval Identification, Mixed.
 * Tracks Hits, Misses, Accuracy, Streak, Live Timer, and Persistent Performance History.
 */

import { Theory } from '../core/theory.js';
import { ChordEngine } from '../core/chordEngine.js';
import { ScaleEngine } from '../core/scaleEngine.js';
import { Storage } from '../core/storage.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { renderFretboard } from '../ui/fretboard.js';
import { renderVerticalChordSVG } from '../ui/chordDiagram.js';

export const ModTrainer = {
  id: 'trainer',
  state: {
    quizType: 'note', // 'note' | 'chord' | 'scale' | 'interval' | 'mixed'
    question: null,
    answered: null, // { selected, isCorrect }
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    startedAt: null,
    elapsedSec: 0,
    timerId: null,
  },

  startTimer(container) {
    if (this.state.timerId) clearInterval(this.state.timerId);
    if (!this.state.startedAt) this.state.startedAt = Date.now();
    this.state.timerId = setInterval(() => {
      this.state.elapsedSec = Math.floor((Date.now() - this.state.startedAt) / 1000);
      const el = container.querySelector('#quiz-timer-val');
      if (el) el.textContent = this.formatTime(this.state.elapsedSec);
    }, 1000);
  },

  formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  },

  pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  generateQuestion() {
    const tuning = Theory.getTuning();
    const types = ['note', 'chord', 'scale', 'interval'];
    const actualType = this.state.quizType === 'mixed' ? this.pickRandom(types) : this.state.quizType;

    if (actualType === 'note') {
      const stringIdx = Math.floor(Math.random() * tuning.strings);
      const fret = Math.floor(Math.random() * 13);
      const midi = Theory.getFretMidi(stringIdx, fret, tuning);
      const pc = Theory.mod12(midi);
      const correctLabel = Theory.pcToNote(pc, false);

      const distractors = new Set([correctLabel]);
      while (distractors.size < 4) {
        distractors.add(Theory.pcToNote(Math.floor(Math.random() * 12), false));
      }

      return {
        type: 'note',
        prompt: `Qual é esta nota na ${tuning.strings - stringIdx}ª corda, casa ${fret}?`,
        correctAnswer: correctLabel,
        options: this.shuffle([...distractors]),
        explanation: `Na afinação ${tuning.short}, a ${tuning.strings - stringIdx}ª corda solta é ${tuning.notes[stringIdx]} + ${fret} semitons = ${correctLabel}.`,
        visual: {
          kind: 'fretboard',
          positions: [{ stringIdx, fret, note: '?', short: '?', degree: '?', customColor: '#f59e0b', isRoot: true }],
        },
        play: () => AudioEngine.playNote(midi, 1.8),
      };
    }

    if (actualType === 'chord') {
      const rootPc = Math.floor(Math.random() * 12);
      const pool = ['maj', 'min', '7', 'maj7', 'm7', 'sus2', 'sus4', 'dim', 'aug', 'add9'];
      const typeId = this.pickRandom(pool);
      const voicings = ChordEngine.getVoicings(rootPc, typeId, tuning);
      const voicing = voicings[0];
      const ct = Theory.getChordType(typeId);
      const correctLabel = `${Theory.pcToNote(rootPc, false)}${ct.symbol}`;

      const distractors = new Set([correctLabel]);
      while (distractors.size < 4) {
        const altType = this.pickRandom(pool);
        const altRoot = Math.random() > 0.4 ? rootPc : Math.floor(Math.random() * 12);
        const altCt = Theory.getChordType(altType);
        distractors.add(`${Theory.pcToNote(altRoot, false)}${altCt.symbol}`);
      }

      return {
        type: 'chord',
        prompt: 'Qual é este acorde?',
        correctAnswer: correctLabel,
        options: this.shuffle([...distractors]),
        explanation: `${correctLabel} (${ct.name}) possui fórmula ${ct.formula} com notas ${Theory.getChordNotes(rootPc, typeId).map((n) => n.note).join(' - ')}.`,
        visual: { kind: 'chord', voicing },
        play: () => {
          if (voicing) AudioEngine.playChord(voicing.stringNotes.filter((n) => !n.muted).map((n) => n.midi), { strumMs: 32 });
        },
      };
    }

    if (actualType === 'scale') {
      const rootPc = this.pickRandom([0, 2, 4, 5, 7, 9]);
      const pool = ['major', 'natural_minor', 'pentatonic_minor', 'pentatonic_major', 'blues', 'dorian', 'mixolydian', 'phrygian', 'lydian', 'harmonic_minor'];
      const scId = this.pickRandom(pool);
      const sc = Theory.getScale(scId);
      const rootName = Theory.pcToNote(rootPc, false);
      const correctLabel = `${rootName} ${sc.name}`;

      const distractors = new Set([correctLabel]);
      while (distractors.size < 4) {
        const altSc = Theory.getScale(this.pickRandom(pool));
        distractors.add(`${rootName} ${altSc.name}`);
      }

      const positions = ScaleEngine.getFretboardPositions(rootPc, sc.intervals, tuning, 12);

      return {
        type: 'scale',
        prompt: `Qual é esta escala com tônica em ${rootName} (destacada em dourado)?`,
        correctAnswer: correctLabel,
        options: this.shuffle([...distractors]),
        explanation: `${correctLabel} tem fórmula ${sc.formula}. Característica: ${sc.characteristic}.`,
        visual: { kind: 'fretboard_scale', positions },
        play: () => {
          const base = 48 + rootPc;
          AudioEngine.playSequence([...sc.intervals.map((iv) => base + iv), base + 12], { bpm: 135, subdivision: 2 });
        },
      };
    }

    // Interval question
    const s1 = Math.floor(Math.random() * Math.max(1, tuning.strings - 2));
    const f1 = 2 + Math.floor(Math.random() * 8);
    const midi1 = Theory.getFretMidi(s1, f1, tuning);
    const targetIv = 1 + Math.floor(Math.random() * 11); // 1..11 semitones
    const midi2 = midi1 + targetIv;

    // Place second note on next string or +2 strings cleanly
    let s2 = s1 + 1;
    let f2 = midi2 - tuning.midi[s2];
    if (f2 < 0 || f2 > 15) {
      s2 = s1;
      f2 = f1 + targetIv;
    }

    const ivInfo = Theory.getIntervalInfo(targetIv);
    const correctLabel = `${ivInfo.short} — ${ivInfo.name}`;
    const distractors = new Set([correctLabel]);
    while (distractors.size < 4) {
      const alt = Theory.getIntervalInfo(1 + Math.floor(Math.random() * 11));
      distractors.add(`${alt.short} — ${alt.name}`);
    }

    return {
      type: 'interval',
      prompt: 'Qual é o intervalo entre a nota dourada (Tônica) e a nota azul?',
      correctAnswer: correctLabel,
      options: this.shuffle([...distractors]),
      explanation: `Distância de ${targetIv} semitom(ns): ${ivInfo.name} (${ivInfo.short}).`,
      visual: {
        kind: 'fretboard',
        positions: [
          { stringIdx: s1, fret: f1, note: 'R', short: 'R', degree: 'R', customColor: '#f59e0b', isRoot: true },
          { stringIdx: s2, fret: f2, note: '?', short: '?', degree: '?', customColor: '#38bdf8', isRoot: false },
        ],
      },
      play: () => {
        AudioEngine.playNote(midi1, 1.2, 0);
        AudioEngine.playNote(midi2, 1.4, 0.45);
        AudioEngine.playChord([midi1, midi2], { strumMs: 12, duration: 1.5 });
      },
    };
  },

  render(container, app) {
    if (!this.state.question) {
      this.state.question = this.generateQuestion();
      this.state.answered = null;
    }
    this.startTimer(container);

    const q = this.state.question;
    const total = this.state.correct + this.state.wrong;
    const acc = total ? Math.round((this.state.correct / total) * 100) : 0;
    const stats = Storage.getQuizStats();

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Treinador Interativo (Quiz)</h2>
          <p class="module-subtitle">Treine ouvido e reconhecimento visual no braço: notas, acordes, escalas e intervalos com histórico salvo.</p>
        </div>
        <div class="action-bar">
          <button id="quiz-save-session" class="btn btn-secondary btn-sm" ${total === 0 ? 'disabled' : ''}>Salvar Sessão</button>
          <button id="quiz-reset-session" class="btn btn-ghost btn-sm">Reiniciar</button>
        </div>
      </div>

      <!-- Mode Selector + Live HUD -->
      <section class="card">
        <div class="controls-split">
          <div class="pill-wrap">
            ${[
              ['note', 'Qual é esta nota?'],
              ['chord', 'Qual é este acorde?'],
              ['scale', 'Qual é esta escala?'],
              ['interval', 'Qual é este intervalo?'],
              ['mixed', '🎲 Modo Misto'],
            ].map(([id, label]) => `
              <button class="pill-btn pill-sm ${this.state.quizType === id ? 'active' : ''}" data-qtype="${id}">${label}</button>
            `).join('')}
          </div>
          <div class="quiz-hud">
            <span class="hud-chip good">✓ ${this.state.correct}</span>
            <span class="hud-chip bad">✕ ${this.state.wrong}</span>
            <span class="hud-chip info">${acc}%</span>
            <span class="hud-chip gold">🔥 ${this.state.streak}</span>
            <span class="hud-chip mono">⏱ <span id="quiz-timer-val">${this.formatTime(this.state.elapsedSec)}</span></span>
          </div>
        </div>
      </section>

      <!-- Active Question Card -->
      <section class="card quiz-stage-card">
        <div class="quiz-stage-head">
          <h3 class="section-title">${q.prompt}</h3>
          <button id="quiz-replay-audio" class="btn btn-primary btn-sm">🔊 Ouvir Áudio</button>
        </div>

        <div class="quiz-visual-box" id="quiz-visual-mount"></div>

        <div class="quiz-options-grid">
          ${q.options.map((opt) => {
            let cls = '';
            if (this.state.answered) {
              if (opt === q.correctAnswer) cls = 'opt-correct';
              else if (opt === this.state.answered.selected) cls = 'opt-wrong';
            }
            return `
              <button class="quiz-opt-btn ${cls}" data-opt="${opt}" ${this.state.answered ? 'disabled' : ''}>
                ${opt}
              </button>
            `;
          }).join('')}
        </div>

        ${this.state.answered ? `
          <div class="quiz-feedback ${this.state.answered.isCorrect ? 'good' : 'bad'}">
            <div>
              <strong>${this.state.answered.isCorrect ? '✓ Resposta Correta!' : `✕ Quase! A resposta correta é ${q.correctAnswer}`}</strong>
              <p class="small" style="margin-top:4px;">${q.explanation}</p>
            </div>
            <button id="quiz-next" class="btn btn-primary">Próxima Pergunta →</button>
          </div>
        ` : ''}
      </section>

      <!-- Persistent Performance History -->
      <section class="card">
        <div class="card-header-row">
          <h3 class="section-title">Histórico de Desempenho</h3>
          ${stats.sessions.length ? `<button id="quiz-clear-hist" class="btn btn-ghost btn-xs">Limpar Histórico</button>` : ''}
        </div>
        <div class="stats-summary-grid">
          <div class="stat-tile"><span>Total Acertos</span><strong class="text-green">${stats.totalCorrect}</strong></div>
          <div class="stat-tile"><span>Total Erros</span><strong class="text-red">${stats.totalWrong}</strong></div>
          <div class="stat-tile"><span>Precisão Geral</span><strong>${stats.totalCorrect + stats.totalWrong ? Math.round((stats.totalCorrect / (stats.totalCorrect + stats.totalWrong)) * 100) : 0}%</strong></div>
          <div class="stat-tile"><span>Melhor Sequência</span><strong class="text-gold">🔥 ${stats.bestStreak}</strong></div>
        </div>

        ${stats.sessions.length ? `
          <table class="data-table" style="margin-top:14px;">
            <thead>
              <tr><th>Data</th><th>Modo</th><th>Acertos</th><th>Erros</th><th>Precisão</th><th>Tempo</th></tr>
            </thead>
            <tbody>
              ${stats.sessions.slice(0, 8).map((s) => `
                <tr>
                  <td>${new Date(s.date).toLocaleDateString('pt-BR')} ${new Date(s.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td><span class="badge badge-info">${s.mode}</span></td>
                  <td class="text-green"><strong>${s.correct}</strong></td>
                  <td class="text-red">${s.wrong}</td>
                  <td><strong>${s.accuracy}%</strong></td>
                  <td><code>${this.formatTime(s.durationSec)}</code></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `<p class="muted-text small" style="margin-top:12px;">Complete algumas perguntas e clique em <strong>Salvar Sessão</strong> para registrar sua evolução.</p>`}
      </section>
    `;

    // Render visual clue
    const visMount = container.querySelector('#quiz-visual-mount');
    if (q.visual.kind === 'chord' && q.visual.voicing) {
      // Mask title in SVG until answered!
      const masked = { ...q.visual.voicing, symbol: this.state.answered ? q.visual.voicing.symbol : '???' };
      visMount.innerHTML = `<div class="svg-center">${renderVerticalChordSVG(masked)}</div>`;
    } else if (q.visual.kind === 'fretboard' || q.visual.kind === 'fretboard_scale') {
      visMount.innerHTML = `<div class="fretboard-scroll" id="quiz-fb-inner"></div>`;
      renderFretboard(visMount.querySelector('#quiz-fb-inner'), {
        id: 'quiz-fb-svg',
        tuning: Theory.getTuning(),
        startFret: 0,
        endFret: 14,
        displayMode: q.visual.kind === 'fretboard_scale' ? (this.state.answered ? 'intervals' : 'roots') : 'notes',
        positions: q.visual.kind === 'fretboard_scale'
          ? q.visual.positions.map((p) => ({
              ...p,
              note: this.state.answered ? p.note : (p.isRoot ? p.note : '•'),
              customColor: p.isRoot ? '#f59e0b' : '#38bdf8',
            }))
          : q.visual.positions,
        interactive: false,
      });
    }

    this.bindEvents(container, app, q);
  },

  bindEvents(container, app, q) {
    container.querySelectorAll('[data-qtype]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.quizType = btn.dataset.qtype;
        this.state.question = this.generateQuestion();
        this.state.answered = null;
        this.render(container, app);
        this.state.question.play();
      });
    });

    container.querySelector('#quiz-replay-audio')?.addEventListener('click', () => q.play());

    container.querySelectorAll('.quiz-opt-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.state.answered) return;
        const selected = btn.dataset.opt;
        const isCorrect = selected === q.correctAnswer;
        this.state.answered = { selected, isCorrect };
        if (isCorrect) {
          this.state.correct++;
          this.state.streak++;
          this.state.bestStreak = Math.max(this.state.bestStreak, this.state.streak);
        } else {
          this.state.wrong++;
          this.state.streak = 0;
        }
        this.render(container, app);
      });
    });

    container.querySelector('#quiz-next')?.addEventListener('click', () => {
      this.state.question = this.generateQuestion();
      this.state.answered = null;
      this.render(container, app);
      this.state.question.play();
    });

    container.querySelector('#quiz-save-session')?.addEventListener('click', () => {
      const total = this.state.correct + this.state.wrong;
      if (!total) return;
      Storage.recordQuizSession({
        mode: this.state.quizType,
        correct: this.state.correct,
        wrong: this.state.wrong,
        accuracy: Math.round((this.state.correct / total) * 100),
        bestStreak: this.state.bestStreak,
        durationSec: this.state.elapsedSec,
      });
      this.state.correct = 0;
      this.state.wrong = 0;
      this.state.streak = 0;
      this.state.startedAt = Date.now();
      this.state.elapsedSec = 0;
      app.toast('Sessão de treino salva no histórico!');
      this.render(container, app);
    });

    container.querySelector('#quiz-reset-session')?.addEventListener('click', () => {
      this.state.correct = 0;
      this.state.wrong = 0;
      this.state.streak = 0;
      this.state.startedAt = Date.now();
      this.state.elapsedSec = 0;
      this.state.question = this.generateQuestion();
      this.state.answered = null;
      this.render(container, app);
    });

    container.querySelector('#quiz-clear-hist')?.addEventListener('click', () => {
      Storage.clearQuizStats();
      app.toast('Histórico limpo.');
      this.render(container, app);
    });
  },
};
