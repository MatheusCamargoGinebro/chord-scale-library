/**
 * Module 2: Full 24-Fret Interactive Fretboard Visualizer
 * Includes: Notes/Intervals/Degrees/Roots/Selected display, Modes (Notes, Intervals, Scales, Chords, Arpeggios),
 * Zoom (Full Neck, Specific Region, Movable Window), Heatmap, Reverse Chord Finder & Reverse Scale Finder.
 */

import { Theory } from '../core/theory.js';
import { ChordEngine } from '../core/chordEngine.js';
import { ScaleEngine } from '../core/scaleEngine.js';
import { Storage } from '../core/storage.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { renderFretboard } from '../ui/fretboard.js';
import { ExportTools } from '../ui/exportTools.js';

export const ModFretboard = {
  id: 'fretboard',
  state: {
    mode: 'scales', // 'notes' | 'intervals' | 'scales' | 'chords' | 'arpeggios' | 'reverse'
    displayMode: 'notes', // 'notes' | 'intervals' | 'degrees' | 'roots' | 'selected'
    rootPc: 0,
    scaleId: 'pentatonic_minor',
    chordTypeId: 'maj7',
    arpeggioId: 'maj7',
    zoomMode: 'full', // 'full' | 'region' | 'window'
    regionPreset: '0-12',
    windowStart: 0,
    windowSpan: 12,
    showHeatmap: false,
    showCaged: false,
    selectedNotes: [], // [{ stringIdx, fret, midi, pc, note }]
  },

  applyExternal(opts = {}) {
    if (opts.mode) this.state.mode = opts.mode;
    if (opts.rootPc !== undefined) this.state.rootPc = Theory.mod12(opts.rootPc);
    if (opts.chordTypeId) this.state.chordTypeId = opts.chordTypeId;
    if (opts.scaleId) this.state.scaleId = opts.scaleId;
    if (opts.arpeggioId) this.state.arpeggioId = opts.arpeggioId;
  },

  getShareParams() {
    return { m: 'fretboard', fm: this.state.mode, r: this.state.rootPc, sc: this.state.scaleId, ct: this.state.chordTypeId };
  },

  applyShareParams(p) {
    if (p.fm) this.state.mode = p.fm;
    if (p.r !== undefined) this.state.rootPc = Theory.mod12(Number(p.r));
    if (p.sc) this.state.scaleId = p.sc;
    if (p.ct) this.state.chordTypeId = p.ct;
  },

  getFretRange() {
    if (this.state.zoomMode === 'full') return { startFret: 0, endFret: 24 };
    if (this.state.zoomMode === 'region') {
      const [a, b] = this.state.regionPreset.split('-').map(Number);
      return { startFret: a, endFret: b };
    }
    const start = Math.max(0, Math.min(20, this.state.windowStart));
    const end = Math.min(24, start + this.state.windowSpan);
    return { startFret: start, endFret: end };
  },

  buildPositions(tuning) {
    const s = this.state;
    if (s.mode === 'reverse') {
      return s.selectedNotes.map((n) => ({
        ...n,
        short: Theory.getIntervalInfo(Theory.mod12(n.pc - (s.selectedNotes[0]?.pc ?? 0))).short,
        degree: Theory.getIntervalInfo(Theory.mod12(n.pc - (s.selectedNotes[0]?.pc ?? 0))).degree,
        color: '#f59e0b',
        isRoot: s.selectedNotes[0] && n.pc === s.selectedNotes[0].pc,
      }));
    }
    if (s.mode === 'notes' || s.mode === 'intervals') {
      const allIvs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      return ScaleEngine.getFretboardPositions(s.rootPc, allIvs, tuning, 24);
    }
    if (s.mode === 'scales') {
      const sc = Theory.getScale(s.scaleId);
      return ScaleEngine.getFretboardPositions(s.rootPc, sc.intervals, tuning, 24);
    }
    if (s.mode === 'chords') {
      const ct = Theory.getChordType(s.chordTypeId);
      return ScaleEngine.getFretboardPositions(s.rootPc, ct.intervals, tuning, 24);
    }
    if (s.mode === 'arpeggios') {
      const arp = Theory.getArpeggio(s.arpeggioId);
      return ScaleEngine.getFretboardPositions(s.rootPc, arp.intervals, tuning, 24);
    }
    return [];
  },

  render(container, app) {
    const tuning = Theory.getTuning();
    const { startFret, endFret } = this.getFretRange();
    const positions = this.buildPositions(tuning);

    let cagedBoxes = null;
    if (this.state.showCaged && (this.state.mode === 'scales' || this.state.mode === 'arpeggios')) {
      const ivs = this.state.mode === 'scales'
        ? Theory.getScale(this.state.scaleId).intervals
        : Theory.getArpeggio(this.state.arpeggioId).intervals;
      cagedBoxes = ScaleEngine.getCagedBoxes(this.state.rootPc, ivs, tuning);
    }

    const chordMatches = this.state.selectedNotes.length >= 2 ? ChordEngine.identifyChord(this.state.selectedNotes) : [];
    const scaleMatches = this.state.selectedNotes.length >= 3 ? ScaleEngine.identifyScale(this.state.selectedNotes) : [];

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Visualizador do Braço (24 Casas)</h2>
          <p class="module-subtitle">Clique em qualquer casa para ouvir a nota, ativar o <strong>Reverse Chord / Scale Finder</strong> ou explorar o <strong>Heatmap</strong> do braço.</p>
        </div>
        <div class="action-bar">
          <button id="fb-toggle-heatmap" class="btn ${this.state.showHeatmap ? 'btn-gold-active' : 'btn-ghost'} btn-sm">🔥 Heatmap ${this.state.showHeatmap ? 'ON' : 'OFF'}</button>
          <button id="fb-toggle-caged" class="btn ${this.state.showCaged ? 'btn-accent-active' : 'btn-ghost'} btn-sm">CAGED ${this.state.showCaged ? 'ON' : 'OFF'}</button>
          <button id="fb-export-png" class="btn btn-ghost btn-sm">Exportar PNG</button>
        </div>
      </div>

      <!-- Controls Bar -->
      <section class="card">
        <div class="controls-grid-3">
          <div>
            <label class="field-label">Modo de Visualização</label>
            <div class="pill-wrap">
              ${[
                ['scales', 'Escalas'],
                ['chords', 'Acordes'],
                ['arpeggios', 'Arpejos'],
                ['notes', 'Todas Notas'],
                ['intervals', 'Intervalos'],
                ['reverse', '🔍 Reverse Finder'],
              ].map(([id, label]) => `
                <button class="pill-btn pill-sm ${this.state.mode === id ? 'active' : ''}" data-fb-mode="${id}">${label}</button>
              `).join('')}
            </div>
          </div>

          <div>
            <label class="field-label">Exibir nos Marcadores</label>
            <div class="pill-wrap">
              ${[
                ['notes', 'Notas'],
                ['intervals', 'Intervalos'],
                ['degrees', 'Graus'],
                ['roots', 'Só Tônicas'],
                ['selected', 'Só Selecionadas'],
              ].map(([id, label]) => `
                <button class="pill-btn pill-sm ${this.state.displayMode === id ? 'active' : ''}" data-fb-disp="${id}">${label}</button>
              `).join('')}
            </div>
          </div>

          <div>
            <label class="field-label">Zoom do Braço</label>
            <div class="pill-wrap">
              <button class="pill-btn pill-sm ${this.state.zoomMode === 'full' ? 'active' : ''}" data-zoom="full">Braço Inteiro (0–24)</button>
              <button class="pill-btn pill-sm ${this.state.zoomMode === 'region' ? 'active' : ''}" data-zoom="region">Região</button>
              <button class="pill-btn pill-sm ${this.state.zoomMode === 'window' ? 'active' : ''}" data-zoom="window">Janela Móvel</button>
            </div>
          </div>
        </div>

        <!-- Contextual Sub-controls -->
        <div class="sub-controls-row">
          ${this.state.mode !== 'reverse' ? `
            <div class="inline-control">
              <label class="field-label">Tônica</label>
              <select id="fb-root" class="select-control">
                ${Theory.getAllRoots().map((r) => `<option value="${r.pc}" ${r.pc === this.state.rootPc ? 'selected' : ''}>${r.label}</option>`).join('')}
              </select>
            </div>
          ` : ''}

          ${this.state.mode === 'scales' ? `
            <div class="inline-control">
              <label class="field-label">Escala</label>
              <select id="fb-scale" class="select-control">
                ${Theory.getScales().map((sc) => `<option value="${sc.id}" ${sc.id === this.state.scaleId ? 'selected' : ''}>${sc.name}</option>`).join('')}
              </select>
            </div>
          ` : ''}

          ${this.state.mode === 'chords' ? `
            <div class="inline-control">
              <label class="field-label">Tipo de Acorde</label>
              <select id="fb-chord" class="select-control">
                ${Theory.getChordTypes().map((c) => `<option value="${c.id}" ${c.id === this.state.chordTypeId ? 'selected' : ''}>${c.name} (${c.symbol || 'Maj'})</option>`).join('')}
              </select>
            </div>
          ` : ''}

          ${this.state.mode === 'arpeggios' ? `
            <div class="inline-control">
              <label class="field-label">Arpejo</label>
              <select id="fb-arp" class="select-control">
                ${Theory.getArpeggios().map((a) => `<option value="${a.id}" ${a.id === this.state.arpeggioId ? 'selected' : ''}>${a.name}</option>`).join('')}
              </select>
            </div>
          ` : ''}

          ${this.state.zoomMode === 'region' ? `
            <div class="inline-control">
              <label class="field-label">Região Específica</label>
              <div class="pill-wrap">
                ${['0-5', '0-12', '5-12', '9-16', '12-24'].map((rg) => `
                  <button class="pill-btn pill-xs ${this.state.regionPreset === rg ? 'active' : ''}" data-reg="${rg}">Casas ${rg}</button>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${this.state.zoomMode === 'window' ? `
            <div class="inline-control slider-pair">
              <label class="field-label">Casa Inicial: <strong>${this.state.windowStart}</strong></label>
              <input type="range" id="fb-win-start" min="0" max="19" value="${this.state.windowStart}">
            </div>
            <div class="inline-control slider-pair">
              <label class="field-label">Largura: <strong>${this.state.windowSpan} casas</strong></label>
              <input type="range" id="fb-win-span" min="5" max="16" value="${this.state.windowSpan}">
            </div>
          ` : ''}
        </div>
      </section>

      <!-- Main Fretboard Card -->
      <section class="card fretboard-card">
        <div class="fretboard-scroll" id="main-fretboard-mount"></div>
        <div class="fretboard-legend">
          <div class="legend-items">
            <span class="legend-dot"><i style="background:#f59e0b"></i> Tônica (R)</span>
            <span class="legend-dot"><i style="background:#22c55e"></i> 3ª Maior</span>
            <span class="legend-dot"><i style="background:#38bdf8"></i> 3ª Menor</span>
            <span class="legend-dot"><i style="background:#3b82f6"></i> 5ª Justa</span>
            <span class="legend-dot"><i style="background:#eab308"></i> b7 / 7</span>
            ${this.state.showHeatmap ? `<span class="legend-dot"><i style="background:#ef4444"></i> Heatmap: Alta frequência de uso</span>` : ''}
          </div>
          <div class="action-bar">
            ${this.state.showHeatmap ? `<button id="fb-reset-heat" class="btn btn-ghost btn-xs">Resetar Heatmap</button>` : ''}
            <button id="fb-play-sel" class="btn btn-secondary btn-xs" ${!this.state.selectedNotes.length ? 'disabled' : ''}>▶ Tocar Selecionadas (${this.state.selectedNotes.length})</button>
            <button id="fb-clear-sel" class="btn btn-ghost btn-xs" ${!this.state.selectedNotes.length ? 'disabled' : ''}>Limpar Seleção</button>
          </div>
        </div>
      </section>

      <!-- Reverse Chord & Scale Finder Results -->
      <section class="card reverse-finder-card">
        <div class="card-header-row">
          <div>
            <h3 class="section-title">🔍 Reverse Chord & Scale Finder</h3>
            <p class="muted-text small">Clique em notas diretamente no braço acima para montar um acorde ou escala. O sistema identifica automaticamente!</p>
          </div>
          <div class="pill-wrap">
            ${this.state.selectedNotes.length
              ? this.state.selectedNotes.map((n, i) => `
                  <span class="note-pill selected-note-chip" data-rm-sel="${i}" title="Clique para remover">
                    ${n.note} <small>C${tuning.strings - n.stringIdx}:f${n.fret}</small> ×
                  </span>
                `).join('')
              : '<span class="muted-text small">Nenhuma nota marcada ainda — clique no braço!</span>'}
          </div>
        </div>

        <div class="reverse-grid">
          <div class="subcard">
            <h4 class="subcard-title">Acordes Identificados (Reverse Chord Finder)</h4>
            ${chordMatches.length ? `
              <div class="match-list">
                ${chordMatches.map((m) => `
                  <div class="match-row">
                    <div>
                      <strong class="match-symbol">${m.symbol}</strong>
                      <span class="muted-text small">${m.chordType.name} · <code>${m.formula}</code></span>
                    </div>
                    <div class="match-right">
                      <span class="badge badge-success">${m.confidence}%</span>
                      <button class="btn btn-ghost btn-xs rev-open-chord" data-r="${m.rootPc}" data-ct="${m.chordTypeId}">Abrir →</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `<p class="muted-text small">Marque pelo menos 2 notas diferentes no braço para identificar acordes e inversões.</p>`}
          </div>

          <div class="subcard">
            <h4 class="subcard-title">Escalas Identificadas (Reverse Scale Finder)</h4>
            ${scaleMatches.length ? `
              <div class="match-list">
                ${scaleMatches.map((m) => `
                  <div class="match-row">
                    <div>
                      <strong class="match-symbol">${m.fullName}</strong>
                      <span class="muted-text small">${m.category} · <code>${m.formula}</code></span>
                    </div>
                    <div class="match-right">
                      <span class="badge badge-info">${m.matchPercent}% cobertura</span>
                      <button class="btn btn-ghost btn-xs rev-open-scale" data-r="${m.rootPc}" data-sc="${m.scaleId}">Abrir →</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `<p class="muted-text small">Marque pelo menos 3 notas diferentes no braço para descobrir quais escalas e modos contêm essas notas.</p>`}
          </div>
        </div>
      </section>
    `;

    const mount = container.querySelector('#main-fretboard-mount');
    renderFretboard(mount, {
      id: 'mod-fretboard-svg',
      tuning,
      startFret,
      endFret,
      displayMode: this.state.displayMode,
      positions,
      selectedNotes: this.state.selectedNotes,
      cagedBoxes,
      heatmap: this.state.showHeatmap ? Storage.getHeatmap() : null,
      interactive: true,
      onFretClick: (noteObj) => {
        const idx = this.state.selectedNotes.findIndex(
          (n) => n.stringIdx === noteObj.stringIdx && n.fret === noteObj.fret
        );
        if (idx >= 0) {
          this.state.selectedNotes.splice(idx, 1);
        } else {
          // In Reverse Chord mode, allow replacing note on same string for easy voicing construction
          if (this.state.mode === 'reverse') {
            this.state.selectedNotes = this.state.selectedNotes.filter((n) => n.stringIdx !== noteObj.stringIdx);
          }
          this.state.selectedNotes.push(noteObj);
        }
        this.render(container, app);
      },
    });

    this.bindEvents(container, app);
  },

  bindEvents(container, app) {
    container.querySelectorAll('[data-fb-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.mode = btn.dataset.fbMode;
        if (this.state.mode === 'intervals') this.state.displayMode = 'intervals';
        else if (this.state.mode === 'notes') this.state.displayMode = 'notes';
        else if (this.state.mode === 'reverse') this.state.displayMode = 'selected';
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-fb-disp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.displayMode = btn.dataset.fbDisp;
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-zoom]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.zoomMode = btn.dataset.zoom;
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-reg]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.regionPreset = btn.dataset.reg;
        this.render(container, app);
      });
    });

    container.querySelector('#fb-root')?.addEventListener('change', (e) => {
      this.state.rootPc = Number(e.target.value);
      this.render(container, app);
    });
    container.querySelector('#fb-scale')?.addEventListener('change', (e) => {
      this.state.scaleId = e.target.value;
      this.render(container, app);
    });
    container.querySelector('#fb-chord')?.addEventListener('change', (e) => {
      this.state.chordTypeId = e.target.value;
      this.render(container, app);
    });
    container.querySelector('#fb-arp')?.addEventListener('change', (e) => {
      this.state.arpeggioId = e.target.value;
      this.render(container, app);
    });

    container.querySelector('#fb-win-start')?.addEventListener('input', (e) => {
      this.state.windowStart = Number(e.target.value);
      this.render(container, app);
    });
    container.querySelector('#fb-win-span')?.addEventListener('input', (e) => {
      this.state.windowSpan = Number(e.target.value);
      this.render(container, app);
    });

    container.querySelector('#fb-toggle-heatmap')?.addEventListener('click', () => {
      this.state.showHeatmap = !this.state.showHeatmap;
      this.render(container, app);
    });
    container.querySelector('#fb-reset-heat')?.addEventListener('click', () => {
      Storage.resetHeatmap();
      app.toast('Heatmap resetado para o padrão ergonômico.');
      this.render(container, app);
    });

    container.querySelector('#fb-toggle-caged')?.addEventListener('click', () => {
      this.state.showCaged = !this.state.showCaged;
      this.render(container, app);
    });

    container.querySelector('#fb-play-sel')?.addEventListener('click', () => {
      const midis = this.state.selectedNotes.slice().sort((a, b) => a.midi - b.midi).map((n) => n.midi);
      AudioEngine.playChord(midis, { strumMs: 36, duration: 2.0 });
    });

    container.querySelector('#fb-clear-sel')?.addEventListener('click', () => {
      this.state.selectedNotes = [];
      this.render(container, app);
    });

    container.querySelectorAll('[data-rm-sel]').forEach((el) => {
      el.addEventListener('click', () => {
        this.state.selectedNotes.splice(Number(el.dataset.rmSel), 1);
        this.render(container, app);
      });
    });

    container.querySelectorAll('.rev-open-chord').forEach((btn) => {
      btn.addEventListener('click', () => {
        app.navigate('chords', { rootPc: Number(btn.dataset.r), chordTypeId: btn.dataset.ct });
      });
    });

    container.querySelectorAll('.rev-open-scale').forEach((btn) => {
      btn.addEventListener('click', () => {
        app.navigate('scales', { rootPc: Number(btn.dataset.r), scaleId: btn.dataset.sc });
      });
    });

    container.querySelector('#fb-export-png')?.addEventListener('click', () => {
      const svg = container.querySelector('#mod-fretboard-svg');
      ExportTools.exportSvgAsPng(svg, 'fretboard-visualizer.png', `Braço 24 Casas (${Theory.getTuning().name})`);
      app.toast('Visualização do braço exportada em PNG!');
    });
  },
};
