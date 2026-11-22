/**
 * Module 3: Scale Builder (Construtor de Escalas)
 * 23+ scales, automatic notes & intervals, full 24-fret neck,
 * CAGED boxes, Regional shapes, and 2/3/4 Notes-Per-String (NPS) patterns + Study Loop playback.
 */

import { Theory } from '../core/theory.js';
import { ScaleEngine } from '../core/scaleEngine.js';
import { Storage } from '../core/storage.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { RhythmEngine } from '../audio/rhythmEngine.js';
import { renderFretboard } from '../ui/fretboard.js';
import { ExportTools } from '../ui/exportTools.js';

export const ModScales = {
  id: 'scales',
  state: {
    rootPc: 9, // A
    scaleId: 'pentatonic_minor',
    displayMode: 'notes', // 'notes' | 'intervals' | 'degrees' | 'roots'
    shapeSystem: 'all', // 'all' | 'caged' | 'regions' | '2nps' | '3nps' | '4nps'
    selectedShapeIdx: 0,
    loopPlay: false,
    isPlaying: false,
    activeMidi: null,
  },

  applyExternal(opts = {}) {
    if (opts.rootPc !== undefined) this.state.rootPc = Theory.mod12(opts.rootPc);
    if (opts.scaleId) this.state.scaleId = opts.scaleId;
    this.state.selectedShapeIdx = 0;
  },

  getShareParams() {
    return { m: 'scales', r: this.state.rootPc, sc: this.state.scaleId, sys: this.state.shapeSystem };
  },

  applyShareParams(p) {
    if (p.r !== undefined) this.state.rootPc = Theory.mod12(Number(p.r));
    if (p.sc) this.state.scaleId = p.sc;
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
    const cagedOverlay = this.state.shapeSystem === 'caged'
      ? (activeShape ? [activeShape] : shapes)
      : null;

    const favId = `scale_${this.state.rootPc}_${this.state.scaleId}`;
    const isFav = Storage.isFavorite('scales', favId);
    const categories = [...new Set(Theory.getScales().map((s) => s.category))];

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Construtor de Escalas</h2>
          <p class="module-subtitle">Gere notas, intervalos, sistema CAGED, shapes por região e digitações <strong>2, 3 e 4 notas por corda</strong>.</p>
        </div>
        <div class="action-bar">
          <button id="sc-play" class="btn btn-primary">${this.state.isPlaying ? '■ Parar' : '▶ Tocar Escala'}</button>
          <button id="sc-loop" class="btn ${this.state.loopPlay ? 'btn-gold-active' : 'btn-ghost'} btn-sm">🔁 Loop</button>
          <button id="sc-fav" class="btn ${isFav ? 'btn-gold-active' : 'btn-ghost'} btn-sm">${isFav ? '★ Favorita' : '☆ Favoritar'}</button>
          <button id="sc-png" class="btn btn-ghost btn-sm">PNG</button>
          <button id="sc-pdf" class="btn btn-ghost btn-sm">PDF</button>
        </div>
      </div>

      <!-- Root & Scale Picker -->
      <section class="card selector-card">
        <div class="selector-group">
          <label class="field-label">Tônica</label>
          <div class="pill-grid root-pills">
            ${Theory.getAllRoots().map((r) => `
              <button class="pill-btn ${r.pc === this.state.rootPc ? 'active' : ''}" data-sc-root="${r.pc}">
                ${r.short || r.label}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="chord-categories">
          ${categories.map((cat) => `
            <div class="cat-block">
              <span class="cat-title">${cat}</span>
              <div class="pill-wrap">
                ${Theory.getScales().filter((s) => s.category === cat).map((s) => `
                  <button class="pill-btn pill-sm ${s.id === this.state.scaleId ? 'active' : ''}" data-sc-id="${s.id}">
                    ${s.name}
                  </button>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Scale Info & Interval Breakdown -->
      <section class="card">
        <div class="chord-hero-top">
          <div>
            <div class="chord-title-row">
              <h3 class="chord-big-name">${fullName}</h3>
              <span class="badge badge-accent">${sc.category}</span>
              <span class="badge badge-muted">${sc.intervals.length} notas</span>
            </div>
            <p class="muted-text">${sc.mood} · Característica: <strong>${sc.characteristic}</strong></p>
          </div>
          <div class="theory-box compact">
            <span class="theory-label">Passos (Tom / Semitom)</span>
            <code class="mono-text">${sc.steps}</code>
          </div>
        </div>

        <div class="scale-intervals-row">
          ${scaleNotes.map((n) => `
            <div class="interval-card" style="border-top:3px solid ${n.color}">
              <span class="iv-deg">${n.short}</span>
              <strong class="iv-note">${n.note}</strong>
              <span class="iv-name">${n.name.split(' ')[0]}</span>
            </div>
          `).join('')}
        </div>

        <div class="theory-strip" style="margin-top:12px;">
          <div class="theory-box">
            <span class="theory-label">Fórmula</span>
            <strong class="mono-text">${sc.formula}</strong>
          </div>
          <div class="theory-box">
            <span class="theory-label">Acordes Compatíveis</span>
            <div class="pill-wrap">
              ${(sc.chords || []).map((c) => `<span class="badge badge-info">${c}</span>`).join('')}
            </div>
          </div>
        </div>
      </section>

      <!-- Shape System & Fretboard Card -->
      <section class="card">
        <div class="controls-split">
          <div>
            <label class="field-label">Sistema de Shapes & Digitação</label>
            <div class="pill-wrap">
              ${[
                ['all', 'Braço Inteiro'],
                ['caged', 'Sistema CAGED'],
                ['regions', 'Por Região'],
                ['2nps', '2 Notas/Corda'],
                ['3nps', '3 Notas/Corda'],
                ['4nps', '4 Notas/Corda'],
              ].map(([id, label]) => `
                <button class="pill-btn pill-sm ${this.state.shapeSystem === id ? 'active' : ''}" data-sc-sys="${id}">${label}</button>
              `).join('')}
            </div>
          </div>
          <div>
            <label class="field-label">Marcadores</label>
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
              <button class="pill-btn pill-sm ${idx === this.state.selectedShapeIdx ? 'active' : ''}" data-sc-sh="${idx}" ${sh.color ? `style="--pill-accent:${sh.color}"` : ''}>
                ${sh.name} <small>(${sh.startFret}–${sh.endFret})</small>
              </button>
            `).join('')}
          </div>
        ` : (this.state.shapeSystem !== 'all' ? `<p class="muted-text small" style="margin:10px 0;">Esta escala não comporta padrão ergonômico estrito de ${this.state.shapeSystem.toUpperCase()} em todas as cordas — exibindo braço completo.</p>` : '')}

        <div class="fretboard-scroll" id="scale-fretboard-mount"></div>
      </section>
    `;

    const mount = container.querySelector('#scale-fretboard-mount');
    renderFretboard(mount, {
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
        ascendingAndDescending: true,
        loop: this.state.loopPlay,
        onStep: (midi) => {
          this.state.activeMidi = midi;
          // Lightweight DOM highlight without full rerender flicker
          const svg = container.querySelector('#scale-fretboard-svg');
          if (svg) {
            svg.querySelectorAll('.fb-cell').forEach((g) => {
              g.style.opacity = Number(g.dataset.midi) === midi ? '1' : '0.68';
            });
          }
        },
        onEnd: () => {
          this.state.isPlaying = false;
          this.state.activeMidi = null;
          const svg = container.querySelector('#scale-fretboard-svg');
          if (svg) svg.querySelectorAll('.fb-cell').forEach((g) => { g.style.opacity = '1'; });
          const playBtn = container.querySelector('#sc-play');
          if (playBtn) playBtn.textContent = '▶ Tocar Escala';
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
        `Fórmula: ${sc.formula} | Passos: ${sc.steps} | Característica: ${sc.characteristic}`,
        `<div class="print-section">${svgHtml}</div><div class="print-section"><h3>Intervalos</h3><table><thead><tr><th>Grau</th><th>Nota</th><th>Intervalo</th></tr></thead><tbody>${rows}</tbody></table></div>`
      );
    });
  },
};
