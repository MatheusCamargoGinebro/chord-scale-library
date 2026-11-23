/**
 * Module 7: Harmonic Progressions
 * - Seamless live playback switching (switching progression/key/shape while playing stops old & starts new immediately!)
 * - Stable fixed-width action buttons (zero layout shift on Play/Stop!)
 * - Individual per-chord shape customization + Voice Leading recalculation
 * - Momentary per-chord Custom Cadence Editor (Down, Up, Palm Mute, Arpeggio, Mute, Rest) + "Replicar para todos" + Momentary BPM
 * - Live Visual Strumming Arrow Indicator + Stage/Focus Mode
 */

import { Theory } from '../core/theory.js';
import { ChordEngine } from '../core/chordEngine.js';
import { HarmonyAI } from '../core/harmonyAI.js';
import { Storage } from '../core/storage.js';
import { AudioEngine, getPresetSteps } from '../audio/audioEngine.js';
import { RhythmEngine } from '../audio/rhythmEngine.js';
import { renderVerticalChordSVG } from '../ui/chordDiagram.js';
import { renderCircleOfFifths } from '../ui/circleOfFifths.js';
import { ExportTools } from '../ui/exportTools.js';
import { icon } from '../ui/icons.js';
import { renderPlaybackControlsHTML, bindPlaybackControls, highlightStrumStep } from '../ui/playbackBar.js';
import { renderChordCadenceEditorHTML, renderStrumStripHTML, renderStageCadenceBoxHTML, cycleStroke } from '../ui/strummingEditor.js';

export const ModProgressions = {
  id: 'progressions',
  state: {
    keyPc: 0,
    genre: 'Todos',
    selectedProgId: 'jazz_251',
    analysisTab: 'voice_leading',
    customShapeIndices: {},
    // Strictly momentary (in-memory only, never persisted to localStorage)
    momentaryBpm: null,
    momentaryCadenceId: null,
    momentaryChordSteps: {}, // { [chordIdx]: string[8] }
    editingCadenceIdx: -1,
    loopPlay: true,
    isPlaying: false,
    activeChordIdx: -1,
    activeBeat: -1,
    activeStep: -1,
    stageMode: false,
  },

  applyExternal(opts = {}) {
    AudioEngine.stopSequence();
    this.state.isPlaying = false;
    this.state.activeChordIdx = -1;
    if (opts.keyPc !== undefined) {
      this.state.keyPc = Theory.mod12(opts.keyPc);
      this.state.customShapeIndices = {};
    }
    if (opts.selectedProgId) {
      this.state.selectedProgId = opts.selectedProgId;
      this.state.genre = 'Todos';
      this.state.customShapeIndices = {};
      this.state.momentaryChordSteps = {};
      this.state.editingCadenceIdx = -1;
    }
  },

  getShareParams() {
    return { m: 'progressions', k: this.state.keyPc, p: this.state.selectedProgId };
  },

  applyShareParams(p) {
    if (p.k !== undefined) this.state.keyPc = Theory.mod12(Number(p.k));
    if (p.p) this.state.selectedProgId = p.p;
    this.state.customShapeIndices = {};
  },

  getEffectiveBpm() {
    return this.state.momentaryBpm ?? RhythmEngine.bpm;
  },

  getEffectiveCadenceId() {
    return this.state.momentaryCadenceId ?? AudioEngine.chordCadence;
  },

  getStepsForChord(idx) {
    return this.state.momentaryChordSteps[idx] || getPresetSteps(this.getEffectiveCadenceId());
  },

  resolveProgressionShapes(prog, tuning) {
    const autoVL = HarmonyAI.computeVoiceLeading(this.state.keyPc, prog.chords, tuning);
    const allVoicingsPerChord = prog.chords.map((ch) =>
      ChordEngine.getVoicings(Theory.mod12(this.state.keyPc + ch.degree), ch.type, tuning)
    );

    const resolvedShapes = prog.chords.map((ch, idx) => {
      const pool = allVoicingsPerChord[idx];
      if (!pool.length) return null;
      if (this.state.customShapeIndices[idx] !== undefined) {
        const safeIdx = ((this.state.customShapeIndices[idx] % pool.length) + pool.length) % pool.length;
        return pool[safeIdx];
      }
      return autoVL.shapes[idx] || pool[0];
    });

    const resolvedIndices = resolvedShapes.map((sh, idx) => {
      const pool = allVoicingsPerChord[idx];
      if (!sh || !pool.length) return 0;
      const found = pool.findIndex((v) => v.id === sh.id);
      return found >= 0 ? found : 0;
    });

    const transitions = HarmonyAI.analyzeTransitions(resolvedShapes, this.state.keyPc);
    return { shapes: resolvedShapes, indices: resolvedIndices, pools: allVoicingsPerChord, transitions };
  },

  startPlayback(container, prog, shapes) {
    const chordItems = shapes.map((sh, idx) => {
      const midis = sh
        ? sh.stringNotes.filter((n) => !n.muted).map((n) => n.midi)
        : Theory.getChordType(prog.chords[idx].type).intervals.map((iv) => 48 + Theory.mod12(this.state.keyPc + prog.chords[idx].degree) + iv);
      return {
        midis,
        customSteps: this.getStepsForChord(idx),
        cadence: this.getEffectiveCadenceId(),
      };
    });

    this.state.isPlaying = true;
    const playBtn = container.querySelector('#prog-play');
    if (playBtn) playBtn.innerHTML = `${icon('stop', 14)}<span>Parar</span>`;
    const stagePlayBtn = container.querySelector('#stage-prog-play');
    if (stagePlayBtn) stagePlayBtn.innerHTML = `${icon('stop', 14)}<span>Parar</span>`;

    AudioEngine.playProgression(chordItems, {
      bpm: this.getEffectiveBpm(),
      cadence: this.getEffectiveCadenceId(),
      loop: this.state.loopPlay,
      onChord: (idx) => {
        this.state.activeChordIdx = idx;
        container.querySelectorAll('.prog-chord-card, .stage-chord-card').forEach((el) => {
          el.classList.toggle('playing', Number(el.dataset.pchordIdx) === idx);
        });
        // Update live strum visualizer to show the currently playing chord's cadence steps
        const strip = container.querySelector('#prog-pb-strum-strip');
        if (strip) {
          const steps = this.getStepsForChord(idx);
          const wrapper = strip.parentElement;
          if (wrapper) {
            wrapper.innerHTML = `<span class="pb-label" style="min-width:68px;">Levada</span>${renderStrumStripHTML(steps, { activeStep: 0, stripId: 'prog-pb-strum-strip' })}`;
          }
        }
      },
      onBeatStep: (chordIdx, stepIdx, beatIdx) => {
        this.state.activeStep = stepIdx;
        this.state.activeBeat = beatIdx;
        highlightStrumStep(container, 'prog-pb', stepIdx);
        container.querySelectorAll('.beat-dot').forEach((d, bi) => d.classList.toggle('on', bi === beatIdx));
        // Live-highlight exact cadence step under the playing chord in Stage Mode!
        container.querySelectorAll('.stage-cadence-box').forEach((box) => {
          const isTarget = box.dataset.stageCadKey === String(chordIdx);
          box.querySelectorAll('.mini-strum-cell').forEach((cell) => {
            cell.classList.toggle('is-now', isTarget && Number(cell.dataset.msStep) === stepIdx);
          });
        });
        if (this.state.editingCadenceIdx === chordIdx) {
          container.querySelectorAll('.strum-edit-btn').forEach((b) => {
            b.classList.toggle('is-now', Number(b.dataset.ceStep) === stepIdx);
          });
        }
      },
      onEnd: () => {
        this.state.isPlaying = false;
        this.state.activeChordIdx = -1;
        this.state.activeBeat = -1;
        this.state.activeStep = -1;
        container.querySelectorAll('.prog-chord-card, .stage-chord-card').forEach((el) => el.classList.remove('playing'));
        highlightStrumStep(container, 'prog-pb', -1);
        const b = container.querySelector('#prog-play');
        if (b) b.innerHTML = `${icon('play', 14)}<span>Tocar</span>`;
        const sb = container.querySelector('#stage-prog-play');
        if (sb) sb.innerHTML = `${icon('play', 14)}<span>Tocar</span>`;
      },
    });
  },

  stopPlayback(container) {
    AudioEngine.stopSequence();
    this.state.isPlaying = false;
    this.state.activeChordIdx = -1;
    this.state.activeBeat = -1;
    this.state.activeStep = -1;
    if (container) {
      container.querySelectorAll('.prog-chord-card, .stage-chord-card').forEach((el) => el.classList.remove('playing'));
      container.querySelectorAll('.mini-strum-cell').forEach((c) => c.classList.remove('is-now'));
      highlightStrumStep(container, 'prog-pb', -1);
      const b = container.querySelector('#prog-play');
      if (b) b.innerHTML = `${icon('play', 14)}<span>Tocar</span>`;
      const sb = container.querySelector('#stage-prog-play');
      if (sb) sb.innerHTML = `${icon('play', 14)}<span>Tocar</span>`;
    }
  },

  /**
   * Re-renders and seamlessly restarts playback if a progression was already playing!
   */
  refreshAndKeepPlaying(container, app) {
    const wasPlaying = this.state.isPlaying;
    if (wasPlaying) {
      AudioEngine.stopSequence();
    }
    this.render(container, app);
    if (wasPlaying) {
      const tuning = Theory.getTuning();
      const prog = Theory.getProgressions().find((p) => p.id === this.state.selectedProgId) || Theory.getProgressions()[0];
      const { shapes } = this.resolveProgressionShapes(prog, tuning);
      this.startPlayback(container, prog, shapes);
    }
  },

  render(container, app) {
    const tuning = Theory.getTuning();
    const genres = ['Todos', ...Theory.getGenres()];
    const allProgs = Theory.getProgressions();
    const visibleProgs = this.state.genre === 'Todos'
      ? allProgs
      : allProgs.filter((p) => p.genre === this.state.genre);

    let prog = visibleProgs.find((p) => p.id === this.state.selectedProgId)
      || allProgs.find((p) => p.id === this.state.selectedProgId)
      || visibleProgs[0]
      || allProgs[0];
    this.state.selectedProgId = prog.id;

    const useFlats = Theory.useFlatsForRoot(this.state.keyPc);
    const keyName = Theory.pcToNote(this.state.keyPc, useFlats);
    const hasCustomShapes = Object.keys(this.state.customShapeIndices).length > 0;
    const hasCustomCadences = Object.keys(this.state.momentaryChordSteps).length > 0;

    const { shapes, indices, pools, transitions } = this.resolveProgressionShapes(prog, tuning);

    const aiArps = HarmonyAI.suggestArpeggiosForProgression(this.state.keyPc, prog.chords);
    const firstChord = prog.chords[0];
    const firstRoot = Theory.mod12(this.state.keyPc + firstChord.degree);
    const aiScales = HarmonyAI.suggestScalesForChord(firstRoot, firstChord.type);
    const aiSubs = HarmonyAI.suggestSubstitutions(
      Theory.mod12(this.state.keyPc + (prog.chords[1]?.degree ?? 7)),
      prog.chords[1]?.type || '7',
      this.state.keyPc
    );

    const favId = `prog_${this.state.keyPc}_${prog.id}`;
    const isFav = Storage.isFavorite('progressions', favId);
    const effBpm = this.getEffectiveBpm();
    const effCadence = this.getEffectiveCadenceId();

    const editingIdx = this.state.editingCadenceIdx >= 0 && this.state.editingCadenceIdx < prog.chords.length
      ? this.state.editingCadenceIdx
      : -1;

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Progressões Harmônicas &amp; IA</h2>
          <p class="module-subtitle">Personalize o shape e a batida de cada acorde individualmente, ou ative o Modo Palco para tocar junto.</p>
        </div>
        <div class="action-bar stable-actions">
          <button id="prog-play" class="btn btn-primary btn-play-toggle">${icon(this.state.isPlaying ? 'stop' : 'play', 14)}<span>${this.state.isPlaying ? 'Parar' : 'Tocar'}</span></button>
          <button id="prog-loop" class="btn ${this.state.loopPlay ? 'btn-gold-active' : 'btn-ghost'} btn-sm">${icon('repeat', 14)} Loop</button>
          <button id="prog-stage-btn" class="btn btn-ghost btn-sm" title="Tela cheia para estudo e ensaio">${icon('maximize', 14)} Modo Palco</button>
          <button id="prog-fav" class="btn ${isFav ? 'btn-gold-active' : 'btn-ghost'} btn-icon" title="Favoritar progressão">${icon(isFav ? 'starFilled' : 'favorites', 15)}</button>
          <button id="prog-to-composer" class="btn btn-secondary btn-sm">${icon('plus', 14)} Compositor</button>
          <button id="prog-pdf" class="btn btn-ghost btn-sm">${icon('fileText', 14)} PDF</button>
        </div>
      </div>

      <!-- Top Row: Interactive Circle of Fifths (Always Visible!) + Progression Picker -->
      <div class="prog-top-grid">
        <section class="card cof-card">
          <div class="card-header-row" style="margin-bottom:6px;">
            <h3 class="section-title">Roda de Acordes</h3>
            <div class="action-bar">
              <span class="badge badge-gold">Tom: ${keyName}</span>
              <button id="cof-export-png" class="btn btn-ghost btn-icon-xs" title="Exportar Roda em PNG">${icon('image', 13)}</button>
            </div>
          </div>
          <p class="muted-text small" style="margin-bottom:8px;">Clique em qualquer tom (Maior ou Menor) para transpor e ouvir.</p>
          <div class="svg-center" id="cof-mount"></div>
        </section>

        <section class="card selector-card">
          <div class="selector-group" style="margin-bottom:12px;">
            <label class="field-label">Tom da Progressão</label>
            <div class="pill-grid root-pills">
              ${Theory.getAllRoots().map((r) => `
                <button class="pill-btn ${r.pc === this.state.keyPc ? 'active' : ''}" data-prog-key="${r.pc}">${r.short || r.label}</button>
              `).join('')}
            </div>
          </div>

          <div class="selector-group" style="margin-bottom:10px;">
            <label class="field-label">Gênero Musical</label>
            <div class="segmented-tabs compact">
              ${genres.map((g) => `
                <button class="seg-tab ${this.state.genre === g ? 'active' : ''}" data-prog-genre="${g}">${g}</button>
              `).join('')}
            </div>
          </div>

          <div class="selector-group" style="margin-bottom:12px;">
            <label class="field-label" for="prog-select-dropdown">Progressão</label>
            <select id="prog-select-dropdown" class="select-control select-sm" style="width:100%;" aria-label="Selecionar progressão">
              ${visibleProgs.map((p) => `<option value="${p.id}" ${p.id === prog.id ? 'selected' : ''}>[${p.genre}] ${p.name}</option>`).join('')}
            </select>
          </div>

          ${renderPlaybackControlsHTML({
            mode: 'chord',
            bpm: effBpm,
            cadence: effCadence,
            idPrefix: 'prog-pb',
            customSteps: this.getStepsForChord(Math.max(0, this.state.activeChordIdx)),
            activeStep: this.state.activeStep,
            momentaryOnly: true,
          })}
        </section>
      </div>

      <!-- Active Progression Chords with Individual Shape & Cadence Customizers -->
      <section class="card">
        <div class="card-header-row">
          <div>
            <h3 class="section-title">${prog.name} em ${keyName}</h3>
            <p class="muted-text small">${prog.description}</p>
          </div>
          <div class="action-bar">
            ${hasCustomCadences ? `<button id="prog-reset-cad" class="btn btn-ghost btn-xs">${icon('rotateCcw', 12)} Resetar Batidas</button>` : ''}
            ${hasCustomShapes ? `<button id="prog-reset-vl" class="btn btn-ghost btn-xs">${icon('rotateCcw', 12)} Otimizar Voice Leading</button>` : `<span class="badge badge-success">Voice Leading Otimizado</span>`}
          </div>
        </div>

        <div class="prog-chords-row" id="prog-chords-row">
          ${prog.chords.map((ch, idx) => {
            const cRoot = Theory.mod12(this.state.keyPc + ch.degree);
            const cName = Theory.getChordDisplayName(cRoot, ch.type);
            const shape = shapes[idx];
            const pool = pools[idx];
            const curIdx = indices[idx];
            const hasCustomBeat = Boolean(this.state.momentaryChordSteps[idx]);
            const isEditing = editingIdx === idx;
            return `
              <div class="prog-chord-card ${this.state.activeChordIdx === idx ? 'playing' : ''} ${isEditing ? 'editing-cadence' : ''}" data-pchord-idx="${idx}">
                <div class="pchord-head">
                  <span class="roman-badge">${ch.roman}</span>
                  <strong>${cName}</strong>
                  <button class="btn btn-ghost btn-icon-xs open-prog-chord" data-r="${cRoot}" data-ct="${ch.type}" title="Abrir na Biblioteca">${icon('arrowRight', 12)}</button>
                </div>

                <div class="pchord-diagram-click" data-play-idx="${idx}" title="Clique para ouvir ${cName}">
                  ${shape ? renderVerticalChordSVG(shape, { compact: true }) : '<div class="muted-text small">Sem voicing</div>'}
                </div>

                ${pool.length > 1 ? `
                  <div class="shape-stepper">
                    <button class="btn btn-ghost btn-icon-xs pchord-prev" data-idx="${idx}" aria-label="Shape anterior">${icon('chevronLeft', 13)}</button>
                    <span class="stepper-text">Shape ${curIdx + 1}/${pool.length}</span>
                    <button class="btn btn-ghost btn-icon-xs pchord-next" data-idx="${idx}" aria-label="Próximo shape">${icon('chevronRight', 13)}</button>
                  </div>
                ` : ''}

                <div class="pchord-shape-label" title="${shape?.label || ''}">${shape ? shape.label : ''}</div>

                <button type="button" class="btn ${isEditing || hasCustomBeat ? 'btn-gold-active' : 'btn-ghost'} btn-xs pchord-edit-cadence" data-idx="${idx}" style="width:100%;margin-top:6px;">
                  ${icon('sliders', 12)} ${hasCustomBeat ? 'Batida Custom' : 'Editar Batida'}
                </button>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Inline Per-Chord Momentary Cadence Editor -->
        ${editingIdx >= 0 ? (() => {
          const ch = prog.chords[editingIdx];
          const cName = Theory.getChordDisplayName(Theory.mod12(this.state.keyPc + ch.degree), ch.type);
          return renderChordCadenceEditorHTML({
            chordLabel: `${ch.roman} (${cName})`,
            steps: this.getStepsForChord(editingIdx),
            bpm: effBpm,
            activeStep: this.state.activeChordIdx === editingIdx ? this.state.activeStep : -1,
            canReplicate: prog.chords.length > 1,
            editorId: 'prog-cadence-editor',
          });
        })() : ''}
      </section>

      <!-- Organized Analysis Card -->
      <section class="card">
        <div class="card-header-row">
          <div class="segmented-tabs">
            <button class="seg-tab ${this.state.analysisTab === 'voice_leading' ? 'active' : ''}" data-atab="voice_leading">${icon('link', 13)} Voice Leading</button>
            <button class="seg-tab ${this.state.analysisTab === 'ai' ? 'active' : ''}" data-atab="ai">${icon('sparkles', 13)} IA Musical</button>
          </div>
        </div>

        ${this.state.analysisTab === 'voice_leading' ? `
          <div class="vl-grid">
            ${transitions.map((tr) => `
              <div class="subcard vl-card">
                <div class="vl-head">
                  <strong>${tr.fromChord} → ${tr.toChord}</strong>
                  <span class="badge ${tr.smoothness >= 75 ? 'badge-success' : 'badge-gold'}">Fluidez ${tr.smoothness}%</span>
                </div>
                <div class="small muted-text" style="margin-bottom:8px;">
                  Notas em comum: <strong>${tr.commonNotes.length ? tr.commonNotes.join(', ') : 'Movimento diatônico/cromático'}</strong>
                </div>
                <div class="vl-moves">
                  ${tr.movements.map((mv) => `
                    <span class="vl-pill ${mv.delta === 0 ? 'common' : Math.abs(mv.delta) <= 2 ? 'step' : 'leap'}">
                      ${mv.from}→${mv.to} (${mv.delta === 0 ? '0' : mv.delta > 0 ? `+${mv.delta}st` : `${mv.delta}st`})
                    </span>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${this.state.analysisTab === 'ai' ? `
          <div class="ai-grid-3">
            <div class="subcard">
              <h4 class="subcard-title">Escalas para Solar</h4>
              <div class="ai-list">
                ${aiScales.slice(0, 4).map((s) => `
                  <div class="ai-item">
                    <div class="ai-item-head"><strong>${s.title}</strong><span class="badge badge-success">${s.match}%</span></div>
                    <p class="muted-text small">${s.mood}</p>
                    <button class="btn btn-ghost btn-xs prog-ai-scale" data-r="${s.rootPc}" data-sc="${s.scaleId}">Abrir no Braço ${icon('arrowRight', 12)}</button>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="subcard">
              <h4 class="subcard-title">Arpejos por Acorde</h4>
              <div class="ai-list">
                ${aiArps.map((item) => `
                  <div class="ai-item">
                    <div class="ai-item-head"><strong>${item.roman} · ${item.chordName}</strong></div>
                    ${item.recommendations.map((rec) => `
                      <div class="ai-sub-row">
                        <span><code>${rec.label}</code> <small class="muted-text">${rec.role}</small></span>
                        <button class="btn btn-ghost btn-xs prog-ai-arp" data-r="${rec.rootPc}" data-arp="${rec.arpId}">Ver</button>
                      </div>
                    `).join('')}
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="subcard">
              <h4 class="subcard-title">Substituições Harmônicas</h4>
              <div class="ai-list">
                ${aiSubs.map((sub) => `
                  <div class="ai-item">
                    <div class="ai-item-head"><strong>${sub.chord}</strong><span class="badge badge-info">${sub.type}</span></div>
                    <p class="muted-text small">${sub.explanation}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}
      </section>

      <!-- Stage / Focus Mode Fullscreen Overlay -->
      ${this.state.stageMode ? `
        <div class="stage-overlay" role="dialog" aria-modal="true" aria-label="Modo Palco — Progressão">
          <div class="stage-header">
            <div>
              <h2 class="stage-title">${prog.name} — Tom de ${keyName}</h2>
              <div class="stage-beat-dots">
                <span class="beat-dot ${this.state.activeBeat === 0 ? 'on' : ''}">1</span>
                <span class="beat-dot ${this.state.activeBeat === 1 ? 'on' : ''}">2</span>
                <span class="beat-dot ${this.state.activeBeat === 2 ? 'on' : ''}">3</span>
                <span class="beat-dot ${this.state.activeBeat === 3 ? 'on' : ''}">4</span>
                <span class="mono-text muted-text" style="margin-left:10px;">${effBpm} BPM</span>
              </div>
            </div>
            <div class="action-bar stable-actions">
              <button id="stage-prog-play" class="btn btn-primary btn-play-toggle">${icon(this.state.isPlaying ? 'stop' : 'play', 14)}<span>${this.state.isPlaying ? 'Parar' : 'Tocar'}</span></button>
              <button id="stage-prog-close" class="btn btn-ghost">${icon('minimize', 15)} Sair do Palco</button>
            </div>
          </div>
          <div class="stage-chords-grid">
            ${prog.chords.map((ch, idx) => {
              const cRoot = Theory.mod12(this.state.keyPc + ch.degree);
              const cName = Theory.getChordDisplayName(cRoot, ch.type);
              const sh = shapes[idx];
              const steps = this.getStepsForChord(idx);
              const activeStep = this.state.activeChordIdx === idx ? this.state.activeStep : -1;
              return `
                <div class="stage-chord-card ${this.state.activeChordIdx === idx ? 'playing' : ''}" data-pchord-idx="${idx}">
                  <div class="stage-chord-head">
                    <span class="roman-badge">${ch.roman}</span>
                    <strong>${cName}</strong>
                  </div>
                  ${sh ? renderVerticalChordSVG(sh, { compact: false }) : ''}
                  <div class="small muted-text" style="margin-bottom:6px;">${sh?.label || ''}</div>
                  ${renderStageCadenceBoxHTML(steps, { activeStep, cardKey: String(idx) })}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;

    // Always mount the interactive Circle of Fifths on the top card
    const cofMount = container.querySelector('#cof-mount');
    if (cofMount) {
      renderCircleOfFifths(cofMount, {
        selectedRootPc: this.state.keyPc,
        onSelectKey: (pc) => {
          this.state.keyPc = pc;
          this.state.customShapeIndices = {};
          this.refreshAndKeepPlaying(container, app);
        },
      });
    }

    this.bindEvents(container, app, prog, shapes, indices, pools, keyName, editingIdx);
  },

  bindEvents(container, app, prog, shapes, indices, pools, keyName, editingIdx) {
    bindPlaybackControls(container, {
      mode: 'chord',
      idPrefix: 'prog-pb',
      momentaryOnly: true,
      onBpmChange: (bpm) => {
        this.state.momentaryBpm = bpm;
        if (this.state.isPlaying) {
          this.startPlayback(container, prog, shapes);
        }
      },
      onCadenceChange: (cadId) => {
        this.state.momentaryCadenceId = cadId;
        if (this.state.isPlaying) {
          this.startPlayback(container, prog, shapes);
        }
      },
    });

    // Switching Key, Genre, or Progression seamlessly restarts playback if currently playing!
    container.querySelectorAll('[data-prog-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.keyPc = Number(btn.dataset.progKey);
        this.state.customShapeIndices = {};
        this.refreshAndKeepPlaying(container, app);
      });
    });

    container.querySelectorAll('[data-prog-genre]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.genre = btn.dataset.progGenre;
        const filtered = this.state.genre === 'Todos'
          ? Theory.getProgressions()
          : Theory.getProgressions().filter((p) => p.genre === this.state.genre);
        if (filtered.length && !filtered.some((p) => p.id === this.state.selectedProgId)) {
          this.state.selectedProgId = filtered[0].id;
          this.state.customShapeIndices = {};
          this.state.momentaryChordSteps = {};
          this.state.editingCadenceIdx = -1;
        }
        this.refreshAndKeepPlaying(container, app);
      });
    });

    container.querySelector('#prog-select-dropdown')?.addEventListener('change', (e) => {
      this.state.selectedProgId = e.target.value;
      this.state.customShapeIndices = {};
      this.state.momentaryChordSteps = {};
      this.state.editingCadenceIdx = -1;
      this.refreshAndKeepPlaying(container, app);
    });

    container.querySelectorAll('[data-atab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.analysisTab = btn.dataset.atab;
        this.render(container, app);
      });
    });

    container.querySelector('#prog-reset-vl')?.addEventListener('click', () => {
      this.state.customShapeIndices = {};
      app.toast('Shapes otimizados para o melhor Voice Leading.');
      this.refreshAndKeepPlaying(container, app);
    });

    container.querySelector('#prog-reset-cad')?.addEventListener('click', () => {
      this.state.momentaryChordSteps = {};
      app.toast('Batidas customizadas restauradas para o padrão.');
      this.refreshAndKeepPlaying(container, app);
    });

    // Individual shape steppers
    container.querySelectorAll('.pchord-prev').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        const len = pools[idx].length;
        this.state.customShapeIndices[idx] = (indices[idx] - 1 + len) % len;
        this.refreshAndKeepPlaying(container, app);
        if (!this.state.isPlaying) {
          const sh = pools[idx][this.state.customShapeIndices[idx]];
          if (sh) AudioEngine.playChord(sh.stringNotes.filter((n) => !n.muted).map((n) => n.midi));
        }
      });
    });

    container.querySelectorAll('.pchord-next').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        const len = pools[idx].length;
        this.state.customShapeIndices[idx] = (indices[idx] + 1) % len;
        this.refreshAndKeepPlaying(container, app);
        if (!this.state.isPlaying) {
          const sh = pools[idx][this.state.customShapeIndices[idx]];
          if (sh) AudioEngine.playChord(sh.stringNotes.filter((n) => !n.muted).map((n) => n.midi));
        }
      });
    });

    // Open/close per-chord cadence editor
    container.querySelectorAll('.pchord-edit-cadence').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.idx);
        this.state.editingCadenceIdx = this.state.editingCadenceIdx === idx ? -1 : idx;
        this.render(container, app);
      });
    });

    // Bind per-chord cadence editor controls
    if (editingIdx >= 0) {
      const editor = container.querySelector('#prog-cadence-editor');
      if (editor) {
        editor.querySelectorAll('[data-ce-step]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const sIdx = Number(btn.dataset.ceStep);
            const cur = this.getStepsForChord(editingIdx).slice();
            cur[sIdx] = cycleStroke(cur[sIdx]);
            this.state.momentaryChordSteps[editingIdx] = cur;
            this.refreshAndKeepPlaying(container, app);
          });
        });

        editor.querySelector('.ce-preset-sel')?.addEventListener('change', (e) => {
          if (!e.target.value) return;
          this.state.momentaryChordSteps[editingIdx] = getPresetSteps(e.target.value);
          this.refreshAndKeepPlaying(container, app);
        });

        const syncEditorBpm = (val) => {
          const clean = Math.max(40, Math.min(220, Math.round(Number(val) || 100)));
          this.state.momentaryBpm = clean;
          const r1 = container.querySelector('#prog-pb-bpm-range');
          const n1 = container.querySelector('#prog-pb-bpm');
          const r2 = editor.querySelector('.ce-bpm-range');
          const n2 = editor.querySelector('.ce-bpm-num');
          if (r1) r1.value = clean;
          if (n1) n1.value = clean;
          if (r2) r2.value = clean;
          if (n2) n2.value = clean;
          if (this.state.isPlaying) this.startPlayback(container, prog, shapes);
        };
        editor.querySelector('.ce-bpm-range')?.addEventListener('input', (e) => syncEditorBpm(e.target.value));
        editor.querySelector('.ce-bpm-num')?.addEventListener('change', (e) => syncEditorBpm(e.target.value));

        editor.querySelector('.ce-preview')?.addEventListener('click', () => {
          const sh = shapes[editingIdx];
          if (!sh) return;
          const midis = sh.stringNotes.filter((n) => !n.muted).map((n) => n.midi);
          AudioEngine.playChordWithCadence(midis, {
            bpm: this.getEffectiveBpm(),
            customSteps: this.getStepsForChord(editingIdx),
            loop: false,
            onBeatStep: (sIdx) => {
              editor.querySelectorAll('.strum-edit-btn').forEach((b) => b.classList.toggle('is-now', Number(b.dataset.ceStep) === sIdx));
            },
            onEnd: () => {
              editor.querySelectorAll('.strum-edit-btn').forEach((b) => b.classList.remove('is-now'));
            },
          });
        });

        editor.querySelector('.ce-replicate')?.addEventListener('click', () => {
          const sourceSteps = this.getStepsForChord(editingIdx).slice();
          prog.chords.forEach((_, idx) => {
            this.state.momentaryChordSteps[idx] = sourceSteps.slice();
          });
          app.toast('Cadência replicada para todos os acordes desta progressão!');
          this.refreshAndKeepPlaying(container, app);
        });

        editor.querySelector('.ce-close')?.addEventListener('click', () => {
          this.state.editingCadenceIdx = -1;
          this.render(container, app);
        });
      }
    }

    container.querySelectorAll('.pchord-diagram-click').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.playIdx);
        const shape = shapes[idx];
        if (shape) {
          const midis = shape.stringNotes.filter((n) => !n.muted).map((n) => n.midi);
          AudioEngine.playChordWithCadence(midis, {
            bpm: this.getEffectiveBpm(),
            customSteps: this.getStepsForChord(idx),
            loop: false,
          });
        }
      });
    });

    container.querySelectorAll('.open-prog-chord').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        app.navigate('chords', { rootPc: Number(btn.dataset.r), chordTypeId: btn.dataset.ct });
      });
    });

    container.querySelector('#prog-loop')?.addEventListener('click', () => {
      this.state.loopPlay = !this.state.loopPlay;
      this.refreshAndKeepPlaying(container, app);
    });

    const togglePlay = () => {
      if (this.state.isPlaying) {
        this.stopPlayback(container);
      } else {
        this.startPlayback(container, prog, shapes);
      }
    };
    container.querySelector('#prog-play')?.addEventListener('click', togglePlay);
    container.querySelector('#stage-prog-play')?.addEventListener('click', togglePlay);

    container.querySelector('#prog-stage-btn')?.addEventListener('click', () => {
      this.state.stageMode = true;
      this.render(container, app);
    });
    container.querySelector('#stage-prog-close')?.addEventListener('click', () => {
      this.state.stageMode = false;
      this.render(container, app);
    });

    container.querySelector('#prog-fav')?.addEventListener('click', () => {
      const added = Storage.toggleFavorite('progressions', {
        id: `prog_${this.state.keyPc}_${prog.id}`,
        title: `${prog.name} em ${keyName}`,
        subtitle: `${prog.genre} · ${prog.numerals}`,
        keyPc: this.state.keyPc,
        progId: prog.id,
      });
      app.toast(added ? 'Progressão salva nos Favoritos!' : 'Progressão removida dos Favoritos.');
      this.render(container, app);
    });

    container.querySelector('#prog-to-composer')?.addEventListener('click', () => {
      app.navigate('composer', {
        importProg: {
          keyPc: this.state.keyPc,
          chords: prog.chords.map((c, idx) => ({
            rootPc: Theory.mod12(this.state.keyPc + c.degree),
            type: c.type,
            beats: 4,
            shapeIdx: indices[idx] || 0,
          })),
          label: `${prog.name} (${keyName})`,
        },
      });
    });

    container.querySelectorAll('.prog-ai-scale').forEach((btn) => {
      btn.addEventListener('click', () => app.navigate('scales', { rootPc: Number(btn.dataset.r), scaleId: btn.dataset.sc }));
    });
    container.querySelectorAll('.prog-ai-arp').forEach((btn) => {
      btn.addEventListener('click', () => app.navigate('arpeggios', { rootPc: Number(btn.dataset.r), arpeggioId: btn.dataset.arp }));
    });

    container.querySelector('#cof-export-png')?.addEventListener('click', () => {
      const svg = container.querySelector('#cof-svg');
      ExportTools.exportSvgAsPng(svg, `circle-of-fifths-${keyName}.png`, `Circle of Fifths — Tom ${keyName}`);
      app.toast('Círculo das Quintas exportado em PNG!');
    });

    container.querySelector('#prog-pdf')?.addEventListener('click', () => {
      const diagrams = prog.chords.map((ch, idx) => {
        const sh = shapes[idx];
        return `<div style="display:inline-block;margin:8px;text-align:center;"><div><strong>${ch.roman}</strong></div>${sh ? renderVerticalChordSVG(sh, { compact: true }) : ''}</div>`;
      }).join('');
      ExportTools.exportPdfSheet(`${prog.name} — Tom de ${keyName}`, `Gênero: ${prog.genre} | Graus: ${prog.numerals}`, `<div class="print-section">${diagrams}</div>`);
    });
  },
};
