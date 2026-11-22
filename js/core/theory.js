/**
 * Core Music Theory Engine
 * Loads structured JSON datasets and provides pitch, interval, note spelling,
 * tuning, and transposition primitives across the entire application.
 */

export const Theory = {
  data: null,
  chordsData: null,
  scalesData: null,
  progressionsData: null,
  currentTuningId: 'standard',
  preferFlats: false,

  async init() {
    const [theoryRes, chordsRes, scalesRes, progRes] = await Promise.all([
      fetch('./data/music-theory.json'),
      fetch('./data/chords.json'),
      fetch('./data/scales.json'),
      fetch('./data/progressions.json'),
    ]);

    this.data = await theoryRes.json();
    this.chordsData = await chordsRes.json();
    this.scalesData = await scalesRes.json();
    this.progressionsData = await progRes.json();

    return this;
  },

  getTunings() {
    return this.data.tunings;
  },

  getTuning(id = this.currentTuningId) {
    return this.data.tunings.find((t) => t.id === id) || this.data.tunings[0];
  },

  setTuning(id) {
    if (this.data.tunings.some((t) => t.id === id)) {
      this.currentTuningId = id;
    }
    return this.getTuning();
  },

  mod12(n) {
    return ((n % 12) + 12) % 12;
  },

  useFlatsForRoot(rootPc) {
    if (this.preferFlats) return true;
    return this.data.preferFlatsRoots.includes(this.mod12(rootPc));
  },

  pcToNote(pc, useFlats = false) {
    const p = this.mod12(pc);
    return useFlats ? this.data.notesFlat[p] : this.data.notesSharp[p];
  },

  noteToPc(noteName) {
    if (!noteName) return 0;
    const clean = noteName.trim().replace(/m.*$/, '');
    let idx = this.data.notesSharp.indexOf(clean);
    if (idx !== -1) return idx;
    idx = this.data.notesFlat.indexOf(clean);
    return idx !== -1 ? idx : 0;
  },

  midiToNote(midi, useFlats = false) {
    const pc = this.mod12(midi);
    const octave = Math.floor(midi / 12) - 1;
    return `${this.pcToNote(pc, useFlats)}${octave}`;
  },

  midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  getFretMidi(stringIdx, fret, tuning = this.getTuning()) {
    return tuning.midi[stringIdx] + fret;
  },

  getFretPc(stringIdx, fret, tuning = this.getTuning()) {
    return this.mod12(tuning.midi[stringIdx] + fret);
  },

  getIntervalInfo(semitones) {
    const s = this.mod12(semitones);
    return this.data.intervals[s];
  },

  getIntervalColor(semitones) {
    return this.getIntervalInfo(semitones).color;
  },

  getChordTypes() {
    return this.chordsData.chordTypes;
  },

  getChordType(id) {
    return this.chordsData.chordTypes.find((c) => c.id === id) || this.chordsData.chordTypes[0];
  },

  getScales() {
    return this.scalesData.scales;
  },

  getScale(id) {
    return this.scalesData.scales.find((s) => s.id === id) || this.scalesData.scales[0];
  },

  getArpeggios() {
    return this.scalesData.arpeggios;
  },

  getArpeggio(id) {
    return this.scalesData.arpeggios.find((a) => a.id === id) || this.scalesData.arpeggios[0];
  },

  getParentSystems() {
    return this.scalesData.parentSystems;
  },

  getProgressions() {
    return this.progressionsData.progressions;
  },

  getGenres() {
    return this.progressionsData.genres;
  },

  getCircleOfFifths() {
    return this.data.circleOfFifths;
  },

  getCagedColor(letter) {
    return this.data.cagedColors[letter] || '#f59e0b';
  },

  getChordNotes(rootPc, chordTypeId) {
    const ct = this.getChordType(chordTypeId);
    const useFlats = this.useFlatsForRoot(rootPc);
    return ct.intervals.map((iv) => ({
      pc: this.mod12(rootPc + iv),
      note: this.pcToNote(rootPc + iv, useFlats),
      interval: iv,
      short: this.getIntervalInfo(iv).short,
      degree: this.getIntervalInfo(iv).degree,
      name: this.getIntervalInfo(iv).name,
      color: this.getIntervalInfo(iv).color,
    }));
  },

  getChordDisplayName(rootPc, chordTypeId, bassPc = null) {
    const ct = this.getChordType(chordTypeId);
    const useFlats = this.useFlatsForRoot(rootPc);
    const rootName = this.pcToNote(rootPc, useFlats);
    const base = `${rootName}${ct.symbol}`;
    if (bassPc !== null && this.mod12(bassPc) !== this.mod12(rootPc)) {
      return `${base}/${this.pcToNote(bassPc, useFlats)}`;
    }
    return base;
  },

  getScaleNotes(rootPc, scaleId) {
    const sc = this.getScale(scaleId);
    const useFlats = this.useFlatsForRoot(rootPc);
    return sc.intervals.map((iv, idx) => ({
      pc: this.mod12(rootPc + iv),
      note: this.pcToNote(rootPc + iv, useFlats),
      interval: iv,
      stepIndex: idx + 1,
      short: this.getIntervalInfo(iv).short,
      degree: this.getIntervalInfo(iv).degree,
      name: this.getIntervalInfo(iv).name,
      color: this.getIntervalInfo(iv).color,
    }));
  },

  getInversions(rootPc, chordTypeId) {
    const notes = this.getChordNotes(rootPc, chordTypeId);
    const labels = ['Posição Fundamental', '1ª Inversão', '2ª Inversão', '3ª Inversão', '4ª Inversão'];
    return notes.slice(0, 4).map((n, idx) => ({
      index: idx,
      label: labels[idx] || `${idx}ª Inversão`,
      bassNote: n.note,
      bassPc: n.pc,
      bassInterval: n.short,
      symbol: this.getChordDisplayName(rootPc, chordTypeId, n.pc),
      orderedNotes: [...notes.slice(idx), ...notes.slice(0, idx)].map((x) => x.note),
    }));
  },

  getAllRoots() {
    return [
      { pc: 0, label: 'C' },
      { pc: 1, label: 'C# / Db', short: 'Db' },
      { pc: 2, label: 'D' },
      { pc: 3, label: 'D# / Eb', short: 'Eb' },
      { pc: 4, label: 'E' },
      { pc: 5, label: 'F' },
      { pc: 6, label: 'F# / Gb', short: 'F#' },
      { pc: 7, label: 'G' },
      { pc: 8, label: 'G# / Ab', short: 'Ab' },
      { pc: 9, label: 'A' },
      { pc: 10, label: 'A# / Bb', short: 'Bb' },
      { pc: 11, label: 'B' },
    ];
  },
};
