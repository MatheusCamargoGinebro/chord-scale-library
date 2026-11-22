/**
 * Reusable Inline Playback Controls (BPM + Cadence Selector + Visual Strumming Arrow Indicator)
 */

import { AudioEngine, CHORD_CADENCES, MELODIC_CADENCES, getPresetSteps } from '../audio/audioEngine.js';
import { RhythmEngine } from '../audio/rhythmEngine.js';
import { Storage } from '../core/storage.js';
import { icon } from './icons.js';
import { renderStrumStripHTML } from './strummingEditor.js';

export function renderPlaybackControlsHTML({
  mode = 'chord',
  bpm = RhythmEngine.bpm,
  cadence = mode === 'chord' ? AudioEngine.chordCadence : AudioEngine.melodicCadence,
  idPrefix = 'pb',
  showStrumStrip = mode === 'chord',
  customSteps = null,
  activeStep = -1,
  momentaryOnly = false,
} = {}) {
  const options = mode === 'chord' ? CHORD_CADENCES : MELODIC_CADENCES;
  const steps = customSteps || (mode === 'chord' ? getPresetSteps(cadence) : null);

  return `
    <div class="inline-playback-wrap" data-pb-mode="${mode}">
      <div class="inline-playback-bar">
        <div class="pb-field">
          <label class="pb-label" for="${idPrefix}-bpm">${icon('metronome', 13)} BPM</label>
          <div class="pb-bpm-group">
            <input type="range" id="${idPrefix}-bpm-range" class="pb-range" min="40" max="220" value="${bpm}" aria-label="Andamento em BPM">
            <input type="number" id="${idPrefix}-bpm" class="pb-num mono-text" min="40" max="220" value="${bpm}" aria-label="Valor de BPM">
          </div>
        </div>
        <div class="pb-field">
          <label class="pb-label" for="${idPrefix}-cadence">${icon('sliders', 13)} Cadência</label>
          <select id="${idPrefix}-cadence" class="select-control select-xs">
            ${options.map((c) => `<option value="${c.id}" ${c.id === cadence ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
        </div>
      </div>
      ${showStrumStrip && steps ? `
        <div class="pb-strum-row">
          <span class="pb-label" style="min-width:68px;">Levada</span>
          ${renderStrumStripHTML(steps, { activeStep, stripId: `${idPrefix}-strum-strip` })}
        </div>
      ` : ''}
    </div>
  `;
}

export function highlightStrumStep(container, idPrefix, stepIdx) {
  const strip = container.querySelector(`#${idPrefix}-strum-strip`);
  if (!strip) return;
  strip.querySelectorAll('.strum-cell').forEach((el) => {
    el.classList.toggle('is-now', Number(el.dataset.sstep) === stepIdx);
  });
}

export function bindPlaybackControls(container, {
  mode = 'chord',
  idPrefix = 'pb',
  momentaryOnly = false,
  onBpmChange = null,
  onCadenceChange = null,
} = {}) {
  const rangeEl = container.querySelector(`#${idPrefix}-bpm-range`);
  const numEl = container.querySelector(`#${idPrefix}-bpm`);
  const cadEl = container.querySelector(`#${idPrefix}-cadence`);

  const updateBpm = (val) => {
    const clean = Math.max(40, Math.min(220, Math.round(Number(val) || 100)));
    if (rangeEl) rangeEl.value = clean;
    if (numEl) numEl.value = clean;
    if (!momentaryOnly) {
      RhythmEngine.setBpm(clean);
      Storage.savePrefs({ bpm: clean });
      const dockRange = document.getElementById('studio-bpm-range');
      const dockVal = document.getElementById('studio-bpm-val');
      if (dockRange) dockRange.value = clean;
      if (dockVal) dockVal.textContent = `${clean} BPM`;
    }
    if (onBpmChange) onBpmChange(clean);
  };

  rangeEl?.addEventListener('input', (e) => updateBpm(e.target.value));
  numEl?.addEventListener('change', (e) => updateBpm(e.target.value));

  cadEl?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (mode === 'chord') {
      if (!momentaryOnly) AudioEngine.setChordCadence(val);
      const strip = container.querySelector(`#${idPrefix}-strum-strip`);
      if (strip) {
        const wrapper = strip.parentElement;
        if (wrapper) {
          wrapper.innerHTML = `<span class="pb-label" style="min-width:68px;">Levada</span>${renderStrumStripHTML(getPresetSteps(val), { stripId: `${idPrefix}-strum-strip` })}`;
        }
      }
    } else {
      if (!momentaryOnly) AudioEngine.setMelodicCadence(val);
    }
    if (onCadenceChange) onCadenceChange(val);
  });
}
