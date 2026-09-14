// Pure game logic for Colorfle Unlimited.
// Kept free of React/DOM imports so it can be unit-tested with plain Node.

// --- PALETTE DEFINITION (Sorted by Hue/Rainbow order) ---
export const ALL_PALETTE = [
  // Reds & Pinks
  { id: 'red', name: 'Red', hex: '#EF4444', code: 'RED', level: 1 },
  { id: 'crimson', name: 'Crimson', hex: '#DC2626', code: 'CRI', level: 3 },
  { id: 'magenta', name: 'Magenta', hex: '#E11D48', code: 'MAG', level: 3 },
  { id: 'pink', name: 'Pink', hex: '#F472B6', code: 'PNK', level: 2 },
  // Purples
  { id: 'purple', name: 'Purple', hex: '#9333EA', code: 'PUR', level: 1 },
  { id: 'lavender', name: 'Lavender', hex: '#C084FC', code: 'LAV', level: 3 },
  // Blues
  { id: 'navy', name: 'Navy', hex: '#1E3A8A', code: 'NVY', level: 3 },
  { id: 'blue', name: 'Blue', hex: '#2563EB', code: 'BLU', level: 1 },
  { id: 'cyan', name: 'Cyan', hex: '#06B6D4', code: 'CYN', level: 1 },
  // Greens
  { id: 'teal', name: 'Teal', hex: '#0D9488', code: 'TEA', level: 2 },
  { id: 'green', name: 'Green', hex: '#16A34A', code: 'GRN', level: 1 },
  { id: 'green_lime', name: 'Lime', hex: '#84CC16', code: 'LIM', level: 2 },
  // Yellows & Oranges
  { id: 'yellow', name: 'Yellow', hex: '#FACC15', code: 'YEL', level: 1 },
  { id: 'orange', name: 'Orange', hex: '#FB923C', code: 'ORA', level: 1 },
  // Earth
  { id: 'brown_light', name: 'Tan', hex: '#D97706', code: 'TAN', level: 2 },
  { id: 'brown', name: 'Brown', hex: '#78350F', code: 'BRO', level: 1 },
  // Grayscale & Neutrals
  { id: 'cream', name: 'Cream', hex: '#FFF2C6', code: 'CRE', level: 3 },
  { id: 'white', name: 'White', hex: '#FFFFFF', code: 'WHI', level: 1 },
  { id: 'gray', name: 'Gray', hex: '#6B7280', code: 'GRA', level: 2 },
  { id: 'black', name: 'Black', hex: '#111827', code: 'BLA', level: 1 }
];

export const PALETTE_MAP = ALL_PALETTE.reduce((acc, curr) => {
  acc[curr.id] = curr;
  return acc;
}, {});

export const paletteBySize = (size) =>
  ALL_PALETTE.filter((c) => {
    if (size === 10) return c.level === 1;
    if (size === 15) return c.level <= 2;
    return true; // 20
  });

// --- COLOR MATH & BLENDING HELPERS ---
export const hexToRgb = (hex) => {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

export const rgbToHex = (r, g, b) => {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
};

// Weighted square-root RGB blending
export const blendColorsWeighted = (recipe, weights) => {
  if (!recipe || recipe.length === 0) return '#2B2D42';
  let sumR2 = 0, sumG2 = 0, sumB2 = 0;
  let totalW = 0;

  recipe.forEach((id, idx) => {
    const item = PALETTE_MAP[id];
    const w = weights[idx] || (1 / recipe.length);
    if (item) {
      const { r, g, b } = hexToRgb(item.hex);
      sumR2 += (r * r) * w;
      sumG2 += (g * g) * w;
      sumB2 += (b * b) * w;
      totalW += w;
    }
  });

  if (totalW === 0) return '#2B2D42';
  return rgbToHex(
    Math.sqrt(sumR2 / totalW),
    Math.sqrt(sumG2 / totalW),
    Math.sqrt(sumB2 / totalW)
  );
};

// CIELAB Perceptual Color Distance
export const rgbToLab = (r, g, b) => {
  let r1 = r / 255, g1 = g / 255, b1 = b / 255;
  r1 = r1 > 0.04045 ? Math.pow((r1 + 0.055) / 1.055, 2.4) : r1 / 12.92;
  g1 = g1 > 0.04045 ? Math.pow((g1 + 0.055) / 1.055, 2.4) : g1 / 12.92;
  b1 = b1 > 0.04045 ? Math.pow((b1 + 0.055) / 1.055, 2.4) : b1 / 12.92;

  let x = (r1 * 0.4124 + g1 * 0.3576 + b1 * 0.1805) / 0.95047;
  let y = (r1 * 0.2126 + g1 * 0.7152 + b1 * 0.0722) / 1.00000;
  let z = (r1 * 0.0193 + g1 * 0.1192 + b1 * 0.9505) / 1.08883;

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

  return { l: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
};

export const deltaE = (rgb1, rgb2) => {
  const lab1 = rgbToLab(rgb1.r, rgb1.g, rgb1.b);
  const lab2 = rgbToLab(rgb2.r, rgb2.g, rgb2.b);
  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
};

// A perfect 100% requires the exact recipe:
//   - even split: same multiset of colors (order free)
//   - uneven split: same colors in the same slot order
// Near-identical blends from a DIFFERENT recipe honestly cap at 99.9,
// otherwise the game could declare a win while showing a different target mix.
export const calculateAccuracy = (targetRecipe, targetWeights, guessRecipe, splitMode) => {
  if (splitMode === 'even') {
    const sortedTarget = [...targetRecipe].sort().join(',');
    const sortedGuess = [...guessRecipe].sort().join(',');
    if (sortedTarget === sortedGuess) return 100.0;
  } else {
    if (targetRecipe.length === guessRecipe.length && targetRecipe.every((col, i) => col === guessRecipe[i])) {
      return 100.0;
    }
  }

  const targetHex = blendColorsWeighted(targetRecipe, targetWeights);
  const guessHex = blendColorsWeighted(guessRecipe, targetWeights);
  const dE = deltaE(hexToRgb(targetHex), hexToRgb(guessHex));

  const rawAcc = Math.max(0, 100 - (dE / 1.12));
  return Math.min(99.9, Math.round(rawAcc * 10) / 10);
};

// Wordle Tile Evaluator (order-insensitive matches in even split mode)
export const evaluateTileStatuses = (targetRecipe, guessRecipe, splitMode) => {
  const result = new Array(guessRecipe.length).fill('absent');
  const targetPool = [...targetRecipe];

  // Pass 1: matches (in even mode ANY pool match counts, order is free)
  for (let i = 0; i < guessRecipe.length; i++) {
    if (guessRecipe[i] === targetRecipe[i]) {
      result[i] = 'correct';
      const idx = targetPool.indexOf(guessRecipe[i]);
      if (idx !== -1) targetPool.splice(idx, 1);
    } else if (splitMode === 'even') {
      const idx = targetPool.indexOf(guessRecipe[i]);
      if (idx !== -1) {
        result[i] = 'correct';
        targetPool.splice(idx, 1);
      }
    }
  }

  // Pass 2: present in wrong slot (only meaningful in uneven mode)
  if (splitMode === 'uneven') {
    for (let i = 0; i < guessRecipe.length; i++) {
      if (result[i] !== 'correct') {
        const idx = targetPool.indexOf(guessRecipe[i]);
        if (idx !== -1) {
          result[i] = 'present';
          targetPool.splice(idx, 1);
        }
      }
    }
  }

  return result;
};

// SVG Matrix Filters for Colorblindness simulation.
// Values mirrored exactly in ChromaSight Profiler so a measured profile
// previews identically there and applies identically here.
export const CB_BASE_MATRICES = {
  protanopia: [0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0],
  deuteranopia: [0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0],
  tritanopia: [0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0],
  achromatopsia: [0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0, 0, 0, 1, 0]
};
export const CB_TYPES = ['protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia'];
const CB_IDENTITY = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];

export const getInterpolatedMatrix = (type, strength) => {
  const target = CB_BASE_MATRICES[type];
  if (!target) return CB_IDENTITY.join(',');
  return target.map((val, i) => CB_IDENTITY[i] + (val - CB_IDENTITY[i]) * strength).join(',');
};

// Apply the interpolated colorblind matrix to a hex color directly.
// Used instead of an SVG filter on the root: composited/animated layers
// (transforms, transitions) escape reference filters in some browsers,
// which made colors flicker between simulated and normal. Applying the
// matrix in JS to each color is deterministic and stays consistent.
export const applyCbMatrix = (hex, type, strength) => {
  if (!type || !(strength > 0)) return hex;
  const m = getInterpolatedMatrix(type, strength).split(',').map(Number);
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    m[0] * r + m[1] * g + m[2] * b + m[3] * 255,
    m[5] * r + m[6] * g + m[7] * b + m[8] * 255,
    m[10] * r + m[11] * g + m[12] * b + m[13] * 255
  );
};

// Preset exponential weight distributions (Top = Largest, Bottom = Smallest)
export const FIXED_UNEVEN_WEIGHTS = {
  2: [0.65, 0.35],
  3: [0.50, 0.35, 0.15],
  4: [0.45, 0.30, 0.15, 0.10],
  5: [0.40, 0.28, 0.18, 0.09, 0.05],
  6: [0.36, 0.26, 0.18, 0.11, 0.06, 0.03]
};

export const generateWeights = (count, mode) => {
  if (mode === 'even') {
    return new Array(count).fill(1 / count);
  }
  return FIXED_UNEVEN_WEIGHTS[count] || FIXED_UNEVEN_WEIGHTS[3];
};

// --- DETERMINISTIC RNG (for reproducible daily puzzles) ---
export const strHash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Local calendar date (not UTC) so the daily puzzle rolls over at the
// player's own midnight instead of 00:00 UTC.
export const getLocalDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const msUntilLocalMidnight = (now = new Date()) => {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
};

export const formatDuration = (ms) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// Builds the target recipe. Daily mode is fully deterministic from
// (localDate, count, splitMode, duplicates, paletteSize) so everyone
// who plays the same config on the same day gets the identical puzzle.
export const generateTargetRecipe = (palette, { count, allowDuplicates, seedStr }) => {
  const rand = seedStr ? mulberry32(strHash(seedStr)) : Math.random;
  const recipe = [];

  if (allowDuplicates) {
    for (let i = 0; i < count; i++) {
      recipe.push(palette[Math.floor(rand() * palette.length)].id);
    }
  } else {
    const available = [...palette];
    const n = Math.min(count, available.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rand() * available.length);
      recipe.push(available[idx].id);
      available.splice(idx, 1);
    }
  }
  return recipe;
};

// --- CHROMASIGHT PROFILE HANDOFF ---
// Profiles look like: { v: 2, type: 'deuteranopia', strength: 0.62,
//   axes: { protanopia: 0.08, deuteranopia: 0.62, tritanopia: 0.05 }, testedAt: '2026-09-13' }
// v1 profiles ({ type, strength }) remain fully supported.
export const normalizeProfile = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  if (!CB_TYPES.includes(raw.type)) return null;

  let strength = Number(raw.strength);
  if (!Number.isFinite(strength)) strength = 1;
  strength = Math.max(0, Math.min(1, strength));

  const profile = { type: raw.type, strength };
  if (raw.axes && typeof raw.axes === 'object') {
    const axes = {};
    CB_TYPES.forEach((t) => {
      const v = Number(raw.axes[t]);
      if (Number.isFinite(v)) axes[t] = Math.max(0, Math.min(1, v));
    });
    if (Object.keys(axes).length) profile.axes = axes;
  }
  if (raw.testedAt) profile.testedAt = String(raw.testedAt);
  return profile;
};

export const parseProfileJson = (text) => {
  try {
    return normalizeProfile(JSON.parse(text));
  } catch (e) {
    return null;
  }
};

// URL-safe base64 helpers (profile JSON is ASCII-only)
export const encodeProfileB64 = (profile) =>
  btoa(JSON.stringify(profile)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const decodeProfileB64 = (encoded) => {
  try {
    let s = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return parseProfileJson(atob(s));
  } catch (e) {
    return null;
  }
};

// --- SHARE TEXT (Wordle-style) ---
const STATUS_EMOJI = { correct: '🟩', present: '🟨', absent: '⬛' };

export const buildShareText = ({ guesses, gameMode, won, maxAttempts, colorCount, splitMode, paletteSize, dailyDate }) => {
  const lines = [];
  const modeLabel = gameMode === 'daily' ? `Daily ${dailyDate}` : 'Unlimited';
  lines.push(`Colorfle ${modeLabel} — ${colorCount} colors • ${splitMode} • ${paletteSize} palette`);

  guesses.forEach((g) => {
    const row = g.recipe.map((_, i) => STATUS_EMOJI[g.statuses[i]] || '⬛').join('');
    lines.push(`${row} ${g.accuracy.toFixed(1)}%`);
  });

  const limit = maxAttempts === '∞' ? '∞' : maxAttempts;
  lines.push(won ? `Solved in ${guesses.length}/${limit} 🎉` : `Out of attempts (${limit})`);
  lines.push('https://colorfle-unlimited.vercel.app');
  return lines.join('\n');
};

// --- STATS ---
export const blankStats = () => ({
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  totalAccuracy: 0,
  totalGuessesForWins: 0,
  totalGuessesAll: 0,
  guessDistribution: {}
});

export const makeConfigKey = (colorCount, splitMode, wordleMode, allowDuplicates, maxAttempts, paletteSize) =>
  [colorCount, splitMode, wordleMode ? 'w' : 'nw', allowDuplicates ? 'd' : 'nd', maxAttempts, paletteSize].join('_');

export const getContrastTextColor = (hex) => {
  const rgb = hexToRgb(hex);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 140 ? 'text-slate-950 font-black' : 'text-white font-black';
};
