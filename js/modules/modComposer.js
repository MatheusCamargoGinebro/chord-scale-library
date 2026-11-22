/**
 * Module 10: Song Composer (Compositor)
 * Assemble complete songs with Sections (Verso, Pré-Refrão, Refrão, Solo, Ponte),
 * Chords, Progressions, Recommended Scales, Playback, LocalStorage Persistence & PDF Export.
 */

import { Theory } from '../core/theory.js';
import { ChordEngine } from '../core/chordEngine.js';
import { Storage } from '../core/storage.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { renderVerticalChordSVG } from '../ui/chordDiagram.js';
import { ExportTools } from '../ui/exportTools.js';

const SECTION_TYPES = ['Verso', 'Pré-Refrão', 'Refrão', 'Solo', 'Ponte', 'Intro', 'Outro'];

export const ModComposer = {
  id: 'composer',
  state: {
    songs: null,
    activeSongId: null,
    isPlaying: false,
    playingSectionId: null,
    newChordRoot: 0,
    newChordType: 'maj7',
  },

  ensureLoaded() {
    if (!this.state.songs) {
      this.state.songs = Storage.getSongs();
      this.state.activeSongId = this.state.songs[0]?.id || null;
    }
  },

  getActiveSong() {
    this.ensureLoaded();
    let s = this.state.songs.find((x) => x.id === this.state.activeSongId);
    if (!s && this.state.songs.length) {
      s = this.state.songs[0];
      this.state.activeSongId = s.id;
    }
    return s;
  },

  save() {
    Storage.saveSongs(this.state.songs);
  },

  applyExternal(opts = {}) {
    this.ensureLoaded();
    if (opts.importProg) {
      const song = this.getActiveSong();
      if (song) {
        song.sections.push({
          id: `sec_${Date.now()}`,
          type: 'Refrão',
          scaleId: 'major',
          scaleRootPc: opts.importProg.keyPc,
          chords: opts.importProg.chords,
          notes: `Importado de Progressões: ${opts.importProg.label}`,
        });
        this.save();
      }
    }
  },

  render(container, app) {
    this.ensureLoaded();
    const song = this.getActiveSong();
    const tuning = Theory.getTuning();

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Compositor de Músicas</h2>
          <p class="module-subtitle">Estruture sua música em <strong>Verso, Pré-Refrão, Refrão e Solo</strong> com acordes, escalas de improviso, áudio e PDF.</p>
        </div>
        <div class="action-bar">
          <button id="comp-new-song" class="btn btn-secondary btn-sm">+ Nova Música</button>
          <button id="comp-play-song" class="btn btn-primary">${this.state.isPlaying ? '■ Parar Música' : '▶ Tocar Música Completa'}</button>
          <button id="comp-export-pdf" class="btn btn-ghost btn-sm">Exportar PDF</button>
        </div>
      </div>

      <!-- Song Selector & Metadata -->
      <section class="card">
        <div class="composer-top-bar">
          <div class="inline-control">
            <label class="field-label">Minhas Músicas</label>
            <select id="comp-song-select" class="select-control">
              ${this.state.songs.map((s) => `<option value="${s.id}" ${s.id === song.id ? 'selected' : ''}>${s.title}</option>`).join('')}
            </select>
          </div>
          <div class="inline-control" style="flex:1;">
            <label class="field-label">Título da Música</label>
            <input type="text" id="comp-song-title" class="input-control" value="${song.title}">
          </div>
          <div class="inline-control">
            <label class="field-label">Tom</label>
            <select id="comp-song-key" class="select-control">
              ${Theory.getAllRoots().map((r) => `<option value="${r.pc}" ${r.pc === song.keyPc ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select>
          </div>
          <div class="inline-control" style="width:110px;">
            <label class="field-label">BPM</label>
            <input type="number" id="comp-song-bpm" class="input-control" min="40" max="220" value="${song.bpm}">
          </div>
          <div class="inline-control" style="align-self:flex-end;">
            <button id="comp-del-song" class="btn btn-ghost btn-sm text-red" ${this.state.songs.length <= 1 ? 'disabled' : ''}>Excluir</button>
          </div>
        </div>

        <div class="add-section-bar">
          <span class="field-label" style="margin:0;">Adicionar Sessão:</span>
          ${SECTION_TYPES.map((st) => `<button class="pill-btn pill-xs" data-add-sec="${st}">+ ${st}</button>`).join('')}
        </div>
      </section>

      <!-- Sections List -->
      <div class="composer-sections">
        ${song.sections.map((sec, sIdx) => {
          const sc = Theory.getScale(sec.scaleId);
          const scRootName = Theory.pcToNote(sec.scaleRootPc, Theory.useFlatsForRoot(sec.scaleRootPc));
          return `
            <section class="card composer-sec-card ${this.state.playingSectionId === sec.id ? 'playing-section' : ''}" data-sec-id="${sec.id}">
              <div class="sec-header">
                <div class="sec-title-group">
                  <span class="sec-badge sec-${sec.type.toLowerCase().replace(/[^a-z]/g, '')}">${sec.type}</span>
                  <select class="select-control select-xs sec-type-sel" data-sidx="${sIdx}">
                    ${SECTION_TYPES.map((t) => `<option value="${t}" ${t === sec.type ? 'selected' : ''}>${t}</option>`).join('')}
                  </select>
                  <span class="muted-text small">Escala da sessão:</span>
                  <select class="select-control select-xs sec-scale-root" data-sidx="${sIdx}">
                    ${Theory.getAllRoots().map((r) => `<option value="${r.pc}" ${r.pc === sec.scaleRootPc ? 'selected' : ''}>${r.short || r.label}</option>`).join('')}
                  </select>
                  <select class="select-control select-xs sec-scale-id" data-sidx="${sIdx}">
                    ${Theory.getScales().map((s) => `<option value="${s.id}" ${s.id === sec.scaleId ? 'selected' : ''}>${s.name}</option>`).join('')}
                  </select>
                  <button class="btn btn-ghost btn-xs sec-open-scale" data-r="${sec.scaleRootPc}" data-sc="${sec.scaleId}">Ver Escala</button>
                </div>
                <div class="action-bar">
                  <button class="btn btn-primary btn-xs sec-play" data-sidx="${sIdx}">▶ Tocar ${sec.type}</button>
                  <button class="btn btn-ghost btn-xs text-red sec-del" data-sidx="${sIdx}">Remover</button>
                </div>
              </div>

              <!-- Chords Timeline -->
              <div class="sec-chords-strip">
                ${sec.chords.map((ch, cIdx) => {
                  const name = Theory.getChordDisplayName(ch.rootPc, ch.type);
                  return `
                    <div class="sec-chord-chip" data-sidx="${sIdx}" data-cidx="${cIdx}">
                      <strong class="sec-chord-play" data-r="${ch.rootPc}" data-ct="${ch.type}">${name}</strong>
                      <span class="small muted-text">${ch.beats}t</span>
                      <button class="chip-x sec-rm-chord" data-sidx="${sIdx}" data-cidx="${cIdx}" title="Remover acorde">×</button>
                    </div>
                  `;
                }).join('')}
                ${sec.chords.length === 0 ? '<span class="muted-text small">Adicione acordes ou importe uma progressão abaixo.</span>' : ''}
              </div>

              <!-- Quick Add Chord / Progression Bar -->
              <div class="sec-add-controls">
                <select class="select-control select-xs add-ch-root" data-sidx="${sIdx}">
                  ${Theory.getAllRoots().map((r) => `<option value="${r.pc}" ${r.pc === song.keyPc ? 'selected' : ''}>${r.short || r.label}</option>`).join('')}
                </select>
                <select class="select-control select-xs add-ch-type" data-sidx="${sIdx}">
                  ${Theory.getChordTypes().map((ct) => `<option value="${ct.id}">${ct.symbol || 'Maj'} (${ct.name})</option>`).join('')}
                </select>
                <button class="btn btn-secondary btn-xs sec-add-chord-btn" data-sidx="${sIdx}">+ Acorde</button>

                <span class="divider-v"></span>

                <select class="select-control select-xs add-prog-tpl" data-sidx="${sIdx}">
                  <option value="">Importar progressão pronta...</option>
                  ${Theory.getProgressions().map((p) => `<option value="${p.id}">[${p.genre}] ${p.name}</option>`).join('')}
                </select>
                <button class="btn btn-ghost btn-xs sec-add-prog-btn" data-sidx="${sIdx}">+ Inserir</button>
              </div>

              <div class="sec-notes-row">
                <input type="text" class="input-control input-sm sec-notes-input" data-sidx="${sIdx}" placeholder="Notas de arranjo, levada ou dicas de solo (${scRootName} ${sc.name})..." value="${sec.notes || ''}">
              </div>
            </section>
          `;
        }).join('')}
      </div>
    `;

    this.bindEvents(container, app, song, tuning);
  },

  playChordsList(chords, bpm, onEnd) {
    const tuning = Theory.getTuning();
    const midisList = chords.map((ch) => {
      const vs = ChordEngine.getVoicings(ch.rootPc, ch.type, tuning);
      if (vs[0]) return vs[0].stringNotes.filter((n) => !n.muted).map((n) => n.midi);
      return Theory.getChordType(ch.type).intervals.map((iv) => 48 + ch.rootPc + iv);
    });
    AudioEngine.playProgression(midisList, { bpm, beatsPerChord: 4, loop: false, onEnd });
  },

  bindEvents(container, app, song) {
    container.querySelector('#comp-song-select')?.addEventListener('change', (e) => {
      this.state.activeSongId = e.target.value;
      this.render(container, app);
    });

    container.querySelector('#comp-song-title')?.addEventListener('change', (e) => {
      song.title = e.target.value.trim() || 'Nova Música';
      this.save();
      this.render(container, app);
    });

    container.querySelector('#comp-song-key')?.addEventListener('change', (e) => {
      song.keyPc = Number(e.target.value);
      this.save();
      this.render(container, app);
    });

    container.querySelector('#comp-song-bpm')?.addEventListener('change', (e) => {
      song.bpm = Math.max(40, Math.min(220, Number(e.target.value) || 100));
      this.save();
    });

    container.querySelector('#comp-new-song')?.addEventListener('click', () => {
      const newSong = {
        id: `song_${Date.now()}`,
        title: `Composição #${this.state.songs.length + 1}`,
        keyPc: 0,
        bpm: 110,
        updatedAt: Date.now(),
        sections: [
          { id: `sec_${Date.now()}_1`, type: 'Verso', scaleId: 'major', scaleRootPc: 0, chords: [{ rootPc: 0, type: 'maj', beats: 4 }, { rootPc: 7, type: 'maj', beats: 4 }], notes: '' },
          { id: `sec_${Date.now()}_2`, type: 'Refrão', scaleId: 'pentatonic_major', scaleRootPc: 0, chords: [{ rootPc: 5, type: 'maj', beats: 4 }, { rootPc: 7, type: 'maj', beats: 4 }], notes: '' },
        ],
      };
      this.state.songs.unshift(newSong);
      this.state.activeSongId = newSong.id;
      this.save();
      app.toast('Nova música criada!');
      this.render(container, app);
    });

    container.querySelector('#comp-del-song')?.addEventListener('click', () => {
      if (this.state.songs.length <= 1) return;
      this.state.songs = this.state.songs.filter((s) => s.id !== song.id);
      this.state.activeSongId = this.state.songs[0].id;
      this.save();
      app.toast('Música removida.');
      this.render(container, app);
    });

    container.querySelectorAll('[data-add-sec]').forEach((btn) => {
      btn.addEventListener('click', () => {
        song.sections.push({
          id: `sec_${Date.now()}`,
          type: btn.dataset.addSec,
          scaleId: 'major',
          scaleRootPc: song.keyPc,
          chords: [],
          notes: '',
        });
        this.save();
        this.render(container, app);
      });
    });

    container.querySelectorAll('.sec-type-sel').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        song.sections[Number(sel.dataset.sidx)].type = e.target.value;
        this.save();
        this.render(container, app);
      });
    });

    container.querySelectorAll('.sec-scale-root').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        song.sections[Number(sel.dataset.sidx)].scaleRootPc = Number(e.target.value);
        this.save();
      });
    });

    container.querySelectorAll('.sec-scale-id').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        song.sections[Number(sel.dataset.sidx)].scaleId = e.target.value;
        this.save();
      });
    });

    container.querySelectorAll('.sec-open-scale').forEach((btn) => {
      btn.addEventListener('click', () => {
        app.navigate('scales', { rootPc: Number(btn.dataset.r), scaleId: btn.dataset.sc });
      });
    });

    container.querySelectorAll('.sec-del').forEach((btn) => {
      btn.addEventListener('click', () => {
        song.sections.splice(Number(btn.dataset.sidx), 1);
        this.save();
        this.render(container, app);
      });
    });

    container.querySelectorAll('.sec-add-chord-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sIdx = Number(btn.dataset.sidx);
        const card = btn.closest('.composer-sec-card');
        const r = Number(card.querySelector('.add-ch-root').value);
        const t = card.querySelector('.add-ch-type').value;
        song.sections[sIdx].chords.push({ rootPc: r, type: t, beats: 4 });
        this.save();
        this.render(container, app);
      });
    });

    container.querySelectorAll('.sec-add-prog-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sIdx = Number(btn.dataset.sidx);
        const card = btn.closest('.composer-sec-card');
        const pid = card.querySelector('.add-prog-tpl').value;
        if (!pid) return;
        const prog = Theory.getProgressions().find((p) => p.id === pid);
        if (!prog) return;
        prog.chords.forEach((c) => {
          song.sections[sIdx].chords.push({
            rootPc: Theory.mod12(song.keyPc + c.degree),
            type: c.type,
            beats: 4,
          });
        });
        this.save();
        this.render(container, app);
      });
    });

    container.querySelectorAll('.sec-rm-chord').forEach((btn) => {
      btn.addEventListener('click', () => {
        song.sections[Number(btn.dataset.sidx)].chords.splice(Number(btn.dataset.cidx), 1);
        this.save();
        this.render(container, app);
      });
    });

    container.querySelectorAll('.sec-chord-play').forEach((el) => {
      el.addEventListener('click', () => {
        const vs = ChordEngine.getVoicings(Number(el.dataset.r), el.dataset.ct);
        if (vs[0]) AudioEngine.playChord(vs[0].stringNotes.filter((n) => !n.muted).map((n) => n.midi));
      });
    });

    container.querySelectorAll('.sec-notes-input').forEach((inp) => {
      inp.addEventListener('change', (e) => {
        song.sections[Number(inp.dataset.sidx)].notes = e.target.value;
        this.save();
      });
    });

    container.querySelectorAll('.sec-play').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sec = song.sections[Number(btn.dataset.sidx)];
        if (!sec.chords.length) return app.toast('Adicione acordes nesta sessão primeiro.');
        this.state.isPlaying = true;
        this.state.playingSectionId = sec.id;
        this.render(container, app);
        this.playChordsList(sec.chords, song.bpm, () => {
          this.state.isPlaying = false;
          this.state.playingSectionId = null;
          this.render(container, app);
        });
      });
    });

    container.querySelector('#comp-play-song')?.addEventListener('click', () => {
      if (this.state.isPlaying) {
        AudioEngine.stopSequence();
        this.state.isPlaying = false;
        this.state.playingSectionId = null;
        this.render(container, app);
        return;
      }
      const allChords = song.sections.flatMap((s) => s.chords);
      if (!allChords.length) return app.toast('Adicione acordes à música primeiro.');
      this.state.isPlaying = true;
      this.render(container, app);
      this.playChordsList(allChords, song.bpm, () => {
        this.state.isPlaying = false;
        this.render(container, app);
      });
    });

    container.querySelector('#comp-export-pdf')?.addEventListener('click', () => {
      const keyName = Theory.pcToNote(song.keyPc, Theory.useFlatsForRoot(song.keyPc));
      const uniqueChords = new Map();
      const body = song.sections.map((sec) => {
        const sc = Theory.getScale(sec.scaleId);
        const scRoot = Theory.pcToNote(sec.scaleRootPc, Theory.useFlatsForRoot(sec.scaleRootPc));
        const chordStr = sec.chords.map((c) => {
          const nm = Theory.getChordDisplayName(c.rootPc, c.type);
          uniqueChords.set(`${c.rootPc}_${c.type}`, c);
          return `<span style="display:inline-block;padding:4px 10px;border:1px solid #cbd5e1;border-radius:6px;margin:3px;font-weight:700;">${nm}</span>`;
        }).join(' → ');
        return `
          <div class="print-section">
            <h3>[${sec.type}] — Escala: ${scRoot} ${sc.name}</h3>
            <div>${chordStr || '<em>Sem acordes</em>'}</div>
            ${sec.notes ? `<p style="color:#475569;font-size:13px;">${sec.notes}</p>` : ''}
          </div>
        `;
      }).join('');

      const chordDiagrams = [...uniqueChords.values()].map((c) => {
        const v = ChordEngine.getVoicings(c.rootPc, c.type)[0];
        return v ? `<div style="display:inline-block;margin:6px;">${renderVerticalChordSVG(v, { compact: true })}</div>` : '';
      }).join('');

      ExportTools.exportPdfSheet(
        song.title,
        `Tom: ${keyName} | BPM: ${song.bpm} | Afinação: ${Theory.getTuning().name}`,
        `${body}<div class="print-section"><h3>Diagramas dos Acordes Utilizados</h3>${chordDiagrams}</div>`
      );
    });
  },
};
