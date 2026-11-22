/**
 * Module 1: Chord Library (Biblioteca de Acordes)
 * Thousands of playable voicings, CAGED, inversions, rich filters,
 * vertical/horizontal diagrams, tablature, fingering breakdown, audio & AI.
 */

import { Theory } from '../core/theory.js';
import { ChordEngine } from '../core/chordEngine.js';
import { HarmonyAI } from '../core/harmonyAI.js';
import { Storage } from '../core/storage.js';
import { AudioEngine } from '../audio/audioEngine.js';
import {
  renderVerticalChordSVG,
  renderHorizontalChordSVG,
  renderTablatureHTML,
  renderStringBreakdownHTML,
} from '../ui/chordDiagram.js';
import { ExportTools } from '../ui/exportTools.js';

export const ModChords = {
  id: 'chords',
  state: {
    rootPc: 7, // G major by default to showcase Open, Barre 3rd fret, CAGED E/D etc.
    chordTypeId: 'maj',
    selectedShapeIdx: 0,
    searchQuery: '',
    filters: {
      difficulty: 'all',
      fingers: 'all',
      barre: 'all',
      region: 'all',
      caged: 'all',
      inversion: 'all',
    },
    showAI: false,
  },

  applyExternal(opts = {}) {
    if (opts.rootPc !== undefined) this.state.rootPc = Theory.mod12(opts.rootPc);
    if (opts.chordTypeId) this.state.chordTypeId = opts.chordTypeId;
    this.state.selectedShapeIdx = 0;
  },

  getShareParams() {
    return {
      m: 'chords',
      r: this.state.rootPc,
      ct: this.state.chordTypeId,
      sh: this.state.selectedShapeIdx,
    };
  },

  applyShareParams(p) {
    if (p.r !== undefined) this.state.rootPc = Theory.mod12(Number(p.r));
    if (p.ct) this.state.chordTypeId = p.ct;
    if (p.sh !== undefined) this.state.selectedShapeIdx = Number(p.sh) || 0;
  },

  getCurrentVoicing() {
    const filtered = this.getFilteredVoicings();
    if (!filtered.length) return null;
    const idx = Math.min(this.state.selectedShapeIdx, filtered.length - 1);
    return filtered[idx];
  },

  getFilteredVoicings() {
    const all = ChordEngine.getVoicings(this.state.rootPc, this.state.chordTypeId);
    const f = this.state.filters;
    return all.filter((v) => {
      if (f.difficulty !== 'all' && v.difficulty !== f.difficulty) return false;
      if (f.fingers !== 'all' && v.fingerCount !== Number(f.fingers)) return false;
      if (f.barre === 'yes' && !v.hasBarre) return false;
      if (f.barre === 'no' && v.hasBarre) return false;
      if (f.region !== 'all' && v.regionKey !== f.region) return false;
      if (f.caged !== 'all' && v.caged !== f.caged) return false;
      if (f.inversion !== 'all' && v.inversionIndex !== Number(f.inversion)) return false;
      return true;
    });
  },

  render(container, app) {
    const tuning = Theory.getTuning();
    const ct = Theory.getChordType(this.state.chordTypeId);
    const allVoicings = ChordEngine.getVoicings(this.state.rootPc, this.state.chordTypeId, tuning);
    const filtered = this.getFilteredVoicings();

    if (this.state.selectedShapeIdx >= filtered.length) {
      this.state.selectedShapeIdx = 0;
    }
    const active = filtered[this.state.selectedShapeIdx] || null;
    const chordNotes = Theory.getChordNotes(this.state.rootPc, this.state.chordTypeId);
    const inversions = Theory.getInversions(this.state.rootPc, this.state.chordTypeId);
    const baseName = Theory.getChordDisplayName(this.state.rootPc, this.state.chordTypeId);
    const rootName = Theory.pcToNote(this.state.rootPc, Theory.useFlatsForRoot(this.state.rootPc));

    const favChordId = `chord_${this.state.rootPc}_${this.state.chordTypeId}`;
    const isFavChord = Storage.isFavorite('chords', favChordId);
    const isFavShape = active ? Storage.isFavorite('shapes', active.id) : false;

    const categories = [...new Set(Theory.getChordTypes().map((c) => c.category))];
    const q = this.state.searchQuery.trim().toLowerCase();

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Biblioteca de Acordes</h2>
          <p class="module-subtitle">Explore mais de <strong>${ChordEngine.getTotalCatalogEstimate().toLocaleString('pt-BR')}+</strong> posições jogáveis com diagramas verticais, horizontais, tablatura, CAGED e inversões.</p>
        </div>
        <div class="header-badges">
          <span class="badge badge-gold">${allVoicings.length} shapes para ${baseName}</span>
          <span class="badge badge-muted">Afinação: ${tuning.short}</span>
        </div>
      </div>

      <!-- Selector Card: Key + Chord Type -->
      <section class="card selector-card">
        <div class="selector-row">
          <div class="selector-group">
            <label class="field-label">Tom (Tônica)</label>
            <div class="pill-grid root-pills" id="chord-root-pills">
              ${Theory.getAllRoots().map((r) => `
                <button class="pill-btn ${r.pc === this.state.rootPc ? 'active' : ''}" data-root="${r.pc}">
                  ${r.short || r.label}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="selector-group search-group">
            <label class="field-label" for="chord-type-search">Buscar Tipo de Acorde</label>
            <input type="search" id="chord-type-search" class="input-control" placeholder="Ex: maj7, m7b5, sus4, 9, add9..." value="${this.state.searchQuery}">
          </div>
        </div>

        <div class="chord-categories" id="chord-type-list">
          ${categories.map((cat) => {
            const types = Theory.getChordTypes().filter((c) => {
              if (c.category !== cat) return false;
              if (!q) return true;
              return c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
            });
            if (!types.length) return '';
            return `
              <div class="cat-block">
                <span class="cat-title">${cat}</span>
                <div class="pill-wrap">
                  ${types.map((c) => `
                    <button class="pill-btn pill-sm ${c.id === this.state.chordTypeId ? 'active' : ''}" data-type="${c.id}" title="${c.name}">
                      ${rootName}${c.symbol}
                    </button>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Filters Card -->
      <section class="card filters-card">
        <div class="filters-grid">
          <div class="filter-item">
            <label class="field-label">Dificuldade</label>
            <select id="f-difficulty" class="select-control">
              <option value="all" ${this.state.filters.difficulty === 'all' ? 'selected' : ''}>Todas</option>
              <option value="Fácil" ${this.state.filters.difficulty === 'Fácil' ? 'selected' : ''}>Fácil</option>
              <option value="Médio" ${this.state.filters.difficulty === 'Médio' ? 'selected' : ''}>Médio</option>
              <option value="Avançado" ${this.state.filters.difficulty === 'Avançado' ? 'selected' : ''}>Avançado</option>
            </select>
          </div>
          <div class="filter-item">
            <label class="field-label">Nº de Dedos</label>
            <select id="f-fingers" class="select-control">
              <option value="all" ${this.state.filters.fingers === 'all' ? 'selected' : ''}>Todos</option>
              <option value="1" ${this.state.filters.fingers === '1' ? 'selected' : ''}>1 dedo</option>
              <option value="2" ${this.state.filters.fingers === '2' ? 'selected' : ''}>2 dedos</option>
              <option value="3" ${this.state.filters.fingers === '3' ? 'selected' : ''}>3 dedos</option>
              <option value="4" ${this.state.filters.fingers === '4' ? 'selected' : ''}>4 dedos</option>
            </select>
          </div>
          <div class="filter-item">
            <label class="field-label">Pestana</label>
            <select id="f-barre" class="select-control">
              <option value="all" ${this.state.filters.barre === 'all' ? 'selected' : ''}>Com ou sem</option>
              <option value="no" ${this.state.filters.barre === 'no' ? 'selected' : ''}>Sem pestana</option>
              <option value="yes" ${this.state.filters.barre === 'yes' ? 'selected' : ''}>Com pestana</option>
            </select>
          </div>
          <div class="filter-item">
            <label class="field-label">Região do Braço</label>
            <select id="f-region" class="select-control">
              <option value="all" ${this.state.filters.region === 'all' ? 'selected' : ''}>Todo o braço</option>
              <option value="open" ${this.state.filters.region === 'open' ? 'selected' : ''}>Aberto (0–4)</option>
              <option value="mid" ${this.state.filters.region === 'mid' ? 'selected' : ''}>Médio (5–9)</option>
              <option value="high" ${this.state.filters.region === 'high' ? 'selected' : ''}>Agudo (10–15)</option>
              <option value="extreme" ${this.state.filters.region === 'extreme' ? 'selected' : ''}>Extremo (16+)</option>
            </select>
          </div>
          <div class="filter-item">
            <label class="field-label">Sistema CAGED</label>
            <select id="f-caged" class="select-control">
              <option value="all" ${this.state.filters.caged === 'all' ? 'selected' : ''}>Todos</option>
              ${['C', 'A', 'G', 'E', 'D'].map((l) => `<option value="${l}" ${this.state.filters.caged === l ? 'selected' : ''}>CAGED ${l}</option>`).join('')}
            </select>
          </div>
          <div class="filter-item">
            <label class="field-label">Inversão</label>
            <select id="f-inversion" class="select-control">
              <option value="all" ${this.state.filters.inversion === 'all' ? 'selected' : ''}>Todas</option>
              <option value="0" ${this.state.filters.inversion === '0' ? 'selected' : ''}>Fundamental</option>
              <option value="1" ${this.state.filters.inversion === '1' ? 'selected' : ''}>1ª Inversão</option>
              <option value="2" ${this.state.filters.inversion === '2' ? 'selected' : ''}>2ª Inversão</option>
              <option value="3" ${this.state.filters.inversion === '3' ? 'selected' : ''}>3ª Inversão</option>
            </select>
          </div>
          <div class="filter-actions">
            <button id="btn-reset-filters" class="btn btn-ghost btn-sm">Limpar Filtros</button>
          </div>
        </div>
      </section>

      <!-- Chord Metadata Summary -->
      <section class="card chord-meta-card">
        <div class="chord-hero-top">
          <div>
            <div class="chord-title-row">
              <h3 class="chord-big-name">${active ? active.symbol : baseName}</h3>
              <span class="badge badge-accent">${ct.name}</span>
              <span class="badge badge-info">${ct.quality}</span>
              ${active && active.caged ? `<span class="badge" style="background:${Theory.getCagedColor(active.caged)}22;color:${Theory.getCagedColor(active.caged)};border:1px solid ${Theory.getCagedColor(active.caged)}55">CAGED ${active.caged}</span>` : ''}
            </div>
            <p class="muted-text">${ct.description}</p>
          </div>
          <div class="action-bar">
            <button id="btn-strum-chord" class="btn btn-primary" ${!active ? 'disabled' : ''}>▶ Tocar Acorde</button>
            <button id="btn-arp-chord" class="btn btn-secondary" ${!active ? 'disabled' : ''}>♪ Arpejar</button>
            <button id="btn-fav-chord" class="btn ${isFavChord ? 'btn-gold-active' : 'btn-ghost'}">${isFavChord ? '★ Favoritado' : '☆ Favoritar'}</button>
            <button id="btn-toggle-ai" class="btn ${this.state.showAI ? 'btn-accent-active' : 'btn-ghost'}">✦ IA Musical</button>
          </div>
        </div>

        <div class="theory-strip">
          <div class="theory-box">
            <span class="theory-label">Fórmula Intervalar</span>
            <strong class="mono-text">${ct.formula}</strong>
          </div>
          <div class="theory-box">
            <span class="theory-label">Tônica</span>
            <strong class="text-gold">${rootName}</strong>
          </div>
          <div class="theory-box">
            <span class="theory-label">Notas do Acorde</span>
            <div class="pill-wrap">
              ${chordNotes.map((n) => `<span class="note-pill" style="background:${n.color}22;color:${n.color};border-color:${n.color}55">${n.note} <small>${n.short}</small></span>`).join('')}
            </div>
          </div>
          <div class="theory-box">
            <span class="theory-label">Inversões</span>
            <div class="pill-wrap">
              ${inversions.map((inv) => `
                <button class="inv-chip ${this.state.filters.inversion === String(inv.index) ? 'active' : ''}" data-inv="${inv.index}" title="${inv.label}: ${inv.orderedNotes.join(' - ')}">
                  ${inv.symbol}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </section>

      <!-- Optional Musical AI Panel for Current Chord -->
      ${this.state.showAI ? this.renderAIPanel(this.state.rootPc, this.state.chordTypeId, baseName) : ''}

      <!-- Active Shape Detailed View -->
      ${active ? `
        <section class="card active-shape-card">
          <div class="shape-nav-bar">
            <div class="shape-nav-left">
              <button id="btn-prev-shape" class="btn btn-ghost btn-sm" ${filtered.length <= 1 ? 'disabled' : ''}>◀ Anterior</button>
              <span class="shape-counter">Shape <strong>${this.state.selectedShapeIdx + 1}</strong> de <strong>${filtered.length}</strong></span>
              <button id="btn-next-shape" class="btn btn-ghost btn-sm" ${filtered.length <= 1 ? 'disabled' : ''}>Próximo ▶</button>
              <span class="shape-label-badge">${active.label}</span>
            </div>
            <div class="shape-nav-right">
              <span class="badge badge-muted">Dificuldade: ${active.difficulty}</span>
              <span class="badge badge-muted">${active.fingerCount} dedos</span>
              <span class="badge badge-muted">${active.hasBarre ? `Pestana casa ${active.barre.fret}` : 'Sem pestana'}</span>
              <button id="btn-save-shape" class="btn btn-ghost btn-sm">${isFavShape ? '★ Shape Salvo' : '☆ Salvar Shape'}</button>
              <button id="btn-open-fretboard" class="btn btn-ghost btn-sm">Ver no Braço</button>
              <button id="btn-export-chord-png" class="btn btn-ghost btn-sm">PNG</button>
              <button id="btn-export-chord-pdf" class="btn btn-ghost btn-sm">PDF</button>
            </div>
          </div>

          <div class="chord-views-grid">
            <div class="subcard diagram-box">
              <h4 class="subcard-title">Diagrama Vertical</h4>
              <div class="svg-center" id="active-vert-wrap">
                ${renderVerticalChordSVG(active, { id: 'chord-vert-svg' })}
              </div>
              <div class="meta-foot">Casas utilizadas: <code>${active.minFret}–${active.maxFret}</code> · ${active.region}</div>
            </div>

            <div class="subcard diagram-box">
              <h4 class="subcard-title">Diagrama Horizontal & Tablatura</h4>
              <div class="svg-center" id="active-horiz-wrap">
                ${renderHorizontalChordSVG(active, { id: 'chord-horiz-svg' })}
              </div>
              <div class="tab-wrapper">
                ${renderTablatureHTML(active)}
              </div>
            </div>

            <div class="subcard breakdown-box">
              <h4 class="subcard-title">Digitação & Notas por Corda</h4>
              ${renderStringBreakdownHTML(active)}
              <div class="pressed-summary">
                <span class="theory-label">Notas pressionadas (grave → agudo):</span>
                <div class="pill-wrap">
                  ${active.stringNotes.filter((n) => !n.muted).map((n) => `<span class="note-pill" style="background:${n.color}22;color:${n.color};border-color:${n.color}55">${n.note}</span>`).join('')}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- All Available Shapes Gallery -->
        <section class="card">
          <div class="card-header-row">
            <h3 class="section-title">Todos os Shapes Disponíveis (${filtered.length})</h3>
            <span class="muted-text">Clique em qualquer shape para inspecionar e ouvir</span>
          </div>
          <div class="shapes-gallery" id="shapes-gallery">
            ${filtered.map((v, idx) => `
              <button class="shape-thumb ${idx === this.state.selectedShapeIdx ? 'active' : ''}" data-shape-idx="${idx}">
                <div class="thumb-head">
                  <span class="thumb-num">Shape ${idx + 1}</span>
                  ${v.caged ? `<span class="caged-dot" style="background:${Theory.getCagedColor(v.caged)}">${v.caged}</span>` : ''}
                </div>
                ${renderVerticalChordSVG(v, { compact: true })}
                <div class="thumb-foot">${v.label}</div>
              </button>
            `).join('')}
          </div>
        </section>
      ` : `
        <section class="card empty-state">
          <h3>Nenhum shape encontrado com esses filtros</h3>
          <p class="muted-text">Tente relaxar os filtros de região, CAGED ou número de dedos.</p>
          <button id="btn-empty-reset" class="btn btn-primary">Resetar Filtros</button>
        </section>
      `}
    `;

    this.bindEvents(container, app, filtered, active, baseName, ct);
  },

  renderAIPanel(rootPc, chordTypeId, chordName) {
    const scales = HarmonyAI.suggestScalesForChord(rootPc, chordTypeId);
    const subs = HarmonyAI.suggestSubstitutions(rootPc, chordTypeId, rootPc);
    return `
      <section class="card ai-panel">
        <div class="card-header-row">
          <h3 class="section-title">✦ IA Musical para ${chordName}</h3>
          <span class="badge badge-gold">Sugestões de Improviso & Rearmonização</span>
        </div>
        <div class="ai-grid">
          <div class="subcard">
            <h4 class="subcard-title">Escalas Recomendadas para Solar</h4>
            <div class="ai-list">
              ${scales.map((s) => `
                <div class="ai-item">
                  <div class="ai-item-head">
                    <strong>${s.title}</strong>
                    <span class="badge badge-success">${s.match}% compatível</span>
                  </div>
                  <p class="muted-text small">${s.reason} <em>(${s.mood})</em></p>
                  <div class="ai-item-foot">
                    <span class="small">Tensões: <code>${s.tensions.join(', ') || 'Direta'}</code></span>
                    <button class="btn btn-ghost btn-xs ai-open-scale" data-root="${s.rootPc}" data-scale="${s.scaleId}">Abrir Escala →</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="subcard">
            <h4 class="subcard-title">Substituições Harmônicas</h4>
            <div class="ai-list">
              ${subs.map((sub) => `
                <div class="ai-item">
                  <div class="ai-item-head">
                    <strong>${sub.chord}</strong>
                    <span class="badge badge-info">${sub.type}</span>
                  </div>
                  <p class="muted-text small">${sub.explanation}</p>
                  <div class="ai-item-foot">
                    <button class="btn btn-ghost btn-xs ai-open-chord" data-root="${sub.rootPc}" data-type="${sub.chordTypeId}">Ver Acorde →</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </section>
    `;
  },

  bindEvents(container, app, filtered, active, baseName, ct) {
    container.querySelectorAll('[data-root]').forEach((btn) => {
      if (btn.classList.contains('ai-open-scale') || btn.classList.contains('ai-open-chord')) return;
      btn.addEventListener('click', () => {
        this.state.rootPc = Number(btn.dataset.root);
        this.state.selectedShapeIdx = 0;
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-type]').forEach((btn) => {
      if (btn.classList.contains('ai-open-chord')) return;
      btn.addEventListener('click', () => {
        this.state.chordTypeId = btn.dataset.type;
        this.state.selectedShapeIdx = 0;
        this.render(container, app);
      });
    });

    const searchInput = container.querySelector('#chord-type-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value;
        this.render(container, app);
        const el = container.querySelector('#chord-type-search');
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }

    const bindSelect = (id, key) => {
      const el = container.querySelector(id);
      if (el) {
        el.addEventListener('change', (e) => {
          this.state.filters[key] = e.target.value;
          this.state.selectedShapeIdx = 0;
          this.render(container, app);
        });
      }
    };
    bindSelect('#f-difficulty', 'difficulty');
    bindSelect('#f-fingers', 'fingers');
    bindSelect('#f-barre', 'barre');
    bindSelect('#f-region', 'region');
    bindSelect('#f-caged', 'caged');
    bindSelect('#f-inversion', 'inversion');

    const resetFilters = () => {
      this.state.filters = { difficulty: 'all', fingers: 'all', barre: 'all', region: 'all', caged: 'all', inversion: 'all' };
      this.state.selectedShapeIdx = 0;
      this.render(container, app);
    };
    container.querySelector('#btn-reset-filters')?.addEventListener('click', resetFilters);
    container.querySelector('#btn-empty-reset')?.addEventListener('click', resetFilters);

    // Inversion quick chips
    container.querySelectorAll('.inv-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const val = chip.dataset.inv;
        this.state.filters.inversion = this.state.filters.inversion === val ? 'all' : val;
        this.state.selectedShapeIdx = 0;
        this.render(container, app);
      });
    });

    // Playback
    container.querySelector('#btn-strum-chord')?.addEventListener('click', () => {
      if (!active) return;
      const midis = active.stringNotes.filter((n) => !n.muted).map((n) => n.midi);
      AudioEngine.playChord(midis, { strumMs: 32, duration: 2.2 });
    });

    container.querySelector('#btn-arp-chord')?.addEventListener('click', () => {
      if (!active) return;
      const midis = active.stringNotes.filter((n) => !n.muted).map((n) => n.midi);
      AudioEngine.playChord(midis, { arpeggiate: true, duration: 2.0 });
    });

    // Favorites
    container.querySelector('#btn-fav-chord')?.addEventListener('click', () => {
      const added = Storage.toggleFavorite('chords', {
        id: `chord_${this.state.rootPc}_${this.state.chordTypeId}`,
        title: baseName,
        subtitle: `${ct.name} (${ct.formula})`,
        rootPc: this.state.rootPc,
        chordTypeId: this.state.chordTypeId,
      });
      app.toast(added ? `${baseName} adicionado aos Favoritos!` : `${baseName} removido dos Favoritos.`);
      this.render(container, app);
    });

    container.querySelector('#btn-save-shape')?.addEventListener('click', () => {
      if (!active) return;
      const added = Storage.toggleFavorite('shapes', {
        id: active.id,
        title: `${active.symbol} · ${active.label}`,
        subtitle: `Casas: ${active.frets.map((f) => (f < 0 ? 'x' : f)).join('-')}`,
        rootPc: active.rootPc,
        chordTypeId: active.chordTypeId,
        frets: active.frets,
      });
      app.toast(added ? 'Shape salvo nos Favoritos!' : 'Shape removido dos Favoritos.');
      this.render(container, app);
    });

    container.querySelector('#btn-toggle-ai')?.addEventListener('click', () => {
      this.state.showAI = !this.state.showAI;
      this.render(container, app);
    });

    // Shape navigation
    container.querySelector('#btn-prev-shape')?.addEventListener('click', () => {
      this.state.selectedShapeIdx = (this.state.selectedShapeIdx - 1 + filtered.length) % filtered.length;
      this.render(container, app);
    });
    container.querySelector('#btn-next-shape')?.addEventListener('click', () => {
      this.state.selectedShapeIdx = (this.state.selectedShapeIdx + 1) % filtered.length;
      this.render(container, app);
    });

    container.querySelectorAll('.shape-thumb').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.selectedShapeIdx = Number(btn.dataset.shapeIdx);
        this.render(container, app);
        const v = filtered[this.state.selectedShapeIdx];
        if (v) {
          AudioEngine.playChord(v.stringNotes.filter((n) => !n.muted).map((n) => n.midi), { strumMs: 28, duration: 1.8 });
        }
      });
    });

    // Open active chord in full Fretboard Visualizer
    container.querySelector('#btn-open-fretboard')?.addEventListener('click', () => {
      app.navigate('fretboard', {
        mode: 'chords',
        rootPc: this.state.rootPc,
        chordTypeId: this.state.chordTypeId,
      });
    });

    // AI jump buttons
    container.querySelectorAll('.ai-open-scale').forEach((btn) => {
      btn.addEventListener('click', () => {
        app.navigate('scales', { rootPc: Number(btn.dataset.root), scaleId: btn.dataset.scale });
      });
    });
    container.querySelectorAll('.ai-open-chord').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.rootPc = Number(btn.dataset.root);
        this.state.chordTypeId = btn.dataset.type;
        this.state.selectedShapeIdx = 0;
        this.render(container, app);
      });
    });

    // Export PNG & PDF
    container.querySelector('#btn-export-chord-png')?.addEventListener('click', () => {
      const svg = container.querySelector('#chord-vert-svg');
      if (svg && active) {
        ExportTools.exportSvgAsPng(svg, `acorde-${active.symbol.replace(/[^a-zA-Z0-9]/g, '_')}.png`, `${active.symbol} — ${active.label}`);
        app.toast('Diagrama exportado em PNG!');
      }
    });

    container.querySelector('#btn-export-chord-pdf')?.addEventListener('click', () => {
      if (!active) return;
      const body = `
        <div class="print-section" style="display:flex;gap:24px;align-items:flex-start;">
          <div>${renderVerticalChordSVG(active)}</div>
          <div>${renderHorizontalChordSVG(active)}</div>
        </div>
        <div class="print-section">
          <h3>Tablatura</h3>
          ${renderTablatureHTML(active)}
        </div>
        <div class="print-section">
          <h3>Notas & Digitação</h3>
          ${renderStringBreakdownHTML(active)}
        </div>
      `;
      ExportTools.exportPdfSheet(
        `Acorde ${active.symbol} (${ct.name})`,
        `Fórmula: ${ct.formula} | Shape: ${active.label} | Afinação: ${Theory.getTuning().name}`,
        body
      );
    });
  },
};
