/**
 * Scale, Mode, Arpeggio, CAGED, N-Notes-Per-String & Comparator Engine
 */

import { Theory } from './theory.js';

export const ScaleEngine = {
  /**
   * Returns all fretboard positions matching a set of pitch classes (intervals from rootPc).
   */
  getFretboardPositions(rootPc, intervals, tuning = Theory.getTuning(), maxFret = 24) {
    const rPc = Theory.mod12(rootPc);
    const useFlats = Theory.useFlatsForRoot(rPc);
    const intervalMap = new Map();
    intervals.forEach((iv, idx) => {
      intervalMap.set(Theory.mod12(rPc + iv), { iv: Theory.mod12(iv), degreeNum: idx + 1 });
    });

    const positions = [];
    for (let s = 0; s < tuning.strings; s++) {
      for (let f = 0; f <= maxFret; f++) {
        const midi = Theory.getFretMidi(s, f, tuning);
        const pc = Theory.mod12(midi);
        if (intervalMap.has(pc)) {
          const { iv, degreeNum } = intervalMap.get(pc);
          const ivInfo = Theory.getIntervalInfo(iv);
          positions.push({
            stringIdx: s,
            fret: f,
            midi,
            pc,
            note: Theory.pcToNote(pc, useFlats),
            interval: iv,
            short: ivInfo.short,
            degree: ivInfo.degree,
            degreeNum,
            color: ivInfo.color,
            isRoot: iv === 0,
          });
        }
      }
    }
    return positions;
  },

  /**
   * Generates CAGED 5-box system positions for a scale on the fretboard.
   */
  getCagedBoxes(rootPc, intervals, tuning = Theory.getTuning()) {
    const rPc = Theory.mod12(rootPc);
    const lowEStringIdx = tuning.strings === 7 ? 1 : 0;
    // Find first root on low E string (0..11)
    let rootOnE = 0;
    for (let f = 0; f < 12; f++) {
      if (Theory.getFretPc(lowEStringIdx, f, tuning) === rPc) {
        rootOnE = f;
        break;
      }
    }

    // Standard CAGED offsets relative to E-shape root fret on 6th string
    const rawBoxes = [
      { letter: 'E', name: 'CAGED E', offset: -1, span: 4 },
      { letter: 'D', name: 'CAGED D', offset: 1, span: 5 },
      { letter: 'C', name: 'CAGED C', offset: 4, span: 4 },
      { letter: 'A', name: 'CAGED A', offset: 6, span: 5 },
      { letter: 'G', name: 'CAGED G', offset: 9, span: 4 },
    ];

    const allPos = this.getFretboardPositions(rPc, intervals, tuning, 24);

    return rawBoxes.map((b) => {
      let start = rootOnE + b.offset;
      while (start < 0) start += 12;
      if (start > 15) start -= 12;
      const end = Math.min(24, start + b.span);
      const notes = allPos.filter((p) => p.fret >= start && p.fret <= end);
      return {
        id: `caged_${b.letter}`,
        letter: b.letter,
        name: b.name,
        color: Theory.getCagedColor(b.letter),
        startFret: start,
        endFret: end,
        notes,
      };
    }).sort((a, b) => a.startFret - b.startFret);
  },

  /**
   * Generates regional shapes covering the full neck cleanly.
   */
  getRegionShapes(rootPc, intervals, tuning = Theory.getTuning()) {
    const allPos = this.getFretboardPositions(rootPc, intervals, tuning, 24);
    const regions = [
      { id: 'reg_1', name: 'Região 1 (Casas 0–4)', startFret: 0, endFret: 4 },
      { id: 'reg_2', name: 'Região 2 (Casas 4–8)', startFret: 4, endFret: 8 },
      { id: 'reg_3', name: 'Região 3 (Casas 7–11)', startFret: 7, endFret: 11 },
      { id: 'reg_4', name: 'Região 4 (Casas 10–14)', startFret: 10, endFret: 14 },
      { id: 'reg_5', name: 'Região 5 (Casas 12–17)', startFret: 12, endFret: 17 },
      { id: 'reg_6', name: 'Região 6 (Casas 17–22)', startFret: 17, endFret: 22 },
    ];
    return regions.map((r) => ({
      ...r,
      notes: allPos.filter((p) => p.fret >= r.startFret && p.fret <= r.endFret),
    }));
  },

  /**
   * Generates N-notes-per-string (2NPS, 3NPS, or 4NPS) ascending scale patterns
   * starting from each scale degree on the lowest string.
   */
  getNpsShapes(rootPc, intervals, notesPerString = 3, tuning = Theory.getTuning()) {
    const rPc = Theory.mod12(rootPc);
    const allPos = this.getFretboardPositions(rPc, intervals, tuning, 24);
    const byString = Array.from({ length: tuning.strings }, (_, s) =>
      allPos.filter((p) => p.stringIdx === s).sort((a, b) => a.fret - b.fret)
    );

    // Find starting degrees on lowest string within frets 0..12
    const lowNotes = byString[0].filter((p) => p.fret <= 12);
    const shapes = [];

    // Limit to at most 7 patterns (one per scale degree)
    const maxPatterns = Math.min(7, intervals.length);

    for (let i = 0; i < Math.min(lowNotes.length, maxPatterns); i++) {
      const startNote = lowNotes[i];
      const patternNotes = [];
      let prevLastMidi = startNote.midi - 1;
      let valid = true;

      for (let s = 0; s < tuning.strings; s++) {
        const candidates = byString[s].filter((p) => p.midi > prevLastMidi);
        if (candidates.length < notesPerString) {
          valid = false;
          break;
        }
        const picked = candidates.slice(0, notesPerString);
        // Check horizontal stretch on a single string isn't absurd (> 7 frets for 4NPS, > 5 for 3NPS)
        const strSpan = picked[picked.length - 1].fret - picked[0].fret;
        if (strSpan > notesPerString + 3) {
          valid = false;
          break;
        }
        patternNotes.push(...picked);
        prevLastMidi = picked[picked.length - 1].midi;
      }

      if (valid && patternNotes.length) {
        const frets = patternNotes.map((n) => n.fret);
        const startFret = Math.min(...frets);
        const endFret = Math.max(...frets);
        shapes.push({
          id: `nps_${notesPerString}_${i + 1}`,
          name: `Shape ${i + 1} (${notesPerString}NPS · Casa ${startFret}–${endFret})`,
          startDegree: startNote.short,
          startFret,
          endFret,
          notesPerString,
          notes: patternNotes,
        });
      }
    }

    return shapes;
  },

  /**
   * Generates all 7 modes of a parent scale system (major, melodic_minor, harmonic_minor).
   * Supports both Parallel (same root) and Relative (same notes, different root) comparison,
   * highlighting exact differences vs Major/Ionian!
   */
  getModesAnalysis(parentKey, rootPc, viewMode = 'parallel') {
    const system = Theory.getParentSystems()[parentKey] || Theory.getParentSystems().major;
    const baseIonian = [0, 2, 4, 5, 7, 9, 11];
    const rPc = Theory.mod12(rootPc);
    const parentIntervals = system.intervals;

    return system.modes.map((m, idx) => {
      const modeRootPc = viewMode === 'relative'
        ? Theory.mod12(rPc + parentIntervals[idx])
        : rPc;
      const useFlats = Theory.useFlatsForRoot(modeRootPc);

      // Rotate parent intervals to start at degree idx
      const rotated = [];
      for (let i = 0; i < 7; i++) {
        const raw = parentIntervals[(idx + i) % 7] - parentIntervals[idx];
        rotated.push(Theory.mod12(raw));
      }

      // Compare each degree to Major/Ionian with exact musical enharmonic degree spelling
      const degrees = rotated.map((iv, degIdx) => {
        const ionianIv = baseIonian[degIdx];
        const diff = iv - ionianIv;
        const note = Theory.pcToNote(modeRootPc + iv, useFlats);
        const ivInfo = Theory.getIntervalInfo(iv);
        let short = ivInfo.short;
        if (degIdx === 3 && iv === 6) short = '#4';
        else if (degIdx === 4 && iv === 8) short = '#5';
        else if (degIdx === 1 && iv === 3) short = '#2';
        else if (degIdx === 6 && iv === 9) short = 'bb7';
        return {
          degreeNumber: degIdx + 1,
          interval: iv,
          short,
          note,
          pc: Theory.mod12(modeRootPc + iv),
          altered: diff !== 0,
          diff,
          diffLabel: diff === -1 ? 'b' : diff === 1 ? '#' : diff === -2 ? 'bb' : '',
          color: ivInfo.color,
        };
      });

      const alteredList = degrees.filter((d) => d.altered);

      return {
        index: idx,
        degree: m.degree,
        name: m.name,
        rootPc: modeRootPc,
        rootNote: Theory.pcToNote(modeRootPc, useFlats),
        fullTitle: `${Theory.pcToNote(modeRootPc, useFlats)} ${m.name}`,
        chord: `${Theory.pcToNote(modeRootPc, useFlats)}${m.chord}`,
        chordQuality: m.chord,
        character: m.character,
        brightness: m.brightness,
        intervals: rotated,
        formula: degrees.map((d) => d.short).join(' - '),
        degrees,
        alteredDegrees: alteredList,
      };
    });
  },

  /**
   * Generates Arpeggio shapes and shape-linking bridge notes between adjacent positions.
   */
  getArpeggioShapes(rootPc, arpeggioId, tuning = Theory.getTuning()) {
    const arp = Theory.getArpeggio(arpeggioId);
    const boxes = this.getCagedBoxes(rootPc, arp.intervals, tuning);

    // Compute linking bridge notes between shape i and shape i+1
    const links = [];
    for (let i = 0; i < boxes.length - 1; i++) {
      const a = boxes[i];
      const b = boxes[i + 1];
      const bSet = new Set(b.notes.map((n) => `${n.stringIdx}:${n.fret}`));
      const shared = a.notes.filter((n) => bSet.has(`${n.stringIdx}:${n.fret}`));

      // Also find slide transitions (adjacent notes on same string within 2-4 frets)
      const slides = [];
      for (const na of a.notes) {
        const nextOnStr = b.notes.find(
          (nb) => nb.stringIdx === na.stringIdx && nb.fret > na.fret && nb.fret - na.fret <= 4
        );
        if (nextOnStr) {
          slides.push({ from: na, to: nextOnStr });
        }
      }
      links.push({
        fromShape: a.letter,
        toShape: b.letter,
        sharedNotes: shared,
        slides: slides.slice(0, 3),
      });
    }

    return {
      arpeggio: arp,
      allPositions: this.getFretboardPositions(rootPc, arp.intervals, tuning, 24),
      shapes: boxes,
      links,
    };
  },

  /**
   * Comparator: compares two note/interval sets (Scale vs Scale, Scale vs Arpeggio, Chord vs Scale)
   */
  compareSets(setA, setB) {
    // Each set: { label, rootPc, intervals }
    const pcsA = new Map();
    setA.intervals.forEach((iv) => {
      const pc = Theory.mod12(setA.rootPc + iv);
      pcsA.set(pc, { pc, iv: Theory.mod12(iv), short: Theory.getIntervalInfo(iv).short });
    });

    const pcsB = new Map();
    setB.intervals.forEach((iv) => {
      const pc = Theory.mod12(setB.rootPc + iv);
      pcsB.set(pc, { pc, iv: Theory.mod12(iv), short: Theory.getIntervalInfo(iv).short });
    });

    const useFlats = Theory.useFlatsForRoot(setA.rootPc);
    const shared = [];
    const onlyA = [];
    const onlyB = [];

    for (let pc = 0; pc < 12; pc++) {
      const inA = pcsA.has(pc);
      const inB = pcsB.has(pc);
      const note = Theory.pcToNote(pc, useFlats);
      if (inA && inB) {
        shared.push({ pc, note, intervalA: pcsA.get(pc).short, intervalB: pcsB.get(pc).short });
      } else if (inA) {
        onlyA.push({ pc, note, intervalA: pcsA.get(pc).short });
      } else if (inB) {
        onlyB.push({ pc, note, intervalB: pcsB.get(pc).short });
      }
    }

    const unionCount = shared.length + onlyA.length + onlyB.length;
    const compatibility = unionCount ? Math.round((shared.length / unionCount) * 100) : 0;
    const bInsideA = onlyB.length === 0 ? 100 : Math.round((shared.length / pcsB.size) * 100);

    return {
      shared,
      onlyA,
      onlyB,
      compatibility,
      coverageOfB: bInsideA,
    };
  },

  /**
   * Reverse Scale Finder: identifies matching scales given selected pitch classes.
   */
  identifyScale(selectedNotes) {
    if (!selectedNotes || selectedNotes.length < 3) return [];
    const uniquePcs = [...new Set(selectedNotes.map((n) => Theory.mod12(n.pc)))];
    if (uniquePcs.length < 3) return [];

    const results = [];
    const scales = Theory.getScales().filter((s) => s.id !== 'chromatic');

    for (let rootPc = 0; rootPc < 12; rootPc++) {
      for (const sc of scales) {
        const scPcs = new Set(sc.intervals.map((iv) => Theory.mod12(rootPc + iv)));
        const matched = uniquePcs.filter((p) => scPcs.has(p));
        const outside = uniquePcs.length - matched.length;
        if (outside > 0) continue; // Strict containment first

        const coverage = matched.length / scPcs.size;
        const rootBonus = uniquePcs[0] === rootPc ? 12 : 0;
        const score = Math.round(coverage * 88 + rootBonus);

        const useFlats = Theory.useFlatsForRoot(rootPc);
        results.push({
          rootPc,
          rootNote: Theory.pcToNote(rootPc, useFlats),
          scaleId: sc.id,
          scaleName: sc.name,
          fullName: `${Theory.pcToNote(rootPc, useFlats)} ${sc.name}`,
          formula: sc.formula,
          matchPercent: Math.round(coverage * 100),
          score: Math.min(100, score),
          category: sc.category,
        });
      }
    }

    results.sort((a, b) => b.score - a.score || b.matchPercent - a.matchPercent);
    return results.slice(0, 12);
  },
};
