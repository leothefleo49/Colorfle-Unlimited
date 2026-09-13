import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PALETTE,
  PALETTE_MAP,
  paletteBySize,
  hexToRgb,
  rgbToHex,
  blendColorsWeighted,
  rgbToLab,
  deltaE,
  calculateAccuracy,
  evaluateTileStatuses,
  generateWeights,
  FIXED_UNEVEN_WEIGHTS,
  generateTargetRecipe,
  getLocalDateStr,
  msUntilLocalMidnight,
  formatDuration,
  strHash,
  mulberry32,
  normalizeProfile,
  parseProfileJson,
  encodeProfileB64,
  decodeProfileB64,
  buildShareText,
  blankStats,
  makeConfigKey,
  getContrastTextColor,
  CB_TYPES,
  getInterpolatedMatrix
} from './game.js';

// ---- palette ----
test('palette has 20 unique ids and valid hex codes', () => {
  assert.equal(ALL_PALETTE.length, 20);
  assert.equal(new Set(ALL_PALETTE.map((c) => c.id)).size, 20);
  ALL_PALETTE.forEach((c) => assert.match(c.hex, /^#[0-9A-Fa-f]{6}$/));
});

test('paletteBySize filters by difficulty level', () => {
  assert.equal(paletteBySize(10).length, 10);
  assert.equal(paletteBySize(15).length, 15);
  assert.equal(paletteBySize(20).length, 20);
});

// ---- color math ----
test('hexToRgb / rgbToHex round trip', () => {
  const hexes = ['#EF4444', '#111827', '#FFFFFF', '#000000', '#9333EA'];
  hexes.forEach((h) => {
    const { r, g, b } = hexToRgb(h);
    assert.equal(rgbToHex(r, g, b).toUpperCase(), h.toUpperCase());
  });
});

test('blendColorsWeighted of identical colors equals that color', () => {
  const w = generateWeights(3, 'even');
  const hex = blendColorsWeighted(['red', 'red', 'red'], w);
  assert.equal(hex.toUpperCase(), '#EF4444');
});

test('blendColorsWeighted is symmetric under reorder for even weights', () => {
  const w = generateWeights(3, 'even');
  const a = blendColorsWeighted(['red', 'blue', 'yellow'], w);
  const b = blendColorsWeighted(['yellow', 'red', 'blue'], w);
  assert.equal(a, b);
});

test('uneven weights make slot order matter', () => {
  const w = generateWeights(2, 'uneven');
  assert.equal(w.length, 2);
  assert.equal(FIXED_UNEVEN_WEIGHTS[5].length, 5);
  const a = blendColorsWeighted(['white', 'black'], w);
  const b = blendColorsWeighted(['black', 'white'], w);
  assert.notEqual(a, b);
});

// ---- accuracy honesty (regression: no more false 100% from visually-similar blends) ----
test('exact recipe scores 100 in uneven mode', () => {
  const w = generateWeights(3, 'uneven');
  const acc = calculateAccuracy(['red', 'blue', 'green'], w, ['red', 'blue', 'green'], 'uneven');
  assert.equal(acc, 100.0);
});

test('same colors in wrong ORDER cannot reach 100 in uneven mode', () => {
  const w = generateWeights(3, 'uneven');
  const acc = calculateAccuracy(['red', 'blue', 'green'], w, ['blue', 'red', 'green'], 'uneven');
  assert.ok(acc < 100, `expected < 100, got ${acc}`);
});

test('near-identical blend from different recipe cannot reach 100 in uneven mode', () => {
  // crimson vs magenta are visually close; swapping them must not score 100
  const w = generateWeights(3, 'uneven');
  const target = ['crimson', 'magenta', 'white'];
  const guess = ['magenta', 'crimson', 'white'];
  const acc = calculateAccuracy(target, w, guess, 'uneven');
  assert.ok(acc < 100, `expected < 100, got ${acc}`);
});

test('even mode: exact multiset scores 100 regardless of order', () => {
  const w = generateWeights(3, 'even');
  const acc = calculateAccuracy(['red', 'blue', 'green'], w, ['green', 'red', 'blue'], 'even');
  assert.equal(acc, 100.0);
});

test('even mode: wrong set cannot reach 100 even if visually identical', () => {
  const w = generateWeights(2, 'even');
  const acc = calculateAccuracy(['crimson', 'white'], w, ['magenta', 'white'], 'even');
  assert.ok(acc < 100, `expected < 100, got ${acc}`);
});

test('completely wrong guess scores low but non-negative', () => {
  const w = generateWeights(3, 'even');
  const acc = calculateAccuracy(['white', 'white', 'white'], w, ['black', 'black', 'black'], 'even');
  assert.ok(acc >= 0 && acc < 50);
});

// ---- tile statuses ----
test('uneven statuses: correct, present, absent', () => {
  const st = evaluateTileStatuses(['red', 'blue', 'green'], ['blue', 'red', 'pink'], 'uneven');
  assert.deepEqual(st, ['present', 'present', 'absent']);
});

test('uneven statuses honor multiplicity', () => {
  const st = evaluateTileStatuses(['red', 'red', 'blue'], ['red', 'red', 'red'], 'uneven');
  assert.deepEqual(st, ['correct', 'correct', 'absent']);
});

test('even statuses: any pool match is correct regardless of slot', () => {
  const st = evaluateTileStatuses(['red', 'blue', 'green'], ['green', 'red', 'pink'], 'even');
  assert.deepEqual(st, ['correct', 'correct', 'absent']);
});

// ---- deterministic daily recipes ----
test('daily recipe is deterministic for the same seed', () => {
  const palette = paletteBySize(20);
  const opts = { count: 3, allowDuplicates: false, seedStr: '2026-09-13_3_uneven_false_20' };
  const a = generateTargetRecipe(palette, opts);
  const b = generateTargetRecipe(palette, opts);
  assert.deepEqual(a, b);
});

test('different seeds produce (almost surely) different recipes', () => {
  const palette = paletteBySize(20);
  const a = generateTargetRecipe(palette, { count: 3, allowDuplicates: false, seedStr: 'day-one' });
  const b = generateTargetRecipe(palette, { count: 3, allowDuplicates: false, seedStr: 'day-two' });
  assert.notDeepEqual(a, b);
});

test('no-duplicates recipes never repeat a color', () => {
  const palette = paletteBySize(20);
  for (let i = 0; i < 50; i++) {
    const r = generateTargetRecipe(palette, { count: 5, allowDuplicates: false, seedStr: 's' + i });
    assert.equal(new Set(r).size, r.length);
  }
});

test('duplicate recipes respect count', () => {
  const palette = paletteBySize(20);
  const r = generateTargetRecipe(palette, { count: 6, allowDuplicates: true, seedStr: 'dup' });
  assert.equal(r.length, 6);
});

// ---- date helpers ----
test('getLocalDateStr uses local components with zero padding', () => {
  assert.equal(getLocalDateStr(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(getLocalDateStr(new Date(2026, 10, 30)), '2026-11-30');
});

test('msUntilLocalMidnight is between 0 and 24h', () => {
  const ms = msUntilLocalMidnight(new Date(2026, 8, 13, 12, 0, 0));
  assert.ok(ms > 0 && ms <= 24 * 3600 * 1000);
});

test('formatDuration pads segments', () => {
  assert.equal(formatDuration(0), '00:00:00');
  assert.equal(formatDuration(3723 * 1000), '01:02:03');
});

// ---- rng ----
test('mulberry32 is reproducible and in range', () => {
  const a = mulberry32(strHash('abc'));
  const b = mulberry32(strHash('abc'));
  for (let i = 0; i < 20; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});

// ---- profile handoff ----
test('normalizeProfile accepts v1 and v2 shapes and rejects garbage', () => {
  assert.deepEqual(normalizeProfile({ type: 'deuteranopia', strength: 0.6 }), { type: 'deuteranopia', strength: 0.6 });
  const v2 = normalizeProfile({ type: 'protanopia', strength: 1.4, axes: { protanopia: 1, deuteranopia: 0.2 } });
  assert.equal(v2.strength, 1);
  assert.equal(v2.axes.deuteranopia, 0.2);
  assert.equal(normalizeProfile({ type: 'nope', strength: 1 }), null);
  assert.equal(normalizeProfile('x'), null);
  assert.equal(normalizeProfile(null), null);
  assert.equal(normalizeProfile({ type: 'tritanopia', strength: 'abc' }).strength, 1);
});

test('parseProfileJson tolerates bad json', () => {
  assert.equal(parseProfileJson('{oops'), null);
  assert.equal(parseProfileJson('{"type":"deuteranopia","strength":0.5}').type, 'deuteranopia');
});

test('profile base64 round trip works with URL-safe alphabet', () => {
  const p = { v: 2, type: 'deuteranopia', strength: 0.62, testedAt: '2026-09-13' };
  const enc = encodeProfileB64(p);
  assert.ok(!/[+/=]/.test(enc));
  assert.deepEqual(decodeProfileB64(enc), { type: 'deuteranopia', strength: 0.62, testedAt: '2026-09-13' });
  assert.equal(decodeProfileB64('!!!not-base64!!!'), null);
});

// ---- share text ----
test('buildShareText renders rows, result, and link', () => {
  const txt = buildShareText({
    guesses: [
      { recipe: ['red', 'blue'], statuses: ['correct', 'absent'], accuracy: 41.2 },
      { recipe: ['red', 'green'], statuses: ['correct', 'correct'], accuracy: 100.0 }
    ],
    gameMode: 'unlimited',
    won: true,
    maxAttempts: 6,
    colorCount: 2,
    splitMode: 'uneven',
    paletteSize: 20
  });
  assert.ok(txt.includes('🟩⬛ 41.2%'));
  assert.ok(txt.includes('🟩🟩 100.0%'));
  assert.ok(txt.includes('Solved in 2/6'));
  assert.ok(txt.includes('colorfle-unlimited.vercel.app'));
});

// ---- stats / misc ----
test('blankStats and makeConfigKey shapes', () => {
  const s = blankStats();
  assert.equal(s.played, 0);
  assert.deepEqual(s.guessDistribution, {});
  const key = makeConfigKey(3, 'uneven', true, false, 6, 20);
  assert.equal(key, '3_uneven_w_nd_6_20');
});

test('getContrastTextColor picks dark text on light bg', () => {
  assert.ok(getContrastTextColor('#FFFFFF').includes('slate-950'));
  assert.ok(getContrastTextColor('#111827').includes('text-white'));
});

test('cb matrix interpolation hits identity at 0 and base at 1', () => {
  const z = getInterpolatedMatrix('deuteranopia', 0).split(',').map(Number);
  const one = getInterpolatedMatrix('deuteranopia', 1).split(',').map(Number);
  z.forEach((v, i) => assert.ok(Math.abs(v - [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0][i]) < 1e-9));
  one.forEach((v, i) => assert.ok(Math.abs(v - [0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0][i]) < 1e-9));
  assert.ok(CB_TYPES.includes('achromatopsia'));
});
