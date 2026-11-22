/**
 * Module 4: Modes Explorer (Explorador de Modos)
 * Clean SVG icons, side-by-side 7-mode comparison, altered note highlights,
 * inline BPM + Melodic Cadence controls & 24-fret board preview.
 */

import { Theory } from '../core/theory.js';
import { ScaleEngine } from '../core/scaleEngine.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { RhythmEngine } from '../audio/rhythmEngine.js';
import { renderFretboard } from '../ui/fretboard.js';
import { icon } from '../ui/icons.js';
import { renderPlaybackControlsHTML, bindPlaybackControls } from '../ui/playbackBar.js';

export const ModModes = {
  id: 'modes',
  state: {
    parentKey: 'major',
    rootPc: 0,
    viewMode: 'parallel',
    selectedModeIdx: 1,
    displayMode: 'intervals',
    isPlaying: false,
  },

  getShareParams() {
    return { m: 'modes', pk: this.state.parentKey, r: this.state.rootPc, vm: this.state.viewMode, mi: this.state.selectedModeIdx };
  },

  applyShareParams(p) {
    if (p.pk) this.state.parentKey = p.pk;
    if (p.r !== undefined) this.state.rootPc = Theory.mod12(Number(p.r));
    if (p.vm) this.state.viewMode = p.vm;
    if (p.mi !== undefined) this.state.selectedModeIdx = Number(p.mi) || 0;
  },

  render(container, app) {
    const systems = Theory.getParentSystems();
    const modes = ScaleEngine.getModesAnalysis(this.state.parentKey, this.state.rootPc, this.state.viewMode);
    const activeMode = modes[this.state.selectedModeIdx] || modes[0];
    const tuning = Theory.getTuning();

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Explorador de Modos</h2>
          <p class="module-subtitle">Compare os 7 modos lado a lado e identifique exatamente quais notas e intervalos são alterados em relação ao Jônio.</p>
        </div>
        <div class="action-bar">
          <button id="mode-play" class="btn btn-primary">${icon(this.state.isPlaying ? 'stop' : 'play', 14)} ${this.state.isPlaying ? 'Parar' : `Ouvir ${activeMode.fullTitle}`}</button>
        </div>
      </div>

      <section class="card selector-card">
        <div class="controls-split" style="margin-bottom:10px;">
          <div>
            <label class="field-label">Escala Mãe</label>
            <div class="segmented-tabs compact">
              ${Object.entries(systems).map(([k, sys]) => `
                <button class="seg-tab ${this.state.parentKey === k ? 'active' : ''}" data-parent="${k}">${sys.name}</button>
              `).join('')}
            </div>
          </div>
          <div>
            <label class="field-label">Comparação</label>
            <div class="segmented-tabs compact">
              <button class="seg-tab ${this.state.viewMode === 'parallel' ? 'active' : ''}" data-vm="parallel">Paralelos</button>
              <button class="seg-tab ${this.state.viewMode === 'relative' ? 'active' : ''}" data-vm="relative">Relativos</button>
            </div>
          </div>
          <div class="inline-control">
            <label class="field-label">Tônica</label>
            <select id="mode-root" class="select-control select-sm">
              ${Theory.getAllRoots().map((r) => `<option value="${r.pc}" ${r.pc === this.state.rootPc ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select>
          </div>
        </div>

        ${renderPlaybackControlsHTML({ mode: 'melodic', bpm: RhythmEngine.bpm, cadence: AudioEngine.melodicCadence, idPrefix: 'mode-pb' })}
      </section>

      <section class="card">
        <div class="card-header-row">
          <h3 class="section-title">7 Modos Lado a Lado</h3>
          <span class="muted-text small">Células em <strong class="text-pink">rosa</strong> indicam graus alterados vs Maior</span>
        </div>

        <div class="modes-grid">
          ${modes.map((m) => `
            <article class="mode-card ${m.index === this.state.selectedModeIdx ? 'active' : ''}" data-mode-idx="${m.index}">
              <div class="mode-card-head">
                <span class="mode-deg">${m.degree}</span>
                <strong>${m.fullTitle}</strong>
                <span class="badge badge-muted">${m.chord}</span>
              </div>
              <p class="mode-char">${m.character}</p>

              <div class="mode-degrees-row">
                ${m.degrees.map((d) => `
                  <div class="mode-deg-cell ${d.altered ? 'altered' : ''}">
                    <span class="m-iv">${d.short}</span>
                    <strong class="m-nt">${d.note}</strong>
                  </div>
                `).join('')}
              </div>

              <div class="mode-footer">
                <span class="small muted-text">
                  ${m.alteredDegrees.length
                    ? `Alteradas: <strong class="text-gold">${m.alteredDegrees.map((a) => `${a.short}(${a.note})`).join(', ')}</strong>`
                    : 'Referência Maior'}
                </span>
                <div class="brightness-bar" title="Brilho: ${m.brightness}/6">
                  ${Array.from({ length: 6 }, (_, i) => `<i class="${i < m.brightness ? 'lit' : ''}"></i>`).join('')}
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </section>

      <section class="card">
        <div class="card-header-row">
          <div>
            <h3 class="section-title">${activeMode.fullTitle} no Braço</h3>
            <p class="muted-text small">Fórmula: <code>${activeMode.formula}</code> · Acorde: <strong>${activeMode.chord}</strong></p>
          </div>
          <div class="pill-wrap">
            <button class="pill-btn pill-xs ${this.state.displayMode === 'notes' ? 'active' : ''}" data-mdisp="notes">Notas</button>
            <button class="pill-btn pill-xs ${this.state.displayMode === 'intervals' ? 'active' : ''}" data-mdisp="intervals">Intervalos</button>
          </div>
        </div>
        <div class="fretboard-scroll" id="mode-fretboard-mount"></div>
      </section>
    `;

    const alteredSet = new Set(activeMode.alteredDegrees.map((a) => a.pc));
    const positions = ScaleEngine.getFretboardPositions(activeMode.rootPc, activeMode.intervals, tuning, 24).map((p) => ({
      ...p,
      ring: alteredSet.has(p.pc),
      customColor: p.isRoot ? '#f59e0b' : alteredSet.has(p.pc) ? '#ec4899' : '#38bdf8',
    }));

    renderFretboard(container.querySelector('#mode-fretboard-mount'), {
      id: 'mode-fretboard-svg',
      tuning,
      startFret: 0,
      endFret: 24,
      displayMode: this.state.displayMode,
      positions,
      interactive: true,
    });

    this.bindEvents(container, app, activeMode);
  },

  bindEvents(container, app, activeMode) {
    bindPlaybackControls(container, { mode: 'melodic', idPrefix: 'mode-pb' });

    container.querySelectorAll('[data-parent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.parentKey = btn.dataset.parent;
        this.state.selectedModeIdx = 0;
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-vm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.viewMode = btn.dataset.vm;
        this.render(container, app);
      });
    });

    container.querySelector('#mode-root')?.addEventListener('change', (e) => {
      this.state.rootPc = Number(e.target.value);
      this.render(container, app);
    });

    container.querySelectorAll('[data-mode-idx]').forEach((card) => {
      card.addEventListener('click', () => {
        this.state.selectedModeIdx = Number(card.dataset.modeIdx);
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-mdisp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.displayMode = btn.dataset.mdisp;
        this.render(container, app);
      });
    });

    container.querySelector('#mode-play')?.addEventListener('click', () => {
      if (this.state.isPlaying) {
        AudioEngine.stopSequence();
        this.state.isPlaying = false;
        this.render(container, app);
        return;
      }
      const baseMidi = 48 + activeMode.rootPc;
      const midis = [...activeMode.intervals.map((iv) => baseMidi + iv), baseMidi + 12];
      this.state.isPlaying = true;
      this.render(container, app);
      AudioEngine.playSequence(midis, {
        bpm: RhythmEngine.bpm,
        subdivision: 2,
        cadence: AudioEngine.melodicCadence,
        onEnd: () => {
          this.state.isPlaying = false;
          const b = container.querySelector('#mode-play');
          if (b) b.innerHTML = `${icon('play', 14)} Ouvir ${activeMode.fullTitle}`;
        },
      });
    });
  },
};
