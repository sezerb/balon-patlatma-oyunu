// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = 800;
canvas.height = 600;

// ============================================================
// AUDIO — background music (procedural, Web Audio API)
// ============================================================
let audioCtx = null;
let musicNodes = [];
let musicScheduled = false;
let musicGain = null;
let musicLoopTimer = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// C-major arpeggio melody: notes in Hz (C4, E4, G4, A4, C5, A4, G4, E4)
const MELODY_NOTES = [261.63, 329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63];
const BASS_NOTES   = [130.81, 130.81, 164.81, 174.61]; // C3, C3, E3, F3
const NOTE_LEN     = 0.22;  // seconds per melody note
const LOOP_LEN     = MELODY_NOTES.length * NOTE_LEN; // ~1.76 s

function scheduleMusicLoop(startTime) {
  if (!musicScheduled) return;
  const ac = getAudioCtx();

  if (!musicGain) {
    musicGain = ac.createGain();
    musicGain.gain.value = 0.12;
    musicGain.connect(ac.destination);
  }

  // Soft low-pass filter for warmth
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1800;
  filter.connect(musicGain);

  const playNote = (freq, t, dur, type = 'triangle', vol = 0.5) => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.02);
    gain.gain.setValueAtTime(vol, t + dur - 0.04);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(gain);
    gain.connect(filter);
    osc.start(t);
    osc.stop(t + dur + 0.01);
    musicNodes.push(osc, gain);
  };

  // Melody
  MELODY_NOTES.forEach((freq, i) => {
    playNote(freq, startTime + i * NOTE_LEN, NOTE_LEN * 0.85, 'triangle', 0.55);
  });

  // Bass (one note per 2 melody notes)
  BASS_NOTES.forEach((freq, i) => {
    playNote(freq, startTime + i * NOTE_LEN * 2, NOTE_LEN * 1.8, 'sine', 0.35);
  });

  // Chord pad on beat 1 and beat 5 (C-major, G-major)
  [[261.63, 329.63, 392.00], [392.00, 493.88, 587.33]].forEach(([f1, f2, f3], i) => {
    const t = startTime + i * (LOOP_LEN / 2);
    [f1, f2, f3].forEach(f => playNote(f, t, LOOP_LEN / 2 - 0.05, 'sine', 0.08));
  });

  // Schedule next loop
  const msUntilNext = (startTime + LOOP_LEN - ac.currentTime) * 1000 - 50;
  musicLoopTimer = setTimeout(() => {
    if (musicScheduled) scheduleMusicLoop(startTime + LOOP_LEN);
  }, Math.max(0, msUntilNext));
}

function startMusic() {
  try {
    const ac = getAudioCtx();
    if (ac.state === 'suspended') ac.resume();
    musicScheduled = true;
    scheduleMusicLoop(ac.currentTime + 0.05);
  } catch (_) {}
}

function stopMusic() {
  musicScheduled = false;
  clearTimeout(musicLoopTimer);
  musicLoopTimer = null;
  musicNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch (_) {} });
  musicNodes = [];
  if (musicGain) { musicGain.disconnect(); musicGain = null; }
}
function playPopSound(pitch = 440) {
  try {
    const ac   = getAudioCtx();
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.45, ac.currentTime + 0.12);
    gain.gain.setValueAtTime(0.38, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.16);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.17);
  } catch (_) { /* silently fail in restricted environments */ }
}

// ============================================================
// LEVEL DEFINITIONS
// ============================================================
const levels = [
  { scoreToAdvance: 100,  background: 'assets/background1.jpg',  balloonSpeedFactor: 0.6, balloonCount: 1, spawnInterval: 1400, sky: ['#B3E5FC', '#E1F5FE'] },  // dawn
  { scoreToAdvance: 200,  background: 'assets/background2.jpg',  balloonSpeedFactor: 0.8, balloonCount: 1, spawnInterval: 1200, sky: ['#FFE082', '#FFB74D'] },  // golden morning
  { scoreToAdvance: 300,  background: 'assets/background3.jpg',  balloonSpeedFactor: 1.0, balloonCount: 1, spawnInterval: 1000, sky: ['#4FC3F7', '#0288D1'] },  // midday blue
  { scoreToAdvance: 400,  background: 'assets/background1.jpg',  balloonSpeedFactor: 1.3, balloonCount: 2, spawnInterval: 1200, sky: ['#FF8A65', '#E64A19'] },  // warm afternoon
  { scoreToAdvance: 500,  background: 'assets/background2.jpg',  balloonSpeedFactor: 1.6, balloonCount: 2, spawnInterval: 1000, sky: ['#CE93D8', '#7B1FA2'] },  // sunset purple
  { scoreToAdvance: 600,  background: 'assets/background3.jpg',  balloonSpeedFactor: 2.0, balloonCount: 2, spawnInterval:  900, sky: ['#546E7A', '#1565C0'] },  // dusk
  { scoreToAdvance: 700,  background: 'assets/background1.jpg',  balloonSpeedFactor: 2.4, balloonCount: 3, spawnInterval: 1000, sky: ['#1A237E', '#311B92'] },  // twilight
  { scoreToAdvance: 800,  background: 'assets/background2.jpg',  balloonSpeedFactor: 2.8, balloonCount: 3, spawnInterval:  900, sky: ['#0A0A1A', '#1A237E'] },  // night
  { scoreToAdvance: 900,  background: 'assets/background3.jpg',  balloonSpeedFactor: 3.2, balloonCount: 4, spawnInterval:  900, sky: ['#0D0221', '#6A0DAD'] },  // aurora
  { scoreToAdvance: 1000, background: 'assets/background10.jpg', balloonSpeedFactor: 3.6, balloonCount: 4, spawnInterval:  900, sky: ['#7F0000', '#FF6F00'] },  // dramatic red
];

const balloonImageSrcs = ['assets/balloon1.png', 'assets/balloon2.png'];

// ============================================================
// ASSET PRELOADING
// ============================================================
let loadedBalloonImages = [];
let loadedBackgrounds   = {};

function preloadImages() {
  const balloonPromises = balloonImageSrcs.map(src => new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  }));

  const uniqueBgs = [...new Set(levels.map(l => l.background))];
  const bgPromises = uniqueBgs.map(src => new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve({ src, img });
    img.onerror = () => resolve({ src, img: null });
    img.src = src;
  }));

  return Promise.all([Promise.all(balloonPromises), Promise.all(bgPromises)]).then(([bImgs, bgs]) => {
    loadedBalloonImages = bImgs.filter(Boolean);
    bgs.forEach(({ src, img }) => { if (img) loadedBackgrounds[src] = img; });
  });
}

// ============================================================
// GAME STATE
// ============================================================
const LIVES_MAX    = 10;
const MAX_COMBO    = 5;
const COMBO_TIMEOUT = 1500;
const COMBO_COLORS = ['#ffffff', '#a8ff78', '#f8d347', '#ff9a3c', '#ff6b6b'];

// Cursor position tracked globally for hover glow
let cursorX = -999;
let cursorY = -999;

let state = {};
let balloons      = [];
let particles     = [];
let floatingTexts = [];

function resetState() {
  state = {
    score:          0,
    levelProgress:  0,   // flat 10 per pop — drives level advancement (combo-independent)
    level:          1,
    lives:          LIVES_MAX,
    combo:          1,
    lastPopTime:    0,
    gameOver:       false,
    paused:         false,
    animFrameId:    null,
    balloonInterval: null,
  };
  balloons      = [];
  particles     = [];
  floatingTexts = [];
}

// ============================================================
// UI ELEMENT REFERENCES
// ============================================================
const splashEl    = document.getElementById('splash');
const levelupEl   = document.getElementById('levelup');
const gameoverEl  = document.getElementById('gameover');
const startBtn    = document.getElementById('startGame');
const restartBtn  = document.getElementById('restartGame');
const scoreValEl  = document.getElementById('scoreValue');
const levelValEl  = document.getElementById('levelValue');
const comboValEl  = document.getElementById('comboValue');
const heartsEl    = document.getElementById('heartsDisplay');
const progressFillEl  = document.getElementById('progressFill');
const progressLabelEl = document.getElementById('progressLabel');
const finalScoreEl        = document.getElementById('finalScore');
const splashHighEl        = document.getElementById('splashHighScoreValue');
const gameoverHighRowEl   = document.getElementById('gameoverHighScoreRow');
const newRecordEl         = document.getElementById('newRecord');

// ============================================================
// HIGH SCORE
// ============================================================
function getHighScore() {
  return parseInt(localStorage.getItem('balonHighScore') || '0', 10);
}
function saveHighScore(s) {
  localStorage.setItem('balonHighScore', String(s));
}

// ============================================================
// PROGRESS BAR  (each level always needs exactly 100 points)
// ============================================================
const POINTS_PER_LEVEL = 100;

function updateProgress() {
  const pct = Math.min(100, state.levelProgress);
  progressFillEl.style.width  = pct + '%';
  progressLabelEl.textContent = `${state.levelProgress} / ${POINTS_PER_LEVEL}`;
}

// ============================================================
// HEARTS
// ============================================================
function renderHearts() {
  heartsEl.innerHTML = '';
  for (let i = 0; i < LIVES_MAX; i++) {
    const span = document.createElement('span');
    span.className = 'heart' + (i >= state.lives ? ' lost' : '');
    span.textContent = '❤️';
    heartsEl.appendChild(span);
  }
}

function loseLife() {
  const prevLives = state.lives;
  state.lives = Math.max(0, state.lives - 1);
  renderHearts();
  // Shake the heart that just turned grey
  const hearts = heartsEl.querySelectorAll('.heart');
  const target  = hearts[prevLives - 1];
  if (target) {
    target.classList.add('shake');
    setTimeout(() => target.classList.remove('shake'), 400);
  }
}

// ============================================================
// COMBO
// ============================================================
function updateCombo() {
  const now = Date.now();
  state.combo = now - state.lastPopTime < COMBO_TIMEOUT
    ? Math.min(state.combo + 1, MAX_COMBO)
    : 1;
  state.lastPopTime = now;

  comboValEl.textContent = `×${state.combo}`;
  comboValEl.style.color = COMBO_COLORS[state.combo - 1];
  comboValEl.classList.remove('pop');
  void comboValEl.offsetWidth; // force reflow to restart animation
  comboValEl.classList.add('pop');
}

function resetCombo() {
  state.combo = 1;
  comboValEl.textContent = '×1';
  comboValEl.style.color = COMBO_COLORS[0];
}

function tickComboReset() {
  if (state.combo > 1 && Date.now() - state.lastPopTime > COMBO_TIMEOUT) {
    resetCombo();
  }
}

// ============================================================
// PARTICLES
// ============================================================
const PARTICLE_PALETTE = ['#ff6b6b', '#f8d347', '#a8ff78', '#6c63ff', '#c94fd8', '#ff9a3c', '#00d2ff', '#fff'];

function spawnParticles(cx, cy, size) {
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const speed = (Math.random() * 4 + 2) * (size / 80);
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      radius: Math.random() * 5 + 3,
      color: PARTICLE_PALETTE[Math.floor(Math.random() * PARTICLE_PALETTE.length)],
      alpha: 1,
      decay: Math.random() * 0.025 + 0.02,
    });
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.18; // gravity
    p.alpha -= p.decay;
    if (p.alpha <= 0) { particles.splice(i, 1); continue; }

    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================
// FLOATING SCORE TEXT
// ============================================================
function spawnFloatingText(cx, topY, text, combo) {
  floatingTexts.push({
    x: cx, y: topY,
    text,
    alpha: 1,
    vy:    -1.6,
    size:  combo > 1 ? 26 + combo * 4 : 22,
    color: COMBO_COLORS[combo - 1],
  });
}

function drawFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y     += ft.vy;
    ft.alpha -= 0.018;
    if (ft.alpha <= 0) { floatingTexts.splice(i, 1); continue; }

    ctx.save();
    ctx.globalAlpha  = ft.alpha;
    ctx.font         = `bold ${ft.size}px "Fredoka One", cursive`;
    ctx.textAlign    = 'center';
    ctx.strokeStyle  = 'rgba(0,0,0,0.45)';
    ctx.lineWidth    = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle    = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

// ============================================================
// BALLOONS
// ============================================================
function createBalloon() {
  if (loadedBalloonImages.length === 0) return;
  // Size range 50–110px (avoids the extreme large balloons that broke speed)
  const size       = Math.random() * 60 + 50;
  const baseX      = Math.random() * (canvas.width - size - 20) + 10;
  // Speed: larger balloons are slower, but ALL balloons always move upward.
  // In-stage ramp: +0–35% boost as levelProgress climbs from 0→100
  const factor       = levels[state.level - 1].balloonSpeedFactor;
  const stageRamp    = 1 + (state.levelProgress / POINTS_PER_LEVEL) * 0.35;
  const speed        = (2 - (size - 50) / 60) * factor * 0.55 * stageRamp + 0.9;
  const image      = loadedBalloonImages[Math.floor(Math.random() * loadedBalloonImages.length)];
  const birthTime  = performance.now();

  balloons.push({
    baseX,
    x: baseX,
    y: canvas.height + size,
    size,
    speed,
    image,
    birthTime,
    swayAmplitude: Math.random() * 6 + 4,     // 4–10 px (was 8–26, much calmer)
    swayFrequency: Math.random() * 1.0 + 0.6, // 0.6–1.6 rad/s (gentler)
    swayOffset:    Math.random() * Math.PI * 2,
    popInDuration: 280,
  });
}

function drawString(x, y, size) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + size / 2, y + size);
  ctx.quadraticCurveTo(x + size / 2 + 7, y + size + 14, x + size / 2, y + size + 22);
  ctx.stroke();
  ctx.restore();
}

function updateBalloons(now) {
  // Draw per-level gradient sky
  const lvl  = levels[state.level - 1];
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, lvl.sky[0]);
  grad.addColorStop(1, lvl.sky[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Blend background image on top for texture (if loaded)
  const bg = loadedBackgrounds[lvl.background];
  if (bg) {
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  for (let i = balloons.length - 1; i >= 0; i--) {
    const b = balloons[i];
    b.y -= b.speed;

    // Horizontal sway
    const elapsed = (now - b.birthTime) / 1000;
    b.x = Math.max(0, Math.min(canvas.width - b.size,
      b.baseX + Math.sin(elapsed * b.swayFrequency + b.swayOffset) * b.swayAmplitude
    ));

    // Pop-in scale: ease-out-cubic from 0.5 → 1
    const popProgress = Math.min(1, (now - b.birthTime) / b.popInDuration);
    const scale = 0.5 + 0.5 * (1 - Math.pow(1 - popProgress, 3));

    // Missed balloon
    if (b.y + b.size < 0) {
      balloons.splice(i, 1);
      loseLife();
      resetCombo();
      if (state.lives <= 0) {
        state.gameOver = true;
        showGameOver();
      }
      continue;
    }

    // Draw string
    drawString(b.x, b.y, b.size);

    // Check if cursor is hovering near this balloon
    const cx = b.x + b.size / 2;
    const cy = b.y + b.size / 2;
    const hoverDist = Math.hypot(cursorX - cx, cursorY - cy);
    const isHovered = hoverDist < b.size / 2 * 1.2;

    // Draw hover glow ring
    if (isHovered) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, b.size / 2 * 1.15, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth   = 3;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur  = 14;
      ctx.stroke();
      ctx.restore();
    }

    // Draw balloon (scaled from centre; hover adds slight scale boost)
    const hoverScale = isHovered ? 1.06 : 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale * hoverScale, scale * hoverScale);
    ctx.drawImage(b.image, -b.size / 2, -b.size / 2, b.size, b.size);
    ctx.restore();
  }
}

// ============================================================
// HIT DETECTION (mousedown / touch)
// ============================================================
function getCanvasCoords(clientX, clientY) {
  const rect   = canvas.getBoundingClientRect();
  return {
    mx: (clientX - rect.left) * (canvas.width  / rect.width),
    my: (clientY - rect.top)  * (canvas.height / rect.height),
  };
}

function handlePop(clientX, clientY) {
  if (state.gameOver || state.paused) return;
  const { mx, my } = getCanvasCoords(clientX, clientY);

  for (let i = balloons.length - 1; i >= 0; i--) {
    const b    = balloons[i];
    const cx   = b.x + b.size / 2;
    const cy   = b.y + b.size / 2;
    const dist = Math.hypot(mx - cx, my - cy);
    if (dist < b.size / 2 * 1.2) {
      balloons.splice(i, 1);
      updateCombo();
      const points = 10 * state.combo;
      state.score        += points;                // combo multiplies display score
      state.levelProgress = Math.min(POINTS_PER_LEVEL, state.levelProgress + 10); // flat 10 per pop
      scoreValEl.textContent = state.score;
      updateProgress();
      spawnParticles(cx, cy, b.size);
      spawnFloatingText(cx, cy - b.size / 2,
        state.combo > 1 ? `+${points}  ×${state.combo}` : `+${points}`,
        state.combo);
      playPopSound(280 + Math.random() * 220);
      checkLevelUp();
      break; // one balloon per press
    }
  }
}

// mousedown fires immediately on press — much better for trackpads than click
canvas.addEventListener('mousedown', e => handlePop(e.clientX, e.clientY));

// Track cursor position for hover glow
canvas.addEventListener('mousemove', e => {
  const { mx, my } = getCanvasCoords(e.clientX, e.clientY);
  cursorX = mx;
  cursorY = my;
});
canvas.addEventListener('mouseleave', () => { cursorX = -999; cursorY = -999; });

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  handlePop(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

// ============================================================
// LEVEL UP / WIN
// ============================================================
function checkLevelUp() {
  if (state.levelProgress < POINTS_PER_LEVEL) return;

  if (state.level >= levels.length) {
    // Completed the final level → victory!
    stopBalloonInterval();
    balloons = [];
    particles = [];
    state.gameOver = true;
    showWin();
    return;
  }

  state.level++;
  state.levelProgress = 0;   // always reset to 0 for the new level
  levelValEl.textContent = state.level;
  updateProgress();
  stopBalloonInterval();
  balloons = [];
  particles = [];
  state.paused = true;
  showLevelUp();
  setTimeout(() => {
    hideLevelUp();
    state.paused = false;
    startBalloonInterval();
  }, 2000);
}

function showLevelUp() {
  document.getElementById('levelupText').textContent = `Level ${state.level}`;
  levelupEl.classList.remove('hidden');
}
function hideLevelUp() { levelupEl.classList.add('hidden'); }

// ============================================================
// GAME OVER
// ============================================================
function showGameOver() {
  stopBalloonInterval();
  cancelAnimationFrame(state.animFrameId);
  stopMusic();

  const hs    = getHighScore();
  const isNew = state.score > hs;
  if (isNew) saveHighScore(state.score);

  finalScoreEl.textContent      = state.score;
  gameoverHighRowEl.textContent = `🏆 Best: ${isNew ? state.score : hs}`;
  newRecordEl.classList.toggle('hidden', !isNew);
  gameoverEl.classList.remove('hidden');
}

// ============================================================
// WIN
// ============================================================
function showWin() {
  cancelAnimationFrame(state.animFrameId);
  stopMusic();

  const hs    = getHighScore();
  const isNew = state.score > hs;
  if (isNew) saveHighScore(state.score);

  document.getElementById('winScore').textContent      = state.score;
  document.getElementById('winHighScoreRow').textContent = `🏆 Best: ${isNew ? state.score : hs}`;
  document.getElementById('winNewRecord').classList.toggle('hidden', !isNew);
  document.getElementById('win').classList.remove('hidden');
}

// ============================================================
// BALLOON INTERVAL
// ============================================================
function startBalloonInterval() {
  stopBalloonInterval();
  const interval = levels[state.level - 1].spawnInterval;
  state.balloonInterval = setInterval(() => {
    if (!state.gameOver && !state.paused) {
      for (let i = 0; i < levels[state.level - 1].balloonCount; i++) {
        createBalloon();
      }
    }
  }, interval);
}

function stopBalloonInterval() {
  if (state.balloonInterval) {
    clearInterval(state.balloonInterval);
    state.balloonInterval = null;
  }
}

// ============================================================
// MAIN GAME LOOP
// ============================================================
function gameLoop(now) {
  if (state.gameOver) return;
  updateBalloons(now);
  drawParticles();
  drawFloatingTexts();
  tickComboReset();
  state.animFrameId = requestAnimationFrame(gameLoop);
}

// ============================================================
// START / RESTART
// ============================================================
function startGame() {
  splashEl.classList.add('hidden');
  gameoverEl.classList.add('hidden');
  document.getElementById('win').classList.add('hidden');
  resetState();
  renderHearts();
  scoreValEl.textContent = '0';
  levelValEl.textContent = '1';
  comboValEl.textContent = '×1';
  comboValEl.style.color = COMBO_COLORS[0];
  updateProgress();
  stopMusic();
  startMusic();
  startBalloonInterval();
  state.animFrameId = requestAnimationFrame(gameLoop);
}

startBtn.addEventListener('click',   startGame);
restartBtn.addEventListener('click', startGame);
document.getElementById('winRestartGame').addEventListener('click', startGame);

// ============================================================
// INIT — show high score on splash, preload assets
// ============================================================
splashHighEl.textContent = getHighScore();
preloadImages(); // preload in background; game waits for user click anyway
