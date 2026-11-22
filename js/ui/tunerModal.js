/**
 * Chromatic & Guided Guitar Tuner Modal
 * - Live microphone pitch detection (Hz + note + cents + mic input level bar)
 * - Automatic string identification OR manual string lock
 * - Tuning selector inside the tuner (Standard, Drop D, Drop C, DADGAD, Open G, Open D, 7 Cordas)
 * - Explicit Portuguese instruction: "APERTAR a corda", "AFROUXAR a corda" or "CORDA AFINADA"
 * - Clickable reference sound button per string
 */

import { Theory } from '../core/theory.js';
import { ChordEngine } from '../core/chordEngine.js';
import { Storage } from '../core/storage.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { icon } from './icons.js';

export const TunerModal = {
  isOpen: false,
  stream: null,
  analyser: null,
  source: null,
  rafId: null,
  listening: false,
  manualStringIdx: null, // null = Auto-detect string, 0..N-1 = locked string
  onTuningChangeCb: null,

  open(onTuningChange = null) {
    this.onTuningChangeCb = onTuningChange;
    this.isOpen = true;
    this.manualStringIdx = null;
    this.render();
  },

  close() {
    this.stopMic();
    this.isOpen = false;
    document.getElementById('tuner-modal-overlay')?.remove();
  },

  stopMic() {
    this.listening = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.source) {
      try { this.source.disconnect(); } catch {}
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  },

  /**
   * Autocorrelation fundamental pitch detector (55 Hz – 1100 Hz) with parabolic interpolation.
   */
  detectPitch(buf, sampleRate) {
    const size = buf.length;
    let rms = 0;
    for (let i = 0; i < size; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / size);
    if (rms < 0.008) return { freq: -1, rms };

    const minLag = Math.floor(sampleRate / 1100);
    const maxLag = Math.min(Math.floor(size / 2) - 1, Math.floor(sampleRate / 55));
    const corrs = new Float32Array(maxLag + 1);

    let maxCorr = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      let norm1 = 0;
      let norm2 = 0;
      for (let i = 0; i < size - lag; i += 2) {
        corr += buf[i] * buf[i + lag];
        norm1 += buf[i] * buf[i];
        norm2 += buf[i + lag] * buf[i + lag];
      }
      const val = corr / (Math.sqrt(norm1 * norm2) || 1);
      corrs[lag] = val;
      if (val > maxCorr) maxCorr = val;
    }

    if (maxCorr < 0.74) return { freq: -1, rms };

    const threshold = Math.max(0.74, maxCorr * 0.92);
    let inPeak = false;
    let peakLag = -1;
    let peakVal = -1;

    for (let lag = minLag; lag <= maxLag; lag++) {
      const v = corrs[lag];
      if (v >= threshold) {
        inPeak = true;
        if (v > peakVal) {
          peakVal = v;
          peakLag = lag;
        }
      } else if (inPeak) {
        break;
      }
    }

    let freq = -1;
    if (peakLag > minLag && peakLag < maxLag) {
      const y0 = corrs[peakLag - 1];
      const y1 = corrs[peakLag];
      const y2 = corrs[peakLag + 1];
      const denom = (2 * y1 - y0 - y2);
      const shift = denom !== 0 ? (y2 - y0) / (2 * denom) : 0;
      freq = sampleRate / (peakLag + shift);
    } else if (peakLag > 0) {
      freq = sampleRate / peakLag;
    }
    return { freq, rms };
  },

  /**
   * Matches a detected frequency to the target string (manual lock or closest string in active tuning).
   */
  matchTargetString(freq, tuning) {
    const midiFloat = 69 + 12 * Math.log2(freq / 440);
    let targetIdx = this.manualStringIdx;

    if (targetIdx === null || targetIdx < 0 || targetIdx >= tuning.strings) {
      let bestDist = Infinity;
      tuning.midi.forEach((m, idx) => {
        const d = Math.abs(midiFloat - m);
        if (d < bestDist) {
          bestDist = d;
          targetIdx = idx;
        }
      });
    }

    const targetMidi = tuning.midi[targetIdx];
    const targetFreq = Theory.midiToFreq(targetMidi);
    const cents = Math.round(1200 * Math.log2(freq / targetFreq));
    const stringNumber = tuning.strings - targetIdx;
    const targetNote = Theory.midiToNote(targetMidi, false);
    const heardNote = Theory.midiToNote(Math.round(midiFloat), false);

    let action = 'in-tune';
    let instruction = 'Corda Afinada!';
    if (cents < -4) {
      action = 'tighten';
      instruction = cents < -25 ? 'Apertar bastante a corda (muito baixa)' : 'Apertar levemente a corda (subir tom)';
    } else if (cents > 4) {
      action = 'loosen';
      instruction = cents > 25 ? 'Afrouxar bastante a corda (muito alta)' : 'Afrouxar levemente a corda (baixar tom)';
    }

    return {
      targetIdx,
      stringNumber,
      targetNote,
      targetFreq,
      heardNote,
      freq,
      cents,
      action,
      instruction,
    };
  },

  async startMic(overlay) {
    const statusEl = overlay.querySelector('#tuner-status');
    const micBtn = overlay.querySelector('#tuner-mic-btn');

    if (this.listening) {
      this.stopMic();
      if (micBtn) micBtn.innerHTML = `${icon('mic', 15)}<span>Ativar Microfone</span>`;
      if (statusEl) statusEl.textContent = 'Microfone pausado. Clique em Ativar Microfone ou selecione uma corda para ouvir a referência.';
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (statusEl) statusEl.textContent = 'Seu navegador bloqueou acesso ao microfone (requer HTTPS ou localhost). Use os tons de referência abaixo.';
      return;
    }

    try {
      const ctx = AudioEngine.ensureContext();
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      this.source = ctx.createMediaStreamSource(this.stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 4096;
      this.source.connect(this.analyser);
      this.listening = true;

      if (micBtn) micBtn.innerHTML = `${icon('stop', 14)}<span>Parar Microfone</span>`;
      if (statusEl) statusEl.textContent = 'Microfone ativo — toque uma corda solta próxima ao microfone.';

      const buf = new Float32Array(this.analyser.fftSize);
      const targetPillEl = overlay.querySelector('#tuner-target-pill');
      const noteEl = overlay.querySelector('#tuner-note');
      const freqEl = overlay.querySelector('#tuner-freq-val');
      const targetFreqEl = overlay.querySelector('#tuner-target-freq');
      const actionEl = overlay.querySelector('#tuner-action-badge');
      const needleEl = overlay.querySelector('#tuner-needle');
      const levelEl = overlay.querySelector('#tuner-level-bar');

      const tick = () => {
        if (!this.listening) return;
        this.analyser.getFloatTimeDomainData(buf);
        const { freq, rms } = this.detectPitch(buf, ctx.sampleRate);

        if (levelEl) {
          levelEl.style.width = `${Math.min(100, Math.round(rms * 600))}%`;
        }

        if (freq > 0) {
          const tuning = Theory.getTuning();
          const res = this.matchTargetString(freq, tuning);

          if (targetPillEl) {
            const modeTag = this.manualStringIdx !== null ? 'Manual' : 'Detectada';
            targetPillEl.textContent = `${modeTag}: ${res.stringNumber}ª Corda (${res.targetNote})`;
          }
          if (noteEl) {
            noteEl.textContent = res.heardNote;
            noteEl.className = `tuner-big-note ${res.action === 'in-tune' ? 'in-tune' : ''}`;
          }
          if (freqEl) freqEl.textContent = `Tocada: ${res.freq.toFixed(1)} Hz`;
          if (targetFreqEl) targetFreqEl.textContent = `Alvo: ${res.targetFreq.toFixed(1)} Hz (${res.cents > 0 ? '+' : ''}${res.cents}c)`;

          if (actionEl) {
            const arrow = res.action === 'tighten' ? icon('arrowUp', 14) : res.action === 'loosen' ? icon('arrowDown', 14) : icon('check', 14);
            actionEl.innerHTML = `${arrow}<span>${res.instruction}</span>`;
            actionEl.className = `tuner-action-badge ${res.action}`;
          }

          if (needleEl) {
            const clamped = Math.max(-50, Math.min(50, res.cents));
            needleEl.style.left = `${50 + clamped}%`;
            needleEl.className = `tuner-needle ${res.action === 'in-tune' ? 'in-tune' : ''}`;
          }

          // Highlight detected string card
          overlay.querySelectorAll('.tuner-str-card').forEach((card) => {
            const idx = Number(card.dataset.sidx);
            card.classList.toggle('detected', idx === res.targetIdx && res.action === 'in-tune');
          });
        }
        this.rafId = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = `Não foi possível acessar o microfone (${err.name || 'permissão negada'}). Você ainda pode ouvir o tom de referência de cada corda abaixo.`;
      }
    }
  },

  render() {
    const wasListening = this.listening;
    if (wasListening) this.stopMic();

    document.getElementById('tuner-modal-overlay')?.remove();
    const tuning = Theory.getTuning();
    const lockedStr = this.manualStringIdx !== null && this.manualStringIdx < tuning.strings
      ? {
          idx: this.manualStringIdx,
          num: tuning.strings - this.manualStringIdx,
          note: Theory.midiToNote(tuning.midi[this.manualStringIdx], false),
          hz: Theory.midiToFreq(tuning.midi[this.manualStringIdx]),
        }
      : null;

    const overlay = document.createElement('div');
    overlay.id = 'tuner-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card tuner-modal" role="dialog" aria-modal="true" aria-label="Afinador Cromático">
        <div class="card-header-row" style="margin-bottom:10px;">
          <h3 class="section-title icon-label">${icon('mic', 17, 'text-gold')} Afinador do Instrumento</h3>
          <button type="button" id="tuner-close" class="btn btn-ghost btn-icon-sm" aria-label="Fechar">${icon('close', 16)}</button>
        </div>

        <!-- Tuning Selector + Auto/Manual Indicator -->
        <div class="tuner-top-controls">
          <div class="pb-field">
            <label class="pb-label" for="tuner-tuning-sel">Afinação</label>
            <select id="tuner-tuning-sel" class="select-control select-sm">
              ${Theory.getTunings().map((t) => `<option value="${t.id}" ${t.id === tuning.id ? 'selected' : ''}>${t.name} (${t.short})</option>`).join('')}
            </select>
          </div>
          <div class="segmented-tabs compact">
            <button type="button" id="tuner-mode-auto" class="seg-tab ${lockedStr === null ? 'active' : ''}">Detectar Corda (Auto)</button>
            <button type="button" id="tuner-mode-manual" class="seg-tab ${lockedStr !== null ? 'active' : ''}">Corda Manual</button>
          </div>
        </div>

        <!-- Live Pitch Readout & Tighten/Loosen Guidance -->
        <div class="tuner-display">
          <div id="tuner-target-pill" class="tuner-target-pill">
            ${lockedStr ? `Manual: ${lockedStr.num}ª Corda (${lockedStr.note})` : 'Modo Automático — toque qualquer corda'}
          </div>
          <div id="tuner-note" class="tuner-big-note">${lockedStr ? lockedStr.note : '--'}</div>
          <div class="tuner-freq-row">
            <span id="tuner-freq-val">Tocada: -- Hz</span>
            <span id="tuner-target-freq">${lockedStr ? `Alvo: ${lockedStr.hz.toFixed(1)} Hz` : 'Ref: A4 = 440.0 Hz'}</span>
          </div>
          <div class="tuner-meter">
            <div class="tuner-meter-center"></div>
            <div id="tuner-needle" class="tuner-needle" style="left:50%"></div>
          </div>
          <div class="tuner-scale-labels">
            <span>-50c · Baixo (Apertar)</span><span>Afinado (0)</span><span>+50c · Alto (Afrouxar)</span>
          </div>
          <div id="tuner-action-badge" class="tuner-action-badge">
            ${icon('mic', 14)}<span>Ative o microfone para afinar</span>
          </div>
          <div class="tuner-level-wrap" title="Nível do microfone">
            <div id="tuner-level-bar" class="tuner-level-bar"></div>
          </div>
        </div>

        <div style="text-align:center;margin:14px 0;">
          <button type="button" id="tuner-mic-btn" class="btn btn-primary btn-play-toggle" style="min-width:170px;">${icon('mic', 15)}<span>Ativar Microfone</span></button>
          <p id="tuner-status" class="muted-text small" style="margin-top:8px;">Clique em uma corda abaixo para selecioná-la manualmente ou ouvir o som de referência.</p>
        </div>

        <!-- Strings Selector + Reference Audio -->
        <div class="subcard">
          <div class="card-header-row" style="margin-bottom:8px;">
            <span class="field-label" style="margin:0;">Cordas de ${tuning.name}</span>
            <span class="small muted-text">Clique na corda para travar · ícone de som para ouvir</span>
          </div>
          <div class="tuner-strings-row">
            ${tuning.midi.map((m, idx) => {
              const strNum = tuning.strings - idx;
              const isLocked = this.manualStringIdx === idx;
              return `
                <div class="tuner-str-card ${isLocked ? 'active' : ''}" data-sidx="${idx}" data-tmidi="${m}">
                  <span class="small muted-text">${strNum}ª corda</span>
                  <strong style="font-size:17px;">${Theory.midiToNote(m, false)}</strong>
                  <span class="mono-text" style="font-size:10.5px;color:var(--text-muted);">${Theory.midiToFreq(m).toFixed(1)} Hz</span>
                  <button type="button" class="btn btn-ghost btn-icon-xs tuner-ref-play" data-tmidi="${m}" title="Ouvir referência da ${strNum}ª corda">${icon('volumeOn', 12)}</button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#tuner-close').addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });
    overlay.querySelector('#tuner-mic-btn').addEventListener('click', () => this.startMic(overlay));

    overlay.querySelector('#tuner-tuning-sel').addEventListener('change', (e) => {
      const next = Theory.setTuning(e.target.value);
      Storage.savePrefs({ tuning: next.id });
      ChordEngine.clearCache();
      const globalSel = document.getElementById('global-tuning');
      if (globalSel) globalSel.value = next.id;
      this.manualStringIdx = null;
      if (this.onTuningChangeCb) this.onTuningChangeCb(next);
      this.render();
    });

    overlay.querySelector('#tuner-mode-auto').addEventListener('click', () => {
      this.manualStringIdx = null;
      this.render();
    });

    overlay.querySelector('#tuner-mode-manual').addEventListener('click', () => {
      if (this.manualStringIdx === null) this.manualStringIdx = 0;
      this.render();
    });

    overlay.querySelectorAll('.tuner-str-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.tuner-ref-play')) return;
        const idx = Number(card.dataset.sidx);
        this.manualStringIdx = this.manualStringIdx === idx ? null : idx;
        AudioEngine.playNote(Number(card.dataset.tmidi), 1.8, 0, 0.85);
        this.render();
      });
    });

    overlay.querySelectorAll('.tuner-ref-play').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioEngine.playNote(Number(btn.dataset.tmidi), 2.8, 0, 0.9);
      });
    });

    if (wasListening) {
      this.startMic(overlay);
    }
  },
};
