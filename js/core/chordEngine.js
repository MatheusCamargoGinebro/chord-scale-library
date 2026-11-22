/**
 * Algorithmic Chord Voicing Generator & Reverse Chord Finder
 * Generates thousands of playable, fingered guitar chord shapes across
 * all 12 roots, 30 chord types, CAGED shapes, inversions, and alternative tunings.
 */

import { Theory } from './theory.js';

const voicingCache = new Map();

export const ChordEngine = {
  clearCache() {
    voicingCache.clear();
  },

  /**
   * Generate all playable chord shapes for (rootPc, chordTypeId, tuning).
   * Cached per combination for instant UI filtering and browsing.
   */
  getVoicings(rootPc, chordTypeId, tuning = Theory.getTuning()) {
    const rPc = Theory.mod12(rootPc);
    const cacheKey = `${tuning.id}:${rPc}:${chordTypeId}`;
    if (voicingCache.has(cacheKey)) {
      return voicingCache.get(cacheKey);
    }

    const ct = Theory.getChordType(chordTypeId);
    const allowedPcs = new Set(ct.intervals.map((iv) => Theory.mod12(rPc + iv)));
    const requiredPcs = ct.required.map((iv) => Theory.mod12(rPc + iv));
    const numStrings = tuning.strings;

    const seenKeys = new Set();
    const results = [];

    const addIfValid = (frets, forcedMeta = {}) => {
      const key = frets.join(',');
      if (seenKeys.has(key)) return;
      const analyzed = this.analyzeVoicing(frets, rPc, ct, tuning, forcedMeta);
      if (!analyzed) return;
      seenKeys.add(key);
      results.push(analyzed);
    };

    // 1. Curated CAGED templates (for standard 6-string tuning)
    if (tuning.id === 'standard' && Theory.chordsData.cagedTemplates[chordTypeId]) {
      const templates = Theory.chordsData.cagedTemplates[chordTypeId];
      for (const tpl of templates) {
        const baseRootPc = Theory.getFretPc(tpl.rootString, tpl.baseRootFret, tuning);
        let shift = Theory.mod12(rPc - baseRootPc);
        for (const octaveShift of [0, 12]) {
          const s = shift + octaveShift;
          const shifted = tpl.offsets.map((f) => (f === -1 ? -1 : f + s));
          const maxF = Math.max(...shifted.filter((f) => f >= 0));
          const minPos = Math.min(...shifted.filter((f) => f > 0), 99);
          if (maxF > 17) continue;
          if (s > 0 && maxF - (minPos === 99 ? 0 : minPos) > 4) continue;
          const isOpen = shifted.some((f) => f === 0) && maxF <= 4;
          const label = isOpen
            ? `Aberto (CAGED ${tpl.caged})`
            : `Pestana ${minPos}ª casa · CAGED ${tpl.caged}`;
          addIfValid(shifted, {
            caged: tpl.caged,
            label,
            priorityBonus: isOpen ? 35 : 22,
          });
        }
      }
    }

    // 2. Algorithmic voicing generator across fret windows (0..14)
    const minSounding = ct.id === '5' ? 2 : Math.min(4, Math.max(3, requiredPcs.length));
    const maxFretLimit = 16;

    // Precompute valid frets per string
    const validFretsPerString = [];
    for (let s = 0; s < numStrings; s++) {
      const list = [];
      for (let f = 0; f <= maxFretLimit; f++) {
        if (allowedPcs.has(Theory.getFretPc(s, f, tuning))) {
          list.push(f);
        }
      }
      validFretsPerString.push(list);
    }

    // Search open window (0..4) + movable windows (1..13)
    const windows = [{ min: 0, max: 4, allowOpen: true }];
    for (let start = 1; start <= 13; start++) {
      windows.push({ min: start, max: Math.min(start + 3, maxFretLimit), allowOpen: false });
    }

    const candidatesPerWindow = 40;

    for (const win of windows) {
      const stringOpts = validFretsPerString.map((frets) => {
        const opts = [-1]; // muted
        for (const f of frets) {
          if (f === 0 && win.allowOpen) opts.push(0);
          else if (f >= win.min && f <= win.max && f > 0) opts.push(f);
        }
        return opts;
      });

      let winFound = 0;
      const current = new Array(numStrings).fill(-1);

      const dfs = (sIdx, soundingCount, minNonZero, maxNonZero, firstSounding, lastSounding, innerMutes) => {
        if (winFound >= candidatesPerWindow) return;
        if (soundingCount + (numStrings - sIdx) < minSounding) return;

        if (sIdx === numStrings) {
          if (soundingCount < minSounding) return;
          if (ct.id === '5' && soundingCount > 4) return;
          if (!win.allowOpen && minNonZero !== win.min) return;

          // Check required pitch classes
          const present = new Set();
          for (let i = 0; i < numStrings; i++) {
            if (current[i] >= 0) {
              present.add(Theory.getFretPc(i, current[i], tuning));
            }
          }
          for (const req of requiredPcs) {
            if (!present.has(req)) return;
          }

          // Quick span & finger feasibility check
          const nonZeroFrets = current.filter((f) => f > 0);
          if (nonZeroFrets.length > 0) {
            const span = maxNonZero - minNonZero;
            if (span > 4) return;
            const atMin = nonZeroFrets.filter((f) => f === minNonZero).length;
            const aboveMin = nonZeroFrets.length - atMin;
            const hasOpenInside = current.some((f, idx) => f === 0 && idx > firstSounding && idx < lastSounding);
            // If barré is blocked by open string or requires > 4 fingers
            if (nonZeroFrets.length > 4) {
              if (hasOpenInside || aboveMin > 3) return;
            }
          }

          const copy = current.slice();
          const key = copy.join(',');
          if (!seenKeys.has(key)) {
            const analyzed = this.analyzeVoicing(copy, rPc, ct, tuning);
            if (analyzed) {
              seenKeys.add(key);
              results.push(analyzed);
              winFound++;
            }
          }
          return;
        }

        const opts = stringOpts[sIdx];
        for (let i = 0; i < opts.length; i++) {
          const f = opts[i];
          let nextInnerMutes = innerMutes;
          let nextFirst = firstSounding;
          let nextLast = lastSounding;

          if (f === -1) {
            if (firstSounding !== -1) {
              // Allow at most 1 muted string inside the voicing (for drop-2/drop-3 jazz shapes)
              // Only count if a later string sounds; we restrict total inner mutes conservatively
              nextInnerMutes = innerMutes + 1;
              if (nextInnerMutes > 2) continue;
            }
          } else {
            if (firstSounding === -1) nextFirst = sIdx;
            // Count actual muted strings between previous lastSounding and current sIdx
            if (lastSounding !== -1 && sIdx - lastSounding > 1) {
              const gap = sIdx - lastSounding - 1;
              if (gap > 1) continue; // never skip 2 adjacent inner strings
            }
            nextLast = sIdx;
          }

          const nextMin = f > 0 ? Math.min(minNonZero, f) : minNonZero;
          const nextMax = f > 0 ? Math.max(maxNonZero, f) : maxNonZero;
          if (nextMax > 0 && nextMin < 99 && nextMax - nextMin > 4) continue;

          current[sIdx] = f;
          dfs(
            sIdx + 1,
            f >= 0 ? soundingCount + 1 : soundingCount,
            nextMin,
            nextMax,
            nextFirst,
            nextLast,
            nextInnerMutes
          );
        }
      };

      dfs(0, 0, 99, 0, -1, -1, 0);
    }

    // Sort by playability score descending, then limit to top 36 diverse shapes per chord
    results.sort((a, b) => b.score - a.score);

    // Deduplicate overly similar voicings in same fret window while keeping inversions & CAGED variety
    const curated = [];
    const bucketCounts = new Map();
    for (const v of results) {
      const bucket = `${v.baseFret}:${v.inversionIndex}:${v.hasBarre ? 1 : 0}`;
      const count = bucketCounts.get(bucket) || 0;
      if (count < 2 || v.priorityBonus > 0) {
        curated.push(v);
        bucketCounts.set(bucket, count + 1);
      }
      if (curated.length >= 32) break;
    }

    // Assign friendly shape index
    curated.forEach((v, idx) => {
      v.shapeNumber = idx + 1;
    });

    voicingCache.set(cacheKey, curated);
    return curated;
  },

  /**
   * Analyze a fret array to compute fingerings, barre, difficulty, CAGED, inversion, notes & playability score.
   */
  analyzeVoicing(frets, rootPc, chordType, tuning, forcedMeta = {}) {
    const numStrings = tuning.strings;
    const soundingIndices = [];
    for (let s = 0; s < numStrings; s++) {
      if (frets[s] >= 0) soundingIndices.push(s);
    }
    if (soundingIndices.length < (chordType.id === '5' ? 2 : 3)) return null;

    // Count inner mutes strictly between first and last sounding string
    const firstS = soundingIndices[0];
    const lastS = soundingIndices[soundingIndices.length - 1];
    let innerMutes = 0;
    for (let s = firstS + 1; s < lastS; s++) {
      if (frets[s] === -1) innerMutes++;
    }
    if (innerMutes > 1) return null;

    const nonZero = frets.filter((f) => f > 0);
    const openCount = frets.filter((f) => f === 0).length;
    const minFret = nonZero.length ? Math.min(...nonZero) : 0;
    const maxFret = nonZero.length ? Math.max(...nonZero) : 0;
    const span = nonZero.length ? maxFret - minFret : 0;
    if (span > 4) return null;

    // Determine fingering & barre
    const fingeringResult = this.computeFingering(frets, minFret);
    if (!fingeringResult) return null;

    const { fingers, barre, fingerCount } = fingeringResult;
    if (fingerCount > 4) return null;

    // Bass note & inversion
    const bassString = firstS;
    const bassMidi = Theory.getFretMidi(bassString, frets[bassString], tuning);
    const bassPc = Theory.mod12(bassMidi);
    const bassInterval = Theory.mod12(bassPc - rootPc);

    let inversionIndex = chordType.intervals.indexOf(bassInterval);
    if (inversionIndex === -1) inversionIndex = 0;
    const invNames = ['Fundamental', '1ª Inversão', '2ª Inversão', '3ª Inversão', '4ª Inversão'];
    const inversionName = invNames[inversionIndex] || `${inversionIndex}ª Inversão`;

    // Region classification
    const avgFret = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
    let region = 'Aberto (0-4)';
    let regionKey = 'open';
    if (openCount > 0 && maxFret <= 4) {
      region = 'Aberto (0-4)';
      regionKey = 'open';
    } else if (minFret <= 4 && maxFret <= 5) {
      region = 'Aberto (0-4)';
      regionKey = 'open';
    } else if (minFret <= 9) {
      region = 'Médio (5-9)';
      regionKey = 'mid';
    } else if (minFret <= 14) {
      region = 'Agudo (10-15)';
      regionKey = 'high';
    } else {
      region = 'Extremo (16+)';
      regionKey = 'extreme';
    }

    // Difficulty classification
    let difficulty = 'Fácil';
    let diffScore = 0;
    if (barre) diffScore += 2;
    if (span >= 3) diffScore += 1.5;
    if (span >= 4) diffScore += 2;
    if (fingerCount >= 4) diffScore += 1.5;
    if (innerMutes > 0) diffScore += 1.5;
    if (minFret >= 10) diffScore += 0.5;
    if (diffScore <= 1.5) difficulty = 'Fácil';
    else if (diffScore <= 3.5) difficulty = 'Médio';
    else difficulty = 'Avançado';

    // Infer CAGED shape if not explicitly provided
    const caged = forcedMeta.caged || this.inferCaged(frets, rootPc, tuning);

    // Per-string details
    const useFlats = Theory.useFlatsForRoot(rootPc);
    const stringNotes = frets.map((f, sIdx) => {
      if (f < 0) {
        return {
          string: numStrings - sIdx,
          stringIdx: sIdx,
          tuningNote: tuning.notes[sIdx],
          fret: -1,
          muted: true,
          finger: -1,
          note: 'X',
          midi: null,
          interval: null,
          short: 'X',
        };
      }
      const midi = Theory.getFretMidi(sIdx, f, tuning);
      const pc = Theory.mod12(midi);
      const iv = Theory.mod12(pc - rootPc);
      const ivInfo = Theory.getIntervalInfo(iv);
      return {
        string: numStrings - sIdx,
        stringIdx: sIdx,
        tuningNote: tuning.notes[sIdx],
        fret: f,
        muted: false,
        finger: fingers[sIdx],
        note: Theory.pcToNote(pc, useFlats),
        noteWithOctave: Theory.midiToNote(midi, useFlats),
        midi,
        pc,
        interval: iv,
        short: ivInfo.short,
        degree: ivInfo.degree,
        color: ivInfo.color,
      };
    });

    // Playability scoring
    let score = 100 + (forcedMeta.priorityBonus || 0);
    if (bassPc === rootPc) score += 28; // Root position preferred
    if (openCount > 0 && maxFret <= 4) score += 18;
    score -= span * 6;
    score -= innerMutes * 14;
    score -= (barre ? 7 : 0);
    score -= minFret * 1.1;
    score += Math.min(soundingIndices.length, 6) * 4;
    if (chordType.id === '5' && soundingIndices.length <= 3) score += 15;
    // Penalize muffled low thirds below MIDI 48
    if (soundingIndices.length >= 2) {
      const lowNotes = stringNotes.filter((n) => !n.muted);
      if (lowNotes.length >= 2 && lowNotes[1].midi - lowNotes[0].midi <= 2 && lowNotes[0].midi < 50) {
        score -= 22;
      }
    }

    // Descriptive label
    let label = forcedMeta.label;
    if (!label) {
      if (openCount > 0 && maxFret <= 4) {
        label = inversionIndex === 0 ? 'Aberto' : `Aberto · ${inversionName}`;
      } else if (barre) {
        label = `Pestana ${barre.fret}ª casa${caged ? ` (CAGED ${caged})` : ''}`;
      } else if (innerMutes > 0) {
        label = `Voicing Jazz · Casa ${minFret}`;
      } else if (inversionIndex > 0) {
        label = `${inversionName} · Casa ${minFret}`;
      } else {
        label = `Posição Casa ${minFret}${caged ? ` (CAGED ${caged})` : ''}`;
      }
    }

    const baseFret = maxFret <= 4 ? 1 : minFret;

    return {
      id: `${tuning.id}_${rootPc}_${chordType.id}_${frets.join('_')}`,
      rootPc,
      chordTypeId: chordType.id,
      symbol: Theory.getChordDisplayName(rootPc, chordType.id, bassPc),
      baseSymbol: Theory.getChordDisplayName(rootPc, chordType.id),
      frets,
      fingers,
      barre,
      hasBarre: Boolean(barre),
      fingerCount,
      minFret,
      maxFret,
      baseFret,
      span,
      difficulty,
      region,
      regionKey,
      caged,
      inversionIndex,
      inversionName,
      bassPc,
      bassNote: Theory.pcToNote(bassPc, useFlats),
      label,
      stringNotes,
      soundingCount: soundingIndices.length,
      priorityBonus: forcedMeta.priorityBonus || 0,
      score: Math.round(score),
    };
  },

  /**
   * Computes realistic finger assignments (1..4) and optional barre.
   */
  computeFingering(frets, minFret) {
    const numStrings = frets.length;
    const fingers = frets.map((f) => (f <= 0 ? (f === 0 ? 0 : -1) : 0));
    const nonZeroIndices = [];
    for (let s = 0; s < numStrings; s++) {
      if (frets[s] > 0) nonZeroIndices.push(s);
    }
    if (nonZeroIndices.length === 0) {
      return { fingers, barre: null, fingerCount: 0 };
    }

    const atMin = nonZeroIndices.filter((s) => frets[s] === minFret);
    const aboveMin = nonZeroIndices.filter((s) => frets[s] > minFret);

    let barre = null;
    let usedFingers = new Set();

    // Check if a barre at minFret is needed or beneficial
    const canBarre = (() => {
      if (atMin.length < 2) return false;
      const bStart = atMin[0];
      const bEnd = atMin[atMin.length - 1];
      // Cannot barre across an open string between bStart and bEnd
      for (let s = bStart; s <= bEnd; s++) {
        if (frets[s] === 0) return false;
      }
      return true;
    })();

    const needsBarre = nonZeroIndices.length > 4 || (atMin.length >= 3 && aboveMin.length >= 2) || (canBarre && atMin.length >= 2 && aboveMin.length >= 3);

    if (needsBarre && canBarre) {
      barre = {
        fret: minFret,
        fromString: atMin[0],
        toString: atMin[atMin.length - 1],
      };
      atMin.forEach((s) => {
        fingers[s] = 1;
      });
      usedFingers.add(1);

      // Assign fingers 2, 3, 4 to notes above minFret sorted by fret then string
      const sortedAbove = aboveMin.slice().sort((a, b) => (frets[a] - frets[b]) || (a - b));
      if (sortedAbove.length > 3) return null;
      let nextFinger = 2;
      for (const s of sortedAbove) {
        fingers[s] = nextFinger;
        usedFingers.add(nextFinger);
        nextFinger++;
      }
      return { fingers, barre, fingerCount: usedFingers.size };
    }

    if (nonZeroIndices.length > 4) return null;

    // Assign fingers 1..4 without barre, ordered by fret then low-to-high string
    const sorted = nonZeroIndices.slice().sort((a, b) => (frets[a] - frets[b]) || (a - b));
    // Prefer matching finger offset to fret offset when ergonomic
    let nextFinger = 1;
    for (const s of sorted) {
      const fOffset = frets[s] - minFret + 1;
      const assigned = Math.max(nextFinger, Math.min(4, fOffset));
      if (assigned > 4) {
        // fallback sequential
        sorted.forEach((idx, i) => {
          fingers[idx] = i + 1;
        });
        return { fingers, barre: null, fingerCount: sorted.length };
      }
      fingers[s] = assigned;
      usedFingers.add(assigned);
      nextFinger = assigned + 1;
    }

    return { fingers, barre: null, fingerCount: usedFingers.size };
  },

  /**
   * Infers the closest CAGED system shape letter from root string position and chord span.
   */
  inferCaged(frets, rootPc, tuning) {
    const numStrings = tuning.strings;
    const offset = numStrings === 7 ? 1 : 0; // map 7-string E..e to indices 1..6
    const rootStrings = [];
    for (let s = offset; s < numStrings; s++) {
      if (frets[s] >= 0 && Theory.getFretPc(s, frets[s], tuning) === rootPc) {
        rootStrings.push({ s: s - offset, fret: frets[s] });
      }
    }
    if (!rootStrings.length) return null;
    const lowRoot = rootStrings[0];
    const nonZero = frets.filter((f) => f > 0);
    const avg = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;

    if (lowRoot.s === 0) {
      return lowRoot.fret >= avg ? 'G' : 'E';
    }
    if (lowRoot.s === 1) {
      return lowRoot.fret >= avg + 0.4 ? 'C' : 'A';
    }
    if (lowRoot.s === 2) {
      return 'D';
    }
    return 'D';
  },

  /**
   * Reverse Chord Finder:
   * Given an array of { midi, pc } or raw pitch classes, returns ranked matching chords.
   */
  identifyChord(selectedNotes) {
    if (!selectedNotes || selectedNotes.length < 2) return [];
    const sorted = selectedNotes.slice().sort((a, b) => (a.midi || 0) - (b.midi || 0));
    const bassPc = Theory.mod12(sorted[0].pc);
    const uniquePcs = [...new Set(sorted.map((n) => Theory.mod12(n.pc)))];
    if (uniquePcs.length < 2) return [];

    const matches = [];
    const chordTypes = Theory.getChordTypes();

    for (let rootPc = 0; rootPc < 12; rootPc++) {
      for (const ct of chordTypes) {
        const ctPcs = ct.intervals.map((iv) => Theory.mod12(rootPc + iv));
        const reqPcs = ct.required.map((iv) => Theory.mod12(rootPc + iv));

        // Every selected note must belong to chord, and all required notes must be present
        const extraNotes = uniquePcs.filter((p) => !ctPcs.includes(p));
        const missingReq = reqPcs.filter((p) => !uniquePcs.includes(p));
        const missingOpt = ctPcs.filter((p) => !uniquePcs.includes(p));

        if (extraNotes.length > 0 || missingReq.length > 0) continue;

        const isRootBass = bassPc === rootPc;
        let confidence = 100;
        confidence -= missingOpt.length * 8;
        if (!isRootBass) confidence -= 10;
        // Prefer simpler chord definitions when identical note set
        confidence -= Math.max(0, ct.intervals.length - uniquePcs.length) * 5;
        if (ct.category === 'Tríades' || ct.category === 'Tétrades (7ª)') confidence += 4;

        const symbol = Theory.getChordDisplayName(rootPc, ct.id, isRootBass ? null : bassPc);
        matches.push({
          rootPc,
          chordTypeId: ct.id,
          chordType: ct,
          symbol,
          bassPc,
          isInversion: !isRootBass,
          confidence: Math.min(100, Math.max(50, Math.round(confidence))),
          formula: ct.formula,
          notes: Theory.getChordNotes(rootPc, ct.id).map((n) => n.note),
        });
      }
    }

    matches.sort((a, b) => b.confidence - a.confidence || (a.isInversion ? 1 : 0) - (b.isInversion ? 1 : 0));
    // Deduplicate by symbol
    const seen = new Set();
    return matches.filter((m) => {
      if (seen.has(m.symbol)) return false;
      seen.add(m.symbol);
      return true;
    }).slice(0, 10);
  },

  /**
   * Computes total library count estimate for display badge.
   */
  getTotalCatalogEstimate() {
    // 12 roots * 30 chord types * ~31 average playable shapes = 11,000+ shapes per tuning
    return 11400;
  },
};
