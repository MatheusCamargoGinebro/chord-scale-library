/**
 * Main Application Entry Point — Chord & Scale Library
 * Orchestrates modular routing, Left-Handed mode, Global Search (Ctrl+K),
 * Chromatic Tuner, Mobile Bottom Bar, Studio Rhythm Dock, URL sharing & PWA.
 */

import { Theory } from './core/theory.js';
import { ChordEngine } from './core/chordEngine.js';
import { Storage } from './core/storage.js';
import { AudioEngine, TONE_PRESETS } from './audio/audioEngine.js';
import { RhythmEngine, DRUM_PRESETS, METRONOME_RHYTHMS } from './audio/rhythmEngine.js';
import { ExportTools } from './ui/exportTools.js';
import { icon } from './ui/icons.js';
import { GlobalSearch } from './ui/globalSearch.js';
import { TunerModal } from './ui/tunerModal.js';

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
import { ModJam } from './modules/modJam.js';

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
  jam: ModJam,
};

const App = {
  currentModuleId: 'chords',
  deferredInstallPrompt: null,
  studioOpen: false,

  async boot() {
    this.hydrateShellIcons();
    await Theory.init();

    const prefs = Storage.getPrefs();
    this.applyTheme(prefs.theme || 'dark');
    Theory.setTuning(prefs.tuning || 'standard');
    Theory.leftHanded = Boolean(prefs.leftHanded);
    AudioEngine.setTone(prefs.guitarTone || 'acoustic');
    RhythmEngine.setBpm(prefs.bpm || 104);
    if (prefs.metroRhythm) RhythmEngine.setMetronomeRhythm(prefs.metroRhythm);

    this.populateHeaderControls();
    this.syncLeftHandedBtn();
    this.bindGlobalControls();
    this.initStudioDock();
    this.initPWA();
    GlobalSearch.init(this);

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

  hydrateShellIcons() {
    document.querySelectorAll('#sidebar-nav-list .nav-item').forEach((btn) => {
      const ico = btn.querySelector('.nav-ico');
      if (ico && btn.dataset.icon) ico.innerHTML = icon(btn.dataset.icon, 17);
    });

    document.querySelectorAll('#mobile-bottom-nav .mbn-item').forEach((btn) => {
      const ico = btn.querySelector('.mbn-ico');
      if (ico && btn.dataset.icon) ico.innerHTML = icon(btn.dataset.icon, 18);
    });

    const setHtml = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };

    setHtml('btn-mobile-menu', icon('menu', 18));
    setHtml('btn-global-search', `${icon('search', 14)}<span>Buscar</span><kbd class="kbd-chip">Ctrl+K</kbd>`);
    setHtml('btn-tuner-open', `${icon('mic', 14)}<span>Afinador</span>`);
    setHtml('btn-studio-toggle', `${icon('drum', 15)}<span>Ritmo</span>`);
    setHtml('btn-lefthanded', icon('flipH', 16));
    setHtml('btn-mute', icon('volumeOn', 16));
    setHtml('btn-share-link', icon('share', 16));
    setHtml('btn-theme-toggle', icon('sun', 16));
    setHtml('btn-pwa-install', `${icon('download', 15)}<span>Instalar</span>`);
    setHtml('studio-dock-title', `${icon('drum', 16)}<span>Estúdio de Ritmo</span>`);
    setHtml('studio-metro-btn', `${icon('metronome', 15)}<span>Metrônomo</span>`);
    setHtml('studio-drum-btn', `${icon('drum', 15)}<span>Bateria</span>`);
    setHtml('studio-stop-btn', `${icon('stop', 14)}<span>Parar</span>`);
    setHtml('btn-close-studio', icon('close', 15));
  },

  syncLeftHandedBtn() {
    const btn = document.getElementById('btn-lefthanded');
    if (btn) {
      btn.classList.toggle('btn-gold-active', Theory.leftHanded);
      btn.title = Theory.leftHanded ? 'Modo Canhoto ATIVO (clique para voltar ao Destro)' : 'Ativar Modo Canhoto (espelhar braço e diagramas)';
    }
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) {
      btn.innerHTML = theme === 'dark' ? icon('sun', 16) : icon('moon', 16);
      btn.title = theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro';
    }
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
      const groups = [...new Set(TONE_PRESETS.map((t) => t.group))];
      toneSel.innerHTML = groups.map((grp) => `
        <optgroup label="${grp}">
          ${TONE_PRESETS.filter((t) => t.group === grp).map((t) => `
            <option value="${t.id}" ${t.id === AudioEngine.tone ? 'selected' : ''}>${t.name}</option>
          `).join('')}
        </optgroup>
      `).join('');
    }
  },

  toggleMobileMenu(force = null) {
    const sb = document.getElementById('app-sidebar');
    const bd = document.getElementById('sidebar-backdrop');
    const open = force !== null ? force : !sb?.classList.contains('open');
    sb?.classList.toggle('open', open);
    bd?.classList.toggle('open', open);
  },

  bindGlobalControls() {
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.navigate(btn.dataset.nav);
        this.toggleMobileMenu(false);
      });
    });

    document.getElementById('btn-mobile-menu')?.addEventListener('click', () => this.toggleMobileMenu());
    document.getElementById('mbn-more-btn')?.addEventListener('click', () => this.toggleMobileMenu());
    document.getElementById('sidebar-backdrop')?.addEventListener('click', () => this.toggleMobileMenu(false));

    document.getElementById('btn-global-search')?.addEventListener('click', () => GlobalSearch.open());
    document.getElementById('btn-tuner-open')?.addEventListener('click', () => TunerModal.open(() => this.renderCurrentModule()));

    document.getElementById('btn-lefthanded')?.addEventListener('click', () => {
      Theory.leftHanded = !Theory.leftHanded;
      Storage.savePrefs({ leftHanded: Theory.leftHanded });
      this.syncLeftHandedBtn();
      this.toast(Theory.leftHanded ? 'Modo Canhoto ativado (braço e diagramas espelhados).' : 'Modo Destro restaurado.');
      this.renderCurrentModule();
    });

    document.getElementById('global-tuning')?.addEventListener('change', (e) => {
      const tuning = Theory.setTuning(e.target.value);
      Storage.savePrefs({ tuning: tuning.id });
      ChordEngine.clearCache();
      this.toast(`Afinação alterada para ${tuning.name} (${tuning.short})`);
      this.renderCurrentModule();
    });

    document.getElementById('global-tone')?.addEventListener('change', (e) => {
      AudioEngine.setTone(e.target.value);
      Storage.savePrefs({ guitarTone: e.target.value });
      // Audition a warm Em9-style harmonic strum so the user immediately hears the new timbre!
      AudioEngine.playChord([40, 47, 52, 55, 59, 66], { strumMs: 42, duration: 1.9 });
    });

    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      this.applyTheme(cur === 'dark' ? 'light' : 'dark');
    });

    document.getElementById('btn-mute')?.addEventListener('click', (e) => {
      const muted = AudioEngine.toggleMute();
      e.currentTarget.innerHTML = muted ? icon('volumeOff', 16) : icon('volumeOn', 16);
      e.currentTarget.classList.toggle('btn-gold-active', muted);
    });

    document.getElementById('btn-share-link')?.addEventListener('click', async () => {
      const mod = MODULES[this.currentModuleId];
      const params = mod.getShareParams ? mod.getShareParams() : { m: this.currentModuleId };
      params.t = Theory.currentTuningId;
      const res = await ExportTools.shareState(params);
      this.toast(res.ok ? 'Link copiado para a área de transferência!' : 'URL atualizada na barra de endereço!');
    });

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
    const metroRhythmSel = document.getElementById('studio-metro-rhythm');
    const drumBtn = document.getElementById('studio-drum-btn');
    const stopBtn = document.getElementById('studio-stop-btn');
    const bpmRange = document.getElementById('studio-bpm-range');
    const bpmVal = document.getElementById('studio-bpm-val');
    const tapBtn = document.getElementById('studio-tap-btn');
    const presetSel = document.getElementById('studio-drum-preset');
    const gridEl = document.getElementById('drum-sequencer-grid');
    const ledsEl = document.getElementById('beat-leds');

    if (metroRhythmSel) {
      metroRhythmSel.innerHTML = METRONOME_RHYTHMS
        .map((r) => `<option value="${r.id}" ${r.id === RhythmEngine.metroRhythmId ? 'selected' : ''}>${r.name}</option>`)
        .join('');
    }

    if (presetSel) {
      presetSel.innerHTML = Object.entries(DRUM_PRESETS)
        .map(([k, v]) => `<option value="${k}">${v.name} (${v.bpm} BPM)</option>`)
        .join('');
    }

    const renderBeatLeds = () => {
      if (!ledsEl) return;
      const r = RhythmEngine.getMetronomeRhythm();
      ledsEl.innerHTML = Array.from({ length: r.beats }, (_, idx) => {
        const isAccent = r.accents.includes(idx);
        return `<span class="beat-led ${isAccent ? 'accent' : ''}" title="Tempo ${idx + 1}"></span>`;
      }).join('');
    };

    const renderGrid = () => {
      if (!gridEl) return;
      const tracks = [['kick', 'Bumbo'], ['snare', 'Caixa'], ['hihat', 'Chimbal'], ['ride', 'Ride/Prato']];
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
      if (metroRhythmSel) metroRhythmSel.value = RhythmEngine.metroRhythmId;
      metroBtn?.classList.toggle('btn-gold-active', RhythmEngine.metronomeOn);
      drumBtn?.classList.toggle('btn-accent-active', RhythmEngine.drumsOn);
    };

    renderBeatLeds();
    renderGrid();
    syncUi();

    metroBtn?.addEventListener('click', () => { RhythmEngine.toggleMetronome(); syncUi(); });
    metroRhythmSel?.addEventListener('change', (e) => {
      RhythmEngine.setMetronomeRhythm(e.target.value);
      Storage.savePrefs({ metroRhythm: e.target.value });
      renderBeatLeds();
      syncUi();
    });
    drumBtn?.addEventListener('click', () => { RhythmEngine.toggleDrums(); syncUi(); });
    stopBtn?.addEventListener('click', () => { RhythmEngine.stop(); AudioEngine.stopSequence(); ModJam.stopJam(); syncUi(); });

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
      if (type === 'metroBeat' && ledsEl) {
        ledsEl.querySelectorAll('.beat-led').forEach((led, idx) => led.classList.toggle('lit', idx === payload));
      }
      if (type === 'step') {
        const step = payload;
        if (!RhythmEngine.metronomeOn && ledsEl) {
          const activeBeat = step >= 0 ? Math.floor(step / 4) : -1;
          ledsEl.querySelectorAll('.beat-led').forEach((led, idx) => led.classList.toggle('lit', idx === activeBeat));
        }
        if (gridEl) {
          gridEl.querySelectorAll('.drum-step').forEach((el) => el.classList.toggle('current', Number(el.dataset.step) === step));
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
    // Reset any playing flag / scheduled jam timers on previous module cleanly
    const prevMod = MODULES[this.currentModuleId];
    if (prevMod && typeof prevMod.stopJam === 'function') {
      prevMod.stopJam();
    }
    if (prevMod && prevMod.state && 'isPlaying' in prevMod.state) {
      prevMod.state.isPlaying = false;
    }
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
          <p class="muted-text">Para carregar os arquivos JSON modulares, execute a aplicação através de um servidor local.</p>
        </div>
      `;
    }
  });
});
