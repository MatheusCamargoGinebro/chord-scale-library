/**
 * Interactive 24-Fret SVG Guitar Fretboard Renderer
 * Supports 6 & 7 strings, zoom/movable window, notes/intervals/degrees/roots/selected modes,
 * CAGED overlays, Arpeggio link curves, Comparator highlighting, Heatmap glow, and audio click-to-play.
 */

import { Theory } from '../core/theory.js';
import { AudioEngine } from '../audio/audioEngine.js';
import { Storage } from '../core/storage.js';

export function renderFretboard(container, options = {}) {
  const {
    tuning = Theory.getTuning(),
    startFret = 0,
    endFret = 24,
    displayMode = 'notes', // 'notes' | 'intervals' | 'degrees' | 'roots' | 'selected'
    positions = [], // array of { stringIdx, fret, note, short, degree, color, isRoot, badge, customColor, ring }
    selectedNotes = [], // array of { stringIdx, fret }
    cagedBoxes = null, // array of { letter, startFret, endFret, color }
    linkPaths = null, // array of { from: {stringIdx, fret}, to: {stringIdx, fret} }
    heatmap = null, // { "s:f": count }
    interactive = true,
    onFretClick = null,
    activeMidi = null,
    id = 'fretboard-svg',
  } = options;

  const numStrings = tuning.strings;
  const visibleFrets = Math.max(4, endFret - startFret);
  const showNut = startFret === 0;

  // Responsive SVG geometry
  const padLeft = showNut ? 52 : 44;
  const padRight = 24;
  const padTop = cagedBoxes ? 38 : 26;
  const padBottom = 34;
  const stringGap = numStrings === 7 ? 32 : 36;
  const boardHeight = (numStrings - 1) * stringGap;

  // Fret widths taper subtly toward higher frets when viewing full neck
  const baseWidth = visibleFrets <= 8 ? 82 : visibleFrets <= 15 ? 58 : 44;
  const fretXs = [padLeft];
  let curX = padLeft;
  for (let f = startFret + 1; f <= endFret; f++) {
    const taper = visibleFrets > 12 ? Math.max(0.74, 1 - (f - startFret) * 0.011) : 1;
    curX += baseWidth * taper;
    fretXs.push(curX);
  }
  const totalWidth = Math.round(curX + padRight);
  const totalHeight = Math.round(padTop + boardHeight + padBottom);

  // Helper: map stringIdx (0=low, N-1=high) to Y (top=high, bottom=low)
  const stringY = (sIdx) => padTop + (numStrings - 1 - sIdx) * stringGap;
  const fretCenterX = (f) => {
    if (f === 0 && showNut) return padLeft - 18;
    const idx = f - startFret;
    if (idx <= 0 || idx >= fretXs.length) return -999;
    return (fretXs[idx - 1] + fretXs[idx]) / 2;
  };

  // Lookup maps
  const posMap = new Map();
  positions.forEach((p) => {
    posMap.set(`${p.stringIdx}:${p.fret}`, p);
  });
  const selSet = new Set(selectedNotes.map((s) => `${s.stringIdx}:${s.fret}`));

  // Heatmap normalization
  let maxHeat = 1;
  if (heatmap) {
    Object.values(heatmap).forEach((v) => {
      if (v > maxHeat) maxHeat = v;
    });
  }

  const markers = Theory.data.fretMarkers;
  const doubleMarkers = Theory.data.doubleFretMarkers;

  let svg = `<svg id="${id}" class="fretboard-svg" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Braço interativo da guitarra">`;
  svg += `<defs>
    <linearGradient id="woodGrad_${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a1d17"/>
      <stop offset="50%" stop-color="#1e1410"/>
      <stop offset="100%" stop-color="#160f0c"/>
    </linearGradient>
    <linearGradient id="fretWire_${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="50%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
  </defs>`;

  // Wood board background
  svg += `<rect x="${padLeft}" y="${padTop - 10}" width="${curX - padLeft}" height="${boardHeight + 20}" rx="6" fill="url(#woodGrad_${id})" stroke="#3f2d24" stroke-width="1.5"/>`;

  // CAGED region shading overlays
  if (cagedBoxes && cagedBoxes.length) {
    cagedBoxes.forEach((box) => {
      const fStart = Math.max(startFret, box.startFret);
      const fEnd = Math.min(endFret, box.endFret);
      if (fEnd < startFret || fStart > endFret) return;
      const x1 = fStart === 0 && showNut ? padLeft : fretXs[Math.max(0, fStart - startFret - 1)] || padLeft;
      const x2 = fretXs[Math.min(fretXs.length - 1, fEnd - startFret)] || curX;
      svg += `<rect x="${x1}" y="${padTop - 10}" width="${Math.max(12, x2 - x1)}" height="${boardHeight + 20}" fill="${box.color}" fill-opacity="0.11" stroke="${box.color}" stroke-opacity="0.45" stroke-width="1.5" rx="4"/>`;
      svg += `<text x="${(x1 + x2) / 2}" y="${padTop - 16}" fill="${box.color}" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter, sans-serif">${box.name}</text>`;
    });
  }

  // Heatmap overlay cells
  if (heatmap) {
    for (let s = 0; s < numStrings; s++) {
      const y = stringY(s);
      for (let f = startFret; f <= endFret; f++) {
        const val = heatmap[`${s}:${f}`] || 0;
        if (val <= 0) continue;
        const ratio = Math.min(1, val / maxHeat);
        if (ratio < 0.15) continue;
        const cx = fretCenterX(f);
        if (cx < 0) continue;
        const color = ratio > 0.7 ? '#ef4444' : ratio > 0.45 ? '#f59e0b' : '#38bdf8';
        svg += `<ellipse cx="${cx}" cy="${y}" rx="16" ry="${stringGap * 0.42}" fill="${color}" fill-opacity="${(ratio * 0.42).toFixed(2)}"/>`;
      }
    }
  }

  // Nut or left edge
  if (showNut) {
    svg += `<rect x="${padLeft - 5}" y="${padTop - 10}" width="7" height="${boardHeight + 20}" rx="2" fill="#f1f5f9" stroke="#94a3b8" stroke-width="0.8"/>`;
  }

  // Fret wires & inlays & fret numbers
  for (let i = 1; i < fretXs.length; i++) {
    const f = startFret + i;
    const x = fretXs[i];
    svg += `<line x1="${x}" y1="${padTop - 10}" x2="${x}" y2="${padTop + boardHeight + 10}" stroke="url(#fretWire_${id})" stroke-width="2.4"/>`;

    const cx = (fretXs[i - 1] + x) / 2;
    // Pearloid fret inlays
    if (markers.includes(f)) {
      if (doubleMarkers.includes(f)) {
        svg += `<circle cx="${cx}" cy="${padTop + boardHeight * 0.28}" r="5.5" fill="#cbd5e1" fill-opacity="0.35"/>`;
        svg += `<circle cx="${cx}" cy="${padTop + boardHeight * 0.72}" r="5.5" fill="#cbd5e1" fill-opacity="0.35"/>`;
      } else {
        svg += `<circle cx="${cx}" cy="${padTop + boardHeight / 2}" r="6" fill="#cbd5e1" fill-opacity="0.35"/>`;
      }
    }

    // Fret number label at bottom
    const isHighlightFret = markers.includes(f);
    svg += `<text x="${cx}" y="${padTop + boardHeight + 26}" fill="${isHighlightFret ? '#f59e0b' : '#94a3b8'}" font-size="11" font-weight="${isHighlightFret ? '700' : '500'}" text-anchor="middle" font-family="JetBrains Mono, monospace">${f}</text>`;
  }

  // Nut "0" label
  if (showNut) {
    svg += `<text x="${padLeft - 18}" y="${padTop + boardHeight + 26}" fill="#94a3b8" font-size="11" text-anchor="middle" font-family="JetBrains Mono, monospace">0</text>`;
  }

  // Strings (graduated thickness from thin high E to thick wound low E/B)
  for (let s = 0; s < numStrings; s++) {
    const y = stringY(s);
    const thickness = 1.1 + ((numStrings - 1 - s) / (numStrings - 1)) * 2.3;
    const isWound = s < numStrings - 2;
    svg += `<line x1="${padLeft - (showNut ? 4 : 0)}" y1="${y}" x2="${curX}" y2="${y}" stroke="${isWound ? '#cbd5e1' : '#e2e8f0'}" stroke-opacity="0.72" stroke-width="${thickness.toFixed(2)}"/>`;

    // String open tuning label on far left
    svg += `<text x="${showNut ? 12 : 16}" y="${y + 4}" fill="#94a3b8" font-size="11.5" font-weight="700" text-anchor="middle" font-family="JetBrains Mono, monospace">${tuning.notes[s]}</text>`;
  }

  // Arpeggio / Shape Linking connectors
  if (linkPaths && linkPaths.length) {
    linkPaths.forEach((lk) => {
      const x1 = fretCenterX(lk.from.fret);
      const y1 = stringY(lk.from.stringIdx);
      const x2 = fretCenterX(lk.to.fret);
      const y2 = stringY(lk.to.stringIdx);
      if (x1 > 0 && x2 > 0) {
        const midX = (x1 + x2) / 2;
        const ctrlY = Math.min(y1, y2) - 14;
        svg += `<path d="M ${x1} ${y1} Q ${midX} ${ctrlY} ${x2} ${y2}" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-dasharray="4 3" stroke-opacity="0.88"/>`;
      }
    });
  }

  // Interactive click targets + Note markers
  for (let s = 0; s < numStrings; s++) {
    const y = stringY(s);
    for (let f = startFret; f <= endFret; f++) {
      if (f === 0 && !showNut) continue;
      const cx = fretCenterX(f);
      if (cx < 0) continue;

      const key = `${s}:${f}`;
      const pos = posMap.get(key);
      const isSelected = selSet.has(key);
      const midi = Theory.getFretMidi(s, f, tuning);
      const pc = Theory.mod12(midi);
      const isPlaying = activeMidi !== null && activeMidi === midi;

      // Decide if dot should be rendered
      let showDot = false;
      let fill = '#3b82f6';
      let label = Theory.pcToNote(pc, Theory.preferFlats);
      let isRoot = false;
      let strokeColor = '#0f172a';
      let ring = false;

      if (displayMode === 'selected') {
        if (isSelected) {
          showDot = true;
          fill = '#f59e0b';
          label = Theory.pcToNote(pc, Theory.preferFlats);
        }
      } else if (pos) {
        if (displayMode === 'roots' && !pos.isRoot) {
          showDot = false;
        } else {
          showDot = true;
          isRoot = Boolean(pos.isRoot);
          fill = pos.customColor || (isRoot ? '#f59e0b' : pos.color || '#38bdf8');
          ring = Boolean(pos.ring);
          if (displayMode === 'notes') label = pos.note;
          else if (displayMode === 'intervals') label = pos.short;
          else if (displayMode === 'degrees') label = pos.degree || pos.short;
          else if (displayMode === 'roots') label = pos.note;
        }
      } else if (isSelected) {
        showDot = true;
        fill = '#f59e0b';
      }

      if (interactive) {
        svg += `<g class="fb-cell" data-s="${s}" data-f="${f}" data-midi="${midi}" data-pc="${pc}" style="cursor:pointer;">`;
        // Invisible generous hit target
        svg += `<rect x="${cx - 16}" y="${y - stringGap / 2 + 2}" width="32" height="${stringGap - 4}" fill="transparent"/>`;
      }

      if (showDot) {
        const radius = isRoot || isSelected ? 12.5 : 11;
        if (isPlaying) {
          svg += `<circle cx="${cx}" cy="${y}" r="${radius + 5}" fill="none" stroke="#fbbf24" stroke-width="2.5" opacity="0.9"/>`;
        }
        if (isRoot || ring) {
          svg += `<circle cx="${cx}" cy="${y}" r="${radius + 2.5}" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="0.85"/>`;
        }
        svg += `<circle cx="${cx}" cy="${y}" r="${radius}" fill="${fill}" stroke="${strokeColor}" stroke-width="1.5"/>`;
        svg += `<text x="${cx}" y="${y + 3.8}" fill="${isRoot || fill === '#f59e0b' || fill === '#eab308' ? '#090d16' : '#ffffff'}" font-size="${label.length > 2 ? '8.5' : '10'}" font-weight="800" text-anchor="middle" font-family="Inter, sans-serif" pointer-events="none">${label}</text>`;
      } else if (interactive) {
        // Hover preview ghost dot
        svg += `<circle class="fb-hover-dot" cx="${cx}" cy="${y}" r="9" fill="#f59e0b" fill-opacity="0"/>`;
      }

      if (interactive) {
        svg += `</g>`;
      }
    }
  }

  svg += `</svg>`;
  container.innerHTML = svg;

  if (interactive) {
    container.querySelectorAll('.fb-cell').forEach((el) => {
      el.addEventListener('click', () => {
        const sIdx = Number(el.dataset.s);
        const fret = Number(el.dataset.f);
        const midi = Number(el.dataset.midi);
        const pc = Number(el.dataset.pc);
        AudioEngine.playNote(midi, 1.3, 0, 0.8);
        Storage.recordFretHeat(sIdx, fret, 2);

        // Quick visual pulse
        const circle = el.querySelector('circle:last-of-type');
        if (circle) {
          circle.style.transformOrigin = 'center';
          circle.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 240 });
        }

        if (onFretClick) {
          onFretClick({
            stringIdx: sIdx,
            fret,
            midi,
            pc,
            note: Theory.pcToNote(pc, Theory.preferFlats),
          });
        }
      });
    });
  }

  return container.querySelector('svg');
}
