/**
 * Chord Diagram Renderer:
 * 1. Traditional Vertical SVG Diagram
 * 2. Horizontal SVG Diagram
 * 3. Guitar Pro / Ultimate Guitar Tablature
 * 4. Detailed String-by-String Fingering & Note Breakdown
 */

import { Theory } from '../core/theory.js';

export function renderVerticalChordSVG(voicing, { compact = false, id = '' } = {}) {
  const numStrings = voicing.frets.length;
  const numFrets = 5;
  const w = compact ? 156 : 220;
  const h = compact ? 196 : 268;
  const padLeft = compact ? 28 : 40;
  const padRight = compact ? 18 : 26;
  const padTop = compact ? 38 : 48;
  const padBottom = compact ? 26 : 36;

  const gridW = w - padLeft - padRight;
  const gridH = h - padTop - padBottom;
  const strGap = gridW / (numStrings - 1);
  const fretGap = gridH / numFrets;

  const showNut = voicing.baseFret === 1;
  const svgId = id ? `id="${id}"` : '';

  let svg = `<svg ${svgId} class="chord-svg-vertical" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;

  // Title on compact card or full diagram
  svg += `<text x="${w / 2}" y="${compact ? 16 : 20}" fill="currentColor" font-size="${compact ? 13 : 16}" font-weight="800" text-anchor="middle" font-family="Inter, sans-serif">${voicing.symbol}</text>`;

  // Base fret marker if not at nut
  if (!showNut) {
    svg += `<text x="${padLeft - 10}" y="${padTop + fretGap * 0.65}" fill="#f59e0b" font-size="${compact ? 11 : 13}" font-weight="800" text-anchor="end" font-family="JetBrains Mono, monospace">${voicing.baseFret}fr</text>`;
  }

  // Nut or top line
  if (showNut) {
    svg += `<rect x="${padLeft - 1}" y="${padTop - 4}" width="${gridW + 2}" height="5" rx="1.5" fill="currentColor" opacity="0.9"/>`;
  } else {
    svg += `<line x1="${padLeft}" y1="${padTop}" x2="${padLeft + gridW}" y2="${padTop}" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/>`;
  }

  // Horizontal fret lines
  for (let f = 1; f <= numFrets; f++) {
    const y = padTop + f * fretGap;
    svg += `<line x1="${padLeft}" y1="${y}" x2="${padLeft + gridW}" y2="${y}" stroke="currentColor" stroke-opacity="0.22" stroke-width="1.3"/>`;
  }

  // Vertical string lines
  for (let s = 0; s < numStrings; s++) {
    const x = padLeft + s * strGap;
    const sw = 2.1 - (s / (numStrings - 1)) * 1.1;
    svg += `<line x1="${x}" y1="${padTop}" x2="${x}" y2="${padTop + gridH}" stroke="currentColor" stroke-opacity="0.45" stroke-width="${sw.toFixed(2)}"/>`;
  }

  // Barre arc/bar if present
  if (voicing.barre) {
    const relFret = voicing.barre.fret - voicing.baseFret + 1;
    if (relFret >= 1 && relFret <= numFrets) {
      const y = padTop + (relFret - 0.5) * fretGap;
      const x1 = padLeft + voicing.barre.fromString * strGap;
      const x2 = padLeft + voicing.barre.toString * strGap;
      const r = compact ? 7 : 9.5;
      svg += `<rect x="${x1 - r}" y="${y - r}" width="${x2 - x1 + r * 2}" height="${r * 2}" rx="${r}" fill="#f59e0b" fill-opacity="0.88"/>`;
    }
  }

  // Open/Mute markers + Fretted dots + Bottom note names
  voicing.stringNotes.forEach((sn, s) => {
    const x = padLeft + s * strGap;
    const topY = padTop - (compact ? 11 : 14);
    const botY = padTop + gridH + (compact ? 16 : 22);

    if (sn.muted) {
      svg += `<text x="${x}" y="${topY + 3}" fill="#ef4444" font-size="${compact ? 11 : 13}" font-weight="800" text-anchor="middle" font-family="Inter, sans-serif">×</text>`;
    } else if (sn.fret === 0) {
      const isRoot = sn.interval === 0;
      svg += `<circle cx="${x}" cy="${topY}" r="${compact ? 4.2 : 5.2}" fill="${isRoot ? '#f59e0b' : 'none'}" stroke="${isRoot ? '#f59e0b' : 'currentColor'}" stroke-width="1.8"/>`;
      svg += `<text x="${x}" y="${botY}" fill="${isRoot ? '#f59e0b' : 'currentColor'}" fill-opacity="${isRoot ? '1' : '0.75'}" font-size="${compact ? 9.5 : 11}" font-weight="700" text-anchor="middle" font-family="JetBrains Mono, monospace">${sn.note}</text>`;
    } else {
      const relFret = sn.fret - voicing.baseFret + 1;
      const y = padTop + (relFret - 0.5) * fretGap;
      const isRoot = sn.interval === 0;
      const dotR = compact ? 7.5 : 10;
      const fill = isRoot ? '#f59e0b' : sn.color || '#38bdf8';

      svg += `<circle cx="${x}" cy="${y}" r="${dotR}" fill="${fill}" stroke="#090d16" stroke-width="1.4"/>`;
      if (sn.finger > 0) {
        svg += `<text x="${x}" y="${y + (compact ? 3.2 : 3.8)}" fill="${isRoot ? '#090d16' : '#ffffff'}" font-size="${compact ? 9 : 11}" font-weight="800" text-anchor="middle" font-family="Inter, sans-serif">${sn.finger}</text>`;
      }
      svg += `<text x="${x}" y="${botY}" fill="${isRoot ? '#f59e0b' : 'currentColor'}" fill-opacity="${isRoot ? '1' : '0.75'}" font-size="${compact ? 9.5 : 11}" font-weight="700" text-anchor="middle" font-family="JetBrains Mono, monospace">${sn.note}</text>`;
    }
  });

  svg += `</svg>`;
  return svg;
}

export function renderHorizontalChordSVG(voicing, { id = '' } = {}) {
  const numStrings = voicing.frets.length;
  const numFrets = 5;
  const w = 310;
  const h = numStrings === 7 ? 205 : 185;
  const padLeft = 46;
  const padRight = 20;
  const padTop = 24;
  const padBottom = 30;

  const gridW = w - padLeft - padRight;
  const gridH = h - padTop - padBottom;
  const fretGap = gridW / numFrets;
  const strGap = gridH / (numStrings - 1);
  const showNut = voicing.baseFret === 1;
  const svgId = id ? `id="${id}"` : '';

  const stringY = (sIdx) => padTop + (numStrings - 1 - sIdx) * strGap;

  let svg = `<svg ${svgId} class="chord-svg-horizontal" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;

  // Wood background
  svg += `<rect x="${padLeft}" y="${padTop - 6}" width="${gridW}" height="${gridH + 12}" rx="4" fill="#1e1410" stroke="#3f2d24" stroke-width="1.2"/>`;

  // Nut or first fret bar
  if (showNut) {
    svg += `<rect x="${padLeft - 4}" y="${padTop - 6}" width="5.5" height="${gridH + 12}" rx="1.5" fill="#f1f5f9"/>`;
  }

  // Fret wires & fret labels at bottom
  for (let f = 1; f <= numFrets; f++) {
    const x = padLeft + f * fretGap;
    svg += `<line x1="${x}" y1="${padTop - 6}" x2="${x}" y2="${padTop + gridH + 6}" stroke="#94a3b8" stroke-opacity="0.55" stroke-width="1.8"/>`;
    const fretNum = voicing.baseFret + f - 1;
    svg += `<text x="${x - fretGap / 2}" y="${padTop + gridH + 22}" fill="#94a3b8" font-size="10.5" font-weight="700" text-anchor="middle" font-family="JetBrains Mono, monospace">${fretNum}</text>`;
  }

  // Strings
  for (let s = 0; s < numStrings; s++) {
    const y = stringY(s);
    const sw = 1.1 + ((numStrings - 1 - s) / (numStrings - 1)) * 1.9;
    svg += `<line x1="${padLeft}" y1="${y}" x2="${padLeft + gridW}" y2="${y}" stroke="#cbd5e1" stroke-opacity="0.65" stroke-width="${sw.toFixed(2)}"/>`;
    svg += `<text x="12" y="${y + 3.5}" fill="#94a3b8" font-size="10.5" font-weight="700" text-anchor="middle" font-family="JetBrains Mono, monospace">${voicing.stringNotes[s].tuningNote}</text>`;
  }

  // Barre vertical bar
  if (voicing.barre) {
    const relFret = voicing.barre.fret - voicing.baseFret + 1;
    if (relFret >= 1 && relFret <= numFrets) {
      const x = padLeft + (relFret - 0.5) * fretGap;
      const yTop = stringY(voicing.barre.toString);
      const yBot = stringY(voicing.barre.fromString);
      svg += `<rect x="${x - 8.5}" y="${yTop - 8.5}" width="17" height="${yBot - yTop + 17}" rx="8.5" fill="#f59e0b" fill-opacity="0.82"/>`;
    }
  }

  // Notes
  voicing.stringNotes.forEach((sn, s) => {
    const y = stringY(s);
    if (sn.muted) {
      svg += `<text x="${padLeft - 15}" y="${y + 4}" fill="#ef4444" font-size="12" font-weight="800" text-anchor="middle" font-family="Inter, sans-serif">×</text>`;
    } else if (sn.fret === 0) {
      const isRoot = sn.interval === 0;
      svg += `<circle cx="${padLeft - 15}" cy="${y}" r="5.5" fill="${isRoot ? '#f59e0b' : 'none'}" stroke="${isRoot ? '#f59e0b' : '#cbd5e1'}" stroke-width="1.8"/>`;
    } else {
      const relFret = sn.fret - voicing.baseFret + 1;
      const x = padLeft + (relFret - 0.5) * fretGap;
      const isRoot = sn.interval === 0;
      const fill = isRoot ? '#f59e0b' : sn.color || '#38bdf8';
      svg += `<circle cx="${x}" cy="${y}" r="9.5" fill="${fill}" stroke="#090d16" stroke-width="1.4"/>`;
      svg += `<text x="${x}" y="${y + 3.5}" fill="${isRoot ? '#090d16' : '#ffffff'}" font-size="9.5" font-weight="800" text-anchor="middle" font-family="Inter, sans-serif">${sn.note}</text>`;
    }
  });

  svg += `</svg>`;
  return svg;
}

export function renderTablatureHTML(voicing) {
  const numStrings = voicing.stringNotes.length;
  const lines = [];
  // High string (index N-1) to low string (index 0)
  for (let s = numStrings - 1; s >= 0; s--) {
    const sn = voicing.stringNotes[s];
    const label = sn.tuningNote.padEnd(2, ' ');
    const fretStr = sn.muted ? 'x' : String(sn.fret);
    const padded = fretStr.length === 1 ? `---${fretStr}----` : `--${fretStr}----`;
    lines.push(
      `<div class="tab-line"><span class="tab-str">${label}</span><span class="tab-dash">|</span><span class="tab-dash">${padded.slice(0, 3)}</span><span class="tab-fret ${sn.muted ? 'muted' : sn.interval === 0 ? 'root' : ''}">${fretStr}</span><span class="tab-dash">----|</span></div>`
    );
  }
  return `<div class="tablature-box" aria-label="Tablatura do acorde">${lines.join('')}</div>`;
}

export function renderStringBreakdownHTML(voicing) {
  const fingerLabels = { '-1': 'Abafada', 0: 'Solta', 1: '1 (Indicador)', 2: '2 (Médio)', 3: '3 (Anelar)', 4: '4 (Mínimo)' };
  const rows = voicing.stringNotes
    .slice()
    .reverse()
    .map((sn) => {
      return `
        <tr class="${sn.muted ? 'row-muted' : ''}">
          <td><strong>${sn.string}ª</strong> (${sn.tuningNote})</td>
          <td><code>${sn.muted ? 'X' : sn.fret === 0 ? '0 (Solta)' : `Casa ${sn.fret}`}</code></td>
          <td>${sn.muted ? '—' : `<span class="note-pill" style="background:${sn.color}22;color:${sn.color};border-color:${sn.color}55">${sn.note}</span>`}</td>
          <td>${sn.muted ? '—' : `<span class="interval-tag">${sn.short}</span>`}</td>
          <td>${fingerLabels[String(sn.finger)] || '—'}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Corda</th>
          <th>Casa</th>
          <th>Nota</th>
          <th>Intervalo</th>
          <th>Dedo</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
