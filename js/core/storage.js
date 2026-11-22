/**
 * Persistent LocalStorage Manager
 * Handles Favorites, Quiz History/Stats, Composer Songs,
 * Fretboard Heatmap counts, and User Preferences.
 */

const KEYS = {
  FAVORITES: 'csl_favorites_v1',
  QUIZ: 'csl_quiz_history_v1',
  SONGS: 'csl_composer_songs_v1',
  HEATMAP: 'csl_fretboard_heatmap_v1',
  PREFS: 'csl_prefs_v1',
};

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota fallback
  }
}

export const Storage = {
  // --- Preferences ---
  getPrefs() {
    return safeRead(KEYS.PREFS, {
      theme: 'dark',
      tuning: 'standard',
      guitarTone: 'acoustic',
      bpm: 100,
    });
  },

  savePrefs(partial) {
    const merged = { ...this.getPrefs(), ...partial };
    safeWrite(KEYS.PREFS, merged);
    return merged;
  },

  // --- Favorites (chords, scales, progressions, shapes) ---
  getFavorites() {
    return safeRead(KEYS.FAVORITES, {
      chords: [],
      scales: [],
      progressions: [],
      shapes: [],
    });
  },

  isFavorite(category, id) {
    const favs = this.getFavorites();
    return (favs[category] || []).some((item) => item.id === id);
  },

  toggleFavorite(category, item) {
    const favs = this.getFavorites();
    if (!favs[category]) favs[category] = [];
    const idx = favs[category].findIndex((x) => x.id === item.id);
    let added = false;
    if (idx >= 0) {
      favs[category].splice(idx, 1);
    } else {
      favs[category].unshift({ ...item, savedAt: Date.now() });
      added = true;
    }
    safeWrite(KEYS.FAVORITES, favs);
    return added;
  },

  removeFavorite(category, id) {
    const favs = this.getFavorites();
    if (!favs[category]) return;
    favs[category] = favs[category].filter((x) => x.id !== id);
    safeWrite(KEYS.FAVORITES, favs);
  },

  // --- Quiz Performance History ---
  getQuizStats() {
    return safeRead(KEYS.QUIZ, {
      totalCorrect: 0,
      totalWrong: 0,
      bestStreak: 0,
      sessions: [],
    });
  },

  recordQuizSession(session) {
    const stats = this.getQuizStats();
    stats.totalCorrect += session.correct;
    stats.totalWrong += session.wrong;
    stats.bestStreak = Math.max(stats.bestStreak, session.bestStreak || 0);
    stats.sessions.unshift({
      ...session,
      date: Date.now(),
    });
    stats.sessions = stats.sessions.slice(0, 30);
    safeWrite(KEYS.QUIZ, stats);
    return stats;
  },

  clearQuizStats() {
    safeWrite(KEYS.QUIZ, { totalCorrect: 0, totalWrong: 0, bestStreak: 0, sessions: [] });
  },

  // --- Composer Songs ---
  getSongs() {
    const songs = safeRead(KEYS.SONGS, null);
    if (songs && songs.length) return songs;
    // Seed with a demo song so the composer immediately shines
    const starter = [
      {
        id: 'song_demo_1',
        title: 'Midnight Groove em Am',
        keyPc: 9,
        bpm: 108,
        updatedAt: Date.now(),
        sections: [
          {
            id: 'sec_1',
            type: 'Verso',
            scaleId: 'dorian',
            scaleRootPc: 9,
            chords: [
              { rootPc: 9, type: 'm7', beats: 4 },
              { rootPc: 2, type: '9', beats: 4 },
              { rootPc: 9, type: 'm7', beats: 4 },
              { rootPc: 2, type: '13', beats: 4 },
            ],
            notes: 'Levada funk suave nas cordas agudas (palhetada abafada).',
          },
          {
            id: 'sec_2',
            type: 'Pré-Refrão',
            scaleId: 'natural_minor',
            scaleRootPc: 9,
            chords: [
              { rootPc: 5, type: 'maj7', beats: 4 },
              { rootPc: 4, type: 'm7', beats: 4 },
              { rootPc: 2, type: 'm7', beats: 4 },
              { rootPc: 4, type: '7#5', beats: 4 },
            ],
            notes: 'Crescer dinâmica até o dominante alterado.',
          },
          {
            id: 'sec_3',
            type: 'Refrão',
            scaleId: 'pentatonic_minor',
            scaleRootPc: 9,
            chords: [
              { rootPc: 9, type: 'm7', beats: 4 },
              { rootPc: 5, type: 'maj7', beats: 4 },
              { rootPc: 0, type: 'maj7', beats: 4 },
              { rootPc: 7, type: 'maj', beats: 4 },
            ],
            notes: 'Acordes abertos com brilho e groove firme.',
          },
          {
            id: 'sec_4',
            type: 'Solo',
            scaleId: 'blues',
            scaleRootPc: 9,
            chords: [
              { rootPc: 9, type: 'm7', beats: 4 },
              { rootPc: 2, type: '7', beats: 4 },
              { rootPc: 5, type: 'maj7', beats: 4 },
              { rootPc: 4, type: '7#9', beats: 4 },
            ],
            notes: 'Misturar A Dórico com A Blues (blue note Eb) nas casas 5–12.',
          },
        ],
      },
    ];
    safeWrite(KEYS.SONGS, starter);
    return starter;
  },

  saveSongs(songs) {
    safeWrite(KEYS.SONGS, songs);
  },

  // --- Fretboard Heatmap ---
  getHeatmap() {
    const saved = safeRead(KEYS.HEATMAP, null);
    if (saved) return saved;
    // Initialize realistic baseline ergonomic guitar heatmap (frets 0-12 hot zones)
    const baseline = {};
    const hotFrets = [0, 2, 3, 5, 7, 8, 9, 10, 12, 14, 15];
    for (let s = 0; s < 7; s++) {
      for (let f = 0; f <= 24; f++) {
        let weight = 1;
        if (f <= 3) weight += 6;
        else if (f >= 5 && f <= 9) weight += 9;
        else if (f >= 10 && f <= 15) weight += 5;
        if (hotFrets.includes(f)) weight += 3;
        if (s >= 1 && s <= 4) weight += 2;
        baseline[`${s}:${f}`] = weight;
      }
    }
    return baseline;
  },

  recordFretHeat(stringIdx, fret, amount = 3) {
    const map = this.getHeatmap();
    const key = `${stringIdx}:${fret}`;
    map[key] = (map[key] || 0) + amount;
    safeWrite(KEYS.HEATMAP, map);
    return map;
  },

  resetHeatmap() {
    localStorage.removeItem(KEYS.HEATMAP);
    return this.getHeatmap();
  },
};
