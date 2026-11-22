/**
 * Module 5: Arpeggios (Arpejos)
 * SVG icons, inline BPM + Melodic Cadence controls, CAGED shapes,
 * shape-linking connectors & reference chord diagrams.
 */

import { Theory } from '../core/theory.js';
import { ChordEngine } from '../core/chordEngine.js';
import { ScaleEngine } from '../core/scaleEngine.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { RhythmEngine } from '../audio/rhythmEngine.js';
import { renderFretboard } from '../ui/fretboard.js';
import { renderVerticalChordSVG } from '../ui/chordDiagram.js';
import { ExportTools } from '../ui/exportTools.js';
import { icon } from '../ui/icons.js';
import { renderPlaybackControlsHTML, bindPlaybackControls } from '../ui/playbackBar.js';

export const ModArpeggios = {
  id: 'arpeggios',
  state: {
    rootPc: 0,
    arpeggioId: 'maj7',
    selectedShapeIdx: -1,
    showLinks: true,
    displayMode: 'intervals',
    loopPlay: false,
    isPlaying: false,
  },

  applyExternal(opts = {}) {
    if (opts.rootPc !== undefined) this.state.rootPc = Theory.mod12(opts.rootPc);
    if (opts.arpeggioId) this.state.arpeggioId = opts.arpeggioId;
    this.state.selectedShapeIdx = -1;
  },

  getShareParams() {
    return { m: 'arpeggios', r: this.state.rootPc, arp: this.state.arpeggioId };
  },

  applyShareParams(p) {
    if (p.r !== undefined) this.state.rootPc = Theory.mod12(Number(p.r));
    if (p.arp) this.state.arpeggioId = p.arp;
  },

  render(container, app) {
    const tuning = Theory.getTuning();
    const { arpeggio, allPositions, shapes, links } = ScaleEngine.getArpeggioShapes(this.state.rootPc, this.state.arpeggioId, tuning);

    const useFlats = Theory.useFlatsForRoot(this.state.rootPc);
    const rootName = Theory.pcToNote(this.state.rootPc, useFlats);
    const title = `${rootName}${arpeggio.symbol}`;

    const chordVoicings = ChordEngine.getVoicings(this.state.rootPc, arpeggio.id, tuning).slice(0, 4);
    const activeShape = this.state.selectedShapeIdx >= 0 ? shapes[this.state.selectedShapeIdx] : null;
    const displayPositions = activeShape ? activeShape.notes : allPositions;
    const activeLinks = this.state.showLinks
      ? (activeShape
          ? links.filter((l) => l.fromShape === activeShape.letter || l.toShape === activeShape.letter).flatMap((l) => l.slides)
          : links.flatMap((l) => l.slides))
      : null;

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Arpejos &amp; Ligações CAGED</h2>
          <p class="module-subtitle">Visualize tétrades e tríades no braço completo com caminhos de transição entre shapes adjacentes.</p>
        </div>
        <div class="action-bar">
          <button id="arp-play" class="btn btn-primary">${icon(this.state.isPlaying ? 'stop' : 'play', 14)} ${this.state.isPlaying ? 'Parar' : 'Tocar Arpejo'}</button>
          <button id="arp-loop" class="btn ${this.state.loopPlay ? 'btn-gold-active' : 'btn-ghost'} btn-sm">${icon('repeat', 14)} Loop</button>
          <button id="arp-png" class="btn btn-ghost btn-sm">${icon('image', 14)} PNG</button>
        </div>
      </div>

      <section class="card selector-card">
        <div class="selector-row" style="margin-bottom:10px;">
          <div class="selector-group">
            <label class="field-label">Tônica</label>
            <div class="pill-grid root-pills">
              ${Theory.getAllRoots().map((r) => `
                <button class="pill-btn ${r.pc === this.state.rootPc ? 'active' : ''}" data-arp-root="${r.pc}">${r.short || r.label}</button>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="selector-group" style="margin-bottom:12px;">
          <label class="field-label">Tipo de Arpejo</label>
          <div class="pill-wrap">
            ${Theory.getArpeggios().map((a) => `
              <button class="pill-btn pill-sm ${a.id === this.state.arpeggioId ? 'active' : ''}" data-arp-id="${a.id}">${a.name}</button>
            `).join('')}
          </div>
        </div>

        ${renderPlaybackControlsHTML({ mode: 'melodic', bpm: RhythmEngine.bpm, cadence: AudioEngine.melodicCadence, idPrefix: 'arp-pb' })}
      </section>

      <section class="card">
        <div class="controls-split">
          <div>
            <h3 class="section-title" style="margin-bottom:8px;">${title} · <code class="mono-text">${arpeggio.formula}</code></h3>
            <div class="pill-wrap">
              <button class="pill-btn pill-sm ${this.state.selectedShapeIdx === -1 ? 'active' : ''}" data-arp-sh="-1">Todos os Shapes</button>
              ${shapes.map((sh, idx) => `
                <button class="pill-btn pill-sm ${idx === this.state.selectedShapeIdx ? 'active' : ''}" data-arp-sh="${idx}">
                  ${sh.name} (${sh.startFret}–${sh.endFret})
                </button>
              `).join('')}
            </div>
          </div>
          <div class="action-bar">
            <button id="arp-toggle-links" class="btn ${this.state.showLinks ? 'btn-gold-active' : 'btn-ghost'} btn-sm">${icon('link', 14)} Ligações</button>
            <button class="pill-btn pill-xs ${this.state.displayMode === 'notes' ? 'active' : ''}" data-arp-disp="notes">Notas</button>
            <button class="pill-btn pill-xs ${this.state.displayMode === 'intervals' ? 'active' : ''}" data-arp-disp="intervals">Intervalos</button>
          </div>
        </div>

        <div class="fretboard-scroll" id="arp-fretboard-mount"></div>

        <div class="links-grid">
          ${links.map((lk) => `
            <div class="subcard link-card">
              <div class="link-head">
                <span class="caged-dot" style="background:${Theory.getCagedColor(lk.fromShape)}">${lk.fromShape}</span>
                ${icon('arrowRight', 13, 'text-gold')}
                <span class="caged-dot" style="background:${Theory.getCagedColor(lk.toShape)}">${lk.toShape}</span>
                <strong>Transição ${lk.fromShape} → ${lk.toShape}</strong>
              </div>
              <p class="small muted-text">
                ${lk.slides.length
                  ? lk.slides.map((sl) => `C${tuning.strings - sl.from.stringIdx}: <code>${sl.from.fret}→${sl.to.fret}</code>`).join(' · ')
                  : `${lk.sharedNotes.length} notas pivô em comum`}
              </p>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="card">
        <h3 class="section-title" style="margin-bottom:12px;">Diagramas de Referência (${title})</h3>
        <div class="shapes-gallery">
          ${chordVoicings.map((v, i) => `
            <div class="shape-thumb arp-diagram-play" data-voicing-i="${i}">
              <div class="thumb-head">
                <span class="thumb-num">${v.label}</span>
                ${v.caged ? `<span class="caged-dot" style="background:${Theory.getCagedColor(v.caged)}">${v.caged}</span>` : ''}
              </div>
              ${renderVerticalChordSVG(v, { compact: true })}
              <div class="thumb-foot icon-label-center">${icon('play', 11)} Ouvir arpejo</div>
            </div>
          `).join('')}
        </div>
      </section>
    `;

    renderFretboard(container.querySelector('#arp-fretboard-mount'), {
      id: 'arp-fretboard-svg',
      tuning,
      startFret: 0,
      endFret: 24,
      displayMode: this.state.displayMode,
      positions: displayPositions,
      cagedBoxes: activeShape ? [activeShape] : shapes,
      linkPaths: activeLinks,
      interactive: true,
    });

    this.bindEvents(container, app, arpeggio, activeShape, chordVoicings, title);
  },

  bindEvents(container, app, arpeggio, activeShape, chordVoicings, title) {
    bindPlaybackControls(container, { mode: 'melodic', idPrefix: 'arp-pb' });

    container.querySelectorAll('[data-arp-root]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.rootPc = Number(btn.dataset.arpRoot);
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-arp-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.arpeggioId = btn.dataset.arpId;
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-arp-sh]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.selectedShapeIdx = Number(btn.dataset.arpSh);
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-arp-disp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.displayMode = btn.dataset.arpDisp;
        this.render(container, app);
      });
    });

    container.querySelector('#arp-toggle-links')?.addEventListener('click', () => {
      this.state.showLinks = !this.state.showLinks;
      this.render(container, app);
    });

    container.querySelector('#arp-loop')?.addEventListener('click', () => {
      this.state.loopPlay = !this.state.loopPlay;
      this.render(container, app);
    });

    container.querySelector('#arp-play')?.addEventListener('click', () => {
      if (this.state.isPlaying) {
        AudioEngine.stopSequence();
        this.state.isPlaying = false;
        this.render(container, app);
        return;
      }
      let midis;
      if (activeShape && activeShape.notes.length) {
        midis = [...new Set(activeShape.notes.map((n) => n.midi))].sort((a, b) => a - b);
      } else {
        const base = 48 + this.state.rootPc;
        midis = [
          ...arpeggio.intervals.map((iv) => base + iv),
          ...arpeggio.intervals.map((iv) => base + 12 + iv),
          base + 24,
        ];
      }
      this.state.isPlaying = true;
      this.render(container, app);
      AudioEngine.playSequence(midis, {
        bpm: RhythmEngine.bpm,
        subdivision: 3,
        cadence: AudioEngine.melodicCadence,
        loop: this.state.loopPlay,
        onEnd: () => {
          this.state.isPlaying = false;
          const b = container.querySelector('#arp-play');
          if (b) b.innerHTML = `${icon('play', 14)} Tocar Arpejo`;
        },
      });
    });

    container.querySelectorAll('.arp-diagram-play').forEach((card) => {
      card.addEventListener('click', () => {
        const v = chordVoicings[Number(card.dataset.voicingI)];
        if (v) AudioEngine.playChord(v.stringNotes.filter((n) => !n.muted).map((n) => n.midi), { arpeggiate: true, duration: 2.0 });
      });
    });

    container.querySelector('#arp-png')?.addEventListener('click', () => {
      const svg = container.querySelector('#arp-fretboard-svg');
      ExportTools.exportSvgAsPng(svg, `arpejo-${title}.png`, `Arpejo ${title} (${arpeggio.formula})`);
      app.toast('Arpejo exportado em PNG!');
    });
  },
};
