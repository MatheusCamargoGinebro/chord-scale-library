/**
 * Interactive SVG Circle of Fifths
 * Outer Ring: Major Keys | Inner Ring: Relative Minor Keys
 * Highlights diatonic chords (I, ii, iii, IV, V, vi, vii°) around the selected key.
 */

import { Theory } from '../core/theory.js';
import { AudioEngine } from '../audio/audioEngine.js';

export function renderCircleOfFifths(container, { selectedRootPc = 0, onSelectKey = null, id = 'cof-svg' } = {}) {
  const items = Theory.getCircleOfFifths();
  const cx = 190;
  const cy = 190;
  const rOuter = 165;
  const rMid = 112;
  const rInner = 64;

  const selectedIdx = items.findIndex((x) => x.majorPc === Theory.mod12(selectedRootPc));
  const activeIdx = selectedIdx === -1 ? 0 : selectedIdx;

  // Diatonic neighbor indices on the Circle of Fifths (IV = -1, I = 0, V = +1)
  const mod12 = (n) => ((n % 12) + 12) % 12;
  const ivIdx = mod12(activeIdx - 1);
  const vIdx = mod12(activeIdx + 1);

  const polar = (r, deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const wedgePath = (r1, r2, a1, a2) => {
    const p1 = polar(r2, a1);
    const p2 = polar(r2, a2);
    const p3 = polar(r1, a2);
    const p4 = polar(r1, a1);
    return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r2} ${r2} 0 0 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} L ${p3.x.toFixed(1)} ${p3.y.toFixed(1)} A ${r1} ${r1} 0 0 0 ${p4.x.toFixed(1)} ${p4.y.toFixed(1)} Z`;
  };

  let svg = `<svg id="${id}" class="cof-svg" viewBox="0 0 380 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Círculo das Quintas Interativo">`;

  items.forEach((item, i) => {
    const a1 = i * 30 - 15;
    const a2 = i * 30 + 15;
    const midA = i * 30;

    const isSelected = i === activeIdx;
    const isNeighbor = i === ivIdx || i === vIdx;

    // Outer Major Wedge
    let majFill = '#162032';
    let majStroke = '#283548';
    let majText = '#e2e8f0';
    if (isSelected) {
      majFill = '#f59e0b';
      majStroke = '#fbbf24';
      majText = '#090d16';
    } else if (isNeighbor) {
      majFill = '#1e3a5f';
      majStroke = '#38bdf8';
      majText = '#f8fafc';
    }

    const majPos = polar((rOuter + rMid) / 2, midA);
    const accPos = polar(rOuter - 12, midA);
    const majRole = isSelected ? 'I' : i === ivIdx ? 'IV' : i === vIdx ? 'V' : '';

    svg += `<g class="cof-wedge" data-pc="${item.majorPc}" data-quality="maj" style="cursor:pointer;">`;
    svg += `<path d="${wedgePath(rMid, rOuter, a1, a2)}" fill="${majFill}" stroke="${majStroke}" stroke-width="1.5"/>`;
    svg += `<text x="${majPos.x.toFixed(1)}" y="${(majPos.y + 4).toFixed(1)}" fill="${majText}" font-size="14" font-weight="800" text-anchor="middle" font-family="Inter, sans-serif">${item.major}</text>`;
    if (majRole) {
      svg += `<text x="${accPos.x.toFixed(1)}" y="${(accPos.y + 3).toFixed(1)}" fill="${isSelected ? '#090d16' : '#38bdf8'}" font-size="9" font-weight="800" text-anchor="middle" font-family="JetBrains Mono, monospace">${majRole}</text>`;
    }
    svg += `</g>`;

    // Inner Minor Wedge
    let minFill = '#0f172a';
    let minStroke = '#1e293b';
    let minText = '#94a3b8';
    const minRole = isSelected ? 'vi' : i === ivIdx ? 'ii' : i === vIdx ? 'iii' : '';

    if (isSelected) {
      minFill = '#1d4ed8';
      minStroke = '#60a5fa';
      minText = '#ffffff';
    } else if (isNeighbor) {
      minFill = '#172554';
      minStroke = '#3b82f6';
      minText = '#cbd5e1';
    }

    const minPos = polar((rMid + rInner) / 2, midA);
    svg += `<g class="cof-wedge" data-pc="${item.minorPc}" data-quality="min" style="cursor:pointer;">`;
    svg += `<path d="${wedgePath(rInner, rMid, a1, a2)}" fill="${minFill}" stroke="${minStroke}" stroke-width="1.4"/>`;
    svg += `<text x="${minPos.x.toFixed(1)}" y="${(minPos.y + 3).toFixed(1)}" fill="${minText}" font-size="11" font-weight="700" text-anchor="middle" font-family="Inter, sans-serif">${item.minor}</text>`;
    if (minRole) {
      const roleP = polar(rInner + 11, midA);
      svg += `<text x="${roleP.x.toFixed(1)}" y="${(roleP.y + 2.5).toFixed(1)}" fill="#93c5fd" font-size="8" font-weight="700" text-anchor="middle" font-family="JetBrains Mono, monospace">${minRole}</text>`;
    }
    svg += `</g>`;
  });

  // Center Hub Info
  const activeItem = items[activeIdx];
  svg += `<circle cx="${cx}" cy="${cy}" r="${rInner - 2}" fill="#0b1120" stroke="#334155" stroke-width="2"/>`;
  svg += `<text x="${cx}" y="${cy - 14}" fill="#f59e0b" font-size="18" font-weight="900" text-anchor="middle" font-family="Inter, sans-serif">${activeItem.major} / ${activeItem.minor}</text>`;
  svg += `<text x="${cx}" y="${cy + 6}" fill="#94a3b8" font-size="10.5" font-weight="600" text-anchor="middle" font-family="JetBrains Mono, monospace">Armadura: ${activeItem.accidentals}</text>`;
  svg += `<text x="${cx}" y="${cy + 24}" fill="#64748b" font-size="9" text-anchor="middle" font-family="Inter, sans-serif">${activeItem.sharpsFlats}</text>`;

  svg += `</svg>`;
  container.innerHTML = svg;

  container.querySelectorAll('.cof-wedge').forEach((el) => {
    el.addEventListener('click', () => {
      const pc = Number(el.dataset.pc);
      const q = el.dataset.quality;
      // Play triad audition
      const ivs = q === 'min' ? [0, 3, 7, 12] : [0, 4, 7, 12];
      AudioEngine.playChord(ivs.map((iv) => 48 + pc + iv), { strumMs: 26, duration: 1.4 });
      if (onSelectKey) onSelectKey(pc, q);
    });
  });

  return container.querySelector('svg');
}
