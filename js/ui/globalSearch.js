/**
 * Unified Global Spotlight Search (Ctrl+K / Cmd+K)
 * Instantly searches Chords, Scales, Modes, Arpeggios, Progressions & Modules.
 */

import { Theory } from '../core/theory.js';
import { icon } from './icons.js';

export const GlobalSearch = {
  isOpen: false,
  query: '',
  selectedIdx: 0,
  results: [],
  appRef: null,

  init(app) {
    this.appRef = app;
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  },

  open() {
    this.isOpen = true;
    this.query = '';
    this.selectedIdx = 0;
    this.renderModal();
  },

  close() {
    this.isOpen = false;
    document.getElementById('global-search-overlay')?.remove();
  },

  normalize(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  },

  search(rawQuery) {
    const q = this.normalize(rawQuery.trim());
    const out = [];

    // Modules quick actions
    const moduleEntries = [
      { kind: 'Módulo', title: 'Biblioteca de Acordes', subtitle: 'Diagramas, CAGED e inversões', ico: 'guitar', go: () => this.appRef.navigate('chords') },
      { kind: 'Módulo', title: 'Construtor de Escalas', subtitle: '23 escalas, 2/3/4 NPS e CAGED', ico: 'scales', go: () => this.appRef.navigate('scales') },
      { kind: 'Módulo', title: 'Visualizador do Braço 24 Casas', subtitle: 'Reverse Finder e Heatmap', ico: 'fretboard', go: () => this.appRef.navigate('fretboard') },
      { kind: 'Módulo', title: 'Progressões Harmônicas & IA', subtitle: 'Voice Leading e Circle of Fifths', ico: 'progressions', go: () => this.appRef.navigate('progressions') },
      { kind: 'Módulo', title: 'Compositor de Músicas', subtitle: 'Verso, Refrão, Solo com shapes', ico: 'composer', go: () => this.appRef.navigate('composer') },
      { kind: 'Módulo', title: 'Explorador de Modos Gregos', subtitle: 'Jônio a Lócrio lado a lado', ico: 'modes', go: () => this.appRef.navigate('modes') },
      { kind: 'Módulo', title: 'Arpejos & Ligações', subtitle: 'Tétrades e conexões entre shapes', ico: 'arpeggios', go: () => this.appRef.navigate('arpeggios') },
      { kind: 'Módulo', title: 'Comparador Musical', subtitle: 'Escala vs Escala / Arpejo / Acorde', ico: 'compare', go: () => this.appRef.navigate('comparator') },
      { kind: 'Módulo', title: 'Treinador Interativo (Quiz)', subtitle: 'Notas, acordes, escalas e intervalos', ico: 'trainer', go: () => this.appRef.navigate('trainer') },
    ];

    if (!q) return moduleEntries.slice(0, 7);

    // 1. Parse explicit Chord / Scale / Arpeggio root prefix (e.g., "Am7", "G dorico", "Cmaj7", "Bb blues")
    const rootMatch = rawQuery.trim().match(/^([A-Ga-g][#b]?)(?:\s+(.*)|([a-zA-Z0-9#()/+]+))?$/);
    if (rootMatch) {
      const noteRaw = rootMatch[1][0].toUpperCase() + (rootMatch[1][1] || '');
      const pc = Theory.noteToPc(noteRaw);
      const restSpace = this.normalize(rootMatch[2] || '');
      const restTight = (rootMatch[3] || '').toLowerCase();

      // Match chords
      for (const ct of Theory.getChordTypes()) {
        const fullSym = `${noteRaw}${ct.symbol}`.toLowerCase();
        const normName = this.normalize(ct.name);
        if (
          (!restSpace && !restTight && ['maj', 'min', '7', 'maj7', 'm7'].includes(ct.id)) ||
          (restTight && (ct.symbol.toLowerCase().startsWith(restTight) || fullSym === rawQuery.trim().toLowerCase())) ||
          (restSpace && (normName.includes(restSpace) || ct.symbol.toLowerCase().includes(restSpace)))
        ) {
          out.push({
            kind: 'Acorde',
            title: `${noteRaw}${ct.symbol}`,
            subtitle: `${ct.name} · ${ct.formula}`,
            ico: 'guitar',
            go: () => this.appRef.navigate('chords', { rootPc: pc, chordTypeId: ct.id }),
          });
        }
      }

      // Match scales (gender-insensitive stem matching: "dorico" matches "Dórica")
      if (restSpace) {
        const stem = restSpace.length >= 4 ? restSpace.replace(/[oa]s?$/, '') : restSpace;
        for (const sc of Theory.getScales()) {
          const hay = this.normalize(`${sc.name} ${sc.category} ${sc.id}`);
          if (hay.includes(restSpace) || (stem.length >= 3 && hay.includes(stem))) {
            out.push({
              kind: 'Escala',
              title: `${noteRaw} ${sc.name}`,
              subtitle: sc.formula,
              ico: 'scales',
              go: () => this.appRef.navigate('scales', { rootPc: pc, scaleId: sc.id }),
            });
          }
        }
      }

      // Match arpeggios
      if (restSpace.includes('arp') || restTight) {
        for (const arp of Theory.getArpeggios()) {
          if (restSpace.includes('arp') || arp.symbol.toLowerCase() === restTight) {
            out.push({
              kind: 'Arpejo',
              title: `Arpejo ${noteRaw}${arp.symbol}`,
              subtitle: arp.formula,
              ico: 'arpeggios',
              go: () => this.appRef.navigate('arpeggios', { rootPc: pc, arpeggioId: arp.id }),
            });
          }
        }
      }
    }

    // 2. General text match on Scales
    const qStem = q.length >= 4 ? q.replace(/[oa]s?$/, '') : q;
    for (const sc of Theory.getScales()) {
      const hay = this.normalize(`${sc.name} ${sc.id}`);
      if (hay.includes(q) || (qStem.length >= 3 && hay.includes(qStem))) {
        out.push({
          kind: 'Escala',
          title: `C ${sc.name}`,
          subtitle: `${sc.category} · ${sc.formula}`,
          ico: 'scales',
          go: () => this.appRef.navigate('scales', { rootPc: 0, scaleId: sc.id }),
        });
      }
    }

    // 3. General text match on Progressions (including "ii-V-I em Bb", "I-V-vi-IV em G")
    const keyInMatch = rawQuery.match(/\bem\s+([A-Ga-g][#b]?)\b/i);
    const targetKeyPc = keyInMatch ? Theory.noteToPc(keyInMatch[1][0].toUpperCase() + (keyInMatch[1][1] || '')) : 0;
    const cleanProgQ = q.replace(/\bem\s+[a-g][#b]?\b/g, '').trim();
    const compactProgQ = cleanProgQ.replace(/\s+/g, '');

    for (const pr of Theory.getProgressions()) {
      const hay = this.normalize(`${pr.name} ${pr.genre} ${pr.numerals}`);
      // Normalize numerals without spaces or 7/maj7/ø7/b9/#9 extensions so "ii-v-i" matches "ii7 - V7 - Imaj7"
      const simpleNumerals = this.normalize(pr.numerals)
        .replace(/\s+/g, '')
        .replace(/(maj7|maj9|m7b5|7b9|7#9|7|9|13|5|ø)/g, '');
      if (cleanProgQ && (hay.includes(cleanProgQ) || (compactProgQ.length >= 3 && simpleNumerals.includes(compactProgQ)))) {
        const kLabel = Theory.pcToNote(targetKeyPc, Theory.useFlatsForRoot(targetKeyPc));
        out.push({
          kind: 'Progressão',
          title: `${pr.name} (${kLabel})`,
          subtitle: `${pr.genre} · ${pr.numerals}`,
          ico: 'progressions',
          go: () => this.appRef.navigate('progressions', { keyPc: targetKeyPc, selectedProgId: pr.id }),
        });
      }
    }

    // 4. Modules match
    for (const m of moduleEntries) {
      if (this.normalize(`${m.title} ${m.subtitle}`).includes(q)) out.push(m);
    }

    // Deduplicate
    const seen = new Set();
    return out.filter((x) => {
      const k = `${x.kind}:${x.title}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 12);
  },

  renderModal() {
    document.getElementById('global-search-overlay')?.remove();
    this.results = this.search(this.query);

    const overlay = document.createElement('div');
    overlay.id = 'global-search-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card search-modal" role="dialog" aria-modal="true" aria-label="Busca global">
        <div class="search-modal-input-row">
          ${icon('search', 18, 'text-gold')}
          <input type="text" id="gs-input" class="search-modal-input" placeholder="Buscar acorde (Am7), escala (G dorico), progressão (ii-V-I em Bb)..." value="${this.query}" autocomplete="off">
          <kbd class="kbd-chip">ESC</kbd>
        </div>
        <div class="search-results-list" id="gs-list"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#gs-input');
    const listEl = overlay.querySelector('#gs-list');

    const paintList = () => {
      this.results = this.search(this.query);
      if (this.selectedIdx >= this.results.length) this.selectedIdx = 0;

      if (!this.results.length) {
        listEl.innerHTML = `<div class="search-empty">Nenhum resultado para "${this.query}". Tente "Am7", "G dorico" ou "Blues".</div>`;
        return;
      }

      listEl.innerHTML = this.results.map((item, idx) => `
        <button type="button" class="search-result-item ${idx === this.selectedIdx ? 'active' : ''}" data-gs-idx="${idx}">
          <span class="gs-ico">${icon(item.ico, 16)}</span>
          <div class="gs-text">
            <strong>${item.title}</strong>
            <span class="small muted-text">${item.subtitle}</span>
          </div>
          <span class="badge badge-muted">${item.kind}</span>
        </button>
      `).join('');

      listEl.querySelectorAll('.search-result-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          const r = this.results[Number(btn.dataset.gsIdx)];
          this.close();
          if (r) r.go();
        });
      });
    };

    paintList();
    input.focus();

    input.addEventListener('input', (e) => {
      this.query = e.target.value;
      this.selectedIdx = 0;
      paintList();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIdx = (this.selectedIdx + 1) % Math.max(1, this.results.length);
        paintList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIdx = (this.selectedIdx - 1 + Math.max(1, this.results.length)) % Math.max(1, this.results.length);
        paintList();
      } else if (e.key === 'Enter' && this.results[this.selectedIdx]) {
        e.preventDefault();
        const r = this.results[this.selectedIdx];
        this.close();
        r.go();
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
  },
};
