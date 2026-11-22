/**
 * Module 3: Scale Builder (Construtor de Escalas)
 * Clean categorized scale selector, inline BPM + Melodic Cadence controls,
 * CAGED boxes, Regional shapes, 2/3/4 NPS, and crisp SVG icons.
 */

import { Theory } from '../core/theory.js';
import { ScaleEngine } from '../core/scaleEngine.js';
import { Storage } from '../core/storage.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { RhythmEngine } from '../audio/rhythmEngine.js';
import { renderFretboard } from '../ui/fretboard.js';
import { ExportTools } from '../ui/exportTools.js';
import { icon } from '../ui/icons.js';
import { renderPlaybackControlsHTML, bindPlaybackControls } from '../ui/playbackBar.js';

export const ModScales = {
  id: 'scales',
  state: {
    rootPc: 9, // A
    scaleId: 'pentatonic_minor',
    activeCategory: 'Pentatônicas & Blues',
    displayMode: 'notes',
    shapeSystem: 'all',
    selectedShapeIdx: 0,
    loopPlay: false,
    isPlaying: false,
    activeMidi: null,
  },

  applyExternal(opts = {}) {
    if (opts.rootPc !== undefined) this.state.rootPc = Theory.mod12(opts.rootPc);
    if (opts.scaleId) {
      this.state.scaleId = opts.scaleId;
      const sc = Theory.getScale(opts.scaleId);
      if (sc) this.state.activeCategory = sc.category;
    }
    this.state.selectedShapeIdx = 0;
  },

  getShareParams() {
    return { m: 'scales', r: this.state.rootPc, sc: this.state.scaleId, sys: this.state.shapeSystem };
  },

  applyShareParams(p) {
    if (p.r !== undefined) this.state.rootPc = Theory.mod12(Number(p.r));
    if (p.sc) this.applyExternal({ scaleId: p.sc });
    if (p.sys) this.state.shapeSystem = p.sys;
  },

  getShapesForSystem(tuning) {
    const sc = Theory.getScale(this.state.scaleId);
    const sys = this.state.shapeSystem;
    if (sys === 'caged') return ScaleEngine.getCagedBoxes(this.state.rootPc, sc.intervals, tuning);
    if (sys === 'regions') return ScaleEngine.getRegionShapes(this.state.rootPc, sc.intervals, tuning);
    if (sys === '2nps') return ScaleEngine.getNpsShapes(this.state.rootPc, sc.intervals, 2, tuning);
    if (sys === '3nps') return ScaleEngine.getNpsShapes(this.state.rootPc, sc.intervals, 3, tuning);
    if (sys === '4nps') return ScaleEngine.getNpsShapes(this.state.rootPc, sc.intervals, 4, tuning);
    return [];
  },

  render(container, app) {
    const tuning = Theory.getTuning();
    const sc = Theory.getScale(this.state.scaleId);
    const scaleNotes = Theory.getScaleNotes(this.state.rootPc, this.state.scaleId);
    const rootName = Theory.pcToNote(this.state.rootPc, Theory.useFlatsForRoot(this.state.rootPc));
    const fullName = `${rootName} ${sc.name}`;

    const shapes = this.getShapesForSystem(tuning);
    if (this.state.selectedShapeIdx >= shapes.length) this.state.selectedShapeIdx = 0;
    const activeShape = this.state.shapeSystem === 'all' ? null : shapes[this.state.selectedShapeIdx] || null;

    const allPos = ScaleEngine.getFretboardPositions(this.state.rootPc, sc.intervals, tuning, 24);
    const displayPos = activeShape ? activeShape.notes : allPos;
    const cagedOverlay = this.state.shapeSystem === 'caged' ? (activeShape ? [activeShape] : shapes) : null;

    const favId = `scale_${this.state.rootPc}_${this.state.scaleId}`;
    const isFav = Storage.isFavorite('scales', favId);
    const categories = [...new Set(Theory.getScales().map((s) => s.category))];
    if (!categories.includes(this.state.activeCategory)) this.state.activeCategory = categories[0];

    const visibleScales = Theory.getScales().filter((s) => s.category === this.state.activeCategory);

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Construtor de Escalas</h2>
          <p class="module-subtitle">Explore notas, intervalos, sistema CAGED e digitações 2, 3 e 4 notas por corda.</p>
        </div>
        <div class="action-bar">
          <button id="sc-play" class="btn btn-primary">${icon(this.state.isPlaying ? 'stop' : 'play', 14)} ${this.state.isPlaying ? 'Parar' : 'Tocar Escala'}</button>
          <button id="sc-loop" class="btn ${this.state.loopPlay ? 'btn-gold-active' : 'btn-ghost'} btn-sm">${icon('repeat', 14)} Loop</button>
          <button id="sc-fav" class="btn ${isFav ? 'btn-gold-active' : 'btn-ghost'} btn-icon" title="${isFav ? 'Remover dos favoritos' : 'Favoritar escala'}">${icon(isFav ? 'starFilled' : 'favorites', 15)}</button>
          <button id="sc-png" class="btn btn-ghost btn-sm">${icon('image', 14)} PNG</button>
          <button id="sc-pdf" class="btn btn-ghost btn-sm">${icon('fileText', 14)} PDF</button>
        </div>
      </div>

      <!-- Compact Root & Categorized Scale Picker -->
      <section class="card selector-card">
        <div class="selector-group" style="margin-bottom:12px;">
          <label class="field-label">Tônica</label>
          <div class="pill-grid root-pills">
            ${Theory.getAllRoots().map((r) => `
              <button class="pill-btn ${r.pc === this.state.rootPc ? 'active' : ''}" data-sc-root="${r.pc}">
                ${r.short || r.label}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="segmented-tabs">
          ${categories.map((cat) => `
            <button class="seg-tab ${cat === this.state.activeCategory ? 'active' : ''}" data-sc-cat="${cat}">${cat}</button>
          `).join('')}
        </div>

        <div class="pill-wrap" style="margin-top:10px;">
          ${visibleScales.map((s) => `
            <button class="pill-btn pill-sm ${s.id === this.state.scaleId ? 'active' : ''}" data-sc-id="${s.id}">${s.name}</button>
          `).join('')}
        </div>
      </section>

      <!-- Main Scale Board & Inline Playback -->
      <section class="card">
        <div class="chord-hero-top" style="margin-bottom:12px;">
          <div>
            <div class="chord-title-row">
              <h3 class="chord-big-name" style="font-size:24px;">${fullName}</h3>
              <span class="badge badge-info">${sc.formula}</span>
              <span class="badge badge-muted">${sc.steps}</span>
            </div>
            <p class="muted-text small">${sc.mood} · Característica: <strong>${sc.characteristic}</strong></p>
          </div>
          <div class="pill-wrap">
            ${(sc.chords || []).map((c) => `<span class="badge badge-accent">${c}</span>`).join('')}
          </div>
        </div>

        ${renderPlaybackControlsHTML({ mode: 'melodic', bpm: RhythmEngine.bpm, cadence: AudioEngine.melodicCadence, idPrefix: 'sc-pb' })}

        <div class="controls-split" style="margin-top:14px;">
          <div>
            <label class="field-label">Sistema de Shapes</label>
            <div class="pill-wrap">
              ${[
                ['all', 'Braço Inteiro'],
                ['caged', 'CAGED'],
                ['regions', 'Regiões'],
                ['2nps', '2NPS'],
                ['3nps', '3NPS'],
                ['4nps', '4NPS'],
              ].map(([id, label]) => `
                <button class="pill-btn pill-sm ${this.state.shapeSystem === id ? 'active' : ''}" data-sc-sys="${id}">${label}</button>
              `).join('')}
            </div>
          </div>
          <div>
            <label class="field-label">Rótulos</label>
            <div class="pill-wrap">
              ${[
                ['notes', 'Notas'],
                ['intervals', 'Intervalos'],
                ['degrees', 'Graus'],
                ['roots', 'Só Tônicas'],
              ].map(([id, label]) => `
                <button class="pill-btn pill-sm ${this.state.displayMode === id ? 'active' : ''}" data-sc-disp="${id}">${label}</button>
              `).join('')}
            </div>
          </div>
        </div>

        ${shapes.length ? `
          <div class="shape-pills-bar">
            ${shapes.map((sh, idx) => `
              <button class="pill-btn pill-sm ${idx === this.state.selectedShapeIdx ? 'active' : ''}" data-sc-sh="${idx}">
                ${sh.name} <small>(${sh.startFret}–${sh.endFret})</small>
              </button>
            `).join('')}
          </div>
        ` : ''}

        <div class="fretboard-scroll" id="scale-fretboard-mount"></div>

        <!-- Compact Interval Strip below fretboard -->
        <div class="scale-intervals-row" style="margin-top:14px;">
          ${scaleNotes.map((n) => `
            <div class="interval-card" style="border-top:3px solid ${n.color}">
              <span class="iv-deg">${n.short}</span>
              <strong class="iv-note">${n.note}</strong>
              <span class="iv-name">${n.name.split(' ')[0]}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;

    renderFretboard(container.querySelector('#scale-fretboard-mount'), {
      id: 'scale-fretboard-svg',
      tuning,
      startFret: 0,
      endFret: 24,
      displayMode: this.state.displayMode,
      positions: displayPos.length ? displayPos : allPos,
      cagedBoxes: cagedOverlay,
      activeMidi: this.state.activeMidi,
      interactive: true,
    });

    this.bindEvents(container, app, sc, scaleNotes, fullName, activeShape);
  },

  bindEvents(container, app, sc, scaleNotes, fullName, activeShape) {
    bindPlaybackControls(container, { mode: 'melodic', idPrefix: 'sc-pb' });

    container.querySelectorAll('[data-sc-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.activeCategory = btn.dataset.scCat;
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-sc-root]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.rootPc = Number(btn.dataset.scRoot);
        this.state.selectedShapeIdx = 0;
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-sc-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.scaleId = btn.dataset.scId;
        this.state.selectedShapeIdx = 0;
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-sc-sys]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.shapeSystem = btn.dataset.scSys;
        this.state.selectedShapeIdx = 0;
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-sc-disp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.displayMode = btn.dataset.scDisp;
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-sc-sh]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.selectedShapeIdx = Number(btn.dataset.scSh);
        this.render(container, app);
      });
    });

    container.querySelector('#sc-loop')?.addEventListener('click', () => {
      this.state.loopPlay = !this.state.loopPlay;
      this.render(container, app);
    });

    container.querySelector('#sc-play')?.addEventListener('click', () => {
      if (this.state.isPlaying) {
        AudioEngine.stopSequence();
        this.state.isPlaying = false;
        this.state.activeMidi = null;
        this.render(container, app);
        return;
      }

      let midis;
      if (activeShape && activeShape.notes.length) {
        midis = [...new Set(activeShape.notes.map((n) => n.midi))].sort((a, b) => a - b);
      } else {
        const baseMidi = 48 + this.state.rootPc;
        midis = [...sc.intervals.map((iv) => baseMidi + iv), baseMidi + 12];
      }

      this.state.isPlaying = true;
      this.render(container, app);

      AudioEngine.playSequence(midis, {
        bpm: RhythmEngine.bpm,
        subdivision: 2,
        cadence: AudioEngine.melodicCadence,
        loop: this.state.loopPlay,
        onStep: (midi) => {
          this.state.activeMidi = midi;
          const svg = container.querySelector('#scale-fretboard-svg');
          if (svg) {
            svg.querySelectorAll('.fb-cell').forEach((g) => {
              g.style.opacity = Number(g.dataset.midi) === midi ? '1' : '0.62';
            });
          }
        },
        onEnd: () => {
          this.state.isPlaying = false;
          this.state.activeMidi = null;
          const svg = container.querySelector('#scale-fretboard-svg');
          if (svg) svg.querySelectorAll('.fb-cell').forEach((g) => { g.style.opacity = '1'; });
          const playBtn = container.querySelector('#sc-play');
          if (playBtn) playBtn.innerHTML = `${icon('play', 14)} Tocar Escala`;
        },
      });
    });

    container.querySelector('#sc-fav')?.addEventListener('click', () => {
      const added = Storage.toggleFavorite('scales', {
        id: `scale_${this.state.rootPc}_${this.state.scaleId}`,
        title: fullName,
        subtitle: sc.formula,
        rootPc: this.state.rootPc,
        scaleId: this.state.scaleId,
      });
      app.toast(added ? `${fullName} adicionada aos Favoritos!` : `${fullName} removida dos Favoritos.`);
      this.render(container, app);
    });

    container.querySelector('#sc-png')?.addEventListener('click', () => {
      const svg = container.querySelector('#scale-fretboard-svg');
      ExportTools.exportSvgAsPng(svg, `escala-${fullName.replace(/\s+/g, '_')}.png`, `${fullName} (${sc.formula})`);
      app.toast('Escala exportada em PNG!');
    });

    container.querySelector('#sc-pdf')?.addEventListener('click', () => {
      const svgHtml = container.querySelector('#scale-fretboard-mount')?.innerHTML || '';
      const rows = scaleNotes.map((n) => `<tr><td>${n.short}</td><td><strong>${n.note}</strong></td><td>${n.name}</td></tr>`).join('');
      ExportTools.exportPdfSheet(
        `Escala ${fullName}`,
        `Fórmula: ${sc.formula} | Passos: ${sc.steps}`,
        `<div class="print-section">${svgHtml}</div><div class="print-section"><h3>Intervalos</h3><table><thead><tr><th>Grau</th><th>Nota</th><th>Intervalo</th></tr></thead><tbody>${rows}</tbody></table></div>`
      );
    });
  },
};
