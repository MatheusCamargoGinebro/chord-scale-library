/**
 * Module 1: Chord Library (Biblioteca de Acordes)
 * Streamlined, low-clutter UX: category tabs, collapsible filters, clean tabbed inspection,
 * inline BPM + Cadence playback, SVG icons, and full shapes gallery.
 */

import { Theory } from '../core/theory.js';
import { ChordEngine } from '../core/chordEngine.js';
import { HarmonyAI } from '../core/harmonyAI.js';
import { Storage } from '../core/storage.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { RhythmEngine } from '../audio/rhythmEngine.js';
import {
  renderVerticalChordSVG,
  renderHorizontalChordSVG,
  renderTablatureHTML,
  renderStringBreakdownHTML,
} from '../ui/chordDiagram.js';
import { ExportTools } from '../ui/exportTools.js';
import { icon } from '../ui/icons.js';
import { renderPlaybackControlsHTML, bindPlaybackControls, highlightStrumStep } from '../ui/playbackBar.js';

export const ModChords = {
  id: 'chords',
  state: {
    rootPc: 7, // G major
    chordTypeId: 'maj',
    activeCategory: 'Tríades',
    selectedShapeIdx: 0,
    searchQuery: '',
    showFilters: false,
    detailTab: 'diagrams', // 'diagrams' | 'fingering' | 'ai'
    loopPlay: false,
    isPlaying: false,
    stageMode: false,
    filters: {
      difficulty: 'all',
      fingers: 'all',
      barre: 'all',
      region: 'all',
      caged: 'all',
      inversion: 'all',
    },
  },

  applyExternal(opts = {}) {
    if (opts.rootPc !== undefined) this.state.rootPc = Theory.mod12(opts.rootPc);
    if (opts.chordTypeId) {
      this.state.chordTypeId = opts.chordTypeId;
      const ct = Theory.getChordType(opts.chordTypeId);
      if (ct) this.state.activeCategory = ct.category;
    }
    this.state.selectedShapeIdx = 0;
  },

  getShareParams() {
    return { m: 'chords', r: this.state.rootPc, ct: this.state.chordTypeId, sh: this.state.selectedShapeIdx };
  },

  applyShareParams(p) {
    if (p.r !== undefined) this.state.rootPc = Theory.mod12(Number(p.r));
    if (p.ct) {
      this.state.chordTypeId = p.ct;
      const ct = Theory.getChordType(p.ct);
      if (ct) this.state.activeCategory = ct.category;
    }
    if (p.sh !== undefined) this.state.selectedShapeIdx = Number(p.sh) || 0;
  },

  getActiveFilterCount() {
    return Object.values(this.state.filters).filter((v) => v !== 'all').length;
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

    if (this.state.selectedShapeIdx >= filtered.length) this.state.selectedShapeIdx = 0;
    const active = filtered[this.state.selectedShapeIdx] || null;
    const chordNotes = Theory.getChordNotes(this.state.rootPc, this.state.chordTypeId);
    const inversions = Theory.getInversions(this.state.rootPc, this.state.chordTypeId);
    const baseName = Theory.getChordDisplayName(this.state.rootPc, this.state.chordTypeId);
    const rootName = Theory.pcToNote(this.state.rootPc, Theory.useFlatsForRoot(this.state.rootPc));

    const favChordId = `chord_${this.state.rootPc}_${this.state.chordTypeId}`;
    const isFavChord = Storage.isFavorite('chords', favChordId);
    const isFavShape = active ? Storage.isFavorite('shapes', active.id) : false;

    const categories = [...new Set(Theory.getChordTypes().map((c) => c.category))];
    if (!categories.includes(this.state.activeCategory)) this.state.activeCategory = categories[0];

    const q = this.state.searchQuery.trim().toLowerCase();
    const visibleTypes = Theory.getChordTypes().filter((c) => {
      if (q) {
        return c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
      }
      return c.category === this.state.activeCategory;
    });

    const activeFilterCount = this.getActiveFilterCount();

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Biblioteca de Acordes</h2>
          <p class="module-subtitle">Escolha a tônica e a qualidade para explorar posições, digitações e ouvir na cadência desejada.</p>
        </div>
        <div class="header-badges">
          <span class="badge badge-gold">${filtered.length} de ${allVoicings.length} shapes</span>
          <button id="btn-toggle-filters" class="btn ${this.state.showFilters || activeFilterCount ? 'btn-gold-active' : 'btn-ghost'} btn-sm">
            ${icon('filter', 14)}
            <span>Filtros${activeFilterCount ? ` (${activeFilterCount})` : ''}</span>
          </button>
        </div>
      </div>

      <!-- Compact Picker Card: Root + Category Tabs + Search -->
      <section class="card selector-card">
        <div class="selector-row">
          <div class="selector-group">
            <label class="field-label">Tônica</label>
            <div class="pill-grid root-pills">
              ${Theory.getAllRoots().map((r) => `
                <button class="pill-btn ${r.pc === this.state.rootPc ? 'active' : ''}" data-root="${r.pc}">
                  ${r.short || r.label}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="selector-group search-group">
            <label class="field-label" for="chord-type-search">Buscar tipo</label>
            <div class="input-icon-wrap">
              ${icon('search', 14, 'input-leading-icon')}
              <input type="search" id="chord-type-search" class="input-control has-icon" placeholder="maj7, sus4, m7b5, 9..." value="${this.state.searchQuery}">
            </div>
          </div>
        </div>

        ${!q ? `
          <div class="segmented-tabs" role="tablist">
            ${categories.map((cat) => `
              <button class="seg-tab ${cat === this.state.activeCategory ? 'active' : ''}" data-cat="${cat}">${cat}</button>
            `).join('')}
          </div>
        ` : `<div class="small muted-text" style="margin-bottom:8px;">Resultados da busca por "${this.state.searchQuery}" (${visibleTypes.length}):</div>`}

        <div class="pill-wrap" style="margin-top:10px;">
          ${visibleTypes.map((c) => `
            <button class="pill-btn pill-sm ${c.id === this.state.chordTypeId ? 'active' : ''}" data-type="${c.id}" title="${c.name}">
              ${rootName}${c.symbol}
            </button>
          `).join('')}
          ${!visibleTypes.length ? '<span class="muted-text small">Nenhum tipo encontrado.</span>' : ''}
        </div>
      </section>

      <!-- Collapsible Advanced Filters -->
      ${this.state.showFilters ? `
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
              <button id="btn-reset-filters" class="btn btn-ghost btn-sm">${icon('rotateCcw', 13)} Limpar</button>
            </div>
          </div>
        </section>
      ` : ''}

      <!-- Focused Chord Workspace Card -->
      ${active ? `
        <section class="card active-shape-card">
          <div class="chord-hero-top">
            <div>
              <div class="chord-title-row">
                <h3 class="chord-big-name">${active.symbol}</h3>
                <span class="badge badge-accent">${ct.name}</span>
                <span class="badge badge-info">${ct.formula}</span>
                ${active.caged ? `<span class="badge" style="background:${Theory.getCagedColor(active.caged)}22;color:${Theory.getCagedColor(active.caged)};border:1px solid ${Theory.getCagedColor(active.caged)}55">CAGED ${active.caged}</span>` : ''}
              </div>
              <div class="pill-wrap" style="margin-top:6px;">
                ${chordNotes.map((n) => `<span class="note-pill" style="background:${n.color}20;color:${n.color};border-color:${n.color}45">${n.note} <small>${n.short}</small></span>`).join('')}
                <span class="divider-v"></span>
                ${inversions.map((inv) => `
                  <button class="inv-chip ${this.state.filters.inversion === String(inv.index) ? 'active' : ''}" data-inv="${inv.index}" title="${inv.label}">${inv.symbol}</button>
                `).join('')}
              </div>
            </div>

            <div class="action-bar stable-actions">
              <button id="btn-strum-chord" class="btn btn-primary btn-play-toggle">${icon(this.state.isPlaying ? 'stop' : 'play', 14)}<span>${this.state.isPlaying ? 'Parar' : 'Tocar'}</span></button>
              <button id="btn-loop-chord" class="btn ${this.state.loopPlay ? 'btn-gold-active' : 'btn-ghost'} btn-sm">${icon('repeat', 14)} Loop</button>
              <button id="btn-chord-stage" class="btn btn-ghost btn-sm" title="Modo Palco horizontal">${icon('maximize', 14)} Modo Palco</button>
              <button id="btn-fav-chord" class="btn ${isFavChord ? 'btn-gold-active' : 'btn-ghost'} btn-icon" title="${isFavChord ? 'Remover dos favoritos' : 'Favoritar acorde'}">${icon(isFavChord ? 'starFilled' : 'favorites', 15)}</button>
              <button id="btn-export-chord-png" class="btn btn-ghost btn-sm">${icon('image', 14)} PNG</button>
              <button id="btn-export-chord-pdf" class="btn btn-ghost btn-sm">${icon('fileText', 14)} PDF</button>
            </div>
          </div>

          <!-- Inline BPM + Cadence Controls -->
          ${renderPlaybackControlsHTML({ mode: 'chord', bpm: RhythmEngine.bpm, cadence: AudioEngine.chordCadence, idPrefix: 'ch-pb' })}

          <!-- Shape Navigation + Detail View Tabs -->
          <div class="shape-nav-bar" style="margin-top:14px;">
            <div class="shape-nav-left">
              <button id="btn-prev-shape" class="btn btn-ghost btn-icon-sm" ${filtered.length <= 1 ? 'disabled' : ''} aria-label="Shape anterior">${icon('chevronLeft', 15)}</button>
              <span class="shape-counter">Shape <strong>${this.state.selectedShapeIdx + 1}</strong> / ${filtered.length}</span>
              <button id="btn-next-shape" class="btn btn-ghost btn-icon-sm" ${filtered.length <= 1 ? 'disabled' : ''} aria-label="Próximo shape">${icon('chevronRight', 15)}</button>
              <span class="shape-label-badge">${active.label}</span>
              <span class="badge badge-muted">${active.difficulty} · ${active.fingerCount} dedos</span>
            </div>

            <div class="segmented-tabs compact">
              <button class="seg-tab ${this.state.detailTab === 'diagrams' ? 'active' : ''}" data-dtab="diagrams">Diagramas &amp; Tab</button>
              <button class="seg-tab ${this.state.detailTab === 'fingering' ? 'active' : ''}" data-dtab="fingering">Notas &amp; Digitação</button>
              <button class="seg-tab ${this.state.detailTab === 'ai' ? 'active' : ''}" data-dtab="ai">${icon('sparkles', 13)} IA Musical</button>
            </div>
          </div>

          <!-- Tab Content -->
          ${this.state.detailTab === 'diagrams' ? `
            <div class="chord-views-clean">
              <div class="subcard diagram-box">
                <div class="card-header-row" style="margin-bottom:4px;">
                  <h4 class="subcard-title" style="margin:0;">Diagrama Vertical</h4>
                  <button id="btn-save-shape" class="btn ${isFavShape ? 'btn-gold-active' : 'btn-ghost'} btn-xs">${icon(isFavShape ? 'starFilled' : 'favorites', 12)} ${isFavShape ? 'Salvo' : 'Salvar Shape'}</button>
                </div>
                <div class="svg-center">${renderVerticalChordSVG(active, { id: 'chord-vert-svg' })}</div>
                <div class="meta-foot">Casas <code>${active.minFret}–${active.maxFret}</code> · ${active.region}</div>
              </div>

              <div class="subcard diagram-box">
                <div class="card-header-row" style="margin-bottom:4px;">
                  <h4 class="subcard-title" style="margin:0;">Diagrama Horizontal &amp; Tablatura</h4>
                  <button id="btn-open-fretboard" class="btn btn-ghost btn-xs">${icon('fretboard', 13)} Ver no Braço</button>
                </div>
                <div class="svg-center">${renderHorizontalChordSVG(active, { id: 'chord-horiz-svg' })}</div>
                <div class="tab-wrapper">${renderTablatureHTML(active)}</div>
              </div>
            </div>
          ` : ''}

          ${this.state.detailTab === 'fingering' ? `
            <div class="subcard">
              <h4 class="subcard-title">Digitação, Dedos Recomendados e Notas por Corda</h4>
              ${renderStringBreakdownHTML(active)}
              <div class="pressed-summary">
                <span class="theory-label">Notas pressionadas (grave → agudo):</span>
                <div class="pill-wrap">
                  ${active.stringNotes.filter((n) => !n.muted).map((n) => `<span class="note-pill" style="background:${n.color}22;color:${n.color};border-color:${n.color}55">${n.note} <small>(${n.short})</small></span>`).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          ${this.state.detailTab === 'ai' ? this.renderAIContent(this.state.rootPc, this.state.chordTypeId) : ''}
        </section>

        <!-- All Available Shapes Strip -->
        <section class="card">
          <div class="card-header-row">
            <h3 class="section-title">Todos os Shapes de ${baseName} (${filtered.length})</h3>
            <span class="muted-text small">Clique em qualquer diagrama para trocar e ouvir</span>
          </div>
          <div class="shapes-gallery">
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

        ${this.state.stageMode ? `
          <div class="stage-overlay" role="dialog" aria-modal="true" aria-label="Modo Palco — ${baseName}">
            <div class="stage-header">
              <div>
                <h2 class="stage-title">${baseName} (${ct.name}) · ${ct.formula}</h2>
                <p class="muted-text small">Clique em qualquer shape horizontal abaixo para ouvir na cadência atual (${RhythmEngine.bpm} BPM).</p>
              </div>
              <div class="action-bar stable-actions">
                <button id="stage-chord-close" class="btn btn-ghost">${icon('minimize', 15)} Sair do Palco</button>
              </div>
            </div>
            <div class="stage-chords-grid">
              ${filtered.slice(0, 8).map((v, idx) => `
                <div class="stage-chord-card ${idx === this.state.selectedShapeIdx ? 'playing' : ''} stage-ch-play" data-sidx="${idx}" style="cursor:pointer;">
                  <div class="stage-chord-head">
                    <span class="badge badge-muted">Shape ${idx + 1}</span>
                    ${v.caged ? `<span class="caged-dot" style="background:${Theory.getCagedColor(v.caged)}">${v.caged}</span>` : ''}
                  </div>
                  ${renderVerticalChordSVG(v, { compact: false })}
                  <div class="small muted-text">${v.label}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      ` : `
        <section class="card empty-state">
          <h3>Nenhum shape encontrado com os filtros atuais</h3>
          <p class="muted-text">Ajuste ou limpe os filtros para visualizar todas as posições.</p>
          <button id="btn-empty-reset" class="btn btn-primary" style="margin-top:12px;">${icon('rotateCcw', 14)} Limpar Filtros</button>
        </section>
      `}
    `;

    this.bindEvents(container, app, filtered, active, baseName, ct);
  },

  renderAIContent(rootPc, chordTypeId) {
    const scales = HarmonyAI.suggestScalesForChord(rootPc, chordTypeId);
    const subs = HarmonyAI.suggestSubstitutions(rootPc, chordTypeId, rootPc);
    return `
      <div class="ai-grid">
        <div class="subcard">
          <h4 class="subcard-title">Escalas Recomendadas para Solar</h4>
          <div class="ai-list">
            ${scales.map((s) => `
              <div class="ai-item">
                <div class="ai-item-head">
                  <strong>${s.title}</strong>
                  <span class="badge badge-success">${s.match}%</span>
                </div>
                <p class="muted-text small">${s.mood}</p>
                <div class="ai-item-foot">
                  <span class="small">Tensões: <code>${s.tensions.join(', ') || 'Direta'}</code></span>
                  <button class="btn btn-ghost btn-xs ai-open-scale" data-root="${s.rootPc}" data-scale="${s.scaleId}">Abrir ${icon('arrowRight', 12)}</button>
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
                  <button class="btn btn-ghost btn-xs ai-open-chord" data-root="${sub.rootPc}" data-type="${sub.chordTypeId}">Ver acorde ${icon('arrowRight', 12)}</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  bindEvents(container, app, filtered, active, baseName, ct) {
    bindPlaybackControls(container, { mode: 'chord', idPrefix: 'ch-pb' });

    container.querySelector('#btn-toggle-filters')?.addEventListener('click', () => {
      this.state.showFilters = !this.state.showFilters;
      this.render(container, app);
    });

    container.querySelectorAll('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.activeCategory = btn.dataset.cat;
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-dtab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.detailTab = btn.dataset.dtab;
        this.render(container, app);
      });
    });

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
      container.querySelector(id)?.addEventListener('change', (e) => {
        this.state.filters[key] = e.target.value;
        this.state.selectedShapeIdx = 0;
        this.render(container, app);
      });
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

    container.querySelectorAll('.inv-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const val = chip.dataset.inv;
        this.state.filters.inversion = this.state.filters.inversion === val ? 'all' : val;
        this.state.selectedShapeIdx = 0;
        this.render(container, app);
      });
    });

    container.querySelector('#btn-loop-chord')?.addEventListener('click', () => {
      this.state.loopPlay = !this.state.loopPlay;
      this.render(container, app);
    });

    container.querySelector('#btn-chord-stage')?.addEventListener('click', () => {
      this.state.stageMode = true;
      this.render(container, app);
    });
    container.querySelector('#stage-chord-close')?.addEventListener('click', () => {
      this.state.stageMode = false;
      this.render(container, app);
    });
    container.querySelectorAll('.stage-ch-play').forEach((card) => {
      card.addEventListener('click', () => {
        const idx = Number(card.dataset.sidx);
        this.state.selectedShapeIdx = idx;
        const v = filtered[idx];
        if (v) {
          AudioEngine.playChordWithCadence(v.stringNotes.filter((n) => !n.muted).map((n) => n.midi), {
            bpm: RhythmEngine.bpm,
            cadence: AudioEngine.chordCadence,
            loop: false,
          });
        }
        container.querySelectorAll('.stage-ch-play').forEach((el, i) => el.classList.toggle('playing', i === idx));
      });
    });

    container.querySelector('#btn-strum-chord')?.addEventListener('click', () => {
      if (!active) return;
      if (this.state.isPlaying) {
        AudioEngine.stopSequence();
        this.state.isPlaying = false;
        this.render(container, app);
        return;
      }
      const midis = active.stringNotes.filter((n) => !n.muted).map((n) => n.midi);
      this.state.isPlaying = true;
      this.render(container, app);
      AudioEngine.playChordWithCadence(midis, {
        bpm: RhythmEngine.bpm,
        cadence: AudioEngine.chordCadence,
        loop: this.state.loopPlay,
        onBeatStep: (stepIdx) => highlightStrumStep(container, 'ch-pb', stepIdx),
        onEnd: () => {
          this.state.isPlaying = false;
          highlightStrumStep(container, 'ch-pb', -1);
          const btn = container.querySelector('#btn-strum-chord');
          if (btn) btn.innerHTML = `${icon('play', 14)}<span>Tocar</span>`;
        },
      });
    });

    container.querySelector('#btn-fav-chord')?.addEventListener('click', () => {
      const added = Storage.toggleFavorite('chords', {
        id: `chord_${this.state.rootPc}_${this.state.chordTypeId}`,
        title: baseName,
        subtitle: `${ct.name} (${ct.formula})`,
        rootPc: this.state.rootPc,
        chordTypeId: this.state.chordTypeId,
      });
      app.toast(added ? `${baseName} salvo nos Favoritos!` : `${baseName} removido dos Favoritos.`);
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
          AudioEngine.playChord(v.stringNotes.filter((n) => !n.muted).map((n) => n.midi), {
            direction: AudioEngine.chordCadence === 'up' ? 'up' : 'down',
            palmMute: AudioEngine.chordCadence === 'palm_mute',
            arpeggiate: AudioEngine.chordCadence === 'arpeggio',
          });
        }
      });
    });

    container.querySelector('#btn-open-fretboard')?.addEventListener('click', () => {
      app.navigate('fretboard', { mode: 'chords', rootPc: this.state.rootPc, chordTypeId: this.state.chordTypeId });
    });

    container.querySelectorAll('.ai-open-scale').forEach((btn) => {
      btn.addEventListener('click', () => app.navigate('scales', { rootPc: Number(btn.dataset.root), scaleId: btn.dataset.scale }));
    });
    container.querySelectorAll('.ai-open-chord').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.applyExternal({ rootPc: Number(btn.dataset.root), chordTypeId: btn.dataset.type });
        this.render(container, app);
      });
    });

    container.querySelector('#btn-export-chord-png')?.addEventListener('click', () => {
      const svg = container.querySelector('#chord-vert-svg');
      if (svg && active) {
        ExportTools.exportSvgAsPng(svg, `acorde-${active.symbol.replace(/[^a-zA-Z0-9]/g, '_')}.png`, `${active.symbol} — ${active.label}`);
        app.toast('Diagrama exportado em PNG!');
      } else {
        app.toast('Abra a aba "Diagramas & Tab" para exportar o PNG.');
      }
    });

    container.querySelector('#btn-export-chord-pdf')?.addEventListener('click', () => {
      if (!active) return;
      const body = `
        <div class="print-section" style="display:flex;gap:24px;align-items:flex-start;">
          <div>${renderVerticalChordSVG(active)}</div>
          <div>${renderHorizontalChordSVG(active)}</div>
        </div>
        <div class="print-section"><h3>Tablatura</h3>${renderTablatureHTML(active)}</div>
        <div class="print-section"><h3>Notas &amp; Digitação</h3>${renderStringBreakdownHTML(active)}</div>
      `;
      ExportTools.exportPdfSheet(`Acorde ${active.symbol} (${ct.name})`, `Fórmula: ${ct.formula} | Shape: ${active.label}`, body);
    });
  },
};
