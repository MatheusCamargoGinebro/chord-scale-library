/**
 * Module 7: Harmonic Progressions + Voice Leading + Interactive Circle of Fifths + Musical AI
 */

import { Theory } from '../core/theory.js';
import { HarmonyAI } from '../core/harmonyAI.js';
import { Storage } from '../core/storage.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { RhythmEngine } from '../audio/rhythmEngine.js';
import { renderVerticalChordSVG } from '../ui/chordDiagram.js';
import { renderCircleOfFifths } from '../ui/circleOfFifths.js';
import { ExportTools } from '../ui/exportTools.js';

export const ModProgressions = {
  id: 'progressions',
  state: {
    keyPc: 0, // C
    genre: 'Todos',
    selectedProgId: 'jazz_251',
    loopPlay: true,
    isPlaying: false,
    activeChordIdx: -1,
  },

  applyExternal(opts = {}) {
    if (opts.keyPc !== undefined) this.state.keyPc = Theory.mod12(opts.keyPc);
    if (opts.selectedProgId) {
      this.state.selectedProgId = opts.selectedProgId;
      this.state.genre = 'Todos';
    }
  },

  getShareParams() {
    return { m: 'progressions', k: this.state.keyPc, p: this.state.selectedProgId };
  },

  applyShareParams(p) {
    if (p.k !== undefined) this.state.keyPc = Theory.mod12(Number(p.k));
    if (p.p) this.state.selectedProgId = p.p;
  },

  render(container, app) {
    const tuning = Theory.getTuning();
    const genres = ['Todos', ...Theory.getGenres()];
    const allProgs = Theory.getProgressions();
    const visibleProgs = this.state.genre === 'Todos'
      ? allProgs
      : allProgs.filter((p) => p.genre === this.state.genre);

    let prog = allProgs.find((p) => p.id === this.state.selectedProgId) || visibleProgs[0] || allProgs[0];
    this.state.selectedProgId = prog.id;

    const useFlats = Theory.useFlatsForRoot(this.state.keyPc);
    const keyName = Theory.pcToNote(this.state.keyPc, useFlats);

    // Voice-leading computation
    const vl = HarmonyAI.computeVoiceLeading(this.state.keyPc, prog.chords, tuning);

    // Musical AI arpeggio & substitution recommendations for this progression
    const aiArps = HarmonyAI.suggestArpeggiosForProgression(this.state.keyPc, prog.chords);
    const firstChord = prog.chords[0];
    const firstRoot = Theory.mod12(this.state.keyPc + firstChord.degree);
    const aiScales = HarmonyAI.suggestScalesForChord(firstRoot, firstChord.type);
    const aiSubs = HarmonyAI.suggestSubstitutions(
      Theory.mod12(this.state.keyPc + (prog.chords[1]?.degree ?? 7)),
      prog.chords[1]?.type || '7',
      this.state.keyPc
    );

    const favId = `prog_${this.state.keyPc}_${prog.id}`;
    const isFav = Storage.isFavorite('progressions', favId);

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Progressões Harmônicas, Circle of Fifths & IA Musical</h2>
          <p class="module-subtitle">Gere cadências por estilo com <strong>shapes otimizados por Voice Leading</strong>, Círculo das Quintas interativo e sugestões de improviso.</p>
        </div>
        <div class="action-bar">
          <button id="prog-play" class="btn btn-primary">${this.state.isPlaying ? '■ Parar' : '▶ Tocar Progressão'}</button>
          <button id="prog-loop" class="btn ${this.state.loopPlay ? 'btn-gold-active' : 'btn-ghost'} btn-sm">🔁 Loop</button>
          <button id="prog-fav" class="btn ${isFav ? 'btn-gold-active' : 'btn-ghost'} btn-sm">${isFav ? '★ Favorita' : '☆ Favoritar'}</button>
          <button id="prog-to-composer" class="btn btn-secondary btn-sm">+ Enviar ao Compositor</button>
          <button id="prog-pdf" class="btn btn-ghost btn-sm">PDF</button>
        </div>
      </div>

      <!-- Top Row: Interactive Circle of Fifths + Progression Picker -->
      <div class="prog-top-grid">
        <section class="card cof-card">
          <div class="card-header-row">
            <h3 class="section-title">Circle of Fifths Interativo</h3>
            <span class="badge badge-gold">Tom: ${keyName}</span>
          </div>
          <p class="muted-text small">Clique em qualquer tonalidade (Maior externa ou Menor interna) para transpor e ouvir.</p>
          <div class="svg-center" id="cof-mount"></div>
          <div class="cof-actions">
            <button id="cof-export-png" class="btn btn-ghost btn-xs">Exportar PNG</button>
          </div>
        </section>

        <section class="card prog-picker-card">
          <div class="selector-group">
            <label class="field-label">Tom da Progressão</label>
            <div class="pill-grid root-pills">
              ${Theory.getAllRoots().map((r) => `
                <button class="pill-btn ${r.pc === this.state.keyPc ? 'active' : ''}" data-prog-key="${r.pc}">${r.short || r.label}</button>
              `).join('')}
            </div>
          </div>

          <div class="selector-group" style="margin-top:14px;">
            <label class="field-label">Gênero Musical</label>
            <div class="pill-wrap">
              ${genres.map((g) => `
                <button class="pill-btn pill-sm ${this.state.genre === g ? 'active' : ''}" data-prog-genre="${g}">${g}</button>
              `).join('')}
            </div>
          </div>

          <div class="prog-list" style="margin-top:14px;">
            ${visibleProgs.map((p) => `
              <button class="prog-item ${p.id === prog.id ? 'active' : ''}" data-prog-id="${p.id}">
                <div class="prog-item-top">
                  <strong>${p.name}</strong>
                  <span class="badge badge-info">${p.genre}</span>
                </div>
                <span class="muted-text small">${p.description}</span>
              </button>
            `).join('')}
          </div>
        </section>
      </div>

      <!-- Active Progression Chords + Voice-Led Shapes -->
      <section class="card">
        <div class="card-header-row">
          <div>
            <h3 class="section-title">${prog.name} em ${keyName}</h3>
            <p class="muted-text small">Shapes escolhidos automaticamente para <strong>mínimo movimento de dedos (Voice Leading)</strong>. Clique em um acorde para ouvir.</p>
          </div>
          <span class="badge badge-muted">BPM sugerido: ${prog.bpm}</span>
        </div>

        <div class="prog-chords-row" id="prog-chords-row">
          ${prog.chords.map((ch, idx) => {
            const cRoot = Theory.mod12(this.state.keyPc + ch.degree);
            const cName = Theory.getChordDisplayName(cRoot, ch.type);
            const shape = vl.shapes[idx];
            return `
              <div class="prog-chord-card ${this.state.activeChordIdx === idx ? 'playing' : ''}" data-pchord-idx="${idx}">
                <div class="pchord-head">
                  <span class="roman-badge">${ch.roman}</span>
                  <strong>${cName}</strong>
                </div>
                ${shape ? renderVerticalChordSVG(shape, { compact: true }) : '<div class="muted-text">Sem voicing</div>'}
                <div class="pchord-foot">
                  <span>${shape ? shape.label : ''}</span>
                  <button class="btn btn-ghost btn-xs open-prog-chord" data-r="${cRoot}" data-ct="${ch.type}">Detalhes</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Voice Leading Analysis -->
      <section class="card">
        <h3 class="section-title">Análise de Voice Leading (Condução de Vozes)</h3>
        <div class="vl-grid">
          ${vl.transitions.map((tr) => `
            <div class="subcard vl-card">
              <div class="vl-head">
                <strong>${tr.fromChord} → ${tr.toChord}</strong>
                <span class="badge ${tr.smoothness >= 75 ? 'badge-success' : 'badge-gold'}">Fluidez ${tr.smoothness}%</span>
              </div>
              <div class="small muted-text" style="margin-bottom:8px;">
                Notas em comum: <strong>${tr.commonNotes.length ? tr.commonNotes.join(', ') : 'Resolução cromática/diatônica'}</strong>
              </div>
              <div class="vl-moves">
                ${tr.movements.map((mv) => `
                  <span class="vl-pill ${mv.delta === 0 ? 'common' : Math.abs(mv.delta) <= 2 ? 'step' : 'leap'}">
                    ${mv.from}→${mv.to} (${mv.delta === 0 ? '0' : mv.delta > 0 ? `+${mv.delta}st` : `${mv.delta}st`})
                  </span>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Musical AI Assistant for Progression -->
      <section class="card ai-panel">
        <div class="card-header-row">
          <h3 class="section-title">✦ IA Musical — Escalas, Arpejos & Substituições para esta Progressão</h3>
          <span class="badge badge-gold">Análise Harmônica Automática</span>
        </div>
        <div class="ai-grid-3">
          <div class="subcard">
            <h4 class="subcard-title">Escalas Principais para Solar</h4>
            <div class="ai-list">
              ${aiScales.slice(0, 4).map((s) => `
                <div class="ai-item">
                  <div class="ai-item-head">
                    <strong>${s.title}</strong>
                    <span class="badge badge-success">${s.match}%</span>
                  </div>
                  <p class="muted-text small">${s.mood}</p>
                  <button class="btn btn-ghost btn-xs prog-ai-scale" data-r="${s.rootPc}" data-sc="${s.scaleId}">Explorar no Braço →</button>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="subcard">
            <h4 class="subcard-title">Arpejos & Superposições por Acorde</h4>
            <div class="ai-list">
              ${aiArps.map((item) => `
                <div class="ai-item">
                  <div class="ai-item-head">
                    <strong>${item.roman} · ${item.chordName}</strong>
                  </div>
                  ${item.recommendations.map((rec) => `
                    <div class="ai-sub-row">
                      <span><code>${rec.label}</code> — <small class="muted-text">${rec.role}</small></span>
                      <button class="btn btn-ghost btn-xs prog-ai-arp" data-r="${rec.rootPc}" data-arp="${rec.arpId}">Ver</button>
                    </div>
                  `).join('')}
                </div>
              `).join('')}
            </div>
          </div>

          <div class="subcard">
            <h4 class="subcard-title">Substituições Harmônicas Sugeridas</h4>
            <div class="ai-list">
              ${aiSubs.map((sub) => `
                <div class="ai-item">
                  <div class="ai-item-head">
                    <strong>${sub.chord}</strong>
                    <span class="badge badge-info">${sub.type}</span>
                  </div>
                  <p class="muted-text small">${sub.explanation}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </section>
    `;

    // Mount interactive Circle of Fifths
    renderCircleOfFifths(container.querySelector('#cof-mount'), {
      selectedRootPc: this.state.keyPc,
      onSelectKey: (pc) => {
        this.state.keyPc = pc;
        this.render(container, app);
      },
    });

    this.bindEvents(container, app, prog, vl, keyName);
  },

  bindEvents(container, app, prog, vl, keyName) {
    container.querySelectorAll('[data-prog-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.keyPc = Number(btn.dataset.progKey);
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-prog-genre]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.genre = btn.dataset.progGenre;
        this.render(container, app);
      });
    });

    container.querySelectorAll('[data-prog-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.selectedProgId = btn.dataset.progId;
        this.render(container, app);
      });
    });

    // Click chord card to audition
    container.querySelectorAll('.prog-chord-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.open-prog-chord')) return;
        const idx = Number(card.dataset.pchordIdx);
        const shape = vl.shapes[idx];
        if (shape) {
          AudioEngine.playChord(shape.stringNotes.filter((n) => !n.muted).map((n) => n.midi), { strumMs: 28, duration: 2.0 });
        }
      });
    });

    container.querySelectorAll('.open-prog-chord').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        app.navigate('chords', { rootPc: Number(btn.dataset.r), chordTypeId: btn.dataset.ct });
      });
    });

    container.querySelector('#prog-loop')?.addEventListener('click', () => {
      this.state.loopPlay = !this.state.loopPlay;
      this.render(container, app);
    });

    container.querySelector('#prog-play')?.addEventListener('click', () => {
      if (this.state.isPlaying) {
        AudioEngine.stopSequence();
        this.state.isPlaying = false;
        this.state.activeChordIdx = -1;
        this.render(container, app);
        return;
      }

      const chordMidisList = vl.shapes.map((sh, idx) => {
        if (sh) return sh.stringNotes.filter((n) => !n.muted).map((n) => n.midi);
        const ch = prog.chords[idx];
        const ct = Theory.getChordType(ch.type);
        return ct.intervals.map((iv) => 48 + Theory.mod12(this.state.keyPc + ch.degree) + iv);
      });

      this.state.isPlaying = true;
      this.render(container, app);

      AudioEngine.playProgression(chordMidisList, {
        bpm: RhythmEngine.bpm || prog.bpm,
        beatsPerChord: 4,
        loop: this.state.loopPlay,
        onChord: (idx) => {
          this.state.activeChordIdx = idx;
          container.querySelectorAll('.prog-chord-card').forEach((el, i) => {
            el.classList.toggle('playing', i === idx);
          });
        },
        onEnd: () => {
          this.state.isPlaying = false;
          this.state.activeChordIdx = -1;
          container.querySelectorAll('.prog-chord-card').forEach((el) => el.classList.remove('playing'));
          const b = container.querySelector('#prog-play');
          if (b) b.textContent = '▶ Tocar Progressão';
        },
      });
    });

    container.querySelector('#prog-fav')?.addEventListener('click', () => {
      const added = Storage.toggleFavorite('progressions', {
        id: `prog_${this.state.keyPc}_${prog.id}`,
        title: `${prog.name} em ${keyName}`,
        subtitle: `${prog.genre} · ${prog.numerals}`,
        keyPc: this.state.keyPc,
        progId: prog.id,
      });
      app.toast(added ? 'Progressão salva nos Favoritos!' : 'Progressão removida dos Favoritos.');
      this.render(container, app);
    });

    container.querySelector('#prog-to-composer')?.addEventListener('click', () => {
      app.navigate('composer', {
        importProg: {
          keyPc: this.state.keyPc,
          chords: prog.chords.map((c) => ({
            rootPc: Theory.mod12(this.state.keyPc + c.degree),
            type: c.type,
            beats: 4,
          })),
          label: `${prog.name} (${keyName})`,
        },
      });
    });

    container.querySelectorAll('.prog-ai-scale').forEach((btn) => {
      btn.addEventListener('click', () => {
        app.navigate('scales', { rootPc: Number(btn.dataset.r), scaleId: btn.dataset.sc });
      });
    });

    container.querySelectorAll('.prog-ai-arp').forEach((btn) => {
      btn.addEventListener('click', () => {
        app.navigate('arpeggios', { rootPc: Number(btn.dataset.r), arpeggioId: btn.dataset.arp });
      });
    });

    container.querySelector('#cof-export-png')?.addEventListener('click', () => {
      const svg = container.querySelector('#cof-svg');
      ExportTools.exportSvgAsPng(svg, `circle-of-fifths-${keyName}.png`, `Circle of Fifths — Tom ${keyName}`);
      app.toast('Círculo das Quintas exportado em PNG!');
    });

    container.querySelector('#prog-pdf')?.addEventListener('click', () => {
      const diagrams = prog.chords.map((ch, idx) => {
        const sh = vl.shapes[idx];
        return `<div style="display:inline-block;margin:8px;text-align:center;"><div><strong>${ch.roman}</strong></div>${sh ? renderVerticalChordSVG(sh, { compact: true }) : ''}</div>`;
      }).join('');
      ExportTools.exportPdfSheet(
        `${prog.name} — Tom de ${keyName}`,
        `Gênero: ${prog.genre} | Graus: ${prog.numerals} | BPM: ${prog.bpm}`,
        `<div class="print-section">${diagrams}</div><div class="print-section"><h3>Descrição</h3><p>${prog.description}</p></div>`
      );
    });
  },
};
