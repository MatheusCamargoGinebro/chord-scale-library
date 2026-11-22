/**
 * Interactive 24-Fret SVG Guitar Fretboard Renderer
 * Enhanced fret-by-fret separation: prominent 3D metallic fret wires,
 * subtle alternating fret compartment shading, dedicated open-string nut column,
 * top/bottom fret numbering, pearloid inlays, CAGED boxes, arpeggio links & heatmap.
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
    positions = [],
    selectedNotes = [],
    cagedBoxes = null,
    linkPaths = null,
    heatmap = null,
    interactive = true,
    onFretClick = null,
    activeMidi = null,
    leftHanded = Theory.leftHanded,
    id = 'fretboard-svg',
  } = options;

  const numStrings = tuning.strings;
  const visibleFrets = Math.max(4, endFret - startFret);
  const showNut = startFret === 0;

  // Geometry with generous room for top & bottom fret numbers and nut column
  const padLeft = leftHanded ? 28 : (showNut ? 64 : 46);
  const padRight = leftHanded ? (showNut ? 64 : 46) : 24;
  const padTop = cagedBoxes ? 48 : 34;
  const padBottom = 38;
  const stringGap = numStrings === 7 ? 33 : 37;
  const boardHeight = (numStrings - 1) * stringGap;

  // Compute fret widths; mirror horizontally when leftHanded is active!
  const baseWidth = visibleFrets <= 8 ? 86 : visibleFrets <= 15 ? 60 : 48;
  const widths = [];
  for (let f = startFret + 1; f <= endFret; f++) {
    const taper = visibleFrets > 12 ? Math.max(0.78, 1 - (f - startFret) * 0.009) : 1;
    widths.push(baseWidth * taper);
  }
  const boardW = widths.reduce((a, b) => a + b, 0);
  const totalWidth = Math.round(padLeft + boardW + padRight);
  const totalHeight = Math.round(padTop + boardHeight + padBottom);

  // fretXs[0] is the nut/start edge; fretXs[i] is the edge after fret (startFret + i)
  const fretXs = [];
  if (!leftHanded) {
    let x = padLeft;
    fretXs.push(x);
    for (const w of widths) {
      x += w;
      fretXs.push(x);
    }
  } else {
    let x = padLeft + boardW;
    fretXs.push(x);
    for (const w of widths) {
      x -= w;
      fretXs.push(x);
    }
  }

  const boardLeftX = padLeft;
  const boardRightX = padLeft + boardW;
  const curX = boardRightX;

  const stringY = (sIdx) => padTop + (numStrings - 1 - sIdx) * stringGap;
  const fretCenterX = (f) => {
    if (f === 0 && showNut) return leftHanded ? boardRightX + 22 : boardLeftX - 22;
    const idx = f - startFret;
    if (idx <= 0 || idx >= fretXs.length) return -999;
    return (fretXs[idx - 1] + fretXs[idx]) / 2;
  };

  const posMap = new Map();
  positions.forEach((p) => posMap.set(`${p.stringIdx}:${p.fret}`, p));
  const selSet = new Set(selectedNotes.map((s) => `${s.stringIdx}:${s.fret}`));

  let maxHeat = 1;
  if (heatmap) {
    Object.values(heatmap).forEach((v) => {
      if (v > maxHeat) maxHeat = v;
    });
  }

  const markers = Theory.data.fretMarkers;
  const doubleMarkers = Theory.data.doubleFretMarkers;
  const boardTop = padTop - 12;
  const boardFullH = boardHeight + 24;

  let svg = `<svg id="${id}" class="fretboard-svg" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Braço interativo da guitarra com casas separadas por trastes">`;
  svg += `<defs>
    <linearGradient id="woodGrad_${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2c1f19"/>
      <stop offset="50%" stop-color="#201611"/>
      <stop offset="100%" stop-color="#170f0c"/>
    </linearGradient>
    <linearGradient id="fretMetal_${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="45%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
    <linearGradient id="nutGrad_${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="50%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
  </defs>`;

  // Dedicated Open-String ("0") column background when nut is visible
  if (showNut) {
    const nutColX = leftHanded ? boardRightX + 4 : boardLeftX - 38;
    svg += `<rect x="${nutColX}" y="${boardTop}" width="34" height="${boardFullH}" rx="4" fill="#0f172a" fill-opacity="0.55" stroke="#334155" stroke-width="1"/>`;
  }

  // Main Rosewood/Ebony fretboard base
  svg += `<rect x="${boardLeftX}" y="${boardTop}" width="${boardW}" height="${boardFullH}" rx="6" fill="url(#woodGrad_${id})" stroke="#4a352b" stroke-width="1.6"/>`;

  // Individual fret compartment shading (makes every fret visually distinct!)
  for (let i = 1; i < fretXs.length; i++) {
    const f = startFret + i;
    const x1 = Math.min(fretXs[i - 1], fretXs[i]);
    const x2 = Math.max(fretXs[i - 1], fretXs[i]);
    const fw = x2 - x1;
    const isMarked = markers.includes(f);
    const fill = isMarked ? '#f59e0b' : (f % 2 === 0 ? '#ffffff' : '#000000');
    const opacity = isMarked ? '0.07' : (f % 2 === 0 ? '0.03' : '0.08');
    svg += `<rect x="${x1}" y="${boardTop + 1}" width="${fw}" height="${boardFullH - 2}" fill="${fill}" fill-opacity="${opacity}"/>`;
  }

  // CAGED region shading overlays
  if (cagedBoxes && cagedBoxes.length) {
    cagedBoxes.forEach((box) => {
      const fStart = Math.max(startFret, box.startFret);
      const fEnd = Math.min(endFret, box.endFret);
      if (fEnd < startFret || fStart > endFret) return;
      const edgeA = fStart === 0 && showNut ? fretXs[0] : fretXs[Math.max(0, fStart - startFret - 1)] ?? fretXs[0];
      const edgeB = fretXs[Math.min(fretXs.length - 1, fEnd - startFret)] ?? fretXs[fretXs.length - 1];
      const x1 = Math.min(edgeA, edgeB);
      const x2 = Math.max(edgeA, edgeB);
      svg += `<rect x="${x1}" y="${boardTop}" width="${Math.max(12, x2 - x1)}" height="${boardFullH}" fill="${box.color}" fill-opacity="0.12" stroke="${box.color}" stroke-opacity="0.55" stroke-width="1.6" rx="4"/>`;
      svg += `<text x="${(x1 + x2) / 2}" y="${boardTop - 16}" fill="${box.color}" font-size="11" font-weight="800" text-anchor="middle" font-family="Inter, sans-serif">${box.name}</text>`;
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

  // Nut (Pestana) — bold ivory divider separating open strings from fret 1
  if (showNut) {
    const nutX = leftHanded ? boardRightX - 2 : boardLeftX - 6;
    svg += `<rect x="${nutX}" y="${boardTop - 1}" width="8" height="${boardFullH + 2}" rx="2" fill="url(#nutGrad_${id})" stroke="#64748b" stroke-width="1"/>`;
  } else {
    const borderX = leftHanded ? boardRightX - 2 : boardLeftX - 2;
    svg += `<rect x="${borderX}" y="${boardTop}" width="3.5" height="${boardFullH}" fill="url(#fretMetal_${id})"/>`;
  }

  // Prominent 3D Metallic Fret Wires + Pearloid Inlays + Top & Bottom Fret Numbers
  for (let i = 1; i < fretXs.length; i++) {
    const f = startFret + i;
    const x = fretXs[i];
    const cx = (fretXs[i - 1] + x) / 2;
    const isHighlightFret = markers.includes(f);

    svg += `<line x1="${x + 1.8}" y1="${boardTop}" x2="${x + 1.8}" y2="${boardTop + boardFullH}" stroke="#090d16" stroke-opacity="0.78" stroke-width="2"/>`;
    svg += `<rect x="${x - 1.7}" y="${boardTop}" width="3.4" height="${boardFullH}" rx="1" fill="url(#fretMetal_${id})"/>`;

    if (isHighlightFret) {
      if (doubleMarkers.includes(f)) {
        svg += `<circle cx="${cx}" cy="${padTop + boardHeight * 0.27}" r="5.5" fill="#e2e8f0" fill-opacity="0.32" stroke="#ffffff" stroke-opacity="0.18"/>`;
        svg += `<circle cx="${cx}" cy="${padTop + boardHeight * 0.73}" r="5.5" fill="#e2e8f0" fill-opacity="0.32" stroke="#ffffff" stroke-opacity="0.18"/>`;
      } else {
        svg += `<circle cx="${cx}" cy="${padTop + boardHeight / 2}" r="6" fill="#e2e8f0" fill-opacity="0.32" stroke="#ffffff" stroke-opacity="0.18"/>`;
      }
    }

    if (!cagedBoxes) {
      svg += `<text x="${cx}" y="${boardTop - 6}" fill="${isHighlightFret ? '#f59e0b' : '#64748b'}" font-size="10.5" font-weight="${isHighlightFret ? '800' : '600'}" text-anchor="middle" font-family="JetBrains Mono, monospace">${f}</text>`;
    }

    if (isHighlightFret) {
      svg += `<rect x="${cx - 12}" y="${boardTop + boardFullH + 6}" width="24" height="17" rx="4" fill="#f59e0b" fill-opacity="0.18" stroke="#f59e0b" stroke-opacity="0.45" stroke-width="1"/>`;
    }
    svg += `<text x="${cx}" y="${boardTop + boardFullH + 18}" fill="${isHighlightFret ? '#f59e0b' : '#94a3b8'}" font-size="11" font-weight="${isHighlightFret ? '800' : '600'}" text-anchor="middle" font-family="JetBrains Mono, monospace">${f}</text>`;
  }

  // Open String "0" label
  if (showNut) {
    const openCx = fretCenterX(0);
    svg += `<text x="${openCx}" y="${boardTop + boardFullH + 18}" fill="#94a3b8" font-size="10.5" font-weight="700" text-anchor="middle" font-family="JetBrains Mono, monospace">0</text>`;
    if (!cagedBoxes) {
      svg += `<text x="${openCx}" y="${boardTop - 6}" fill="#64748b" font-size="9.5" font-weight="700" text-anchor="middle" font-family="Inter, sans-serif">SOLTA</text>`;
    }
  }

  // Strings (graduated thickness from thin high E to wound low E/B)
  const strStartX = leftHanded ? boardLeftX : (boardLeftX - (showNut ? 36 : 0));
  const strEndX = leftHanded ? (boardRightX + (showNut ? 36 : 0)) : boardRightX;
  const labelX = leftHanded ? totalWidth - 14 : 14;
  for (let s = 0; s < numStrings; s++) {
    const y = stringY(s);
    const thickness = 1.15 + ((numStrings - 1 - s) / (numStrings - 1)) * 2.35;
    const isWound = s < numStrings - 2;
    svg += `<line x1="${strStartX}" y1="${y + 1}" x2="${strEndX}" y2="${y + 1}" stroke="#000000" stroke-opacity="0.45" stroke-width="${thickness.toFixed(2)}"/>`;
    svg += `<line x1="${strStartX}" y1="${y}" x2="${strEndX}" y2="${y}" stroke="${isWound ? '#cbd5e1' : '#f1f5f9'}" stroke-opacity="0.82" stroke-width="${thickness.toFixed(2)}"/>`;

    svg += `<text x="${labelX}" y="${y + 4}" fill="#cbd5e1" font-size="12" font-weight="800" text-anchor="middle" font-family="JetBrains Mono, monospace">${tuning.notes[s]}</text>`;
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
        svg += `<path d="M ${x1} ${y1} Q ${midX} ${ctrlY} ${x2} ${y2}" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-dasharray="4 3" stroke-opacity="0.9"/>`;
      }
    });
  }

  // Interactive cells + Note markers
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

      let showDot = false;
      let fill = '#3b82f6';
      let label = Theory.pcToNote(pc, Theory.preferFlats);
      let isRoot = false;
      let ring = false;

      if (displayMode === 'selected') {
        if (isSelected) {
          showDot = true;
          fill = '#f59e0b';
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
        svg += `<title>${Theory.pcToNote(pc, Theory.preferFlats)} · ${numStrings - s}ª corda · Casa ${f}</title>`;
        svg += `<rect x="${cx - 17}" y="${y - stringGap / 2 + 2}" width="34" height="${stringGap - 4}" fill="transparent"/>`;
      }

      if (showDot) {
        const radius = isRoot || isSelected ? 12.5 : 11;
        if (isPlaying) {
          svg += `<circle cx="${cx}" cy="${y}" r="${radius + 5}" fill="none" stroke="#fbbf24" stroke-width="2.5" opacity="0.95"/>`;
        }
        if (isRoot || ring) {
          svg += `<circle cx="${cx}" cy="${y}" r="${radius + 2.5}" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="0.88"/>`;
        }
        svg += `<circle cx="${cx}" cy="${y}" r="${radius}" fill="${fill}" stroke="#090d16" stroke-width="1.6"/>`;
        svg += `<text x="${cx}" y="${y + 3.8}" fill="${isRoot || fill === '#f59e0b' || fill === '#eab308' ? '#090d16' : '#ffffff'}" font-size="${label.length > 2 ? '8.5' : '10'}" font-weight="800" text-anchor="middle" font-family="Inter, sans-serif" pointer-events="none">${label}</text>`;
      } else if (interactive) {
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
        AudioEngine.playNote(midi, 1.3, 0, 0.82);
        Storage.recordFretHeat(sIdx, fret, 2);

        const circle = el.querySelector('circle:last-of-type');
        if (circle) {
          circle.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: 220 });
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
