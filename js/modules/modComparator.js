/**
 * Module 6: Musical Comparator (Comparador)
 * Compares Scale vs Scale, Scale vs Arpeggio, or Chord vs Scale.
 * Highlights Shared Notes, Different Notes, and Exclusive Intervals on the full fretboard.
 */

import { Theory } from '../core/theory.js';
import { ScaleEngine } from '../core/scaleEngine.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { renderFretboard } from '../ui/fretboard.js';

export const ModComparator = {
  id: 'comparator',
  state: {
    mode: 'scale_scale', // 'scale_scale' | 'scale_arp' | 'chord_scale'
    rootA: 9, // A
    idA: 'dorian',
    rootB: 9, // A
    idB: 'pentatonic_minor',
    displayMode: 'notes',
  },

  getShareParams() {
    return { m: 'comparator', cm: this.state.mode, rA: this.state.rootA, iA: this.state.idA, rB: this.state.rootB, iB: this.state.idB };
  },

  applyShareParams(p) {
    if (p.cm) this.state.mode = p.cm;
    if (p.rA !== undefined) this.state.rootA = Theory.mod12(Number(p.rA));
    if (p.iA) this.state.idA = p.iA;
    if (p.rB !== undefined) this.state.rootB = Theory.mod12(Number(p.rB));
    if (p.iB) this.state.idB = p.iB;
  },

  getSetA() {
    const useFlats = Theory.useFlatsForRoot(this.state.rootA);
    const rName = Theory.pcToNote(this.state.rootA, useFlats);
    if (this.state.mode === 'chord_scale') {
      const ct = Theory.getChordType(this.state.idA);
      return {
        label: `Acorde ${rName}${ct.symbol}`,
        rootPc: this.state.rootA,
        intervals: ct.intervals,
        formula: ct.formula,
      };
    }
    const sc = Theory.getScale(this.state.idA);
    return {
      label: `Escala ${rName} ${sc.name}`,
      rootPc: this.state.rootA,
      intervals: sc.intervals,
      formula: sc.formula,
    };
  },

  getSetB() {
    const useFlats = Theory.useFlatsForRoot(this.state.rootB);
    const rName = Theory.pcToNote(this.state.rootB, useFlats);
    if (this.state.mode === 'scale_arp') {
      const arp = Theory.getArpeggio(this.state.idB);
      return {
        label: `Arpejo ${rName}${arp.symbol}`,
        rootPc: this.state.rootB,
        intervals: arp.intervals,
        formula: arp.formula,
      };
    }
    const sc = Theory.getScale(this.state.idB);
    return {
      label: `Escala ${rName} ${sc.name}`,
      rootPc: this.state.rootB,
      intervals: sc.intervals,
      formula: sc.formula,
    };
  },

  render(container, app) {
    const tuning = Theory.getTuning();
    const setA = this.getSetA();
    const setB = this.getSetB();
    const comp = ScaleEngine.compareSets(setA, setB);

    const sharedPcs = new Set(comp.shared.map((x) => x.pc));
    const onlyAPcs = new Set(comp.onlyA.map((x) => x.pc));
    const onlyBPcs = new Set(comp.onlyB.map((x) => x.pc));

    // Build combined fretboard positions with distinct colors
    const positions = [];
    const useFlats = Theory.useFlatsForRoot(setA.rootPc);
    for (let s = 0; s < tuning.strings; s++) {
      for (let f = 0; f <= 24; f++) {
        const midi = Theory.getFretMidi(s, f, tuning);
        const pc = Theory.mod12(midi);
        let customColor = null;
        let isRoot = false;
        let short = '';
        if (sharedPcs.has(pc)) {
          customColor = '#10b981'; // Emerald = common
          isRoot = pc === setA.rootPc;
          short = Theory.getIntervalInfo(Theory.mod12(pc - setA.rootPc)).short;
        } else if (onlyAPcs.has(pc)) {
          customColor = '#f59e0b'; // Amber = only A
          short = Theory.getIntervalInfo(Theory.mod12(pc - setA.rootPc)).short;
        } else if (onlyBPcs.has(pc)) {
          customColor = '#38bdf8'; // Cyan = only B
          short = Theory.getIntervalInfo(Theory.mod12(pc - setB.rootPc)).short;
        }
        if (customColor) {
          positions.push({
            stringIdx: s,
            fret: f,
            midi,
            pc,
            note: Theory.pcToNote(pc, useFlats),
            short,
            degree: short,
            customColor,
            isRoot,
          });
        }
      }
    }

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Comparador Musical</h2>
          <p class="module-subtitle">Sobrepõe escalas, arpejos e acordes para revelar <strong>notas em comum, diferenças e intervalos exclusivos</strong>.</p>
        </div>
        <div class="pill-wrap">
          <button class="pill-btn pill-sm ${this.state.mode === 'scale_scale' ? 'active' : ''}" data-cm="scale_scale">Escala vs Escala</button>
          <button class="pill-btn pill-sm ${this.state.mode === 'scale_arp' ? 'active' : ''}" data-cm="scale_arp">Escala vs Arpejo</button>
          <button class="pill-btn pill-sm ${this.state.mode === 'chord_scale' ? 'active' : ''}" data-cm="chord_scale">Acorde vs Escala</button>
        </div>
      </div>

      <!-- Dual Selectors -->
      <section class="card">
        <div class="compare-selectors">
          <div class="subcard comp-box-a">
            <div class="comp-tag" style="color:#f59e0b">● ELEMENTO A (${this.state.mode === 'chord_scale' ? 'Acorde' : 'Escala'})</div>
            <div class="inline-pair">
              <select id="comp-root-a" class="select-control">
                ${Theory.getAllRoots().map((r) => `<option value="${r.pc}" ${r.pc === this.state.rootA ? 'selected' : ''}>${r.label}</option>`).join('')}
              </select>
              <select id="comp-id-a" class="select-control">
                ${(this.state.mode === 'chord_scale' ? Theory.getChordTypes() : Theory.getScales()).map((item) => `
                  <option value="${item.id}" ${item.id === this.state.idA ? 'selected' : ''}>${item.name}</option>
                `).join('')}
              </select>
            </div>
            <div class="comp-meta">
              <code>${setA.formula}</code>
              <button id="comp-play-a" class="btn btn-ghost btn-xs">▶ Ouvir A</button>
            </div>
          </div>

          <div class="comp-vs-badge">
            <div class="compat-ring">
              <strong>${comp.compatibility}%</strong>
              <span>Overlap</span>
            </div>
          </div>

          <div class="subcard comp-box-b">
            <div class="comp-tag" style="color:#38bdf8">● ELEMENTO B (${this.state.mode === 'scale_arp' ? 'Arpejo' : 'Escala'})</div>
            <div class="inline-pair">
              <select id="comp-root-b" class="select-control">
                ${Theory.getAllRoots().map((r) => `<option value="${r.pc}" ${r.pc === this.state.rootB ? 'selected' : ''}>${r.label}</option>`).join('')}
              </select>
              <select id="comp-id-b" class="select-control">
                ${(this.state.mode === 'scale_arp' ? Theory.getArpeggios() : Theory.getScales()).map((item) => `
                  <option value="${item.id}" ${item.id === this.state.idB ? 'selected' : ''}>${item.name}</option>
                `).join('')}
              </select>
            </div>
            <div class="comp-meta">
              <code>${setB.formula}</code>
              <button id="comp-play-b" class="btn btn-ghost btn-xs">▶ Ouvir B</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Analytical Breakdown -->
      <section class="card">
        <div class="compare-results-grid">
          <div class="subcard res-shared">
            <h4 class="subcard-title" style="color:#10b981">✓ Notas Iguais (${comp.shared.length})</h4>
            <div class="pill-wrap">
              ${comp.shared.length
                ? comp.shared.map((n) => `<span class="note-pill" style="background:#10b98122;color:#10b981;border-color:#10b98155">${n.note} <small>${n.intervalA}/${n.intervalB}</small></span>`).join('')
                : '<span class="muted-text small">Nenhuma nota em comum</span>'}
            </div>
          </div>

          <div class="subcard res-only-a">
            <h4 class="subcard-title" style="color:#f59e0b">◆ Exclusivas de A (${comp.onlyA.length})</h4>
            <div class="pill-wrap">
              ${comp.onlyA.length
                ? comp.onlyA.map((n) => `<span class="note-pill" style="background:#f59e0b22;color:#f59e0b;border-color:#f59e0b55">${n.note} <small>${n.intervalA}</small></span>`).join('')
                : '<span class="muted-text small">Todas as notas de A estão em B!</span>'}
            </div>
          </div>

          <div class="subcard res-only-b">
            <h4 class="subcard-title" style="color:#38bdf8">◆ Exclusivas de B (${comp.onlyB.length})</h4>
            <div class="pill-wrap">
              ${comp.onlyB.length
                ? comp.onlyB.map((n) => `<span class="note-pill" style="background:#38bdf822;color:#38bdf8;border-color:#38bdf855">${n.note} <small>${n.intervalB}</small></span>`).join('')
                : '<span class="muted-text small">B está 100% contido em A!</span>'}
            </div>
          </div>
        </div>
      </section>

      <!-- Combined Fretboard -->
      <section class="card">
        <div class="card-header-row">
          <div>
            <h3 class="section-title">Sobreposição no Braço: ${setA.label} × ${setB.label}</h3>
            <div class="legend-items" style="margin-top:6px;">
              <span class="legend-dot"><i style="background:#10b981"></i> Em comum (${comp.shared.length})</span>
              <span class="legend-dot"><i style="background:#f59e0b"></i> Exclusivas de A (${comp.onlyA.length})</span>
              <span class="legend-dot"><i style="background:#38bdf8"></i> Exclusivas de B (${comp.onlyB.length})</span>
            </div>
          </div>
          <div class="pill-wrap">
            <button class="pill-btn pill-xs ${this.state.displayMode === 'notes' ? 'active' : ''}" data-cdisp="notes">Notas</button>
            <button class="pill-btn pill-xs ${this.state.displayMode === 'intervals' ? 'active' : ''}" data-cdisp="intervals">Intervalos</button>
          </div>
        </div>
        <div class="fretboard-scroll" id="comp-fretboard-mount"></div>
      </section>
    `;

    renderFretboard(container.querySelector('#comp-fretboard-mount'), {
      id: 'comp-fretboard-svg',
      tuning,
      startFret: 0,
      endFret: 24,
      displayMode: this.state.displayMode,
      positions,
      interactive: true,
    });

    this.bindEvents(container, app, setA, setB);
  },

  bindEvents(container, app, setA, setB) {
    container.querySelectorAll('[data-cm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextMode = btn.dataset.cm;
        this.state.mode = nextMode;
        if (nextMode === 'scale_scale') {
          this.state.idA = 'dorian';
          this.state.idB = 'pentatonic_minor';
        } else if (nextMode === 'scale_arp') {
          this.state.idA = 'mixolydian';
          this.state.idB = '7';
        } else {
          this.state.idA = 'm7';
          this.state.idB = 'dorian';
        }
        this.render(container, app);
      });
    });

    container.querySelector('#comp-root-a')?.addEventListener('change', (e) => {
      this.state.rootA = Number(e.target.value);
      this.render(container, app);
    });
    container.querySelector('#comp-id-a')?.addEventListener('change', (e) => {
      this.state.idA = e.target.value;
      this.render(container, app);
    });
    container.querySelector('#comp-root-b')?.addEventListener('change', (e) => {
      this.state.rootB = Number(e.target.value);
      this.render(container, app);
    });
    container.querySelector('#comp-id-b')?.addEventListener('change', (e) => {
      this.state.idB = e.target.value;
      this.render(container, app);
    });

    container.querySelectorAll('[data-cdisp]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.displayMode = btn.dataset.cdisp;
        this.render(container, app);
      });
    });

    container.querySelector('#comp-play-a')?.addEventListener('click', () => {
      const midis = setA.intervals.map((iv) => 48 + setA.rootPc + iv);
      if (this.state.mode === 'chord_scale') AudioEngine.playChord(midis, { strumMs: 30 });
      else AudioEngine.playSequence([...midis, 60 + setA.rootPc], { bpm: 120, subdivision: 2 });
    });

    container.querySelector('#comp-play-b')?.addEventListener('click', () => {
      const midis = setB.intervals.map((iv) => 48 + setB.rootPc + iv);
      AudioEngine.playSequence([...midis, 60 + setB.rootPc], { bpm: 120, subdivision: 2 });
    });
  },
};
