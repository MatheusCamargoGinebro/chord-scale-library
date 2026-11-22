/**
 * Module 10: Song Composer (Compositor)
 * - Prominent Chord Name + Large Interactive Shape Diagram on every chord card (easy to play!)
 * - Individual per-chord shape stepper (< Shape X/Y >) persisted with song
 * - Momentary per-chord Custom Cadence Editor (Down, Up, Palm Mute, Arpeggio, Mute, Rest) + "Replicar para todos" + Momentary BPM (never persisted!)
 * - Synchronized real-time chord + beat (1-2-3-4) highlight during playback
 * - HTML5 Drag-and-Drop reordering for chords inside sections
 * - Stage / Focus Mode fullscreen rehearsal view
 */

import { Theory } from '../core/theory.js';
import { ChordEngine } from '../core/chordEngine.js';
import { Storage } from '../core/storage.js';
import { AudioEngine, getPresetSteps } from '../audio/audioEngine.js';
import { RhythmEngine } from '../audio/rhythmEngine.js';
import { renderVerticalChordSVG } from '../ui/chordDiagram.js';
import { ExportTools } from '../ui/exportTools.js';
import { icon } from '../ui/icons.js';
import { renderPlaybackControlsHTML, bindPlaybackControls, highlightStrumStep } from '../ui/playbackBar.js';
import { renderChordCadenceEditorHTML, renderStrumStripHTML, cycleStroke } from '../ui/strummingEditor.js';

const SECTION_TYPES = ['Verso', 'Pré-Refrão', 'Refrão', 'Solo', 'Ponte', 'Intro', 'Outro'];

export const ModComposer = {
  id: 'composer',
  state: {
    songs: null,
    activeSongId: null,
    isPlaying: false,
    playingSectionId: null,
    activeChordKey: null, // "sIdx:cIdx"
    activeBeat: -1,
    activeStep: -1,
    stageMode: false,
    // Strictly momentary (in-memory only, never saved to localStorage)
    momentaryBpm: null,
    momentaryCadenceId: null,
    momentaryChordSteps: {}, // { "secId:cIdx": string[8] }
    editingKey: null, // { sIdx, cIdx, secId }
    dragSource: null, // { sIdx, cIdx }
  },

  ensureLoaded() {
    if (!this.state.songs) {
      this.state.songs = Storage.getSongs();
      this.state.activeSongId = this.state.songs[0]?.id || null;
    }
  },

  getActiveSong() {
    this.ensureLoaded();
    let s = this.state.songs.find((x) => x.id === this.state.activeSongId);
    if (!s && this.state.songs.length) {
      s = this.state.songs[0];
      this.state.activeSongId = s.id;
    }
    return s;
  },

  save() {
    Storage.saveSongs(this.state.songs);
  },

  applyExternal(opts = {}) {
    this.ensureLoaded();
    if (opts.importProg) {
      const song = this.getActiveSong();
      if (song) {
        song.sections.push({
          id: `sec_${Date.now()}`,
          type: 'Refrão',
          scaleId: 'major',
          scaleRootPc: opts.importProg.keyPc,
          chords: opts.importProg.chords,
          notes: `Importado de Progressões: ${opts.importProg.label}`,
        });
        this.save();
      }
    }
  },

  getEffectiveBpm(song) {
    return this.state.momentaryBpm ?? song.bpm ?? RhythmEngine.bpm;
  },

  getEffectiveCadenceId() {
    return this.state.momentaryCadenceId ?? AudioEngine.chordCadence;
  },

  getStepsForComposerChord(secId, cIdx) {
    return this.state.momentaryChordSteps[`${secId}:${cIdx}`] || getPresetSteps(this.getEffectiveCadenceId());
  },

  getChordShape(ch, tuning) {
    const pool = ChordEngine.getVoicings(ch.rootPc, ch.type, tuning);
    if (!pool.length) {
      // Safe fallback to triad if exotic voicing unavailable in special tuning
      const fallback = ChordEngine.getVoicings(ch.rootPc, ch.type.startsWith('m') ? 'min' : 'maj', tuning);
      return { voicing: fallback[0] || null, pool: fallback, safeIdx: 0 };
    }
    const idx = Number.isInteger(ch.shapeIdx) ? ch.shapeIdx : 0;
    const safeIdx = ((idx % pool.length) + pool.length) % pool.length;
    return { voicing: pool[safeIdx], pool, safeIdx };
  },

  playTimeline(container, song, entries, playingSectionId = null) {
    const tuning = Theory.getTuning();
    const bpm = this.getEffectiveBpm(song);
    const cadence = this.getEffectiveCadenceId();

    const chordItems = entries.map((e) => {
      const { voicing } = this.getChordShape(e.chord, tuning);
      const midis = voicing
        ? voicing.stringNotes.filter((n) => !n.muted).map((n) => n.midi)
        : Theory.getChordType(e.chord.type).intervals.map((iv) => 48 + e.chord.rootPc + iv);
      return {
        midis,
        customSteps: this.getStepsForComposerChord(e.secId, e.cIdx),
        cadence,
      };
    });

    this.state.isPlaying = true;
    this.state.playingSectionId = playingSectionId;

    const mainPlayBtn = container.querySelector('#comp-play-song');
    if (mainPlayBtn) mainPlayBtn.innerHTML = `${icon('stop', 14)}<span>Parar</span>`;
    const stagePlayBtn = container.querySelector('#stage-comp-play');
    if (stagePlayBtn) stagePlayBtn.innerHTML = `${icon('stop', 14)}<span>Parar</span>`;

    AudioEngine.playProgression(chordItems, {
      bpm,
      cadence,
      loop: false,
      onChord: (flatIdx) => {
        const entry = entries[flatIdx];
        if (!entry) return;
        this.state.activeChordKey = `${entry.sIdx}:${entry.cIdx}`;
        this.state.playingSectionId = entry.secId;

        container.querySelectorAll('.composer-chord-card, .stage-chord-card').forEach((el) => {
          const isNow = el.dataset.chKey === this.state.activeChordKey;
          el.classList.toggle('playing', isNow);
          if (isNow && this.state.stageMode) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        });
        container.querySelectorAll('.composer-sec-card').forEach((secEl) => {
          secEl.classList.toggle('playing-section', secEl.dataset.secId === entry.secId);
        });

        // Update top visual strum strip to match the currently playing chord's cadence
        const strip = container.querySelector('#comp-pb-strum-strip');
        if (strip && strip.parentElement) {
          strip.parentElement.innerHTML = `<span class="pb-label" style="min-width:68px;">Levada</span>${renderStrumStripHTML(this.getStepsForComposerChord(entry.secId, entry.cIdx), { activeStep: 0, stripId: 'comp-pb-strum-strip' })}`;
        }
      },
      onBeatStep: (flatIdx, stepIdx, beatIdx) => {
        this.state.activeStep = stepIdx;
        this.state.activeBeat = beatIdx;
        highlightStrumStep(container, 'comp-pb', stepIdx);
        container.querySelectorAll('.beat-dot').forEach((d, bi) => d.classList.toggle('on', bi === beatIdx));
        const entry = entries[flatIdx];
        if (entry && this.state.editingKey && this.state.editingKey.secId === entry.secId && this.state.editingKey.cIdx === entry.cIdx) {
          container.querySelectorAll('.strum-edit-btn').forEach((b) => b.classList.toggle('is-now', Number(b.dataset.ceStep) === stepIdx));
        }
      },
      onEnd: () => {
        this.stopPlayback(container);
      },
    });
  },

  stopPlayback(container) {
    AudioEngine.stopSequence();
    this.state.isPlaying = false;
    this.state.playingSectionId = null;
    this.state.activeChordKey = null;
    this.state.activeBeat = -1;
    this.state.activeStep = -1;
    if (container) {
      container.querySelectorAll('.composer-chord-card, .stage-chord-card').forEach((el) => el.classList.remove('playing'));
      container.querySelectorAll('.composer-sec-card').forEach((el) => el.classList.remove('playing-section'));
      container.querySelectorAll('.beat-dot').forEach((d) => d.classList.remove('on'));
      highlightStrumStep(container, 'comp-pb', -1);
      const b = container.querySelector('#comp-play-song');
      if (b) b.innerHTML = `${icon('play', 14)}<span>Tocar Música</span>`;
      const sb = container.querySelector('#stage-comp-play');
      if (sb) sb.innerHTML = `${icon('play', 14)}<span>Tocar Música</span>`;
    }
  },

  render(container, app) {
    this.ensureLoaded();
    const song = this.getActiveSong();
    const tuning = Theory.getTuning();
    const effBpm = this.getEffectiveBpm(song);
    const effCadence = this.getEffectiveCadenceId();
    const hasCustomCadences = Object.keys(this.state.momentaryChordSteps).length > 0;

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Compositor de Músicas</h2>
          <p class="module-subtitle">Cada acorde exibe o nome e o shape pronto para tocar. Arraste acordes para reordenar, customize batidas momentâneas ou use o Modo Palco.</p>
        </div>
        <div class="action-bar stable-actions">
          <button id="comp-play-song" class="btn btn-primary btn-play-toggle">${icon(this.state.isPlaying ? 'stop' : 'play', 14)}<span>${this.state.isPlaying ? 'Parar' : 'Tocar Música'}</span></button>
          <button id="comp-stage-btn" class="btn btn-ghost btn-sm">${icon('maximize', 14)} Modo Palco</button>
          <button id="comp-new-song" class="btn btn-secondary btn-sm">${icon('plus', 14)} Nova Música</button>
          <button id="comp-export-pdf" class="btn btn-ghost btn-sm">${icon('fileText', 14)} PDF</button>
        </div>
      </div>

      <!-- Song Header & Momentary Playback Bar -->
      <section class="card">
        <div class="composer-top-bar">
          <div class="inline-control">
            <label class="field-label">Música</label>
            <select id="comp-song-select" class="select-control select-sm">
              ${this.state.songs.map((s) => `<option value="${s.id}" ${s.id === song.id ? 'selected' : ''}>${s.title}</option>`).join('')}
            </select>
          </div>
          <div class="inline-control" style="flex:1;min-width:180px;">
            <label class="field-label">Título</label>
            <input type="text" id="comp-song-title" class="input-control input-sm" value="${song.title}">
          </div>
          <div class="inline-control">
            <label class="field-label">Tom</label>
            <select id="comp-song-key" class="select-control select-sm">
              ${Theory.getAllRoots().map((r) => `<option value="${r.pc}" ${r.pc === song.keyPc ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select>
          </div>
          <div class="inline-control" style="align-self:flex-end;">
            <button id="comp-del-song" class="btn btn-ghost btn-sm text-red" ${this.state.songs.length <= 1 ? 'disabled' : ''}>${icon('trash', 14)} Excluir</button>
          </div>
        </div>

        <div style="margin-top:12px;">
          ${renderPlaybackControlsHTML({
            mode: 'chord',
            bpm: effBpm,
            cadence: effCadence,
            idPrefix: 'comp-pb',
            activeStep: this.state.activeStep,
            momentaryOnly: true,
          })}
        </div>

        <div class="add-section-bar">
          <span class="field-label" style="margin:0;">Adicionar sessão:</span>
          ${SECTION_TYPES.map((st) => `<button class="pill-btn pill-xs" data-add-sec="${st}">${icon('plus', 11)} ${st}</button>`).join('')}
          ${hasCustomCadences ? `<button id="comp-reset-cad" class="btn btn-ghost btn-xs" style="margin-left:auto;">${icon('rotateCcw', 12)} Resetar Batidas Momentâneas</button>` : ''}
        </div>
      </section>

      <!-- Sections with Clear Visual Shape Cards + Drag-and-Drop -->
      <div class="composer-sections">
        ${song.sections.map((sec, sIdx) => {
          const sc = Theory.getScale(sec.scaleId);
          const scRootName = Theory.pcToNote(sec.scaleRootPc, Theory.useFlatsForRoot(sec.scaleRootPc));
          const isEditingThisSec = this.state.editingKey && this.state.editingKey.secId === sec.id && this.state.editingKey.cIdx < sec.chords.length;

          return `
            <section class="card composer-sec-card ${this.state.playingSectionId === sec.id ? 'playing-section' : ''}" data-sec-id="${sec.id}">
              <div class="sec-header">
                <div class="sec-title-group">
                  <span class="sec-badge">${sec.type}</span>
                  <select class="select-control select-xs sec-type-sel" data-sidx="${sIdx}">
                    ${SECTION_TYPES.map((t) => `<option value="${t}" ${t === sec.type ? 'selected' : ''}>${t}</option>`).join('')}
                  </select>
                  <span class="muted-text small">Escala:</span>
                  <select class="select-control select-xs sec-scale-root" data-sidx="${sIdx}">
                    ${Theory.getAllRoots().map((r) => `<option value="${r.pc}" ${r.pc === sec.scaleRootPc ? 'selected' : ''}>${r.short || r.label}</option>`).join('')}
                  </select>
                  <select class="select-control select-xs sec-scale-id" data-sidx="${sIdx}">
                    ${Theory.getScales().map((s) => `<option value="${s.id}" ${s.id === sec.scaleId ? 'selected' : ''}>${s.name}</option>`).join('')}
                  </select>
                  <button class="btn btn-ghost btn-xs sec-open-scale" data-r="${sec.scaleRootPc}" data-sc="${sec.scaleId}">Ver Escala ${icon('arrowRight', 12)}</button>
                </div>
                <div class="action-bar">
                  <button class="btn btn-primary btn-xs sec-play" data-sidx="${sIdx}">${icon('play', 12)} Tocar ${sec.type}</button>
                  <button class="btn btn-ghost btn-xs text-red sec-del" data-sidx="${sIdx}" aria-label="Remover sessão">${icon('trash', 13)}</button>
                </div>
              </div>

              <!-- Visual Chord Name + Shape Diagram Cards (Draggable!) -->
              <div class="composer-chords-grid" data-sec-grid="${sIdx}">
                ${sec.chords.map((ch, cIdx) => {
                  const name = Theory.getChordDisplayName(ch.rootPc, ch.type);
                  const { voicing, pool, safeIdx } = this.getChordShape(ch, tuning);
                  const chKey = `${sIdx}:${cIdx}`;
                  const hasCustomBeat = Boolean(this.state.momentaryChordSteps[`${sec.id}:${cIdx}`]);
                  const isEditingCard = isEditingThisSec && this.state.editingKey.cIdx === cIdx;

                  return `
                    <div class="composer-chord-card ${this.state.activeChordKey === chKey ? 'playing' : ''} ${isEditingCard ? 'editing-cadence' : ''}" draggable="true" data-ch-key="${chKey}" data-sidx="${sIdx}" data-cidx="${cIdx}">
                      <div class="ccard-head">
                        <span class="drag-handle" title="Arraste para reordenar">${icon('grip', 13)}</span>
                        <strong class="ccard-name">${name}</strong>
                        <span class="badge badge-muted">${ch.beats}t</span>
                        <button class="btn btn-ghost btn-icon-xs text-red sec-rm-chord" data-sidx="${sIdx}" data-cidx="${cIdx}" title="Remover acorde">${icon('close', 12)}</button>
                      </div>

                      <div class="ccard-diagram sec-chord-play" data-sidx="${sIdx}" data-cidx="${cIdx}" title="Clique para ouvir ${name}">
                        ${voicing ? renderVerticalChordSVG(voicing, { compact: false }) : `<div class="muted-text small">${name}</div>`}
                      </div>

                      ${pool.length > 1 ? `
                        <div class="shape-stepper">
                          <button class="btn btn-ghost btn-icon-xs comp-sh-prev" data-sidx="${sIdx}" data-cidx="${cIdx}" aria-label="Shape anterior">${icon('chevronLeft', 12)}</button>
                          <span class="stepper-text">Shape ${safeIdx + 1}/${pool.length}</span>
                          <button class="btn btn-ghost btn-icon-xs comp-sh-next" data-sidx="${sIdx}" data-cidx="${cIdx}" aria-label="Próximo shape">${icon('chevronRight', 12)}</button>
                        </div>
                      ` : ''}

                      <div class="pchord-shape-label" title="${voicing?.label || ''}">${voicing ? `${voicing.label} · Casas ${voicing.minFret}–${voicing.maxFret}` : ''}</div>

                      <button type="button" class="btn ${isEditingCard || hasCustomBeat ? 'btn-gold-active' : 'btn-ghost'} btn-xs comp-edit-cadence" data-sidx="${sIdx}" data-cidx="${cIdx}" data-sec-id="${sec.id}" style="width:100%;margin-top:6px;">
                        ${icon('sliders', 12)} ${hasCustomBeat ? 'Batida Custom' : 'Editar Batida'}
                      </button>
                    </div>
                  `;
                }).join('')}
                ${sec.chords.length === 0 ? '<div class="muted-text small" style="padding:14px;">Adicione acordes ou insira uma progressão pronta abaixo.</div>' : ''}
              </div>

              <!-- Momentary Per-Chord Cadence Editor inside this section -->
              ${isEditingThisSec ? (() => {
                const cIdx = this.state.editingKey.cIdx;
                const ch = sec.chords[cIdx];
                const name = Theory.getChordDisplayName(ch.rootPc, ch.type);
                return renderChordCadenceEditorHTML({
                  chordLabel: `${sec.type} · ${name} (#${cIdx + 1})`,
                  steps: this.getStepsForComposerChord(sec.id, cIdx),
                  bpm: effBpm,
                  activeStep: this.state.activeChordKey === `${sIdx}:${cIdx}` ? this.state.activeStep : -1,
                  canReplicate: true,
                  editorId: `comp-cadence-editor-${sIdx}`,
                });
              })() : ''}

              <!-- Quick Add Chord / Progression Bar -->
              <div class="sec-add-controls">
                <select class="select-control select-xs add-ch-root" data-sidx="${sIdx}">
                  ${Theory.getAllRoots().map((r) => `<option value="${r.pc}" ${r.pc === song.keyPc ? 'selected' : ''}>${r.short || r.label}</option>`).join('')}
                </select>
                <select class="select-control select-xs add-ch-type" data-sidx="${sIdx}">
                  ${Theory.getChordTypes().map((ct) => `<option value="${ct.id}">${ct.symbol || 'Maj'} (${ct.name})</option>`).join('')}
                </select>
                <button class="btn btn-secondary btn-xs sec-add-chord-btn" data-sidx="${sIdx}">${icon('plus', 12)} Acorde</button>

                <span class="divider-v"></span>

                <select class="select-control select-xs add-prog-tpl" data-sidx="${sIdx}">
                  <option value="">Importar progressão pronta...</option>
                  ${Theory.getProgressions().map((p) => `<option value="${p.id}">[${p.genre}] ${p.name}</option>`).join('')}
                </select>
                <button class="btn btn-ghost btn-xs sec-add-prog-btn" data-sidx="${sIdx}">Inserir</button>
              </div>

              <div class="sec-notes-row">
                <input type="text" class="input-control input-sm sec-notes-input" data-sidx="${sIdx}" placeholder="Notas de arranjo, levada ou dicas de solo (${scRootName} ${sc.name})..." value="${sec.notes || ''}">
              </div>
            </section>
          `;
        }).join('')}
      </div>

      <!-- Stage / Focus Mode Overlay for Composer -->
      ${this.state.stageMode ? `
        <div class="stage-overlay" role="dialog" aria-modal="true" aria-label="Modo Palco — ${song.title}">
          <div class="stage-header">
            <div>
              <h2 class="stage-title">${song.title}</h2>
              <div class="stage-beat-dots">
                <span class="beat-dot ${this.state.activeBeat === 0 ? 'on' : ''}">1</span>
                <span class="beat-dot ${this.state.activeBeat === 1 ? 'on' : ''}">2</span>
                <span class="beat-dot ${this.state.activeBeat === 2 ? 'on' : ''}">3</span>
                <span class="beat-dot ${this.state.activeBeat === 3 ? 'on' : ''}">4</span>
                <span class="mono-text muted-text" style="margin-left:10px;">${effBpm} BPM</span>
              </div>
            </div>
            <div class="action-bar stable-actions">
              <button id="stage-comp-play" class="btn btn-primary btn-play-toggle">${icon(this.state.isPlaying ? 'stop' : 'play', 14)}<span>${this.state.isPlaying ? 'Parar' : 'Tocar Música'}</span></button>
              <button id="stage-comp-close" class="btn btn-ghost">${icon('minimize', 15)} Sair do Palco</button>
            </div>
          </div>

          <div class="stage-sections-wrap">
            ${song.sections.map((sec, sIdx) => `
              <div class="stage-section-block">
                <div class="stage-sec-title"><span class="sec-badge">${sec.type}</span> <span class="muted-text small">${sec.notes || ''}</span></div>
                <div class="stage-chords-grid">
                  ${sec.chords.map((ch, cIdx) => {
                    const name = Theory.getChordDisplayName(ch.rootPc, ch.type);
                    const { voicing } = this.getChordShape(ch, tuning);
                    const chKey = `${sIdx}:${cIdx}`;
                    return `
                      <div class="stage-chord-card ${this.state.activeChordKey === chKey ? 'playing' : ''}" data-ch-key="${chKey}">
                        <div class="stage-chord-head"><strong>${name}</strong><span class="badge badge-muted">${ch.beats}t</span></div>
                        ${voicing ? renderVerticalChordSVG(voicing, { compact: false }) : ''}
                        <div class="small muted-text">${voicing?.label || ''}</div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    this.bindEvents(container, app, song, tuning);
  },

  bindEvents(container, app, song, tuning) {
    bindPlaybackControls(container, {
      mode: 'chord',
      idPrefix: 'comp-pb',
      momentaryOnly: true,
      onBpmChange: (bpm) => {
        this.state.momentaryBpm = bpm;
      },
      onCadenceChange: (cadId) => {
        this.state.momentaryCadenceId = cadId;
      },
    });

    container.querySelector('#comp-song-select')?.addEventListener('change', (e) => {
      this.stopPlayback(container);
      this.state.activeSongId = e.target.value;
      this.state.momentaryChordSteps = {};
      this.state.momentaryBpm = null;
      this.state.editingKey = null;
      this.render(container, app);
    });

    container.querySelector('#comp-song-title')?.addEventListener('change', (e) => {
      song.title = e.target.value.trim() || 'Nova Música';
      this.save();
      this.render(container, app);
    });

    container.querySelector('#comp-song-key')?.addEventListener('change', (e) => {
      song.keyPc = Number(e.target.value);
      this.save();
      this.render(container, app);
    });

    container.querySelector('#comp-reset-cad')?.addEventListener('click', () => {
      this.state.momentaryChordSteps = {};
      app.toast('Batidas momentâneas restauradas.');
      this.render(container, app);
    });

    container.querySelector('#comp-new-song')?.addEventListener('click', () => {
      this.stopPlayback(container);
      const newSong = {
        id: `song_${Date.now()}`,
        title: `Composição #${this.state.songs.length + 1}`,
        keyPc: 0,
        bpm: RhythmEngine.bpm || 110,
        updatedAt: Date.now(),
        sections: [
          { id: `sec_${Date.now()}_1`, type: 'Verso', scaleId: 'major', scaleRootPc: 0, chords: [{ rootPc: 0, type: 'maj', beats: 4, shapeIdx: 0 }, { rootPc: 7, type: 'maj', beats: 4, shapeIdx: 0 }], notes: '' },
          { id: `sec_${Date.now()}_2`, type: 'Refrão', scaleId: 'pentatonic_major', scaleRootPc: 0, chords: [{ rootPc: 5, type: 'maj', beats: 4, shapeIdx: 0 }, { rootPc: 7, type: 'maj', beats: 4, shapeIdx: 0 }], notes: '' },
        ],
      };
      this.state.songs.unshift(newSong);
      this.state.activeSongId = newSong.id;
      this.save();
      app.toast('Nova música criada!');
      this.render(container, app);
    });

    container.querySelector('#comp-del-song')?.addEventListener('click', () => {
      if (this.state.songs.length <= 1) return;
      this.stopPlayback(container);
      this.state.songs = this.state.songs.filter((s) => s.id !== song.id);
      this.state.activeSongId = this.state.songs[0].id;
      this.save();
      app.toast('Música removida.');
      this.render(container, app);
    });

    container.querySelectorAll('[data-add-sec]').forEach((btn) => {
      btn.addEventListener('click', () => {
        song.sections.push({
          id: `sec_${Date.now()}`,
          type: btn.dataset.addSec,
          scaleId: 'major',
          scaleRootPc: song.keyPc,
          chords: [],
          notes: '',
        });
        this.save();
        this.render(container, app);
      });
    });

    container.querySelectorAll('.sec-type-sel').forEach((sel) => {
      sel.addEventListener('change', (e) => { song.sections[Number(sel.dataset.sidx)].type = e.target.value; this.save(); this.render(container, app); });
    });
    container.querySelectorAll('.sec-scale-root').forEach((sel) => {
      sel.addEventListener('change', (e) => { song.sections[Number(sel.dataset.sidx)].scaleRootPc = Number(e.target.value); this.save(); });
    });
    container.querySelectorAll('.sec-scale-id').forEach((sel) => {
      sel.addEventListener('change', (e) => { song.sections[Number(sel.dataset.sidx)].scaleId = e.target.value; this.save(); });
    });
    container.querySelectorAll('.sec-open-scale').forEach((btn) => {
      btn.addEventListener('click', () => app.navigate('scales', { rootPc: Number(btn.dataset.r), scaleId: btn.dataset.sc }));
    });
    container.querySelectorAll('.sec-del').forEach((btn) => {
      btn.addEventListener('click', () => { song.sections.splice(Number(btn.dataset.sidx), 1); this.save(); this.render(container, app); });
    });

    container.querySelectorAll('.sec-add-chord-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sIdx = Number(btn.dataset.sidx);
        const card = btn.closest('.composer-sec-card');
        const r = Number(card.querySelector('.add-ch-root').value);
        const t = card.querySelector('.add-ch-type').value;
        song.sections[sIdx].chords.push({ rootPc: r, type: t, beats: 4, shapeIdx: 0 });
        this.save();
        this.render(container, app);
      });
    });

    container.querySelectorAll('.sec-add-prog-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sIdx = Number(btn.dataset.sidx);
        const card = btn.closest('.composer-sec-card');
        const pid = card.querySelector('.add-prog-tpl').value;
        if (!pid) return;
        const prog = Theory.getProgressions().find((p) => p.id === pid);
        if (!prog) return;
        prog.chords.forEach((c) => {
          song.sections[sIdx].chords.push({ rootPc: Theory.mod12(song.keyPc + c.degree), type: c.type, beats: 4, shapeIdx: 0 });
        });
        this.save();
        this.render(container, app);
      });
    });

    container.querySelectorAll('.sec-rm-chord').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        song.sections[Number(btn.dataset.sidx)].chords.splice(Number(btn.dataset.cidx), 1);
        this.save();
        this.render(container, app);
      });
    });

    // Per-chord shape switching
    container.querySelectorAll('.comp-sh-prev').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ch = song.sections[Number(btn.dataset.sidx)].chords[Number(btn.dataset.cidx)];
        const { pool, safeIdx } = this.getChordShape(ch, tuning);
        if (!pool.length) return;
        ch.shapeIdx = (safeIdx - 1 + pool.length) % pool.length;
        this.save();
        this.render(container, app);
        AudioEngine.playChord(pool[ch.shapeIdx].stringNotes.filter((n) => !n.muted).map((n) => n.midi));
      });
    });

    container.querySelectorAll('.comp-sh-next').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ch = song.sections[Number(btn.dataset.sidx)].chords[Number(btn.dataset.cidx)];
        const { pool, safeIdx } = this.getChordShape(ch, tuning);
        if (!pool.length) return;
        ch.shapeIdx = (safeIdx + 1) % pool.length;
        this.save();
        this.render(container, app);
        AudioEngine.playChord(pool[ch.shapeIdx].stringNotes.filter((n) => !n.muted).map((n) => n.midi));
      });
    });

    // Click chord diagram to audition with its custom cadence
    container.querySelectorAll('.sec-chord-play').forEach((el) => {
      el.addEventListener('click', () => {
        const sIdx = Number(el.dataset.sidx);
        const cIdx = Number(el.dataset.cidx);
        const sec = song.sections[sIdx];
        const ch = sec.chords[cIdx];
        const { voicing } = this.getChordShape(ch, tuning);
        if (voicing) {
          AudioEngine.playChordWithCadence(voicing.stringNotes.filter((n) => !n.muted).map((n) => n.midi), {
            bpm: this.getEffectiveBpm(song),
            customSteps: this.getStepsForComposerChord(sec.id, cIdx),
            loop: false,
          });
        }
      });
    });

    // Toggle momentary per-chord cadence editor
    container.querySelectorAll('.comp-edit-cadence').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sIdx = Number(btn.dataset.sidx);
        const cIdx = Number(btn.dataset.cidx);
        const secId = btn.dataset.secId;
        if (this.state.editingKey && this.state.editingKey.secId === secId && this.state.editingKey.cIdx === cIdx) {
          this.state.editingKey = null;
        } else {
          this.state.editingKey = { sIdx, cIdx, secId };
        }
        this.render(container, app);
      });
    });

    // Bind active momentary cadence editor inside Composer
    if (this.state.editingKey) {
      const { sIdx, cIdx, secId } = this.state.editingKey;
      const editor = container.querySelector(`#comp-cadence-editor-${sIdx}`);
      if (editor) {
        editor.querySelectorAll('[data-ce-step]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const stepIdx = Number(btn.dataset.ceStep);
            const cur = this.getStepsForComposerChord(secId, cIdx).slice();
            cur[stepIdx] = cycleStroke(cur[stepIdx]);
            this.state.momentaryChordSteps[`${secId}:${cIdx}`] = cur;
            this.render(container, app);
          });
        });

        editor.querySelector('.ce-preset-sel')?.addEventListener('change', (e) => {
          if (!e.target.value) return;
          this.state.momentaryChordSteps[`${secId}:${cIdx}`] = getPresetSteps(e.target.value);
          this.render(container, app);
        });

        const syncBpm = (val) => {
          const clean = Math.max(40, Math.min(220, Math.round(Number(val) || 100)));
          this.state.momentaryBpm = clean;
          const r1 = container.querySelector('#comp-pb-bpm-range');
          const n1 = container.querySelector('#comp-pb-bpm');
          const r2 = editor.querySelector('.ce-bpm-range');
          const n2 = editor.querySelector('.ce-bpm-num');
          if (r1) r1.value = clean;
          if (n1) n1.value = clean;
          if (r2) r2.value = clean;
          if (n2) n2.value = clean;
        };
        editor.querySelector('.ce-bpm-range')?.addEventListener('input', (e) => syncBpm(e.target.value));
        editor.querySelector('.ce-bpm-num')?.addEventListener('change', (e) => syncBpm(e.target.value));

        editor.querySelector('.ce-preview')?.addEventListener('click', () => {
          const ch = song.sections[sIdx]?.chords[cIdx];
          if (!ch) return;
          const { voicing } = this.getChordShape(ch, tuning);
          if (!voicing) return;
          AudioEngine.playChordWithCadence(voicing.stringNotes.filter((n) => !n.muted).map((n) => n.midi), {
            bpm: this.getEffectiveBpm(song),
            customSteps: this.getStepsForComposerChord(secId, cIdx),
            loop: false,
            onBeatStep: (si) => {
              editor.querySelectorAll('.strum-edit-btn').forEach((b) => b.classList.toggle('is-now', Number(b.dataset.ceStep) === si));
            },
            onEnd: () => {
              editor.querySelectorAll('.strum-edit-btn').forEach((b) => b.classList.remove('is-now'));
            },
          });
        });

        editor.querySelector('.ce-replicate')?.addEventListener('click', () => {
          const src = this.getStepsForComposerChord(secId, cIdx).slice();
          song.sections.forEach((sec) => {
            sec.chords.forEach((_, idx) => {
              this.state.momentaryChordSteps[`${sec.id}:${idx}`] = src.slice();
            });
          });
          app.toast('Cadência replicada para todos os acordes da música!');
          this.render(container, app);
        });

        editor.querySelector('.ce-close')?.addEventListener('click', () => {
          this.state.editingKey = null;
          this.render(container, app);
        });
      }
    }

    // HTML5 Drag-and-Drop reordering for chord cards!
    container.querySelectorAll('.composer-chord-card').forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        this.state.dragSource = { sIdx: Number(card.dataset.sidx), cIdx: Number(card.dataset.cidx) };
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        container.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        card.classList.add('drag-over');
      });
      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        if (!this.state.dragSource) return;
        const from = this.state.dragSource;
        const to = { sIdx: Number(card.dataset.sidx), cIdx: Number(card.dataset.cidx) };
        if (from.sIdx === to.sIdx && from.cIdx === to.cIdx) return;

        const [moved] = song.sections[from.sIdx].chords.splice(from.cIdx, 1);
        song.sections[to.sIdx].chords.splice(to.cIdx, 0, moved);
        this.state.dragSource = null;
        this.save();
        this.render(container, app);
      });
    });

    container.querySelectorAll('.sec-notes-input').forEach((inp) => {
      inp.addEventListener('change', (e) => { song.sections[Number(inp.dataset.sidx)].notes = e.target.value; this.save(); });
    });

    // Play Section
    container.querySelectorAll('.sec-play').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sIdx = Number(btn.dataset.sidx);
        const sec = song.sections[sIdx];
        if (!sec.chords.length) return app.toast('Adicione acordes nesta sessão primeiro.');
        const entries = sec.chords.map((chord, cIdx) => ({ sIdx, cIdx, secId: sec.id, chord }));
        this.playTimeline(container, song, entries, sec.id);
      });
    });

    // Play Full Song (or Stop)
    const togglePlayFull = () => {
      if (this.state.isPlaying) {
        this.stopPlayback(container);
        return;
      }
      const entries = [];
      song.sections.forEach((sec, sIdx) => {
        sec.chords.forEach((chord, cIdx) => {
          entries.push({ sIdx, cIdx, secId: sec.id, chord });
        });
      });
      if (!entries.length) return app.toast('Adicione acordes à música primeiro.');
      this.playTimeline(container, song, entries, null);
    };
    container.querySelector('#comp-play-song')?.addEventListener('click', togglePlayFull);
    container.querySelector('#stage-comp-play')?.addEventListener('click', togglePlayFull);

    container.querySelector('#comp-stage-btn')?.addEventListener('click', () => {
      this.state.stageMode = true;
      this.render(container, app);
    });
    container.querySelector('#stage-comp-close')?.addEventListener('click', () => {
      this.state.stageMode = false;
      this.render(container, app);
    });

    container.querySelector('#comp-export-pdf')?.addEventListener('click', () => {
      const keyName = Theory.pcToNote(song.keyPc, Theory.useFlatsForRoot(song.keyPc));
      const body = song.sections.map((sec) => {
        const sc = Theory.getScale(sec.scaleId);
        const scRoot = Theory.pcToNote(sec.scaleRootPc, Theory.useFlatsForRoot(sec.scaleRootPc));
        const diagrams = sec.chords.map((c) => {
          const { voicing } = this.getChordShape(c, tuning);
          return `<div style="display:inline-block;margin:6px;text-align:center;">${voicing ? renderVerticalChordSVG(voicing, { compact: true }) : `<strong>${Theory.getChordDisplayName(c.rootPc, c.type)}</strong>`}</div>`;
        }).join('');
        return `
          <div class="print-section">
            <h3>[${sec.type}] — Escala: ${scRoot} ${sc.name}</h3>
            <div>${diagrams || '<em>Sem acordes</em>'}</div>
            ${sec.notes ? `<p style="color:#475569;font-size:13px;">${sec.notes}</p>` : ''}
          </div>
        `;
      }).join('');

      ExportTools.exportPdfSheet(song.title, `Tom: ${keyName} | BPM: ${this.getEffectiveBpm(song)} | Afinação: ${tuning.name}`, body);
    });
  },
};
