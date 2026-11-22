/**
 * Module 9: Favorites Hub (Favoritos)
 * Manages saved Chords, Scales, Progressions, and Shapes stored in localStorage.
 */

import { Theory } from '../core/theory.js';
import { ChordEngine } from '../core/chordEngine.js';
import { Storage } from '../core/storage.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { renderVerticalChordSVG } from '../ui/chordDiagram.js';

export const ModFavorites = {
  id: 'favorites',
  state: {
    tab: 'all', // 'all' | 'chords' | 'scales' | 'progressions' | 'shapes'
  },

  render(container, app) {
    const favs = Storage.getFavorites();
    const counts = {
      chords: favs.chords.length,
      scales: favs.scales.length,
      progressions: favs.progressions.length,
      shapes: favs.shapes.length,
    };
    const total = counts.chords + counts.scales + counts.progressions + counts.shapes;

    const showCat = (cat) => this.state.tab === 'all' || this.state.tab === cat;

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h2 class="module-title">Meus Favoritos</h2>
          <p class="module-subtitle">Seus acordes, escalas, progressões e shapes salvos localmente para acesso instantâneo offline.</p>
        </div>
        <div class="pill-wrap">
          <button class="pill-btn pill-sm ${this.state.tab === 'all' ? 'active' : ''}" data-ftab="all">Todos (${total})</button>
          <button class="pill-btn pill-sm ${this.state.tab === 'chords' ? 'active' : ''}" data-ftab="chords">Acordes (${counts.chords})</button>
          <button class="pill-btn pill-sm ${this.state.tab === 'scales' ? 'active' : ''}" data-ftab="scales">Escalas (${counts.scales})</button>
          <button class="pill-btn pill-sm ${this.state.tab === 'progressions' ? 'active' : ''}" data-ftab="progressions">Progressões (${counts.progressions})</button>
          <button class="pill-btn pill-sm ${this.state.tab === 'shapes' ? 'active' : ''}" data-ftab="shapes">Shapes (${counts.shapes})</button>
        </div>
      </div>

      ${total === 0 ? `
        <section class="card empty-state">
          <h3>Sua coleção de favoritos está vazia</h3>
          <p class="muted-text">Clique em <strong>☆ Favoritar</strong> em qualquer acorde, escala, progressão ou shape para montar seu caderno de estudos.</p>
          <div class="action-bar" style="justify-content:center;margin-top:14px;">
            <button class="btn btn-primary fav-goto" data-mod="chords">Explorar Acordes</button>
            <button class="btn btn-secondary fav-goto" data-mod="scales">Explorar Escalas</button>
          </div>
        </section>
      ` : ''}

      ${showCat('chords') && favs.chords.length ? `
        <section class="card">
          <h3 class="section-title">Acordes Favoritos (${favs.chords.length})</h3>
          <div class="fav-grid">
            ${favs.chords.map((c) => `
              <div class="subcard fav-card">
                <div class="fav-card-head">
                  <strong>${c.title}</strong>
                  <span class="badge badge-gold">Acorde</span>
                </div>
                <p class="muted-text small">${c.subtitle}</p>
                <div class="fav-actions">
                  <button class="btn btn-ghost btn-xs fav-play-chord" data-r="${c.rootPc}" data-ct="${c.chordTypeId}">▶ Ouvir</button>
                  <button class="btn btn-secondary btn-xs fav-open-chord" data-r="${c.rootPc}" data-ct="${c.chordTypeId}">Abrir</button>
                  <button class="btn btn-ghost btn-xs text-red fav-rm" data-cat="chords" data-id="${c.id}">✕</button>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      ${showCat('shapes') && favs.shapes.length ? `
        <section class="card">
          <h3 class="section-title">Shapes Salvos (${favs.shapes.length})</h3>
          <div class="shapes-gallery">
            ${favs.shapes.map((sh) => {
              const analyzed = ChordEngine.analyzeVoicing(sh.frets, sh.rootPc, Theory.getChordType(sh.chordTypeId), Theory.getTuning());
              return `
                <div class="shape-thumb fav-shape-card">
                  <div class="thumb-head">
                    <span class="thumb-num">${sh.title}</span>
                    <button class="btn btn-ghost btn-xs text-red fav-rm" data-cat="shapes" data-id="${sh.id}">✕</button>
                  </div>
                  ${analyzed ? renderVerticalChordSVG(analyzed, { compact: true }) : `<p class="small">${sh.subtitle}</p>`}
                  <div class="fav-actions" style="justify-content:center;margin-top:6px;">
                    <button class="btn btn-ghost btn-xs fav-play-shape" data-frets="${sh.frets.join(',')}">▶ Ouvir</button>
                    <button class="btn btn-secondary btn-xs fav-open-chord" data-r="${sh.rootPc}" data-ct="${sh.chordTypeId}">Abrir</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      ${showCat('scales') && favs.scales.length ? `
        <section class="card">
          <h3 class="section-title">Escalas Favoritas (${favs.scales.length})</h3>
          <div class="fav-grid">
            ${favs.scales.map((s) => `
              <div class="subcard fav-card">
                <div class="fav-card-head">
                  <strong>${s.title}</strong>
                  <span class="badge badge-info">Escala</span>
                </div>
                <p class="muted-text small"><code>${s.subtitle}</code></p>
                <div class="fav-actions">
                  <button class="btn btn-ghost btn-xs fav-play-scale" data-r="${s.rootPc}" data-sc="${s.scaleId}">▶ Ouvir</button>
                  <button class="btn btn-secondary btn-xs fav-open-scale" data-r="${s.rootPc}" data-sc="${s.scaleId}">Abrir</button>
                  <button class="btn btn-ghost btn-xs text-red fav-rm" data-cat="scales" data-id="${s.id}">✕</button>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      ${showCat('progressions') && favs.progressions.length ? `
        <section class="card">
          <h3 class="section-title">Progressões Favoritas (${favs.progressions.length})</h3>
          <div class="fav-grid">
            ${favs.progressions.map((p) => `
              <div class="subcard fav-card">
                <div class="fav-card-head">
                  <strong>${p.title}</strong>
                  <span class="badge badge-accent">Progressão</span>
                </div>
                <p class="muted-text small">${p.subtitle}</p>
                <div class="fav-actions">
                  <button class="btn btn-secondary btn-xs fav-open-prog" data-k="${p.keyPc}" data-pid="${p.progId}">Abrir</button>
                  <button class="btn btn-ghost btn-xs text-red fav-rm" data-cat="progressions" data-id="${p.id}">✕</button>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}
    `;

    this.bindEvents(container, app);
  },

  bindEvents(container, app) {
    container.querySelectorAll('[data-ftab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.tab = btn.dataset.ftab;
        this.render(container, app);
      });
    });

    container.querySelectorAll('.fav-goto').forEach((btn) => {
      btn.addEventListener('click', () => app.navigate(btn.dataset.mod));
    });

    container.querySelectorAll('.fav-rm').forEach((btn) => {
      btn.addEventListener('click', () => {
        Storage.removeFavorite(btn.dataset.cat, btn.dataset.id);
        app.toast('Item removido dos favoritos.');
        this.render(container, app);
      });
    });

    container.querySelectorAll('.fav-play-chord').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vs = ChordEngine.getVoicings(Number(btn.dataset.r), btn.dataset.ct);
        if (vs[0]) AudioEngine.playChord(vs[0].stringNotes.filter((n) => !n.muted).map((n) => n.midi));
      });
    });

    container.querySelectorAll('.fav-play-shape').forEach((btn) => {
      btn.addEventListener('click', () => {
        const frets = btn.dataset.frets.split(',').map(Number);
        const tuning = Theory.getTuning();
        const midis = frets.map((f, s) => (f >= 0 ? Theory.getFretMidi(s, f, tuning) : null)).filter((m) => m !== null);
        AudioEngine.playChord(midis);
      });
    });

    container.querySelectorAll('.fav-play-scale').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sc = Theory.getScale(btn.dataset.sc);
        const r = Number(btn.dataset.r);
        AudioEngine.playSequence([...sc.intervals.map((iv) => 48 + r + iv), 60 + r], { bpm: 120, subdivision: 2 });
      });
    });

    container.querySelectorAll('.fav-open-chord').forEach((btn) => {
      btn.addEventListener('click', () => app.navigate('chords', { rootPc: Number(btn.dataset.r), chordTypeId: btn.dataset.ct }));
    });

    container.querySelectorAll('.fav-open-scale').forEach((btn) => {
      btn.addEventListener('click', () => app.navigate('scales', { rootPc: Number(btn.dataset.r), scaleId: btn.dataset.sc }));
    });

    container.querySelectorAll('.fav-open-prog').forEach((btn) => {
      btn.addEventListener('click', () => app.navigate('progressions', { keyPc: Number(btn.dataset.k), selectedProgId: btn.dataset.pid }));
    });
  },
};
