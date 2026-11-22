/**
 * Module 4: Modes Explorer (Explorador de Modos)
 * Select parent scale (Major, Melodic Minor, Harmonic Minor), compare all 7 modes side-by-side,
 * highlight altered notes & intervals vs Ionian, audition audio & inspect on 24-fret board.
 */

import { Theory } from '../core/theory.js';
import { ScaleEngine } from '../core/scaleEngine.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { renderFretboard } from '../ui/fretboard.js';

export const ModModes = {
  id: 'modes',
  state: {
    parentKey: 'major',
    rootPc: 0, // C
    viewMode: 'parallel', // 'parallel' (same root, shows altered notes) | 'relative' (same parent notes)
    selectedModeIdx: 1, // Dorian by default
    displayMode: 'intervals',
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
          <p class="module-subtitle">Compare todos os 7 modos lado a lado, veja exatamente quais <strong>notas e intervalos são alterados</strong> em relação ao Jônio (Maior).</p>
        </div>
        <div class="action-bar">
          <button id="mode-play" class="btn btn-primary">▶ Ouvir ${activeMode.fullTitle}</button>
        </div>
      </div>

      <section class="card selector-card">
        <div class="controls-grid-3">
          <div>
            <label class="field-label">Escala Mãe</label>
            <div class="pill-wrap">
              ${Object.entries(systems).map(([k, sys]) => `
                <button class="pill-btn pill-sm ${this.state.parentKey === k ? 'active' : ''}" data-parent="${k}">${sys.name}</button>
              `).join('')}
            </div>
          </div>

          <div>
            <label class="field-label">Modo de Comparação</label>
            <div class="pill-wrap">
              <button class="pill-btn pill-sm ${this.state.viewMode === 'parallel' ? 'active' : ''}" data-vm="parallel">Paralelos (Mesma Tônica)</button>
              <button class="pill-btn pill-sm ${this.state.viewMode === 'relative' ? 'active' : ''}" data-vm="relative">Relativos (Mesma Armadura)</button>
            </div>
          </div>

          <div>
            <label class="field-label">Tônica</label>
            <select id="mode-root" class="select-control">
              ${Theory.getAllRoots().map((r) => `<option value="${r.pc}" ${r.pc === this.state.rootPc ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select>
          </div>
        </div>
      </section>

      <!-- Side-by-Side 7 Modes Comparison Matrix -->
      <section class="card">
        <div class="card-header-row">
          <h3 class="section-title">Comparação Lado a Lado — 7 Modos</h3>
          <span class="muted-text small">Células destacadas em <strong class="text-pink">rosa/âmbar</strong> indicam notas alteradas em relação à Escala Maior (1-2-3-4-5-6-7)</span>
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
                  <div class="mode-deg-cell ${d.altered ? 'altered' : ''}" title="${d.altered ? 'Alterada vs Maior' : 'Natural'}">
                    <span class="m-iv">${d.short}</span>
                    <strong class="m-nt">${d.note}</strong>
                  </div>
                `).join('')}
              </div>

              <div class="mode-footer">
                <span class="small muted-text">
                  ${m.alteredDegrees.length
                    ? `Alterações: <strong class="text-gold">${m.alteredDegrees.map((a) => `${a.short} (${a.note})`).join(', ')}</strong>`
                    : 'Nenhuma alteração (Referência Maior)'}
                </span>
                <div class="brightness-bar" title="Brilho harmônico: ${m.brightness}/6">
                  ${Array.from({ length: 6 }, (_, i) => `<i class="${i < m.brightness ? 'lit' : ''}"></i>`).join('')}
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </section>

      <!-- Active Mode Fretboard Visualization -->
      <section class="card">
        <div class="card-header-row">
          <div>
            <h3 class="section-title">${activeMode.fullTitle} no Braço</h3>
            <p class="muted-text small">Fórmula: <code>${activeMode.formula}</code> · Acorde característico: <strong>${activeMode.chord}</strong></p>
          </div>
          <div class="pill-wrap">
            <button class="pill-btn pill-xs ${this.state.displayMode === 'notes' ? 'active' : ''}" data-mdisp="notes">Notas</button>
            <button class="pill-btn pill-xs ${this.state.displayMode === 'intervals' ? 'active' : ''}" data-mdisp="intervals">Intervalos</button>
          </div>
        </div>
        <div class="fretboard-scroll" id="mode-fretboard-mount"></div>
      </section>
    `;

    // Highlight altered characteristic notes with ring on fretboard!
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
      const baseMidi = 48 + activeMode.rootPc;
      const midis = [...activeMode.intervals.map((iv) => baseMidi + iv), baseMidi + 12];
      AudioEngine.playSequence(midis, { bpm: 120, subdivision: 2, ascendingAndDescending: true });
    });
  },
};
