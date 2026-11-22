/**
 * Musical AI & Voice Leading Engine
 * Suggests scales over chords, arpeggios over progressions,
 * harmonic substitutions, and optimal voice-leading shapes.
 */

import { Theory } from './theory.js';
import { ChordEngine } from './chordEngine.js';

export const HarmonyAI = {
  /**
   * Suggests the best scales to improvise over a given chord (rootPc, chordTypeId).
   */
  suggestScalesForChord(rootPc, chordTypeId) {
    const rPc = Theory.mod12(rootPc);
    const ct = Theory.getChordType(chordTypeId);
    const chordPcs = new Set(ct.intervals.map((iv) => Theory.mod12(rPc + iv)));
    const useFlats = Theory.useFlatsForRoot(rPc);
    const rootName = Theory.pcToNote(rPc, useFlats);

    const suggestions = [];
    const rules = {
      maj: ['major', 'lydian', 'pentatonic_major', 'mixolydian', 'bebop_major'],
      min: ['natural_minor', 'dorian', 'pentatonic_minor', 'phrygian', 'melodic_minor'],
      '5': ['pentatonic_minor', 'natural_minor', 'blues', 'dorian', 'phrygian'],
      '7': ['mixolydian', 'blues', 'bebop_dominant', 'lydian_dominant', 'pentatonic_minor'],
      maj7: ['major', 'lydian', 'pentatonic_major', 'bebop_major'],
      m7: ['dorian', 'natural_minor', 'pentatonic_minor', 'blues', 'phrygian'],
      m7b5: ['locrian', 'melodic_minor'],
      dim: ['diminished_wh', 'harmonic_minor'],
      dim7: ['diminished_wh', 'harmonic_minor'],
      aug: ['whole_tone', 'lydian'],
      '7#5': ['whole_tone', 'altered', 'phrygian_dominant'],
      '7b5': ['lydian_dominant', 'whole_tone', 'altered'],
      '7b9': ['diminished_hw', 'phrygian_dominant', 'altered'],
      '7#9': ['altered', 'blues', 'diminished_hw'],
      maj7_11: ['lydian'],
      'maj7#11': ['lydian', 'pentatonic_major'],
      sus2: ['major', 'mixolydian', 'pentatonic_major'],
      sus4: ['mixolydian', 'dorian', 'pentatonic_major'],
      '9': ['mixolydian', 'bebop_dominant', 'lydian_dominant', 'blues'],
      m9: ['dorian', 'natural_minor', 'pentatonic_minor'],
      maj9: ['major', 'lydian', 'pentatonic_major'],
      '13': ['mixolydian', 'lydian_dominant', 'bebop_dominant'],
      '6': ['major', 'pentatonic_major', 'lydian'],
      m6: ['dorian', 'melodic_minor'],
    };

    const preferredIds = rules[chordTypeId] || ['major', 'dorian', 'mixolydian', 'pentatonic_minor'];

    for (const scId of preferredIds) {
      const sc = Theory.getScale(scId);
      if (!sc) continue;
      const scPcs = new Set(sc.intervals.map((iv) => Theory.mod12(rPc + iv)));
      let hits = 0;
      chordPcs.forEach((p) => {
        if (scPcs.has(p)) hits++;
      });
      const match = Math.round((hits / chordPcs.size) * 100);

      // Identify color/tension notes (in scale but not in chord)
      const tensions = sc.intervals
        .filter((iv) => !chordPcs.has(Theory.mod12(rPc + iv)))
        .map((iv) => `${Theory.getIntervalInfo(iv).short} (${Theory.pcToNote(rPc + iv, useFlats)})`);

      suggestions.push({
        scaleId: sc.id,
        rootPc: rPc,
        title: `${rootName} ${sc.name}`,
        match,
        mood: sc.mood,
        characteristic: sc.characteristic,
        tensions: tensions.slice(0, 4),
        reason: match === 100
          ? 'Contém 100% das notas do acorde com tensões musicais naturais.'
          : 'Cria contraste bluesy/modal expressivo sobre o acorde.',
      });
    }

    return suggestions;
  },

  /**
   * Suggests arpeggios (direct + upper-structure superimpositions) over a progression.
   */
  suggestArpeggiosForProgression(keyPc, progChords) {
    const useFlats = Theory.useFlatsForRoot(keyPc);
    return progChords.map((ch) => {
      const cRoot = Theory.mod12(keyPc + ch.degree);
      const chordName = Theory.getChordDisplayName(cRoot, ch.type);
      const recs = [];

      // Direct arpeggio
      const directMap = {
        maj: 'maj7', maj7: 'maj7', maj9: 'maj7', 'maj7#11': 'maj7', '6': 'maj7', add9: 'maj',
        min: 'm7', m7: 'm7', m9: 'm7', m6: 'm7', m11: 'm7',
        '7': '7', '9': '7', '13': '7', '7#9': '7', '7b9': '7', '7#5': 'aug', '7b5': '7',
        m7b5: 'm7b5', dim: 'dim7', dim7: 'dim7', aug: 'aug', '5': 'min',
      };
      const primaryArp = directMap[ch.type] || 'maj7';
      recs.push({
        label: `${Theory.pcToNote(cRoot, useFlats)}${Theory.getArpeggio(primaryArp).symbol}`,
        rootPc: cRoot,
        arpId: primaryArp,
        role: 'Arpejo Direto (Notas-alvo 1-3-5-7)',
      });

      // Upper-structure superimposition (Jazz/Fusion secret!)
      if (['maj', 'maj7', 'maj9', 'maj7#11'].includes(ch.type)) {
        const thirdPc = Theory.mod12(cRoot + 4);
        recs.push({
          label: `${Theory.pcToNote(thirdPc, useFlats)}m7`,
          rootPc: thirdPc,
          arpId: 'm7',
          role: 'Superposição (destaca 3, 5, 7 e 9ª)',
        });
      } else if (['min', 'm7', 'm9', 'm11'].includes(ch.type)) {
        const b3Pc = Theory.mod12(cRoot + 3);
        recs.push({
          label: `${Theory.pcToNote(b3Pc, useFlats)}maj7`,
          rootPc: b3Pc,
          arpId: 'maj7',
          role: 'Superposição (destaca b3, 5, b7 e 9ª)',
        });
      } else if (['7', '9', '13', '7b9', '7#9'].includes(ch.type)) {
        const thirdPc = Theory.mod12(cRoot + 4);
        recs.push({
          label: `${Theory.pcToNote(thirdPc, useFlats)}m7b5`,
          rootPc: thirdPc,
          arpId: 'm7b5',
          role: 'Superposição Dominante (destaca 3, 5, b7 e 9ª)',
        });
        const b9Dim = Theory.mod12(cRoot + 1);
        recs.push({
          label: `${Theory.pcToNote(b9Dim, useFlats)}dim7`,
          rootPc: b9Dim,
          arpId: 'dim7',
          role: 'Tensão b9 (resolução forte pro próximo acorde)',
        });
      }

      return { chordName, roman: ch.roman, recommendations: recs };
    });
  },

  /**
   * Suggests harmonic substitutions for a chord in context of keyPc.
   */
  suggestSubstitutions(rootPc, chordTypeId, keyPc = rootPc) {
    const rPc = Theory.mod12(rootPc);
    const useFlats = Theory.useFlatsForRoot(keyPc);
    const subs = [];

    const ct = Theory.getChordType(chordTypeId);

    if (ct.quality === 'Dominante' || ct.quality === 'Alterado') {
      const tritonePc = Theory.mod12(rPc + 6);
      subs.push({
        type: 'Substituto Trítono (SubV7)',
        chord: `${Theory.pcToNote(tritonePc, useFlats)}7`,
        rootPc: tritonePc,
        chordTypeId: '7',
        explanation: 'Compartilha o mesmo trítono (3ª e b7ª invertidas), criando baixo cromático descendente.',
      });
      const dimPc = Theory.mod12(rPc + 4);
      subs.push({
        type: 'Diminuto sobre a 3ª',
        chord: `${Theory.pcToNote(dimPc, useFlats)}dim7`,
        rootPc: dimPc,
        chordTypeId: 'dim7',
        explanation: 'Equivale ao dominante com b9 sem a tônica — tensão elegante para resolução.',
      });
      subs.push({
        type: 'Dominante Alterado',
        chord: `${Theory.pcToNote(rPc, useFlats)}7#5`,
        rootPc: rPc,
        chordTypeId: '7#5',
        explanation: 'Adiciona a #5 puxando dramaticamente para a 3ª do acorde de resolução.',
      });
    } else if (ct.quality === 'Maior') {
      const relMin = Theory.mod12(rPc + 9);
      subs.push({
        type: 'Relativo Menor (vi)',
        chord: `${Theory.pcToNote(relMin, useFlats)}m7`,
        rootPc: relMin,
        chordTypeId: 'm7',
        explanation: 'Compartilha 3 notas em comum, mantendo a função tônica com cor mais emocional.',
      });
      const mediant = Theory.mod12(rPc + 4);
      subs.push({
        type: 'Mediante Menor (iii)',
        chord: `${Theory.pcToNote(mediant, useFlats)}m7`,
        rootPc: mediant,
        chordTypeId: 'm7',
        explanation: 'Substituição de tônica sofisticada (notas 3-5-7-9 do acorde original).',
      });
      subs.push({
        type: 'Cor Lídia / Extensão',
        chord: `${Theory.pcToNote(rPc, useFlats)}maj9`,
        rootPc: rPc,
        chordTypeId: 'maj9',
        explanation: 'Enriquece a tríade maior adicionando 7ª maior e 9ª sem mudar a função.',
      });
    } else if (ct.quality === 'Menor') {
      const relMaj = Theory.mod12(rPc + 3);
      subs.push({
        type: 'Relativo Maior (bIII)',
        chord: `${Theory.pcToNote(relMaj, useFlats)}maj7`,
        rootPc: relMaj,
        chordTypeId: 'maj7',
        explanation: 'Substituição diatônica direta com 3 notas compartilhadas.',
      });
      subs.push({
        type: 'Empréstimo Dórico (m6)',
        chord: `${Theory.pcToNote(rPc, useFlats)}m6`,
        rootPc: rPc,
        chordTypeId: 'm6',
        explanation: 'Traz o brilho da 6ª maior do modo Dórico — ideal para Funk, Jazz e Bossa.',
      });
      const secDom = Theory.mod12(rPc + 7);
      subs.push({
        type: 'Dominante Secundária (V7/alvo)',
        chord: `${Theory.pcToNote(secDom, useFlats)}7`,
        rootPc: secDom,
        chordTypeId: '7',
        explanation: 'Insira este acorde antes para preparar a chegada com forte atração harmônica.',
      });
    } else {
      const minorSub = Theory.mod12(rPc + 3);
      subs.push({
        type: 'Menor com 6ª (Inversão)',
        chord: `${Theory.pcToNote(minorSub, useFlats)}m6`,
        rootPc: minorSub,
        chordTypeId: 'm6',
        explanation: 'Meio-diminuto e menor com 6ª a uma terça menor acima possuem exatamente as mesmas 4 notas!',
      });
    }

    return subs;
  },

  /**
   * Selects optimal voice-led shapes across a chord progression,
   * minimizing total fret/pitch movement between consecutive chords.
   */
  computeVoiceLeading(keyPc, progChords, tuning = Theory.getTuning()) {
    const selectedShapes = [];
    const transitions = [];

    for (let i = 0; i < progChords.length; i++) {
      const ch = progChords[i];
      const cRoot = Theory.mod12(keyPc + ch.degree);
      const voicings = ChordEngine.getVoicings(cRoot, ch.type, tuning);

      if (!voicings.length) {
        selectedShapes.push(null);
        continue;
      }

      if (i === 0) {
        // Pick highest-scoring ergonomic shape near frets 0..7
        const starter = voicings.find((v) => v.minFret <= 7) || voicings[0];
        selectedShapes.push(starter);
      } else {
        const prev = selectedShapes[i - 1];
        if (!prev) {
          selectedShapes.push(voicings[0]);
          continue;
        }
        const prevMidis = prev.stringNotes.filter((n) => !n.muted).map((n) => n.midi);
        const prevAvgFret = (prev.minFret + prev.maxFret) / 2;

        // Score each candidate by voice-leading smoothness + playability
        let best = voicings[0];
        let bestCost = Infinity;

        for (const cand of voicings.slice(0, 18)) {
          const candMidis = cand.stringNotes.filter((n) => !n.muted).map((n) => n.midi);
          const candAvgFret = (cand.minFret + cand.maxFret) / 2;

          // Sum minimum pitch distance from each note in prev to cand
          let pitchDist = 0;
          for (const pm of prevMidis) {
            let minD = 99;
            for (const cm of candMidis) {
              minD = Math.min(minD, Math.abs(cm - pm));
            }
            pitchDist += minD;
          }
          const avgPitchDist = pitchDist / Math.max(1, prevMidis.length);
          const fretJump = Math.abs(candAvgFret - prevAvgFret);
          const cost = avgPitchDist * 2.5 + fretJump * 1.8 - cand.score * 0.08;

          if (cost < bestCost) {
            bestCost = cost;
            best = cand;
          }
        }
        selectedShapes.push(best);

        // Build detailed transition analysis
        const prevNotes = prev.stringNotes.filter((n) => !n.muted);
        const nextNotes = best.stringNotes.filter((n) => !n.muted);
        const commonNotes = [];
        const movements = [];

        const prevPcs = new Set(prevNotes.map((n) => n.pc));
        const nextPcs = new Set(nextNotes.map((n) => n.pc));
        const useFlats = Theory.useFlatsForRoot(keyPc);

        prevPcs.forEach((pc) => {
          if (nextPcs.has(pc)) commonNotes.push(Theory.pcToNote(pc, useFlats));
        });

        // Pair top 4 voices
        const topPrev = prevNotes.slice(-4);
        const topNext = nextNotes.slice(-4);
        const count = Math.min(topPrev.length, topNext.length);
        let totalSemitones = 0;

        for (let v = 0; v < count; v++) {
          const delta = topNext[v].midi - topPrev[v].midi;
          totalSemitones += Math.abs(delta);
          movements.push({
            from: topPrev[v].note,
            to: topNext[v].note,
            delta,
            type: delta === 0 ? 'Nota Comum' : Math.abs(delta) <= 2 ? 'Grau Conjunto' : 'Salto',
          });
        }

        transitions.push({
          fromChord: prev.symbol,
          toChord: best.symbol,
          commonNotes,
          movements,
          smoothness: Math.max(40, Math.min(100, Math.round(100 - totalSemitones * 4))),
        });
      }
    }

    return { shapes: selectedShapes, transitions };
  },
};
