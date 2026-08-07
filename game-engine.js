// --- CORE GAME ENGINE AND PHYSICS RENDER LOOP ---
const STATE_MENU = 'menu';
const STATE_LEVEL_SELECT = 'level_select';
const STATE_PLAYING = 'playing';
const STATE_PAUSED = 'paused';
const STATE_GAMEOVER = 'gameover';
const STATE_VICTORY = 'victory';

let currentGameState = STATE_MENU;
let currentGameMode = 'classic';
let currentLevel = 1;
let attemptCount = 1;
let isMuted = false;
let playerName = 'NEON_WAVE';
let levelProgress = 0;

// Canvas scaling
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let width = 1200;
let height = 675;
let scaleX = 1;
let scaleY = 1;

let lastTime = 0;
let deltaTime = 0;

const inputs = {
  active: false,
  space: false,
  w: false,
  pointer: false
};

let bgScrollX = 0;
let bgScrollY = 0;
let hexPatternCanvas = null;
let hexPatternWidth = 256;
let hexPatternHeight = 256;

// Audio context
let audioCtx = null;
let synthIntervalId = null;
let synthBeatsCount = 0;

let obstacles = [];
let levelLength = 6000;
let currentPracticeCheckpoint = null;

// Ghost Replay state
let recordedGhostRun = []; // current run tracking: array of {x, y, angle}
let activeGhostTrajectory = []; // loaded best trajectory run
let ghostFrameIdx = 0;

let bots = [];

let player = {
  x: 150,
  y: 337.5,
  width: 32,
  height: 24,
  vy: 0,
  targetVy: 0,
  angle: 0,
  baseSpeed: 380,
  speedMultiplier: 1,
  isDead: false,
  trail: [],
  particles: []
};

let camera = {
  x: 0,
  y: 0,
  targetY: 0
};

// --- INITIALIZATION ---
window.addEventListener('load', () => {
  initCanvas();
  createHexagonPattern();
  initInputListeners();

  // Start game loops
  requestAnimationFrame(gameLoop);
});

window.addEventListener('resize', initCanvas);
window.addEventListener('orientationchange', () => {
  setTimeout(initCanvas, 150);
});

function initCanvas() {
  const container = document.getElementById('game-container');
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  const targetAspect = 16 / 9;
  let renderWidth = containerWidth;
  let renderHeight = containerHeight;

  if (containerWidth / containerHeight > targetAspect) {
    renderHeight = containerHeight;
    renderWidth = containerHeight * targetAspect;
  } else {
    renderWidth = containerWidth;
    renderHeight = containerWidth / targetAspect;
  }

  canvas.style.width = `${renderWidth}px`;
  canvas.style.height = `${renderHeight}px`;
  canvas.style.left = `${(containerWidth - renderWidth) / 2}px`;
  canvas.style.top = `${(containerHeight - renderHeight) / 2}px`;

  canvas.width = width;
  canvas.height = height;
}

// --- HONEYCOMB GRAPHICS PATTERNS ---
function createHexagonPattern(customTheme = null) {
  hexPatternCanvas = document.createElement('canvas');
  hexPatternCanvas.width = hexPatternWidth;
  hexPatternCanvas.height = hexPatternHeight;
  const hCtx = hexPatternCanvas.getContext('2d');

  let strokeColor = 'rgba(0, 255, 102, 0.12)';
  if (customTheme) {
    hCtx.fillStyle = '#040b09';
    strokeColor = customTheme.bgPatternColor;
  } else {
    hCtx.fillStyle = '#051412';
  }
  hCtx.fillRect(0, 0, hexPatternWidth, hexPatternHeight);

  const r = 24;
  const h = r * Math.sqrt(3);
  const w = r * 1.5;

  hCtx.strokeStyle = strokeColor;
  hCtx.lineWidth = 1.5;

  for (let x = -r; x < hexPatternWidth + r * 2; x += r * 3) {
    for (let y = -r; y < hexPatternHeight + r * 2; y += h) {
      drawHexagonPath(hCtx, x, y, r);
      hCtx.stroke();
      drawHexagonPath(hCtx, x + w, y + h / 2, r);
      hCtx.stroke();
    }
  }

  hCtx.fillStyle = 'rgba(0, 243, 255, 0.03)';
  for (let i = 0; i < 5; i++) {
    const rx = Math.random() * hexPatternWidth;
    const ry = Math.random() * hexPatternHeight;
    hCtx.beginPath();
    hCtx.arc(rx, ry, Math.random() * 40 + 20, 0, Math.PI * 2);
    hCtx.fill();
  }
}

function drawHexagonPath(context, x, y, radius) {
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    if (i === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
}

function toggleFullscreen() {
  const container = document.getElementById('game-container');
  if (!document.fullscreenElement) {
    if (container.requestFullscreen) container.requestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

// --- INPUT MANAGEMENT ---
function initInputListeners() {
  window.addEventListener('keydown', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

    if (e.code === 'Space') {
      inputs.space = true;
      e.preventDefault();
    }
    if (e.code === 'KeyW' || e.code === 'ArrowUp') {
      inputs.w = true;
    }
    if (e.code === 'Escape') {
      if (currentGameState === STATE_PLAYING) pauseGame();
      else if (currentGameState === STATE_PAUSED) resumeGame();
    }
    updateInputActiveState();
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') inputs.space = false;
    if (e.code === 'KeyW' || e.code === 'ArrowUp') inputs.w = false;
    updateInputActiveState();
  });

  window.addEventListener('mousedown', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (e.button === 0) {
      inputs.pointer = true;
      updateInputActiveState();
    }
  });

  window.addEventListener('mouseup', () => {
    inputs.pointer = false;
    updateInputActiveState();
  });

  window.addEventListener('touchstart', (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (e.target.closest('#game-container')) {
      inputs.pointer = true;
      updateInputActiveState();
    }
  });

  window.addEventListener('touchend', () => {
    inputs.pointer = false;
    updateInputActiveState();
  });
}

function updateInputActiveState() {
  const prevActive = inputs.active;
  inputs.active = inputs.space || inputs.w || inputs.pointer;

  // Trigger flight upwards diagonal glide audio cue
  if (inputs.active && !prevActive && currentGameState === STATE_PLAYING && !player.isDead) {
    playJumpSound();
  }
}

// --- PROCEDURAL AUDIO SYNTHESIZER ---
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playJumpSound(frequencyOverride) {
  if (isMuted) return;
  initAudioContext();
  try {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Jump pitch glide
    const startFreq = frequencyOverride || 220;
    osc.frequency.setValueAtTime(startFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 2.2, audioCtx.currentTime + 0.14);

    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.16);
  } catch (e) {
    console.error("Audio error:", e);
  }
}

function playCoinCollectSound() {
  if (isMuted) return;
  initAudioContext();
  try {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Coin bell chime chord (C5 to G5 chord chime)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.28);
  } catch (e) {}
}

// Bind to window so ui.js can trigger coin collect sounds
window.playCoinCollectSound = playCoinCollectSound;
window.playJumpSound = playJumpSound;

function playDeathSound() {
  if (isMuted) return;
  initAudioContext();
  try {
    // Noise thud combination
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.42);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.45);
  } catch (e) {}
}

function playVictorySound() {
  if (isMuted) return;
  initAudioContext();
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C major arpeggio
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);

      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + idx * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.1 + 0.35);

      osc.start(audioCtx.currentTime + idx * 0.1);
      osc.stop(audioCtx.currentTime + idx * 0.1 + 0.4);
    });
  } catch (e) {}
}

window.playVictorySound = playVictorySound;

function startSynthMusic() {
  if (isMuted) return;
  initAudioContext();
  stopSynthMusic();

  synthBeatsCount = 0;
  synthIntervalId = setInterval(() => {
    if (currentGameState !== STATE_PLAYING || isMuted) return;
    playSequencerStep();
  }, 207);
}

function stopSynthMusic() {
  if (synthIntervalId) {
    clearInterval(synthIntervalId);
    synthIntervalId = null;
  }
}

function playSequencerStep() {
  try {
    const step = synthBeatsCount % 16;
    synthBeatsCount++;

    // Kick Drum
    if (step % 4 === 0) {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.16);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    }

    // Bassline notes
    let modifier = 1.0;
    if (currentGameMode === 'classic') {
      modifier = getLevelTheme(currentLevel).pitchModifier;
    }
    const melody = [55, 55, 65, 55, 58, 55, 62, 58, 55, 55, 65, 55, 58, 65, 70, 65];
    const freq = melody[step] * modifier;

    const oscBass = audioCtx.createOscillator();
    const gainBass = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    oscBass.type = 'sawtooth';
    oscBass.frequency.setValueAtTime(freq, audioCtx.currentTime);
    filter.type = 'lowpass';
    filter.frequency.value = 650;

    oscBass.connect(filter);
    filter.connect(gainBass);
    gainBass.connect(audioCtx.destination);

    gainBass.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gainBass.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.19);
    oscBass.start();
    oscBass.stop(audioCtx.currentTime + 0.2);
  } catch (e) {}
}

// --- ENGINE LOOP ---
function gameLoop(time) {
  if (!lastTime) lastTime = time;
  deltaTime = (time - lastTime) / 1000;
  lastTime = time;

  if (deltaTime > 0.1) deltaTime = 0.1;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  if (currentGameState !== STATE_PLAYING) return;

  updatePlayerPhysics(dt);
  updateBots(dt);
  updateLevelAndCollisions();
  updateCamera(dt);

  bgScrollX = camera.x;
  bgScrollY = camera.y;
}

function updatePlayerPhysics(dt) {
  if (player.isDead) {
    updatePlayerParticles(dt);
    return;
  }

  // 1. Move Player Horizontally
  player.x += player.baseSpeed * player.speedMultiplier * dt;

  // 2. Trajectory direction
  const diagonalSpeed = 390;
  if (inputs.active) {
    player.targetVy = -diagonalSpeed;
  } else {
    player.targetVy = diagonalSpeed;
  }

  // Smooth diagonal wave transition
  player.vy += (player.targetVy - player.vy) * 16 * dt;
  player.y += player.vy * dt;

  // Bound player coordinates
  const borderTop = 40;
  const borderBottom = height - 40;
  if (player.y < borderTop + player.height / 2) {
    player.y = borderTop + player.height / 2;
    player.vy = 0;
  }
  if (player.y > borderBottom - player.height / 2) {
    player.y = borderBottom - player.height / 2;
    player.vy = 0;
  }

  player.angle = Math.atan2(player.vy, player.baseSpeed) * 0.8;

  // Track Ghost Replay path
  recordedGhostRun.push({ x: player.x, y: player.y, angle: player.angle });

  // 3. Update Custom Trails and Particles
  const backOffsetAngle = player.angle + Math.PI;
  const backX = player.x + Math.cos(backOffsetAngle) * (player.width / 2);
  const backY = player.y + Math.sin(backOffsetAngle) * (player.width / 2);

  player.trail.push({ x: backX, y: backY, time: Date.now() });
  player.trail = player.trail.filter(pt => Date.now() - pt.time < 900);

  if (Math.random() < 0.4) {
    createSpark(backX, backY, -player.vy * 0.2);
  }

  // Spawning environmental drift particles
  if (currentGameMode === 'classic' && Math.random() < 0.25) {
    const theme = getLevelTheme(currentLevel);
    let size = Math.random() * 2 + 0.5;
    let color = theme.spikeColor;
    let vx = -player.baseSpeed * 0.7 - Math.random() * 100;
    let vy = (Math.random() - 0.5) * 40;

    player.particles.push({
      x: player.x + 800 + Math.random() * 200,
      y: Math.random() * height,
      vx: vx, vy: vy,
      size: size, color: color,
      alpha: 0.8, life: 2.0
    });
  }

  updatePlayerParticles(dt);
}

function createSpark(x, y, vyOffset) {
  let color = '#00ff66';
  if (currentGameMode === 'classic') {
    color = getLevelTheme(currentLevel).spikeColor;
  } else {
    const currentSkin = SKINS.find(s => s.id === equippedSkin) || SKINS[0];
    color = currentSkin.color;
  }

  player.particles.push({
    x: x, y: y,
    vx: -player.baseSpeed * 0.4 + (Math.random() - 0.5) * 60,
    vy: vyOffset + (Math.random() - 0.5) * 80,
    size: Math.random() * 3 + 1,
    color: color, alpha: 1,
    life: 0.5 + Math.random() * 0.3
  });
}

function updatePlayerParticles(dt) {
  for (let i = player.particles.length - 1; i >= 0; i--) {
    const p = player.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.alpha = Math.max(0, p.life);
    if (p.life <= 0) player.particles.splice(i, 1);
  }
}

function triggerCrashExplosion() {
  player.isDead = true;
  player.vy = 0;
  stopSynthMusic();
  playDeathSound();

  // Concentrate massive explosive glow sparks
  for (let i = 0; i < 45; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 250 + 80;
    player.particles.push({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 5 + 2,
      color: Math.random() < 0.5 ? 'rgba(0,255,102,0.9)' : 'rgba(0,243,255,0.9)',
      alpha: 1, life: 1.2
    });
  }

  setTimeout(() => {
    if (currentGameState === STATE_PLAYING) triggerGameOverScreen();
  }, 1200);
}

function updateCamera(dt) {
  camera.x = player.x - 180;
  camera.targetY = player.y - height / 2;
  const clampLimit = 120;
  if (camera.targetY < -clampLimit) camera.targetY = -clampLimit;
  if (camera.targetY > clampLimit) camera.targetY = clampLimit;

  camera.y += (camera.targetY - camera.y) * 8 * dt;
}

// --- RENDERING PIPELINE ---
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  // Parallax Honeycomb Hexagon
  if (hexPatternCanvas) {
    ctx.save();
    const offsetLeft = -(bgScrollX * 0.3) % hexPatternWidth;
    const offsetTop = -(bgScrollY * 0.3) % hexPatternHeight;
    ctx.fillStyle = ctx.createPattern(hexPatternCanvas, 'repeat');
    ctx.translate(offsetLeft, offsetTop);
    ctx.fillRect(-offsetLeft, -offsetTop, width, height);
    ctx.restore();
  }

  // Draw Glowing ceiling/floor lane borders
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
  ctx.lineWidth = 4;
  ctx.shadowBlur = 10;
  ctx.shadowColor = 'rgba(0, 255, 102, 0.8)';

  ctx.beginPath();
  ctx.moveTo(camera.x - 200, 40);
  ctx.lineTo(camera.x + width + 200, 40);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(camera.x - 200, height - 40);
  ctx.lineTo(camera.x + width + 200, height - 40);
  ctx.stroke();
  ctx.restore();

  // Render game assets in Camera Coordinate space
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawObstacles(ctx);
  drawBots(ctx);

  // Render Practice Ghost triangle Replay!
  drawGhostTriangle(ctx);

  drawPlayer(ctx);
  ctx.restore();

  ctx.restore();
}

function drawPlayer(ctx) {
  if (player.isDead) {
    drawPlayerParticles(ctx);
    return;
  }

  // Custom Neon Trails logic
  drawPlayerTrail(ctx);

  // Ship shape vectors based on customization
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  const currentSkin = SKINS.find(s => s.id === equippedSkin) || SKINS[0];
  const skinColor = currentSkin.color;

  // Soft radiant core
  const radialGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, player.width);
  radialGlow.addColorStop(0, skinColor);
  radialGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radialGlow;
  ctx.beginPath();
  ctx.arc(0, 0, player.width, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.fillStyle = 'rgba(5, 20, 18, 0.95)';
  ctx.shadowColor = skinColor;
  ctx.shadowBlur = 10;

  // Draw customized vector geometries
  ctx.beginPath();
  if (equippedSkin === 'emerald_leaf') {
    ctx.moveTo(player.width / 2, 0);
    ctx.quadraticCurveTo(0, -player.height, -player.width / 2, 0);
    ctx.quadraticCurveTo(0, player.height, player.width / 2, 0);
  } else if (equippedSkin === 'phantom_glow') {
    ctx.moveTo(player.width / 2, 0);
    ctx.quadraticCurveTo(player.width / 4, -player.height / 2, -player.width / 2, -player.height / 2);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.quadraticCurveTo(player.width / 4, player.height / 2, player.width / 2, 0);
  } else if (equippedSkin === 'pyro_cube') {
    ctx.rotate(Math.PI / 4);
    ctx.rect(-player.width / 2.5, -player.width / 2.5, player.width * 0.8, player.width * 0.8);
  } else if (equippedSkin === 'cyber_pulse') {
    ctx.moveTo(player.width / 2, 0);
    ctx.lineTo(0, -player.height);
    ctx.lineTo(-player.width / 2, 0);
    ctx.lineTo(0, player.height);
  } else if (equippedSkin === 'golden_arrow') {
    ctx.moveTo(player.width / 2, 0);
    ctx.lineTo(-player.width / 2, -player.height / 1.5);
    ctx.lineTo(-player.width / 5, 0);
    ctx.lineTo(-player.width / 2, player.height / 1.5);
  } else { // default wave triangle
    ctx.moveTo(player.width / 2, 0);
    ctx.lineTo(-player.width / 2, -player.height / 2);
    ctx.lineTo(-player.width / 4, 0);
    ctx.lineTo(-player.width / 2, player.height / 2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
  drawPlayerParticles(ctx);
}

function drawPlayerTrail(ctx) {
  if (player.trail.length < 2) return;
  ctx.save();
  ctx.shadowBlur = 12;

  const currentTrail = TRAILS.find(t => t.id === equippedTrail) || TRAILS[0];
  ctx.shadowColor = currentTrail.color === 'rainbow' ? '#00f3ff' : currentTrail.color;
  ctx.lineWidth = 3.5;

  for (let i = 1; i < player.trail.length; i++) {
    const pt1 = player.trail[i - 1];
    const pt2 = player.trail[i];
    const age = Date.now() - pt2.time;
    const opacity = Math.max(0, 1 - age / 900);

    if (currentTrail.id === 'rainbow_run') {
      const hue = (i * 12) % 360;
      ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${opacity * 0.85})`;
    } else if (currentTrail.id === 'fire_trail') {
      ctx.strokeStyle = `rgba(255, 51, 0, ${opacity * 0.85})`;
    } else if (currentTrail.id === 'matrix_green') {
      ctx.strokeStyle = `rgba(0, 255, 102, ${opacity * 0.85})`;
    } else {
      ctx.strokeStyle = `rgba(0, 243, 255, ${opacity * 0.85})`;
    }

    ctx.beginPath();
    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerParticles(ctx) {
  ctx.save();
  for (const p of player.particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// --- GHOST REPLAY DRAW PIPELINE ---
function drawGhostTriangle(ctx) {
  const activeChk = document.getElementById('practice-mode-chk');
  if (!activeChk || !activeChk.checked || activeGhostTrajectory.length === 0) return;

  // Read recorded frames matching player horizontal progress x
  const targetX = player.x;

  // Find matching frame
  let frame = activeGhostTrajectory.find(f => f.x >= targetX);
  if (!frame) {
    // Take the last frame if player outruns best
    frame = activeGhostTrajectory[activeGhostTrajectory.length - 1];
  }

  if (frame) {
    ctx.save();
    ctx.translate(frame.x, frame.y);
    ctx.rotate(frame.angle);
    ctx.globalAlpha = 0.35; // semi-transparent Ghost appearance

    ctx.strokeStyle = 'rgba(0, 243, 255, 0.8)';
    ctx.fillStyle = 'rgba(0, 243, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(0,243,255,0.6)';

    ctx.beginPath();
    ctx.moveTo(player.width / 2, 0);
    ctx.lineTo(-player.width / 2, -player.height / 2);
    ctx.lineTo(-player.width / 4, 0);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

// --- COLLISION DETECTOR AND PROGRESS MONITORS ---
function updateLevelAndCollisions() {
  if (player.isDead) return;

  if (currentGameMode === 'classic') {
    const startX = 150;
    const totalDist = levelLength - 800 - startX;
    const currentDist = player.x - startX;
    levelProgress = Math.max(0, Math.min(100, (currentDist / totalDist) * 100));

    const bar = document.getElementById('hud-progress-bar');
    const text = document.getElementById('hud-progress-text');
    const indicator = document.getElementById('hud-level-text');

    if (bar) bar.style.width = `${levelProgress}%`;
    if (text) text.innerText = `${Math.floor(levelProgress)}%`;
    if (indicator) indicator.innerText = `Level ${currentLevel}`;

    if (player.x >= levelLength - 800) {
      triggerLevelCleared();
    }
  } else if (currentGameMode === 'endless') {
    const startX = 150;
    const distMeters = Math.floor((player.x - startX) / 10);

    const bar = document.getElementById('hud-progress-bar');
    const text = document.getElementById('hud-progress-text');
    const indicator = document.getElementById('hud-level-text');

    if (bar) bar.style.width = '100%';
    if (text) text.innerText = `${distMeters}m`;
    if (indicator) indicator.innerText = `Endless Mode`;

    // Infinite level generators ahead
    if (obstacles.length > 0 && obstacles[0].x < player.x - 1000) {
      obstacles = obstacles.filter(o => o.x >= player.x - 1000);
    }
    const lastObstacleX = obstacles.length > 0 ? obstacles[obstacles.length - 1].x : player.x;
    if (lastObstacleX < player.x + 3000) {
      generateEndlessBuffer(lastObstacleX + 300, 10000);
    }
  }

  // Precise hitbox checking
  const pW = player.width * 0.55;
  const pH = player.height * 0.55;
  const pX = player.x - pW / 2;
  const pY = player.y - pH / 2;

  for (const obs of obstacles) {
    if (obs.x < player.x - 100) continue;
    if (obs.x > player.x + 250) continue;

    if (obs.type === 'spike') {
      if (rectsIntersect(pX, pY, pW, pH, obs.x, obs.dir === 1 ? obs.y : obs.y - obs.height, obs.width, obs.height)) {
        if (playerSpikeCollision(obs)) {
          triggerCrashExplosion();
          break;
        }
      }
    } else if (obs.type === 'block') {
      if (rectsIntersect(pX, pY, pW, pH, obs.x, obs.y, obs.width, obs.height)) {
        triggerCrashExplosion();
        break;
      }
    }
  }

  const ceilingCrash = player.y - pH / 2 <= 42;
  const floorCrash = player.y + pH / 2 >= height - 42;
  if (ceilingCrash || floorCrash) {
    triggerCrashExplosion();
  }
}

function rectsIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function playerSpikeCollision(spike) {
  const tipY = spike.dir === 1 ? spike.y + spike.height : spike.y - spike.height;
  const tipX = spike.x + spike.width / 2;
  const baseX1 = spike.x;
  const baseY1 = spike.y;
  const baseX2 = spike.x + spike.width;
  const baseY2 = spike.y;

  const corners = [
    { x: player.x, y: player.y },
    { x: player.x + player.width * 0.25, y: player.y },
    { x: player.x - player.width * 0.25, y: player.y }
  ];

  for (const p of corners) {
    if (pointInTriangle(p.x, p.y, baseX1, baseY1, baseX2, baseY2, tipX, tipY)) return true;
  }
  return false;
}

function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const areaOrig = Math.abs((x1*(y2-y3) + x2*(y3-y1) + x3*(y1-y2))/2);
  const area1 = Math.abs((px*(y2-y3) + x2*(y3-py) + x3*(py-y2))/2);
  const area2 = Math.abs((x1*(py-y3) + px*(y3-y1) + x3*(y1-py))/2);
  const area3 = Math.abs((x1*(y2-py) + x2*(py-y1) + px*(y1-y2))/2);
  return Math.abs(areaOrig - (area1 + area2 + area3)) < 0.1;
}

function drawObstacles(ctx) {
  ctx.save();
  for (const obs of obstacles) {
    if (obs.x < camera.x - 100 || obs.x > camera.x + width + 100) continue;
    ctx.shadowBlur = 10;
    ctx.shadowColor = obs.color;

    if (obs.type === 'spike') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = obs.color;
      ctx.beginPath();
      if (obs.dir === 1) {
        ctx.moveTo(obs.x, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y);
        ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height);
      } else {
        ctx.moveTo(obs.x, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y);
        ctx.lineTo(obs.x + obs.width / 2, obs.y - obs.height);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'var(--neon-cyan)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (obs.dir === 1) {
        ctx.moveTo(obs.x + obs.width / 4, obs.y + 4);
        ctx.lineTo(obs.x + 3 * obs.width / 4, obs.y + 4);
        ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height * 0.7);
      } else {
        ctx.moveTo(obs.x + obs.width / 4, obs.y - 4);
        ctx.lineTo(obs.x + 3 * obs.width / 4, obs.y - 4);
        ctx.lineTo(obs.x + obs.width / 2, obs.y - obs.height * 0.7);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (obs.type === 'block') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(5, 20, 18, 0.95)';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

      ctx.strokeStyle = obs.color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(obs.x + 4, obs.y + 4, obs.width - 8, obs.height - 8);
    } else if (obs.type === 'gate') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }
  }
  ctx.restore();
}

// --- LEVEL GENERATORS AND THEMES BRACKETS ---
function generateLevel() {
  obstacles = [];
  recordedGhostRun = [];

  // Load existing personal best trajectory for the Ghost Triangle
  const savedGhost = localStorage.getItem(`best_run_trajectory_lvl_${currentLevel}`);
  if (savedGhost) {
    activeGhostTrajectory = JSON.parse(savedGhost);
  } else {
    activeGhostTrajectory = [];
  }

  if (currentGameMode === 'classic') {
    levelLength = 4000 + (currentLevel * 1000);
    createLevelGates();

    // Handcraft maps or proceed procedurally
    generateProceduralObstacles(600, levelLength - 1000, currentLevel);

    obstacles.push({
      type: 'gate',
      x: levelLength - 800,
      y: 40,
      width: 15,
      height: height - 80,
      color: '#ffffff'
    });
  } else {
    levelLength = 9999999;
    generateEndlessBuffer(0, 50000);
  }
}

function getLevelTheme(levelNum) {
  if (levelNum <= 10) {
    return {
      name: "Forest",
      spikeColor: "#00ff66",
      blockColor: "#1e824c",
      bgPatternColor: "rgba(0, 255, 102, 0.08)",
      pitchModifier: 0.8,
      description: "Emerald Forest"
    };
  } else if (levelNum <= 20) {
    return {
      name: "Haunted",
      spikeColor: "#9b59b6",
      blockColor: "#4a148c",
      bgPatternColor: "rgba(155, 89, 182, 0.08)",
      pitchModifier: 0.6,
      description: "Haunted Graveyard"
    };
  } else if (levelNum <= 30) {
    return {
      name: "Lava",
      spikeColor: "#e67e22",
      blockColor: "#d35400",
      bgPatternColor: "rgba(230, 126, 34, 0.08)",
      pitchModifier: 0.9,
      description: "Desert & Lava Peak"
    };
  } else if (levelNum <= 40) {
    return {
      name: "Cyber",
      spikeColor: "#3498db",
      blockColor: "#2c3e50",
      bgPatternColor: "rgba(52, 152, 219, 0.08)",
      pitchModifier: 1.1,
      description: "Cybernetic Grid"
    };
  } else {
    return {
      name: "Obsidian",
      spikeColor: "#e74c3c",
      blockColor: "#111111",
      bgPatternColor: "rgba(231, 76, 60, 0.08)",
      pitchModifier: 1.4,
      description: "Obsidian Chaos"
    };
  }
}

function generateProceduralObstacles(startX, endX, levelNum) {
  let seed = levelNum * 314.159 + 42;
  function seededRandom() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  let cursorX = startX;
  const speedRatio = Math.min(1, (levelNum - 5) / 45);
  const theme = getLevelTheme(levelNum);

  while (cursorX < endX) {
    const r = seededRandom();

    if (r < 0.22) {
      const count = 2 + Math.floor(seededRandom() * 4);
      const spacing = 180 - speedRatio * 50;
      for (let i = 0; i < count; i++) {
        const isCeiling = (i % 2 === 0);
        obstacles.push({
          type: 'spike',
          x: cursorX + i * spacing,
          y: isCeiling ? 40 : height - 40,
          width: 40, height: 48,
          dir: isCeiling ? 1 : -1,
          color: theme.spikeColor
        });
      }
      cursorX += count * spacing + 180;
    } else if (r < 0.45) {
      const gapHeight = Math.max(135, 220 - speedRatio * 75);
      const gapY = 160 + seededRandom() * (height - 320);
      const blockWidth = 70 + Math.floor(seededRandom() * 80);

      obstacles.push({
        type: 'block',
        x: cursorX, y: 40,
        width: blockWidth, height: gapY - gapHeight / 2 - 40,
        color: theme.blockColor
      });
      obstacles.push({
        type: 'block',
        x: cursorX, y: gapY + gapHeight / 2,
        width: blockWidth, height: (height - 40) - (gapY + gapHeight / 2),
        color: theme.blockColor
      });
      cursorX += blockWidth + 260 - speedRatio * 50;
    } else {
      const colHeight = 110 + seededRandom() * 110;
      const colY = 140 + seededRandom() * (height - colHeight - 280);
      const blockWidth = 90;

      obstacles.push({
        type: 'block',
        x: cursorX, y: colY,
        width: blockWidth, height: colHeight,
        color: theme.blockColor
      });
      cursorX += blockWidth + 280 - speedRatio * 60;
    }
  }
}

function generateEndlessBuffer(startX, length) {
  let cursorX = Math.max(startX, 600);
  const endX = startX + length;

  while (cursorX < endX) {
    const typeRoll = Math.random();
    if (typeRoll < 0.28) {
      const count = Math.floor(Math.random() * 4) + 1;
      const isCeiling = Math.random() < 0.5;
      const spacing = 45;
      for (let i = 0; i < count; i++) {
        obstacles.push({
          type: 'spike',
          x: cursorX + i * spacing,
          y: isCeiling ? 40 : height - 40,
          width: 40, height: 48,
          dir: isCeiling ? 1 : -1,
          color: 'rgba(255, 0, 102, 0.85)'
        });
      }
      cursorX += count * spacing + 220;
    } else {
      const gapY = 160 + Math.random() * 240;
      const gapHeight = 160 + Math.max(-40, 60 - (cursorX * 0.0001));
      obstacles.push({
        type: 'block',
        x: cursorX, y: 40,
        width: 80 + Math.random() * 100,
        height: Math.max(10, gapY - gapHeight / 2 - 40),
        color: 'rgba(0, 243, 255, 0.85)'
      });
      obstacles.push({
        type: 'block',
        x: cursorX, y: gapY + gapHeight / 2,
        width: 80 + Math.random() * 100,
        height: Math.max(10, (height - 40) - (gapY + gapHeight / 2)),
        color: 'rgba(0, 243, 255, 0.85)'
      });
      cursorX += 280;
    }
  }
}

function createLevelGates() {
  obstacles.push({
    type: 'gate',
    x: 400, y: 40,
    width: 15, height: height - 80,
    color: '#ffffff'
  });
}

// --- GHOST REPLAY SYSTEM SETTERS ---
function saveGhostReplay() {
  if (recordedGhostRun.length > 0) {
    try {
      localStorage.setItem(`best_run_trajectory_lvl_${currentLevel}`, JSON.stringify(recordedGhostRun));
    } catch (e) {
      console.error("Failed to save best run trajectory:", e);
    }
  }
}

// --- COMPETITORS BOTS AI ACTIONS (RACE MODE) ---
function initBots() {
  bots = [];
  const board = document.getElementById('race-leaderboard');
  if (currentGameMode !== 'race') {
    if (board) board.classList.remove('active');
    return;
  }

  if (board) board.classList.add('active');

  const names = ["ApexWave", "ShadowRunner", "LavaDash", "CyberDodge"];
  const colors = ["#ff0055", "#e5ff00", "#ff00ea", "#00ffff"];

  for (let i = 0; i < 4; i++) {
    bots.push({
      name: names[i],
      x: 150,
      y: 200 + i * 80,
      vy: 0,
      width: 28, height: 20,
      angle: 0, color: colors[i],
      baseSpeed: 380 + Math.random() * 20,
      isDead: false,
      lastDecisionTime: 0,
      decisionInterval: 0.12 + Math.random() * 0.1,
      trail: [],
      targetVy: 390
    });
  }
}

function updateBots(dt) {
  if (currentGameMode !== 'race') return;
  const now = Date.now();

  for (const bot of bots) {
    if (bot.isDead) continue;

    bot.x += bot.baseSpeed * dt;

    if (now - bot.lastDecisionTime > bot.decisionInterval * 1000) {
      bot.lastDecisionTime = now;
      makeAIDecision(bot);
    }

    bot.vy += (bot.targetVy - bot.vy) * 14 * dt;
    bot.y += bot.vy * dt;

    const borderTop = 40;
    const borderBottom = height - 40;
    if (bot.y < borderTop + bot.height / 2) {
      bot.y = borderTop + bot.height / 2;
      bot.vy = 0;
    }
    if (bot.y > borderBottom - bot.height / 2) {
      bot.y = borderBottom - bot.height / 2;
      bot.vy = 0;
    }

    bot.angle = Math.atan2(bot.vy, bot.baseSpeed) * 0.8;
    checkBotCollisions(bot);
  }

  updateLeaderboardUI();
}

function makeAIDecision(bot) {
  const lookaheadDistance = 240;
  let imminentObstacle = null;

  for (const obs of obstacles) {
    if (obs.x > bot.x && obs.x < bot.x + lookaheadDistance) {
      if (obs.type === 'block') {
        if (bot.y > obs.y - 40 && bot.y < obs.y + obs.height + 40) {
          imminentObstacle = obs;
          break;
        }
      } else if (obs.type === 'spike') {
        const isCeilingSpike = obs.dir === 1;
        if (isCeilingSpike && bot.y < 180) {
          imminentObstacle = obs;
          break;
        }
        if (!isCeilingSpike && bot.y > height - 180) {
          imminentObstacle = obs;
          break;
        }
      }
    }
  }

  if (imminentObstacle) {
    if (imminentObstacle.type === 'block') {
      const distToCeiling = imminentObstacle.y - 40;
      const distToFloor = (height - 40) - (imminentObstacle.y + imminentObstacle.height);
      bot.targetVy = distToCeiling > distToFloor ? -390 : 390;
    } else {
      bot.targetVy = imminentObstacle.dir === 1 ? 390 : -390;
    }
  } else {
    if (bot.y < 160) bot.targetVy = 390;
    else if (bot.y > height - 160) bot.targetVy = -390;
    else if (Math.random() < 0.15) bot.targetVy = -bot.targetVy;
  }
}

function checkBotCollisions(bot) {
  const bW = bot.width * 0.6;
  const bH = bot.height * 0.6;
  const bX = bot.x - bW / 2;
  const bY = bot.y - bH / 2;

  for (const obs of obstacles) {
    if (obs.x < bot.x - 50) continue;
    if (obs.x > bot.x + 150) continue;

    if (obs.type === 'block') {
      if (rectsIntersect(bX, bY, bW, bH, obs.x, obs.y, obs.width, obs.height)) {
        killBot(bot);
        break;
      }
    } else if (obs.type === 'spike') {
      if (rectsIntersect(bX, bY, bW, bH, obs.x, obs.dir === 1 ? obs.y : obs.y - obs.height, obs.width, obs.height)) {
        killBot(bot);
        break;
      }
    }
  }

  if (bot.y - bH/2 <= 42 || bot.y + bH/2 >= height - 42) {
    killBot(bot);
  }
}

function killBot(bot) {
  bot.isDead = true;
  bot.vy = 0;
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    player.particles.push({
      x: bot.x, y: bot.y,
      vx: Math.cos(angle) * 140, vy: Math.sin(angle) * 140,
      size: 2.5, color: bot.color, alpha: 1, life: 0.6
    });
  }
}

function drawBots(ctx) {
  if (currentGameMode !== 'race') return;
  for (const bot of bots) {
    if (bot.isDead) continue;
    ctx.save();
    ctx.translate(bot.x, bot.y);
    ctx.rotate(bot.angle);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillStyle = bot.color;
    ctx.beginPath();
    ctx.moveTo(bot.width / 2, 0);
    ctx.lineTo(-bot.width / 2, -bot.height / 2);
    ctx.lineTo(-bot.width / 4, 0);
    ctx.lineTo(-bot.width / 2, bot.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function updateLeaderboardUI() {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;
  container.innerHTML = '';

  const runners = [];
  if (!player.isDead) runners.push({ name: window.playerName || 'NEON_WAVE', x: player.x, isDead: false, color: 'var(--neon-green)', isPlayer: true });
  else runners.push({ name: window.playerName || 'NEON_WAVE', x: player.x, isDead: true, color: 'var(--neon-green)', isPlayer: true });

  for (const b of bots) {
    runners.push({ name: b.name, x: b.x, isDead: b.isDead, color: b.color, isPlayer: false });
  }

  runners.sort((a, b) => b.x - a.x);

  runners.forEach((r, idx) => {
    const row = document.createElement('div');
    row.className = `leaderboard-row ${r.isPlayer ? 'player' : ''}`;
    row.style.color = r.isDead ? '#666' : (r.isPlayer ? 'var(--neon-green)' : r.color);
    row.innerHTML = `
      <span>${idx + 1}. ${r.name}</span>
      <span>${r.isDead ? 'CRASH' : Math.floor(r.x / 10) + 'm'}</span>
    `;
    container.appendChild(row);
  });

  if (!player.isDead && player.x >= levelLength - 800) {
    const standings = runners.findIndex(r => r.isPlayer);
    if (standings === 0) {
      if (window.incrementRaceWins) window.incrementRaceWins();
      if (window.addCoins) window.addCoins(15);
      triggerLevelCleared();
    } else {
      setGameState(STATE_GAMEOVER);
      document.getElementById('fail-progress-val').innerText = `Finished #${standings + 1}`;
      document.getElementById('fail-score-val').innerText = `Winner: ${runners[0].name}`;
      document.getElementById('gameover-modal').classList.add('active');
    }
  }
}

// --- OVERLAY TRIGGERS CONTROLLERS ---
function triggerGameOverScreen() {
  setGameState(STATE_GAMEOVER);
  const progressText = document.getElementById('fail-progress-val');
  const scoreText = document.getElementById('fail-score-val');

  if (currentGameMode === 'classic') {
    if (progressText) progressText.innerText = `${Math.floor(levelProgress)}%`;
    if (scoreText) scoreText.innerText = `Level ${currentLevel}`;
  } else if (currentGameMode === 'endless') {
    const scoreVal = Math.floor((player.x - 150) / 10);
    if (progressText) progressText.innerText = `${scoreVal}m`;
    if (scoreText) scoreText.innerText = `High Score: ${window.endlessDistance || 0}m`;

    // Endless coin rewards
    const endlessCoins = Math.floor(scoreVal / 20);
    if (endlessCoins > 0 && window.addCoins) window.addCoins(endlessCoins);
    if (window.saveEndlessHighScore) window.saveEndlessHighScore(scoreVal);
  } else {
    if (progressText) progressText.innerText = `Crashed`;
    if (scoreText) scoreText.innerText = `Leaderboard Match`;
  }

  document.getElementById('gameover-modal').classList.add('active');
}

function triggerLevelCleared() {
  setGameState(STATE_VICTORY);
  playVictorySound();

  if (currentGameMode === 'classic') {
    document.getElementById('win-mode-val').innerText = `Level ${currentLevel} Complete`;
    document.getElementById('win-attempts-val').innerText = attemptCount;

    // Save replay best run coordinates
    saveGhostReplay();

    if (window.saveClassicProgress) window.saveClassicProgress(currentLevel, 100);
    document.getElementById('win-next-btn').style.display = currentLevel < 50 ? 'block' : 'none';

    // Unlocks first win achievement
    if (window.checkMilestone) window.checkMilestone('first_win', () => true);

    // Check Haunted survivor achievement
    if (window.checkMilestone) window.checkMilestone('haunted_survivor', () => currentLevel >= 11);
  }

  document.getElementById('win-modal').classList.add('active');
}

// Practice checkpoint controls
function togglePracticeMode(enabled) {
  const ctrls = document.getElementById('practice-controls');
  if (ctrls) ctrls.style.visibility = enabled ? 'visible' : 'hidden';
  if (!enabled) currentPracticeCheckpoint = null;
}

function placeCheckpoint() {
  if (player.isDead) return;
  currentPracticeCheckpoint = {
    x: player.x,
    y: player.y,
    vy: player.vy,
    bgScrollX: bgScrollX,
    bgScrollY: bgScrollY,
    attempt: attemptCount
  };

  const pulseParticles = 12;
  for (let i = 0; i < pulseParticles; i++) {
    const angle = (i / pulseParticles) * Math.PI * 2;
    player.particles.push({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * 120, vy: Math.sin(angle) * 120,
      size: 4, color: 'var(--neon-cyan)', alpha: 1, life: 0.6
    });
  }
}

function clearCheckpoints() {
  currentPracticeCheckpoint = null;
}

// --- CORE REPLAY / LEVEL LOADERS ---
function initGameElements() {
  player.x = 150;
  player.y = 337.5;
  player.vy = 0;
  player.targetVy = 0;
  player.angle = 0;
  player.isDead = false;
  player.trail = [];
  player.particles = [];
  player.speedMultiplier = 1;

  if (currentGameMode === 'classic') {
    player.baseSpeed = 380 + (currentLevel * 15);
  } else {
    player.baseSpeed = 400;
  }

  camera.x = 0;
  camera.y = 0;
  camera.targetY = 0;

  // Background creation
  if (currentGameMode === 'classic') {
    createHexagonPattern(getLevelTheme(currentLevel));
  } else {
    createHexagonPattern(null);
  }

  generateLevel();
  initBots();

  // Load practice mode checkpoint
  const chk = document.getElementById('practice-mode-chk');
  if (chk && chk.checked && currentPracticeCheckpoint) {
    player.x = currentPracticeCheckpoint.x;
    player.y = currentPracticeCheckpoint.y;
    player.vy = currentPracticeCheckpoint.vy;
    attemptCount = currentPracticeCheckpoint.attempt;
    camera.x = player.x - 180;
    camera.y = player.y - height / 2;
  }
}

function startClassicLevel(lvlNum) {
  currentGameMode = 'classic';
  currentLevel = lvlNum;
  attemptCount = 1;
  syncNameDisplays();
  initGameElements();
  setGameState(STATE_PLAYING);
}

function startEndlessMode() {
  currentGameMode = 'endless';
  attemptCount = 1;
  syncNameDisplays();
  initGameElements();
  setGameState(STATE_PLAYING);
}

function startRaceMode() {
  currentGameMode = 'race';
  attemptCount = 1;
  syncNameDisplays();
  initGameElements();
  setGameState(STATE_PLAYING);
}

function syncNameDisplays() {
  const name = window.playerName || 'NEON_WAVE';
  const nameHUD = document.getElementById('hud-player-name');
  if (nameHUD) nameHUD.innerText = name;
}

// --- STATE ROUTER AND WINDOW EXPORTS ---
function setGameState(newState) {
  currentGameState = newState;

  const screens = {
    [STATE_MENU]: 'main-menu-screen',
    [STATE_LEVEL_SELECT]: 'level-select-screen',
  };

  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const hud = document.getElementById('hud');
  if (hud) hud.classList.remove('active');
  hideAllModals();

  if (screens[newState]) {
    const scr = document.getElementById(screens[newState]);
    if (scr) scr.classList.remove('hidden');
  }

  if (newState === STATE_PLAYING) {
    if (hud) hud.classList.add('active');
    startSynthMusic();
  } else {
    stopSynthMusic();
  }
}

function openMainMenu() {
  setGameState(STATE_MENU);
}

function openLevelSelect() {
  setGameState(STATE_LEVEL_SELECT);
}

function hideAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

function pauseGame() {
  if (currentGameState !== STATE_PLAYING) return;
  currentGameState = STATE_PAUSED;
  stopSynthMusic();

  const pg = document.getElementById('pause-progress-val');
  if (pg) {
    if (currentGameMode === 'classic') pg.innerText = `${Math.floor(levelProgress)}%`;
    else if (currentGameMode === 'endless') pg.innerText = `${Math.floor((player.x - 150) / 10)}m`;
    else pg.innerText = `RACING`;
  }
  const modeVal = document.getElementById('pause-mode-val');
  if (modeVal) modeVal.innerText = currentGameMode.toUpperCase();
  document.getElementById('pause-modal').classList.add('active');
}

function resumeGame() {
  if (currentGameState !== STATE_PAUSED) return;
  hideAllModals();
  currentGameState = STATE_PLAYING;
  startSynthMusic();
}

function restartLevel() {
  hideAllModals();
  attemptCount++;
  initGameElements();
  setGameState(STATE_PLAYING);
}

function quitToMenu() {
  hideAllModals();
  openMainMenu();
}

function nextLevel() {
  hideAllModals();
  if (currentLevel < 50) {
    try {
      const data = window.getClassicProgress ? window.getClassicProgress() : {};
      if (data[currentLevel + 1] !== null) {
        startClassicLevel(currentLevel + 1);
        return;
      }
    } catch (e) {}
    openLevelSelect();
  } else {
    openLevelSelect();
  }
}

function toggleAudio() {
  isMuted = !isMuted;
  const toggle = document.getElementById('audio-toggle');
  if (toggle) {
    toggle.innerHTML = isMuted ? '<span>🔇</span> Audio: OFF' : '<span>🔊</span> Audio: ON';
  }
  const hudBtn = document.getElementById('hud-audio-btn');
  if (hudBtn) {
    hudBtn.innerText = isMuted ? '🔇' : '🔊';
  }
  if (!isMuted && currentGameState === STATE_PLAYING) startSynthMusic();
  else stopSynthMusic();
}

function toggleMuteHUD() {
  toggleAudio();
}

// Link helper hooks to global windows
window.openMainMenu = openMainMenu;
window.openLevelSelect = openLevelSelect;
window.startEndlessMode = startEndlessMode;
window.startRaceMode = startRaceMode;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
window.restartLevel = restartLevel;
window.quitToMenu = quitToMenu;
window.nextLevel = nextLevel;
window.toggleAudio = toggleAudio;
window.toggleMuteHUD = toggleMuteHUD;
window.togglePracticeMode = togglePracticeMode;
window.placeCheckpoint = placeCheckpoint;
window.clearCheckpoints = clearCheckpoints;

// Classic progress and endless saves hook mappings
window.saveClassicProgress = function(level, percent) {
  try {
    const data = window.getClassicProgress ? window.getClassicProgress() : {};
    const currentBest = data[level] || 0;
    if (percent > currentBest) {
      data[level] = percent;
    }
    if (percent >= 100) {
      if (window.addCoins) window.addCoins(50);
    }
    localStorage.setItem(SAVE_CLASSIC_PROGRESS, JSON.stringify(data));
    if (window.renderLevelGrid) window.renderLevelGrid();
  } catch (e) {}
};

window.saveEndlessHighScore = function(score) {
  try {
    const savedHi = localStorage.getItem(SAVE_ENDLESS_HI_SCORE);
    const hiScoreVal = savedHi ? parseInt(savedHi, 10) : 0;
    if (score > hiScoreVal) {
      localStorage.setItem(SAVE_ENDLESS_HI_SCORE, score.toString());
      window.endlessDistance = score;
      if (window.updateMenuLeaderboardTags) window.updateMenuLeaderboardTags();
    }
  } catch (e) {}
};

window.incrementRaceWins = function() {
  try {
    const savedWins = localStorage.getItem(SAVE_RACE_WINS);
    const winsVal = savedWins ? parseInt(savedWins, 10) : 0;
    const nextWins = winsVal + 1;
    localStorage.setItem(SAVE_RACE_WINS, nextWins.toString());
    if (window.updateMenuLeaderboardTags) window.updateMenuLeaderboardTags();
  } catch (e) {}
};

window.updateMenuLeaderboardTags = function() {
  const savedHi = localStorage.getItem(SAVE_ENDLESS_HI_SCORE) || '0';
  const savedWins = localStorage.getItem(SAVE_RACE_WINS) || '0';
  window.endlessDistance = parseInt(savedHi, 10);

  const endlessTag = document.getElementById('endless-high-score');
  const winsTag = document.getElementById('race-stats');
  if (endlessTag) endlessTag.innerText = `Best: ${savedHi}m`;
  if (winsTag) winsTag.innerText = `Wins: ${savedWins}`;
};

// Map levels select populator directly on script references
window.renderLevelGrid = function() {
  const grid = document.getElementById('level-grid');
  if (!grid) return;
  grid.innerHTML = '';

  try {
    const data = window.getClassicProgress ? window.getClassicProgress() : {};
    for (let i = 1; i <= 50; i++) {
      const progress = data[i];
      const isLocked = progress === null;
      const box = document.createElement('div');
      box.className = `level-box ${isLocked ? 'locked' : ''}`;

      if (!isLocked) {
        box.onclick = () => startClassicLevel(i);
        const num = document.createElement('div');
        num.className = 'level-num';
        num.innerText = i;
        box.appendChild(num);

        const percent = document.createElement('div');
        percent.className = 'level-percent';
        percent.innerText = `${progress}%`;
        box.appendChild(percent);
      } else {
        box.onclick = () => {
          if (window.ploCoins < 100) {
            alert("Not enough coins! Earn more in Endless / Classic mode.");
            return;
          }
          if (confirm(`Unlock Level ${i} for 100 PLO Coins?`)) {
            if (window.addCoins) window.addCoins(-100);
            data[i] = 0;
            localStorage.setItem(SAVE_CLASSIC_PROGRESS, JSON.stringify(data));
            window.renderLevelGrid();
            if (window.updateShopLevelsUI) window.updateShopLevelsUI();
          }
        };

        const num = document.createElement('div');
        num.className = 'level-num';
        num.style.color = '#777';
        num.innerText = i;
        box.appendChild(num);

        const price = document.createElement('div');
        price.className = 'level-price';
        price.innerHTML = `🪙100`;
        box.appendChild(price);

        box.innerHTML += `
          <svg class="lock-icon" viewBox="0 0 24 24">
            <path d="M12 2c-2.76 0-5 2.24-5 5v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm-3 5c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V7zm3 10c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1z"/>
          </svg>
        `;
      }

      let themeColor = 'rgba(0, 255, 102, 0.4)';
      if (i <= 10) themeColor = 'rgba(0, 255, 102, 0.4)';
      else if (i <= 20) themeColor = 'rgba(155, 89, 182, 0.4)';
      else if (i <= 30) themeColor = 'rgba(230, 126, 34, 0.4)';
      else if (i <= 40) themeColor = 'rgba(52, 152, 219, 0.4)';
      else themeColor = 'rgba(231, 76, 60, 0.4)';

      if (!isLocked) box.style.borderColor = themeColor;
      grid.appendChild(box);
    }
  } catch (e) {}
};

// Exports load updates tags on ready hooks
window.addEventListener('load', () => {
  window.updateMenuLeaderboardTags();
});
