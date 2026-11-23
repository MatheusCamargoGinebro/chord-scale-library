/**
 * Visual Strumming Pattern Indicator & Momentary Per-Chord Cadence Customizer
 * - Shows 8 eighth-note beats (1 e 2 e 3 e 4 e) with SVG stroke arrows (Down, Up, PM, Arp, Mute, Rest)
 * - Live active-step pulse synced with AudioEngine playback
 * - Allows per-chord stroke customization, momentary BPM override, and "Replicar para todos"
 * - Changes are strictly momentary (in-memory only, never persisted to localStorage).
 */

import { CHORD_CADENCES, STEP_STROKES } from '../audio/audioEngine.js';
import { icon } from './icons.js';

const BEAT_LABELS = ['1', 'e', '2', 'e', '3', 'e', '4', 'e'];

export function strokeDisplayHTML(code) {
  if (code === 'D') return `<span class="stroke-glyph stroke-d" title="Para Baixo">${icon('arrowDown', 13)}</span>`;
  if (code === 'U') return `<span class="stroke-glyph stroke-u" title="Para Cima">${icon('arrowUp', 13)}</span>`;
  if (code === 'PM') return `<span class="stroke-glyph stroke-pm" title="Palm Mute">PM</span>`;
  if (code === 'ARP') return `<span class="stroke-glyph stroke-arp" title="Dedilhado">Arp</span>`;
  if (code === 'X') return `<span class="stroke-glyph stroke-x" title="Abafado">${icon('close', 12)}</span>`;
  return `<span class="stroke-glyph stroke-rest" title="Pausa">·</span>`;
}

export function cycleStroke(currentCode) {
  const idx = STEP_STROKES.findIndex((s) => s.code === currentCode);
  return STEP_STROKES[(idx + 1) % STEP_STROKES.length].code;
}

/**
 * Returns the preset label matching a step pattern, or "Customizada" if user-edited.
 */
export function getCadenceLabel(steps) {
  const sig = (steps || []).join(',');
  const match = CHORD_CADENCES.find((c) => c.steps.join(',') === sig);
  return match ? match.label : 'Cadência Custom';
}

/**
 * Inline compact icon-only cadence preview (shown next to section chord summary when uniform).
 */
export function renderInlineCadenceIconsHTML(steps) {
  return `
    <span class="inline-cadence-icons" title="Cadência do trecho: ${getCadenceLabel(steps)}">
      ${steps.map((code, i) => `
        <span class="ici-step ${code === '-' ? 'is-rest' : ''}" data-ic-step="${i}">${strokeDisplayHTML(code)}</span>
      `).join('')}
    </span>
  `;
}

/**
 * Stage Mode per-chord cadence box shown right below each chord diagram,
 * displaying the cadence name and live-highlighted 8-step rhythm indicator.
 */
export function renderStageCadenceBoxHTML(steps, { activeStep = -1, cardKey = '' } = {}) {
  const label = getCadenceLabel(steps);
  return `
    <div class="stage-cadence-box" data-stage-cad-key="${cardKey}">
      <div class="stage-cad-label">${label}</div>
      <div class="mini-strum-strip">
        ${steps.map((code, i) => `
          <div class="mini-strum-cell ${code === '-' ? 'is-rest' : ''} ${activeStep === i ? 'is-now' : ''}" data-ms-step="${i}">
            <span class="mini-beat">${BEAT_LABELS[i]}</span>
            ${strokeDisplayHTML(code)}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Compact read-only visual strumming strip (for inline playback bars & chord cards).
 */
export function renderStrumStripHTML(steps, { activeStep = -1, stripId = '' } = {}) {
  return `
    <div class="strum-strip" ${stripId ? `id="${stripId}"` : ''} aria-label="Padrão visual da levada">
      ${steps.map((code, i) => `
        <div class="strum-cell ${code === '-' ? 'is-rest' : ''} ${activeStep === i ? 'is-now' : ''}" data-sstep="${i}">
          <span class="strum-beat">${BEAT_LABELS[i]}</span>
          ${strokeDisplayHTML(code)}
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Full Interactive Momentary Cadence Editor for a specific chord (in Progressions or Composer).
 */
export function renderChordCadenceEditorHTML({
  chordLabel,
  steps,
  bpm,
  activeStep = -1,
  canReplicate = true,
  replicateLabel = 'Replicar para todos',
  editorId = 'cadence-editor',
}) {
  return `
    <div class="cadence-editor-panel subcard" id="${editorId}">
      <div class="cadence-editor-head">
        <div>
          <strong class="icon-label">${icon('sliders', 14)} Editar Cadência de <span class="text-gold">${chordLabel}</span></strong>
          <span class="badge badge-muted" style="margin-left:6px;">Alteração momentânea (não salva)</span>
        </div>
        <div class="action-bar">
          ${canReplicate ? `<button type="button" class="btn btn-secondary btn-xs ce-replicate">${icon('copy', 12)} ${replicateLabel}</button>` : ''}
          <button type="button" class="btn btn-ghost btn-xs ce-close">${icon('close', 12)} Fechar</button>
        </div>
      </div>

      <div class="cadence-editor-row">
        <div class="pb-field">
          <label class="pb-label">${icon('metronome', 13)} BPM da Cadência</label>
          <div class="pb-bpm-group">
            <input type="range" class="pb-range ce-bpm-range" min="40" max="220" value="${bpm}">
            <input type="number" class="pb-num mono-text ce-bpm-num" min="40" max="220" value="${bpm}">
          </div>
        </div>

        <div class="pb-field">
          <label class="pb-label">Base Rápida</label>
          <select class="select-control select-xs ce-preset-sel">
            <option value="">Aplicar preset neste acorde...</option>
            ${CHORD_CADENCES.map((c) => `<option value="${c.id}">${c.label}</option>`).join('')}
          </select>
        </div>

        <button type="button" class="btn btn-primary btn-xs ce-preview">${icon('play', 12)} Testar Acorde</button>
      </div>

      <p class="small muted-text" style="margin:8px 0 6px;">Clique em cada tempo abaixo para alternar a batida (Baixo, Cima, Palm Mute, Dedilhado, Abafado, Pausa):</p>

      <div class="strum-editor-grid">
        ${steps.map((code, i) => `
          <button type="button" class="strum-edit-btn ${code === '-' ? 'is-rest' : ''} stroke-type-${code.toLowerCase()} ${activeStep === i ? 'is-now' : ''}" data-ce-step="${i}" title="Clique para alternar batida no tempo ${BEAT_LABELS[i]}">
            <span class="strum-beat">${BEAT_LABELS[i]}</span>
            ${strokeDisplayHTML(code)}
            <span class="strum-code-lbl">${STEP_STROKES.find((s) => s.code === code)?.label || 'Pausa'}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}
