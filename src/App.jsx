import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// --- PALETTE DEFINITION ---
const PALETTE = [
  { id: 'white', name: 'White', hex: '#FFFFFF', code: 'WHT' },
  { id: 'cream', name: 'Cream', hex: '#FFF2C6', code: 'CRM' },
  { id: 'yellow', name: 'Yellow', hex: '#FACC15', code: 'YEL' },
  { id: 'orange', name: 'Orange', hex: '#FB923C', code: 'ORG' },
  { id: 'brown_light', name: 'Tan', hex: '#D97706', code: 'TAN' },
  { id: 'brown', name: 'Brown', hex: '#78350F', code: 'BRN' },
  { id: 'crimson', name: 'Crimson', hex: '#DC2626', code: 'CRM' },
  { id: 'red', name: 'Red', hex: '#EF4444', code: 'RED' },
  { id: 'pink', name: 'Pink', hex: '#F472B6', code: 'PNK' },
  { id: 'magenta', name: 'Magenta', hex: '#E11D48', code: 'MAG' },
  { id: 'purple', name: 'Purple', hex: '#9333EA', code: 'PRP' },
  { id: 'lavender', name: 'Lavender', hex: '#C084FC', code: 'LAV' },
  { id: 'navy', name: 'Navy', hex: '#1E3A8A', code: 'NVY' },
  { id: 'blue', name: 'Blue', hex: '#2563EB', code: 'BLU' },
  { id: 'cyan', name: 'Cyan', hex: '#06B6D4', code: 'CYN' },
  { id: 'teal', name: 'Teal', hex: '#0D9488', code: 'TEL' },
  { id: 'green_lime', name: 'Lime', hex: '#84CC16', code: 'LME' },
  { id: 'green', name: 'Green', hex: '#16A34A', code: 'GRN' },
  { id: 'gray', name: 'Gray', hex: '#6B7280', code: 'GRY' },
  { id: 'black', name: 'Black', hex: '#111827', code: 'BLK' }
];

const PALETTE_MAP = PALETTE.reduce((acc, curr) => {
  acc[curr.id] = curr;
  return acc;
}, {});

const hexToRgb = (hex) => {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const rgbToHex = (r, g, b) => {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
};

const blendColorsWeighted = (recipe, weights) => {
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

const rgbToLab = (r, g, b) => {
  let r1 = r / 255, g1 = g / 255, b1 = b / 255;
  r1 = r1 > 0.04045 ? Math.pow((r1 + 0.055) / 1.055, 2.4) : r1 / 12.92;
  g1 = g1 > 0.04045 ? Math.pow((g1 + 0.055) / 1.055, 2.4) : g1 / 12.92;
  b1 = b1 > 0.04045 ? Math.pow((b1 + 0.055) / 1.055, 2.4) : b1 / 12.92;

  let x = (r1 * 0.4124 + g1 * 0.3576 + b1 * 0.1805) / 0.95047;
  let y = (r1 * 0.2126 + g1 * 0.7152 + b1 * 0.0722) / 1.00000;
  let z = (r1 * 0.0193 + g1 * 0.1192 + b1 * 0.9505) / 1.08883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

  return { l: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
};

const calculateAccuracy = (targetRecipe, targetWeights, guessRecipe) => {
  if (targetRecipe.length === guessRecipe.length && targetRecipe.every((col, i) => col === guessRecipe[i])) {
    return 100.0;
  }

  const targetHex = blendColorsWeighted(targetRecipe, targetWeights);
  const guessHex = blendColorsWeighted(guessRecipe, targetWeights);

  const rgb1 = hexToRgb(targetHex);
  const rgb2 = hexToRgb(guessHex);

  const lab1 = rgbToLab(rgb1.r, rgb1.g, rgb1.b);
  const lab2 = rgbToLab(rgb2.r, rgb2.g, rgb2.b);

  const deltaE = Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );

  if (deltaE < 0.2) return 100.0;
  const rawAcc = Math.max(0, 100 - (deltaE / 1.12));
  return Math.min(99.9, Math.round(rawAcc * 10) / 10);
};

const evaluateTileStatuses = (targetRecipe, guessRecipe) => {
  const result = new Array(guessRecipe.length).fill('absent');
  const targetPool = [...targetRecipe];

  for (let i = 0; i < guessRecipe.length; i++) {
    if (guessRecipe[i] === targetRecipe[i]) {
      result[i] = 'correct';
      const idx = targetPool.indexOf(guessRecipe[i]);
      if (idx !== -1) targetPool.splice(idx, 1);
    }
  }

  for (let i = 0; i < guessRecipe.length; i++) {
    if (result[i] !== 'correct') {
      const idx = targetPool.indexOf(guessRecipe[i]);
      if (idx !== -1) {
        result[i] = 'present';
        targetPool.splice(idx, 1);
      }
    }
  }

  return result;
};

const triggerHaptic = (type, enabled = true) => {
  if (!enabled || typeof window === 'undefined') return;
  if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
    try {
      if (type === 'tap') navigator.vibrate(40);
      else if (type === 'delete') navigator.vibrate(55);
      else if (type === 'submit') navigator.vibrate([60, 40, 60]);
      else if (type === 'win') navigator.vibrate([90, 60, 90, 60, 160]);
      else if (type === 'error') navigator.vibrate([70, 50, 70]);
    } catch (e) {}
  }
};

const playSoundEffect = (type, enabled = true) => {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'tap') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.04);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'delete') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'submit') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(780, now + 0.06);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.01, now + i * 0.08 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.22);
      });
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (e) {}
};

const FIXED_UNEVEN_WEIGHTS = {
  2: [0.65, 0.35],
  3: [0.50, 0.35, 0.15],
  4: [0.45, 0.30, 0.15, 0.10],
  5: [0.40, 0.28, 0.18, 0.09, 0.05],
  6: [0.36, 0.26, 0.18, 0.11, 0.06, 0.03],
};

const generateWeights = (count, mode) => {
  if (mode === 'even') {
    return new Array(count).fill(1 / count);
  }
  return FIXED_UNEVEN_WEIGHTS[count] || FIXED_UNEVEN_WEIGHTS[3];
};

export default function App() {
  // Configuration State
  const [colorCount, setColorCount] = useState(3);
  const [splitMode, setSplitMode] = useState('uneven');
  const [wordleMode, setWordleMode] = useState(true);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState(6);
  const [gameMode, setGameMode] = useState('unlimited');

  // Interactive Features
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Colorblindness Simulation & Accessibility
  const [cbEnabled, setCbEnabled] = useState(false);
  const [cbType, setCbType] = useState('deuteranopia');
  const [cbHighContrast, setCbHighContrast] = useState(false);
  const [cbSymbols, setCbSymbols] = useState(false);
  const [cbColorNames, setCbColorNames] = useState(false);

  // Gameplay State
  const [targetRecipe, setTargetRecipe] = useState([]);
  const [targetWeights, setTargetWeights] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing');
  const [shakeRow, setShakeRow] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSpinningWin, setIsSpinningWin] = useState(false);

  // Previous Guess Inspection State (Modes 1, 2, 3)
  const [inspectingGuessIndex, setInspectingGuessIndex] = useState(null);
  const [inspectMode, setInspectMode] = useState('mode1');

  // Modals
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const configKey = [colorCount, splitMode, wordleMode ? 'w' : 'nw', allowDuplicates ? 'd' : 'nd', maxAttempts].join('_');
  const [allStats, setAllStats] = useState(() => {
    const saved = localStorage.getItem('colorfle_all_stats');
    return saved ? JSON.parse(saved) : {};
  });

  const canvasRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('colorfle_all_stats', JSON.stringify(allStats));
  }, [allStats]);

  const currentStats = useMemo(() => {
    return allStats[configKey] || {
      played: 0,
      wins: 0,
      currentStreak: 0,
      maxStreak: 0,
      totalAccuracy: 0,
      guessDistribution: {}
    };
  }, [allStats, configKey]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch (e) {}
  };

  const getDailySeed = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    let hash = 0;
    const str = today + '_' + colorCount + '_' + splitMode + '_' + allowDuplicates;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }, [colorCount, splitMode, allowDuplicates]);

  const startNewGame = useCallback(() => {
    let recipe = [];
    let weights = generateWeights(colorCount, splitMode);

    if (gameMode === 'daily') {
      let seed = getDailySeed();
      if (allowDuplicates) {
        for (let i = 0; i < colorCount; i++) {
          const idx = Math.abs(seed + i * 19) % PALETTE.length;
          recipe.push(PALETTE[idx].id);
        }
      } else {
        const available = [...PALETTE];
        for (let i = 0; i < colorCount; i++) {
          const idx = Math.abs(seed + i * 19) % available.length;
          recipe.push(available[idx].id);
          available.splice(idx, 1);
        }
      }
    } else {
      if (allowDuplicates) {
        for (let i = 0; i < colorCount; i++) {
          const randIdx = Math.floor(Math.random() * PALETTE.length);
          recipe.push(PALETTE[randIdx].id);
        }
      } else {
        const available = [...PALETTE];
        for (let i = 0; i < colorCount; i++) {
          const randIdx = Math.floor(Math.random() * available.length);
          recipe.push(available[randIdx].id);
          available.splice(randIdx, 1);
        }
      }
    }

    setTargetRecipe(recipe);
    setTargetWeights(weights);
    setGuesses([]);
    setCurrentGuess([]);
    setGameStatus('playing');
    setToastMessage('');
    setIsSpinningWin(false);
    setInspectingGuessIndex(null);
  }, [colorCount, splitMode, allowDuplicates, gameMode, getDailySeed]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleSelectColor = (colorId) => {
    if (gameStatus !== 'playing') return;
    if (currentGuess.length < colorCount) {
      playSoundEffect('tap', soundEnabled);
      triggerHaptic('tap', hapticEnabled);
      setCurrentGuess([...currentGuess, colorId]);
    } else {
      setShakeRow(true);
      playSoundEffect('error', soundEnabled);
      triggerHaptic('error', hapticEnabled);
      setTimeout(() => setShakeRow(false), 350);
    }
  };

  const handleBackspace = () => {
    if (gameStatus !== 'playing' || currentGuess.length === 0) return;
    playSoundEffect('delete', soundEnabled);
    triggerHaptic('delete', hapticEnabled);
    setCurrentGuess(currentGuess.slice(0, -1));
  };

  const handleClear = () => {
    if (gameStatus !== 'playing' || currentGuess.length === 0) return;
    playSoundEffect('delete', soundEnabled);
    triggerHaptic('delete', hapticEnabled);
    setCurrentGuess([]);
  };

  const handleSubmit = () => {
    if (gameStatus !== 'playing') return;

    if (currentGuess.length < colorCount) {
      showToast('Select all ' + colorCount + ' colors before submitting!');
      setShakeRow(true);
      playSoundEffect('error', soundEnabled);
      triggerHaptic('error', hapticEnabled);
      setTimeout(() => setShakeRow(false), 350);
      return;
    }

    const accuracy = calculateAccuracy(targetRecipe, targetWeights, currentGuess);
    const tileStatuses = evaluateTileStatuses(targetRecipe, currentGuess);

    const newGuesses = [
      ...guesses,
      { recipe: currentGuess, accuracy, statuses: tileStatuses }
    ];

    setGuesses(newGuesses);
    setCurrentGuess([]);
    setInspectingGuessIndex(null);
    playSoundEffect('submit', soundEnabled);
    triggerHaptic('submit', hapticEnabled);

    if (accuracy === 100.0) {
      setGameStatus('won');
      setIsSpinningWin(true);
      playSoundEffect('win', soundEnabled);
      triggerHaptic('win', hapticEnabled);
      triggerConfetti();
      updateStats(true, newGuesses.length, accuracy);
      showToast('Perfect 100% Match!');
    } else if (newGuesses.length >= maxAttempts) {
      setGameStatus('lost');
      playSoundEffect('error', soundEnabled);
      triggerHaptic('error', hapticEnabled);
      updateStats(false, newGuesses.length, accuracy);
      showToast('Game Over!');
    }
  };

  const updateStats = (isWin, attempts, finalAcc) => {
    setAllStats(prev => {
      const oldConfig = prev[configKey] || {
        played: 0,
        wins: 0,
        currentStreak: 0,
        maxStreak: 0,
        totalAccuracy: 0,
        guessDistribution: {}
      };

      const newPlayed = oldConfig.played + 1;
      const newWins = oldConfig.wins + (isWin ? 1 : 0);
      const newStreak = isWin ? oldConfig.currentStreak + 1 : 0;
      const newMaxStreak = Math.max(oldConfig.maxStreak, newStreak);
      const newTotalAcc = oldConfig.totalAccuracy + finalAcc;
      const newDist = { ...oldConfig.guessDistribution };
      if (isWin) {
        newDist[attempts] = (newDist[attempts] || 0) + 1;
      }

      return {
        ...prev,
        [configKey]: {
          played: newPlayed,
          wins: newWins,
          currentStreak: newStreak,
          maxStreak: newMaxStreak,
          totalAccuracy: newTotalAcc,
          guessDistribution: newDist
        }
      };
    });
  };

  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 80 }, () => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 18,
      size: Math.random() * 8 + 4,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)].hex,
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 12
    }));

    let animId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.38;
        p.rotation += p.rSpeed;
        if (p.y < canvas.height) alive = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (alive) animId = requestAnimationFrame(render);
    };
    render();
  };

  const targetSolidHex = useMemo(() => {
    return blendColorsWeighted(targetRecipe, targetWeights);
  }, [targetRecipe, targetWeights]);

  // Inspection Calculation
  const inspectedGuess = inspectingGuessIndex !== null ? guesses[inspectingGuessIndex] : null;
  const inspectedGuessBlendHex = inspectedGuess ? blendColorsWeighted(inspectGuessRecipe(inspectedGuess), targetWeights) : null;

  function inspectGuessRecipe(g) {
    return g ? g.recipe : [];
  }

  const pieRightFillHex = useMemo(() => {
    if (inspectedGuess && inspectMode === 'mode3') {
      return inspectedGuessBlendHex;
    }
    return targetSolidHex;
  }, [inspectedGuess, inspectMode, inspectedGuessBlendHex, targetSolidHex]);

  const isLeftSolidBlendMode = useMemo(() => {
    if (inspectedGuess && inspectMode === 'mode2') {
      return true;
    }
    return false;
  }, [inspectedGuess, inspectMode]);

  const activeLeftRecipe = useMemo(() => {
    if (inspectedGuess) {
      return inspectedGuess.recipe;
    }
    if (currentGuess.length > 0) {
      return currentGuess;
    }
    if (guesses.length > 0) {
      return guesses[guesses.length - 1].recipe;
    }
    return [];
  }, [inspectedGuess, guesses, currentGuess]);

  const renderLeftHalfSlices = () => {
    if (isLeftSolidBlendMode && inspectedGuessBlendHex) {
      return (
        <path
          d="M 100 190 A 90 90 0 0 1 100 10 Z"
          fill={inspectedGuessBlendHex}
          stroke="#12131C"
          strokeWidth="2.5"
        />
      );
    }

    const center = 100;
    const radius = 90;
    let currentAngleDeg = 270;

    return targetWeights.map((weight, idx) => {
      const sliceDeg = weight * 180;
      const startDeg = currentAngleDeg;
      const endDeg = currentAngleDeg - sliceDeg;
      currentAngleDeg = endDeg;

      const startRad = (startDeg * Math.PI) / 180;
      const endRad = (endDeg * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const d = 'M ' + center + ' ' + center + ' L ' + x1 + ' ' + y1 + ' A ' + radius + ' ' + radius + ' 0 0 0 ' + x2 + ' ' + y2 + ' Z';

      const selectedColorId = activeLeftRecipe[idx];
      const colorObj = selectedColorId ? PALETTE_MAP[selectedColorId] : null;
      const fillColor = colorObj ? colorObj.hex : '#222533';

      return (
        <path
          key={idx}
          d={d}
          fill={fillColor}
          stroke="#12131C"
          strokeWidth="2.5"
          className="transition-fill duration-200"
        >
          {colorObj && <title>{colorObj.name + ' (' + Math.round(weight * 100) + '%)'}</title>}
        </path>
      );
    });
  };

  const keyboardStatuses = useMemo(() => {
    const map = {};
    guesses.forEach(g => {
      g.recipe.forEach((id, idx) => {
        const st = g.statuses[idx];
        if (st === 'correct') {
          map[id] = 'correct';
        } else if (st === 'present' && map[id] !== 'correct') {
          map[id] = 'present';
        } else if (st === 'absent' && !map[id]) {
          map[id] = 'absent';
        }
      });
    });
    return map;
  }, [guesses]);

  const getContrastTextColor = (hex) => {
    const rgb = hexToRgb(hex);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 140 ? 'text-slate-950 font-black' : 'text-white font-black';
  };

  return (
    <div 
      className="fixed inset-0 w-full h-full bg-[#12131C] text-slate-100 flex flex-col justify-between font-sans selection:bg-purple-500 selection:text-white overflow-hidden select-none touch-none pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]"
      style={{ filter: cbEnabled ? 'url(#cb-' + cbType + ')' : 'none' }}
    >
      {/* Hidden SVG Colorblind Simulation Matrices */}
      <svg className="hidden" style={{ display: 'none' }}>
        <defs>
          <filter id="cb-protanopia">
            <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0   0.558, 0.442, 0, 0, 0   0, 0.242, 0.758, 0, 0   0, 0, 0, 1, 0" />
          </filter>
          <filter id="cb-deuteranopia">
            <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0   0.7, 0.3, 0, 0, 0   0, 0.3, 0.7, 0, 0   0, 0, 0, 1, 0" />
          </filter>
          <filter id="cb-tritanopia">
            <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0   0, 0.433, 0.567, 0, 0   0, 0.475, 0.525, 0, 0   0, 0, 0, 1, 0" />
          </filter>
          <filter id="cb-achromatopsia">
            <feColorMatrix type="matrix" values="0.299, 0.587, 0.114, 0, 0   0.299, 0.587, 0.114, 0, 0   0.299, 0.587, 0.114, 0, 0   0, 0, 0, 1, 0" />
          </filter>
        </defs>
      </svg>

      {/* Confetti Layer */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />

      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-5 py-2 rounded-full border border-purple-500/50 shadow-2xl backdrop-blur-md text-xs font-bold flex items-center gap-2 animate-bounce">
          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="w-full mx-auto px-4 py-1.5 landscape:py-1 sm:py-2 flex items-center justify-between border-b border-slate-800/80 bg-[#12131C]/90 backdrop-blur-md flex-shrink-0 z-30">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => {
              triggerHaptic('tap', hapticEnabled);
              setShowHowToPlay(true);
            }}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
            title="How to play"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <button 
            onClick={() => {
              triggerHaptic('tap', hapticEnabled);
              setSoundEnabled(!soundEnabled);
            }}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
            title="Toggle Sound"
          >
            {soundEnabled ? (
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            )}
          </button>
        </div>

        {/* LOGO */}
        <div className="text-center">
          <h1 className="text-lg sm:text-2xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-purple-300 to-slate-200">
            Colorfle
          </h1>
          <div className="text-[9px] sm:text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center justify-center gap-1">
            <span className="text-purple-400">{splitMode === 'even' ? 'EVEN SPLIT' : 'UNEVEN'}</span>
            <span>•</span>
            <span>{colorCount + ' COLORS'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => {
              triggerHaptic('tap', hapticEnabled);
              setShowStats(true);
            }}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
            title="Statistics"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 012 2h2a2 2 0 012-2z" />
            </svg>
          </button>

          <button 
            onClick={() => {
              triggerHaptic('tap', hapticEnabled);
              setShowSettings(true);
            }}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* --- RESPONSIVE MAIN BODY --- */}
      <main className="w-full flex-1 min-h-0 px-2 sm:px-3 py-1 flex flex-col landscape:flex-row lg:flex-row items-center justify-evenly gap-2 landscape:gap-4 lg:gap-8 overflow-hidden">
        
        {/* --- LEFT PANEL: PIE WHEEL DISPLAY --- */}
        <div className="flex flex-col items-center justify-center gap-1 landscape:w-5/12 lg:w-1/2 flex-shrink-0 h-auto landscape:h-full lg:h-full">
          <div className="p-2 sm:p-4 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-md flex flex-col items-center max-h-full">
            <div 
              className={'w-32 h-32 sm:w-48 sm:h-48 landscape:w-[38vh] landscape:h-[38vh] lg:w-[28vw] lg:h-[28vw] max-w-[45vh] max-h-[45vh] rounded-full border-4 border-slate-700/80 shadow-2xl relative overflow-hidden transition-all duration-700 transform ' + (
                isSpinningWin ? 'rotate-[720deg] scale-105 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.6)]' : ''
              )}
            >
              {gameStatus === 'won' ? (
                <div 
                  className="w-full h-full transition-colors duration-500"
                  style={{ backgroundColor: targetSolidHex }}
                />
              ) : (
                <svg className="w-full h-full" viewBox="0 0 200 200">
                  <defs>
                    <clipPath id="leftHalfClip">
                      <rect x="0" y="0" width="100" height="200" />
                    </clipPath>
                    <clipPath id="rightHalfClip">
                      <rect x="100" y="0" width="100" height="200" />
                    </clipPath>
                  </defs>

                  {/* RIGHT HALF */}
                  <g clipPath="url(#rightHalfClip)">
                    <path
                      d="M 100 10 A 90 90 0 0 1 100 190 Z"
                      fill={pieRightFillHex}
                      stroke="#12131C"
                      strokeWidth="2.5"
                    />
                  </g>

                  {/* LEFT HALF */}
                  <g clipPath="url(#leftHalfClip)">
                    {renderLeftHalfSlices()}
                  </g>
                </svg>
              )}

              {/* Target Recipe Revealed Overlay on Game Over */}
              {gameStatus !== 'playing' && !isSpinningWin && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-2">
                  <span className="text-[11px] font-bold text-slate-300 uppercase">Target Mix</span>
                  <div className="flex gap-1 justify-center mt-1.5">
                    {targetRecipe.map((id, i) => (
                      <div 
                        key={i} 
                        className="w-6 h-6 rounded-md border border-white/40 shadow-sm flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ backgroundColor: PALETTE_MAP[id]?.hex }}
                        title={PALETTE_MAP[id]?.name + ' (' + Math.round(targetWeights[i] * 100) + '%)'}
                      >
                        {splitMode === 'uneven' && Math.round(targetWeights[i] * 100) + '%'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inspection Controls */}
            {inspectingGuessIndex !== null ? (
              <div className="mt-1.5 flex flex-col items-center gap-1 animate-fade-in">
                <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-purple-500/50 shadow-md">
                  <button
                    onClick={() => {
                      triggerHaptic('tap', hapticEnabled);
                      setInspectMode('mode1');
                    }}
                    className={'px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition ' + (
                      inspectMode === 'mode1' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    )}
                    title="Target Color vs Guess Slices"
                  >
                    1. Target vs Slices
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('tap', hapticEnabled);
                      setInspectMode('mode2');
                    }}
                    className={'px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition ' + (
                      inspectMode === 'mode2' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    )}
                    title="Target Color vs Guess Blend"
                  >
                    2. Target vs Blend
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('tap', hapticEnabled);
                      setInspectMode('mode3');
                    }}
                    className={'px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition ' + (
                      inspectMode === 'mode3' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    )}
                    title="Guess Blend vs Guess Slices"
                  >
                    3. Blend vs Slices
                  </button>
                </div>

                <button
                  onClick={() => {
                    triggerHaptic('tap', hapticEnabled);
                    setInspectingGuessIndex(null);
                  }}
                  className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[9px] font-bold hover:bg-slate-700 transition"
                >
                  ✕ Close Comparison
                </button>
              </div>
            ) : (
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-600 inline-block" /> Your Guess
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-purple-500 inline-block" /> Target Mix
                </span>
              </div>
            )}
          </div>
        </div>

        {/* --- RIGHT PANEL: GUESS GRID & KEYBOARD --- */}
        <div className="w-full landscape:w-7/12 lg:w-1/2 flex-1 min-h-0 flex flex-col justify-between gap-1.5 overflow-hidden h-full">
          
          {/* GUESS HISTORY GRID */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pr-1 custom-scrollbar space-y-1">
            {Array.from({ length: maxAttempts }).map((_, rowIndex) => {
              const guess = guesses[rowIndex];
              const isCurrentRow = rowIndex === guesses.length && gameStatus === 'playing';
              const isInspected = inspectingGuessIndex === rowIndex;

              const guessMixedHex = guess ? blendColorsWeighted(guess.recipe, targetWeights) : null;
              const badgeTextColor = guessMixedHex ? getContrastTextColor(guessMixedHex) : 'text-slate-600';

              return (
                <div 
                  key={rowIndex} 
                  className={'flex items-center justify-between gap-2 p-1.5 rounded-xl border transition-all ' + (
                    isInspected 
                      ? 'bg-purple-950/50 border-purple-400 ring-2 ring-purple-400/50 shadow-lg' 
                      : isCurrentRow 
                      ? 'bg-slate-800/60 border-purple-500/70 shadow-md' 
                      : 'bg-slate-900/40 border-slate-800/60'
                  ) + ' ' + (isCurrentRow && shakeRow ? 'animate-shake' : '')}
                >
                  {/* Color Slot Boxes */}
                  <div className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2">
                    {Array.from({ length: colorCount }).map((_, colIndex) => {
                      let tileColor = null;
                      let tileStatus = null;

                      if (guess) {
                        tileColor = PALETTE_MAP[guess.recipe[colIndex]];
                        tileStatus = guess.statuses[colIndex];
                      } else if (isCurrentRow && currentGuess[colIndex]) {
                        tileColor = PALETTE_MAP[currentGuess[colIndex]];
                      }

                      let borderStyle = 'border-slate-700/80 bg-slate-800/40';
                      if (wordleMode && tileStatus === 'correct') {
                        borderStyle = cbHighContrast
                          ? 'border-blue-500 border-4 shadow-[0_0_12px_rgba(59,130,246,0.8)]'
                          : 'border-emerald-500 border-4 shadow-[0_0_12px_rgba(16,185,129,0.8)]';
                      } else if (wordleMode && tileStatus === 'present') {
                        borderStyle = cbHighContrast
                          ? 'border-orange-500 border-4 shadow-[0_0_12px_rgba(249,115,22,0.8)]'
                          : 'border-amber-400 border-4 shadow-[0_0_12px_rgba(251,191,36,0.8)]';
                      } else if (wordleMode && tileStatus === 'absent') {
                        borderStyle = 'border-slate-800';
                      }

                      return (
                        <div
                          key={colIndex}
                          onClick={() => {
                            if (isCurrentRow && colIndex < currentGuess.length) {
                              const newG = [...currentGuess];
                              newG.splice(colIndex, 1);
                              setCurrentGuess(newG);
                              playSoundEffect('delete', soundEnabled);
                              triggerHaptic('delete', hapticEnabled);
                            }
                          }}
                          className={'w-9 h-9 sm:w-11 sm:h-11 rounded-lg flex flex-col items-center justify-center relative transition-all duration-200 transform ' + borderStyle + ' ' + (
                            isCurrentRow && currentGuess[colIndex] ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
                          )}
                          style={{ backgroundColor: tileColor ? tileColor.hex : undefined }}
                          title={tileColor ? tileColor.name : 'Slot ' + (colIndex + 1)}
                        >
                          {!tileColor && (
                            <span className="text-slate-600 font-bold text-xs">{colIndex + 1}</span>
                          )}

                          {tileColor && cbColorNames && (
                            <span className={'text-[8px] font-black uppercase leading-none drop-shadow ' + getContrastTextColor(tileColor.hex)}>
                              {tileColor.code}
                            </span>
                          )}

                          {wordleMode && cbSymbols && tileStatus && (
                            <span className={'text-[10px] font-black drop-shadow ' + (tileStatus === 'correct' ? 'text-emerald-300' : tileStatus === 'present' ? 'text-amber-300' : 'text-slate-400')}>
                              {tileStatus === 'correct' ? '✓' : tileStatus === 'present' ? '⟳' : '✕'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Percentage Badge */}
                  <div className="w-14 flex items-center justify-end">
                    {guess ? (
                      <button
                        onClick={() => {
                          triggerHaptic('tap', hapticEnabled);
                          setInspectingGuessIndex(isInspected ? null : rowIndex);
                        }}
                        className={'w-10 h-10 sm:w-11 sm:h-11 rounded-full text-[11px] flex items-center justify-center transition-all shadow-lg border-2 hover:scale-110 active:scale-95 ' + (
                          isInspected ? 'border-purple-300 ring-2 ring-purple-400' : 'border-slate-700/80'
                        ) + ' ' + badgeTextColor}
                        style={{ backgroundColor: guessMixedHex }}
                        title="Click to compare this guess side-by-side on pie wheel!"
                      >
                        {guess.accuracy.toFixed(1) + '%'}
                      </button>
                    ) : (
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800/50 border border-slate-800 flex items-center justify-center text-slate-600 text-xs font-bold">
                        ?
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* GAME OVER RESTART BANNER */}
          {gameStatus !== 'playing' && (
            <div className="w-full p-2.5 rounded-xl bg-slate-900 border border-purple-500/40 flex items-center justify-between shadow-xl flex-shrink-0 animate-fade-in">
              <h2 className="text-xs sm:text-sm font-bold">
                {gameStatus === 'won' ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Solved! 100% Match!
                  </span>
                ) : (
                  <span className="text-rose-400">Out of Attempts!</span>
                )}
              </h2>
              <button
                onClick={() => {
                  triggerHaptic('tap', hapticEnabled);
                  startNewGame();
                }}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg transition transform hover:scale-105 active:scale-95 flex items-center gap-1"
              >
                <span>Play Next</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          )}

          {/* COLOR KEYBOARD PALETTE */}
          <div className="w-full flex flex-col gap-1 flex-shrink-0">
            <div className="grid grid-cols-7 sm:grid-cols-10 gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
              {PALETTE.map((color) => {
                const status = wordleMode ? keyboardStatuses[color.id] : null;
                const isAbsent = status === 'absent';

                let badgeStyle = '';
                if (wordleMode && status === 'correct') {
                  badgeStyle = cbHighContrast 
                    ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900'
                    : 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900';
                } else if (wordleMode && status === 'present') {
                  badgeStyle = cbHighContrast
                    ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-slate-900'
                    : 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900';
                }

                return (
                  <button
                    key={color.id}
                    disabled={gameStatus !== 'playing' || isAbsent}
                    onClick={() => handleSelectColor(color.id)}
                    className={'h-7 sm:h-9 rounded-lg flex flex-col items-center justify-center relative overflow-hidden transition-all duration-150 transform border-2 border-slate-600/90 active:scale-90 shadow-sm ' + (
                      isAbsent ? 'cursor-not-allowed opacity-80' : 'hover:scale-105 hover:border-slate-300'
                    ) + ' ' + badgeStyle}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {cbColorNames && (
                      <span className={'text-[7px] sm:text-[8px] font-black uppercase leading-none drop-shadow ' + getContrastTextColor(color.hex)}>
                        {color.code}
                      </span>
                    )}

                    {isAbsent && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-full h-1 bg-red-600/90 rotate-45 transform shadow-sm" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={handleClear}
                disabled={gameStatus !== 'playing' || currentGuess.length === 0}
                className="py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition disabled:opacity-40"
              >
                Clear
              </button>

              <button
                onClick={handleBackspace}
                disabled={gameStatus !== 'playing' || currentGuess.length === 0}
                className="py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold text-xs transition disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-9.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
                <span>Delete</span>
              </button>

              <button
                onClick={handleSubmit}
                disabled={gameStatus !== 'playing' || currentGuess.length < colorCount}
                className="py-1.5 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition active:scale-95 disabled:opacity-40"
              >
                ENTER
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* --- HOW TO PLAY MODAL --- */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 flex flex-col gap-3 shadow-2xl relative">
            <button 
              onClick={() => setShowHowToPlay(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-black text-center text-purple-400">How to Play Colorfle</h2>
            
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>Find the exact blend of <strong>{colorCount + ' colors'}</strong> that match the target color on the right half of the pie!</p>
              
              <p>Left pie slices run from top (largest contribution e.g. 50%) to bottom (smallest e.g. 15%). Click any previous guess circle to compare side-by-side in 3 modes!</p>

              {wordleMode && (
                <div className="p-2.5 bg-slate-800 rounded-xl space-y-1.5 border border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-4 border-emerald-500 bg-purple-600" />
                    <span><strong>Thick Green Border:</strong> Correct color in right slot!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-4 border-amber-400 bg-pink-500" />
                    <span><strong>Thick Yellow Border:</strong> Used in recipe, wrong slot.</span>
                  </div>
                </div>
              )}

              <p>Reach <strong>100% Accuracy</strong> to solve the puzzle!</p>
            </div>

            <button 
              onClick={() => setShowHowToPlay(false)}
              className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* --- STATISTICS MODAL --- */}
      {showStats && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 flex flex-col gap-4 shadow-2xl relative">
            <button 
              onClick={() => setShowStats(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <h2 className="text-lg font-black text-fuchsia-400">Statistics</h2>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">{colorCount + ' Colors • ' + splitMode}</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-800 p-2 rounded-xl border border-slate-700">
                <div className="text-base font-black text-white">{currentStats.played}</div>
                <div className="text-[9px] text-slate-400 uppercase font-bold">Played</div>
              </div>
              <div className="bg-slate-800 p-2 rounded-xl border border-slate-700">
                <div className="text-base font-black text-emerald-400">
                  {(currentStats.played > 0 ? Math.round((currentStats.wins / currentStats.played) * 100) : 0) + '%'}
                </div>
                <div className="text-[9px] text-slate-400 uppercase font-bold">Win %</div>
              </div>
              <div className="bg-slate-800 p-2 rounded-xl border border-slate-700">
                <div className="text-base font-black text-amber-400">{currentStats.currentStreak}</div>
                <div className="text-[9px] text-slate-400 uppercase font-bold">Streak</div>
              </div>
              <div className="bg-slate-800 p-2 rounded-xl border border-slate-700">
                <div className="text-base font-black text-purple-400">
                  {(currentStats.played > 0 ? (currentStats.totalAccuracy / currentStats.played).toFixed(1) : '0') + '%'}
                </div>
                <div className="text-[9px] text-slate-400 uppercase font-bold">Avg Acc</div>
              </div>
            </div>

            <button 
              onClick={() => {
                setShowStats(false);
                startNewGame();
              }}
              className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs transition"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* --- SETTINGS MODAL --- */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 flex flex-col gap-3 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-black text-center text-amber-400">Settings</h2>

            {/* Display & Feedback Options */}
            <div className="space-y-1.5 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700">
              <label className="text-xs font-bold uppercase text-slate-300 block">App Features & Haptics</label>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>True Fullscreen Mode</span>
                <button
                  onClick={toggleFullscreen}
                  className={'w-10 h-5 rounded-full transition-colors relative p-0.5 ' + (
                    isFullscreen ? 'bg-purple-600' : 'bg-slate-700'
                  )}
                >
                  <div className={'w-4 h-4 rounded-full bg-white transition-transform ' + (
                    isFullscreen ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Haptic Vibration Feedback</span>
                <button
                  onClick={() => setHapticEnabled(!hapticEnabled)}
                  className={'w-10 h-5 rounded-full transition-colors relative p-0.5 ' + (
                    hapticEnabled ? 'bg-purple-600' : 'bg-slate-700'
                  )}
                >
                  <div className={'w-4 h-4 rounded-full bg-white transition-transform ' + (
                    hapticEnabled ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </button>
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400">Number of Colors</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => setColorCount(num)}
                    className={'py-1.5 rounded-xl text-xs font-bold border transition ' + (
                      colorCount === num ? 'bg-emerald-500 border-emerald-300 text-slate-950 font-black' : 'bg-slate-800 border-slate-700 text-slate-300'
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Mode */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400">Slice Contribution Split</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSplitMode('even')}
                  className={'py-1.5 rounded-xl text-xs font-bold border transition ' + (
                    splitMode === 'even' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
                  )}
                >
                  Even Split
                </button>
                <button
                  onClick={() => setSplitMode('uneven')}
                  className={'py-1.5 rounded-xl text-xs font-bold border transition ' + (
                    splitMode === 'uneven' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
                  )}
                >
                  Uneven
                </button>
              </div>
            </div>

            {/* Duplicate Colors Option */}
            <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-slate-700">
              <div>
                <div className="text-xs font-bold text-white">Allow Duplicate Colors</div>
                <div className="text-[10px] text-slate-400">Same color can appear multiple times</div>
              </div>
              <button
                onClick={() => setAllowDuplicates(!allowDuplicates)}
                className={'w-12 h-6 rounded-full transition-colors relative p-0.5 ' + (
                  allowDuplicates ? 'bg-emerald-500' : 'bg-slate-700'
                )}
              >
                <div className={'w-5 h-5 rounded-full bg-white transition-transform ' + (
                  allowDuplicates ? 'translate-x-6' : 'translate-x-0'
                )} />
              </button>
            </div>

            {/* Wordle Mode Toggle */}
            <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-slate-700">
              <div>
                <div className="text-xs font-bold text-white">Wordle Hints Mode</div>
                <div className="text-[10px] text-slate-400">Thick border feedback on tiles</div>
              </div>
              <button
                onClick={() => setWordleMode(!wordleMode)}
                className={'w-12 h-6 rounded-full transition-colors relative p-0.5 ' + (
                  wordleMode ? 'bg-emerald-500' : 'bg-slate-700'
                )}
              >
                <div className={'w-5 h-5 rounded-full bg-white transition-transform ' + (
                  wordleMode ? 'translate-x-6' : 'translate-x-0'
                )} />
              </button>
            </div>

            {/* Colorblind Adjustments */}
            <div className="space-y-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Colorblind Simulation Profile</span>
                <button
                  onClick={() => setCbEnabled(!cbEnabled)}
                  className={'w-10 h-5 rounded-full transition-colors relative p-0.5 ' + (
                    cbEnabled ? 'bg-purple-600' : 'bg-slate-700'
                  )}
                >
                  <div className={'w-4 h-4 rounded-full bg-white transition-transform ' + (
                    cbEnabled ? 'translate-x-5' : 'translate-x-0'
                  )} />
                </button>
              </div>

              {cbEnabled && (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {[
                    { id: 'deuteranopia', label: 'Deuteranopia' },
                    { id: 'protanopia', label: 'Protanopia' },
                    { id: 'tritanopia', label: 'Tritanopia' },
                    { id: 'achromatopsia', label: 'Monochrome' },
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setCbType(item.id)}
                      className={'py-1 px-2 rounded-lg text-[10px] font-bold border transition ' + (
                        cbType === item.id ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-700/80 pt-2 space-y-1.5">
                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>High Contrast Borders (Blue / Orange)</span>
                  <input 
                    type="checkbox" 
                    checked={cbHighContrast} 
                    onChange={(e) => setCbHighContrast(e.target.checked)} 
                    className="w-4 h-4 accent-purple-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Symbol Indicators (✓, ⟳, ✕)</span>
                  <input 
                    type="checkbox" 
                    checked={cbSymbols} 
                    onChange={(e) => setCbSymbols(e.target.checked)} 
                    className="w-4 h-4 accent-purple-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Color Name Labels on Swatches</span>
                  <input 
                    type="checkbox" 
                    checked={cbColorNames} 
                    onChange={(e) => setCbColorNames(e.target.checked)} 
                    className="w-4 h-4 accent-purple-500 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Max Attempts */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400">{'Max Attempts (' + maxAttempts + ')'}</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                {[4, 5, 6, 7, 10, 15, 20, 25].map(att => (
                  <button
                    key={att}
                    onClick={() => setMaxAttempts(att)}
                    className={'py-1.5 rounded-xl text-xs font-bold border transition ' + (
                      maxAttempts === att ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                    )}
                  >
                    {att}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => {
                setShowSettings(false);
                startNewGame();
              }}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition mt-1"
            >
              Apply & Restart
            </button>
          </div>
        </div>
      )}

      {/* --- INLINE CSS UTILITIES --- */}
      <style>{
        '@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } } .animate-shake { animation: shake 0.3s ease-in-out; } .custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.5); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(147, 51, 234, 0.5); border-radius: 10px; }'
      }</style>

    </div>
  );
}
