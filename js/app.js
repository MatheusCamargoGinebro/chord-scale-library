/**
 * Main Application Entry Point — Chord & Scale Library
 * Orchestrates modular routing, global tuning/audio/theme state,
 * Studio Rhythm Dock (Metronome + 16-Step Drum Machine), URL sharing & PWA.
 */

import { Theory } from './core/theory.js';
import { ChordEngine } from './core/chordEngine.js';
import { Storage } from './core/storage.js';
import { AudioEngine } from './audio/audioEngine.js';
import { RhythmEngine, DRUM_PRESETS } from './audio/rhythmEngine.js';
import { ExportTools } from './ui/exportTools.js';

import { ModChords } from './modules/modChords.js';
import { ModFretboard } from './modules/modFretboard.js';
import { ModScales } from './modules/modScales.js';
import { ModModes } from './modules/modModes.js';
import { ModArpeggios } from './modules/modArpeggios.js';
import { ModComparator } from './modules/modComparator.js';
import { ModProgressions } from './modules/modProgressions.js';
import { ModTrainer } from './modules/modTrainer.js';
import { ModFavorites } from './modules/modFavorites.js';
import { ModComposer } from './modules/modComposer.js';

const MODULES = {
  chords: ModChords,
  fretboard: ModFretboard,
  scales: ModScales,
  modes: ModModes,
  arpeggios: ModArpeggios,
  comparator: ModComparator,
  progressions: ModProgressions,
  trainer: ModTrainer,
  favorites: ModFavorites,
  composer: ModComposer,
};

const App = {
  currentModuleId: 'chords',
  deferredInstallPrompt: null,
  studioOpen: false,

  async boot() {
    await Theory.init();

    // Restore saved user preferences
    const prefs = Storage.getPrefs();
    this.applyTheme(prefs.theme || 'dark');
    Theory.setTuning(prefs.tuning || 'standard');
    AudioEngine.setTone(prefs.guitarTone || 'acoustic');
    RhythmEngine.setBpm(prefs.bpm || 104);

    // Populate tuning & tone selectors
    this.populateHeaderControls();
    this.bindGlobalControls();
    this.initStudioDock();
    this.initPWA();

    // Check shared URL hash parameters
    const shared = ExportTools.parseShareState();
    if (shared && shared.m && MODULES[shared.m]) {
      if (shared.t) {
        Theory.setTuning(shared.t);
        document.getElementById('global-tuning').value = Theory.currentTuningId;
      }
      this.currentModuleId = shared.m;
      if (MODULES[shared.m].applyShareParams) {
        MODULES[shared.m].applyShareParams(shared);
      }
    }

    this.renderCurrentModule();
    this.updateActiveNav();
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀ Light' : '☾ Dark';
    Storage.savePrefs({ theme });
  },

  populateHeaderControls() {
    const tuningSel = document.getElementById('global-tuning');
    if (tuningSel) {
      tuningSel.innerHTML = Theory.getTunings()
        .map((t) => `<option value="${t.id}" ${t.id === Theory.currentTuningId ? 'selected' : ''}>${t.name} (${t.short})</option>`)
        .join('');
    }
    const toneSel = document.getElementById('global-tone');
    if (toneSel) {
      toneSel.value = AudioEngine.tone;
    }
  },

  bindGlobalControls() {
    // Sidebar & Mobile Navigation
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.navigate(btn.dataset.nav);
        document.getElementById('app-sidebar')?.classList.remove('open');
      });
    });

    document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
      document.getElementById('app-sidebar')?.classList.toggle('open');
    });

    // Global Tuning Change
    document.getElementById('global-tuning')?.addEventListener('change', (e) => {
      const tuning = Theory.setTuning(e.target.value);
      Storage.savePrefs({ tuning: tuning.id });
      ChordEngine.clearCache();
      this.toast(`Afinação alterada para ${tuning.name} (${tuning.short})`);
      this.renderCurrentModule();
    });

    // Guitar Tone Change
    document.getElementById('global-tone')?.addEventListener('change', (e) => {
      AudioEngine.setTone(e.target.value);
      Storage.savePrefs({ guitarTone: e.target.value });
      // Audition quick harmonic chime
      AudioEngine.playNote(52, 0.8);
      AudioEngine.playNote(59, 0.8, 0.08);
      AudioEngine.playNote(64, 1.0, 0.16);
    });

    // Theme Toggle
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      this.applyTheme(cur === 'dark' ? 'light' : 'dark');
    });

    // Mute Toggle
    document.getElementById('btn-mute')?.addEventListener('click', (e) => {
      const muted = AudioEngine.toggleMute();
      e.currentTarget.textContent = muted ? '🔇 Mudo' : '🔊 Som';
      e.currentTarget.classList.toggle('btn-gold-active', muted);
    });

    // Share Link
    document.getElementById('btn-share-link')?.addEventListener('click', async () => {
      const mod = MODULES[this.currentModuleId];
      const params = mod.getShareParams ? mod.getShareParams() : { m: this.currentModuleId };
      params.t = Theory.currentTuningId;
      const res = await ExportTools.shareState(params);
      this.toast(res.ok ? 'Link copiado para a área de transferência!' : 'URL atualizada na barra de endereço!');
    });

    // Studio Rhythm Dock Toggle
    document.getElementById('btn-studio-toggle')?.addEventListener('click', () => {
      this.studioOpen = !this.studioOpen;
      document.getElementById('studio-dock')?.classList.toggle('open', this.studioOpen);
      document.getElementById('btn-studio-toggle')?.classList.toggle('btn-gold-active', this.studioOpen);
    });

    document.getElementById('btn-close-studio')?.addEventListener('click', () => {
      this.studioOpen = false;
      document.getElementById('studio-dock')?.classList.remove('open');
      document.getElementById('btn-studio-toggle')?.classList.remove('btn-gold-active');
    });
  },

  initStudioDock() {
    const metroBtn = document.getElementById('studio-metro-btn');
    const drumBtn = document.getElementById('studio-drum-btn');
    const stopBtn = document.getElementById('studio-stop-btn');
    const bpmRange = document.getElementById('studio-bpm-range');
    const bpmVal = document.getElementById('studio-bpm-val');
    const tapBtn = document.getElementById('studio-tap-btn');
    const presetSel = document.getElementById('studio-drum-preset');
    const gridEl = document.getElementById('drum-sequencer-grid');
    const ledsEl = document.getElementById('beat-leds');

    if (presetSel) {
      presetSel.innerHTML = Object.entries(DRUM_PRESETS)
        .map(([k, v]) => `<option value="${k}">${v.name} (${v.bpm} BPM)</option>`)
        .join('');
    }

    const renderGrid = () => {
      if (!gridEl) return;
      const tracks = [
        ['kick', 'Bumbo'],
        ['snare', 'Caixa'],
        ['hihat', 'Chimbal'],
        ['ride', 'Ride/Prato'],
      ];
      gridEl.innerHTML = tracks.map(([key, label]) => `
        <div class="drum-row">
          <span class="drum-label">${label}</span>
          <div class="drum-steps">
            ${RhythmEngine.pattern[key].map((val, idx) => `
              <button class="drum-step ${val ? 'on' : ''} ${idx % 4 === 0 ? 'beat-start' : ''}" data-track="${key}" data-step="${idx}" aria-label="${label} passo ${idx + 1}"></button>
            `).join('')}
          </div>
        </div>
      `).join('');

      gridEl.querySelectorAll('.drum-step').forEach((btn) => {
        btn.addEventListener('click', () => {
          RhythmEngine.toggleStep(btn.dataset.track, Number(btn.dataset.step));
          renderGrid();
        });
      });
    };

    const syncUi = () => {
      if (bpmRange) bpmRange.value = RhythmEngine.bpm;
      if (bpmVal) bpmVal.textContent = `${RhythmEngine.bpm} BPM`;
      metroBtn?.classList.toggle('btn-gold-active', RhythmEngine.metronomeOn);
      drumBtn?.classList.toggle('btn-accent-active', RhythmEngine.drumsOn);
    };

    renderGrid();
    syncUi();

    metroBtn?.addEventListener('click', () => {
      RhythmEngine.toggleMetronome();
      syncUi();
    });

    drumBtn?.addEventListener('click', () => {
      RhythmEngine.toggleDrums();
      syncUi();
    });

    stopBtn?.addEventListener('click', () => {
      RhythmEngine.stop();
      AudioEngine.stopSequence();
      syncUi();
    });

    bpmRange?.addEventListener('input', (e) => {
      RhythmEngine.setBpm(Number(e.target.value));
      Storage.savePrefs({ bpm: RhythmEngine.bpm });
      syncUi();
    });

    tapBtn?.addEventListener('click', () => {
      RhythmEngine.tapTempo();
      Storage.savePrefs({ bpm: RhythmEngine.bpm });
      syncUi();
    });

    presetSel?.addEventListener('change', (e) => {
      RhythmEngine.loadPreset(e.target.value);
      Storage.savePrefs({ bpm: RhythmEngine.bpm });
      renderGrid();
      syncUi();
    });

    RhythmEngine.subscribe((type, payload) => {
      if (type === 'step') {
        const step = payload;
        if (ledsEl) {
          const activeBeat = step >= 0 ? Math.floor(step / 4) : -1;
          ledsEl.querySelectorAll('.beat-led').forEach((led, idx) => {
            led.classList.toggle('lit', idx === activeBeat);
          });
        }
        if (gridEl) {
          gridEl.querySelectorAll('.drum-step').forEach((el) => {
            el.classList.toggle('current', Number(el.dataset.step) === step);
          });
        }
      }
    });
  },

  initPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    const installBtn = document.getElementById('btn-pwa-install');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      if (installBtn) installBtn.hidden = false;
    });

    installBtn?.addEventListener('click', async () => {
      if (!this.deferredInstallPrompt) return;
      this.deferredInstallPrompt.prompt();
      await this.deferredInstallPrompt.userChoice;
      this.deferredInstallPrompt = null;
      installBtn.hidden = true;
    });

    // Offline indicator
    const updateNet = () => {
      const badge = document.getElementById('offline-badge');
      if (badge) badge.hidden = navigator.onLine;
    };
    window.addEventListener('online', updateNet);
    window.addEventListener('offline', updateNet);
    updateNet();
  },

  navigate(moduleId, externalOpts = null) {
    if (!MODULES[moduleId]) return;
    AudioEngine.stopSequence();
    this.currentModuleId = moduleId;
    if (externalOpts && MODULES[moduleId].applyExternal) {
      MODULES[moduleId].applyExternal(externalOpts);
    }
    this.updateActiveNav();
    this.renderCurrentModule();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  updateActiveNav() {
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.nav === this.currentModuleId);
    });
  },

  renderCurrentModule() {
    const stage = document.getElementById('module-stage');
    const mod = MODULES[this.currentModuleId];
    if (!stage || !mod) return;
    stage.classList.remove('fade-in');
    // Force reflow for subtle transition
    void stage.offsetWidth;
    mod.render(stage, this);
    stage.classList.add('fade-in');
  },

  toast(message) {
    const host = document.getElementById('toast-host');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast-item';
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 260);
    }, 2800);
  },
};

document.addEventListener('DOMContentLoaded', () => {
  App.boot().catch((err) => {
    console.error('Erro ao iniciar Chord & Scale Library:', err);
    const stage = document.getElementById('module-stage');
    if (stage) {
      stage.innerHTML = `
        <div class="card empty-state">
          <h3>Erro ao carregar os dados musicais</h3>
          <p class="muted-text">Para carregar os arquivos JSON modulares, execute a aplicação através de um servidor local (ex: <code>npx serve .</code> ou <code>python -m http.server</code>).</p>
        </div>
      `;
    }
  });
});
