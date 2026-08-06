    // --- CORE GAME STATE AND VARIABLES ---
    const STATE_MENU = 'menu';
    const STATE_LEVEL_SELECT = 'level_select';
    const STATE_PLAYING = 'playing';
    const STATE_PAUSED = 'paused';
    const STATE_GAMEOVER = 'gameover';
    const STATE_VICTORY = 'victory';

    let currentGameState = STATE_MENU;
    let currentGameMode = 'classic'; // 'classic', 'endless', 'race'
    let currentLevel = 1;
    let attemptCount = 1;
    let isMuted = false;
    let playerName = 'NEON_WAVE';

    // Canvas scaling and dimensions
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let width = 1200;
    let height = 675;
    let scaleX = 1;
    let scaleY = 1;

    // Timing
    let lastTime = 0;
    let deltaTime = 0;

    // Inputs
    const inputs = {
      active: false,
      space: false,
      w: false,
      pointer: false
    };

    // Parallax background offsets
    let bgScrollX = 0;
    let bgScrollY = 0;

    // Offscreen Hexagon Grid Canvas for performance caching
    let hexPatternCanvas = null;
    let hexPatternWidth = 256;
    let hexPatternHeight = 256;

    // LocalStorage keys
    const SAVE_CLASSIC_PROGRESS = 'plo_io_classic_progress';
    const SAVE_ENDLESS_HI_SCORE = 'plo_io_endless_hiscore';
    const SAVE_RACE_WINS = 'plo_io_race_wins';
    const SAVE_COINS = 'plo_io_coins';
    const SAVE_SKINS = 'plo_io_skins_unlocked';
    const SAVE_EQUIPPED_SKIN = 'plo_io_equipped_skin';

    let unlockedSkins = ['wave_triangle'];
    let equippedSkin = 'wave_triangle';

    const SKINS = [
      { id: 'wave_triangle', name: 'Wave Triangle', cost: 0, desc: 'The classic aerodynamic vector shape.', color: '#00ff66' },
      { id: 'emerald_leaf', name: 'Emerald Leaf', cost: 150, desc: 'Woodland leaf with forest green trail.', color: '#2ecc71' },
      { id: 'phantom_glow', name: 'Phantom Glow', cost: 250, desc: 'Ghost model with purple trails.', color: '#9b59b6' },
      { id: 'pyro_cube', name: 'Pyro Cube', cost: 350, desc: 'Lava-themed square vessel.', color: '#e67e22' },
      { id: 'cyber_pulse', name: 'Cyber Pulse', cost: 500, desc: 'Neon blue geometric diamond.', color: '#3498db' },
      { id: 'void_arrow', name: 'Void Arrow', cost: 750, desc: 'Chaos-infused vector arrow.', color: '#e74c3c' }
    ];

    // Game stats trackers
    let levelProgress = 0; // 0 to 100
    let endlessDistance = 0; // meters survived
    let raceWinsCount = 0;
    let ploCoins = 0;

    // --- AUDIO SYSTEM (WEB AUDIO API SYNTHESIZER) ---
    let audioCtx = null;
    let synthIntervalId = null;
    let synthBeatsCount = 0;

    // --- LEVEL OBSTACLES AND GENERATION ---
    let obstacles = []; // array of {type: 'spike'|'block', x, y, width, height, color}
    let levelLength = 6000; // total width in pixels of a classic course level
    let currentPracticeCheckpoint = null; // saved player snapshot

    // --- RACE MODE AI BOT COMPETITORS ---
    let bots = []; // array of bot objects: {name, x, y, vy, color, isDead, lastDecisionTime, angle, targetY}

    // --- PLAYER OBJECT ---
    let player = {
      x: 150,
      y: 337.5,
      width: 32,
      height: 24,
      vy: 0,
      targetVy: 0,
      angle: 0,
      baseSpeed: 380, // forward movement speed
      speedMultiplier: 1,
      isDead: false,
      trail: [], // array of {x, y, age} for the glowing wave line
      particles: [], // actual particle explosion / drift sparks
      checkpoints: [], // practice mode checkpoints: {x, y, vy, bgScrollX, bgScrollY, attempt}
    };

    // Camera
    let camera = {
      x: 0,
      y: 0,
      targetY: 0,
    };

    // --- PWA SERVICE WORKER & DEFERRED PROMPT SYSTEM ---
    let deferredPrompt = null;

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('[Service Worker] Registered successfully:', reg.scope))
          .catch((err) => console.error('[Service Worker] Registration failed:', err));
      });
    }

    // Capture beforeinstallprompt event to enable custom Install button
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent standard browser auto-install prompt
      e.preventDefault();
      deferredPrompt = e;

      // Render our custom "📥 Install App" button visible in the Main Menu
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) {
        installBtn.style.display = 'flex';
      }
    });

    function triggerPWAInstall() {
      if (!deferredPrompt) return;

      // Render native browser prompt dialog
      deferredPrompt.prompt();

      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt');
        } else {
          console.log('[PWA] User dismissed the install prompt');
        }

        // Wipe deferredPrompt so it triggers once
        deferredPrompt = null;
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
          installBtn.style.display = 'none';
        }
      });
    }

    // Hide button if the app has already been installed/launched as a PWA
    window.addEventListener('appinstalled', (e) => {
      console.log('[PWA] Successfully installed plo.io as a native app!');
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) {
        installBtn.style.display = 'none';
      }
    });

    // --- INITIALIZATION ---
    window.addEventListener('load', () => {
      initCanvas();
      createHexagonPattern();
      initInputListeners();
      initPlayerNameListener();
      loadSavedData();
      renderLevelGrid();

      // Begin rendering loop
      requestAnimationFrame(gameLoop);

      // Update score display UI tags
      updateMenuLeaderboardTags();
    });

    window.addEventListener('resize', initCanvas);
    window.addEventListener('orientationchange', () => {
      // Small timeout to allow browser layout to stabilize on orientation change
      setTimeout(initCanvas, 150);
    });

    // Initialize the input listener for player name
    function initPlayerNameListener() {
      const nameField = document.getElementById('player-name-field');
      if (nameField) {
        nameField.addEventListener('input', (e) => {
          let val = e.target.value.trim().toUpperCase();
          if (!val) {
            playerName = 'NEON_WAVE';
          } else {
            playerName = val.replace(/[^A-Z0-9_]/g, ''); // alphanumeric and underscores only
          }
          localStorage.setItem('plo_io_player_name', playerName);
        });
      }
    }

    function initCanvas() {
      // Setup scaled dimensions preserving a 16:9 virtual ratio
      const container = document.getElementById('game-container');
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const targetAspect = 16 / 9;
      let renderWidth = containerWidth;
      let renderHeight = containerHeight;

      if (containerWidth / containerHeight > targetAspect) {
        // Window is wider than 16:9 - bound by height
        renderHeight = containerHeight;
        renderWidth = containerHeight * targetAspect;
      } else {
        // Window is taller than 16:9 - bound by width
        renderWidth = containerWidth;
        renderHeight = containerWidth / targetAspect;
      }

      // Style canvas element size to fit perfect aspect ratio
      canvas.style.width = `${renderWidth}px`;
      canvas.style.height = `${renderHeight}px`;

      // Keep canvas element centered in the screen
      canvas.style.left = `${(containerWidth - renderWidth) / 2}px`;
      canvas.style.top = `${(containerHeight - renderHeight) / 2}px`;

      // Keep backing store resolution fixed at high-res 1200x675 virtual dimensions
      canvas.width = width;
      canvas.height = height;

      // Since canvas backing store is exactly 1200x675, drawing scale factor is always 1
      scaleX = 1;
      scaleY = 1;
    }

    // --- PROCEDURAL HONEYCOMB DESIGN ---
    function createHexagonPattern(customTheme = null) {
      hexPatternCanvas = document.createElement('canvas');
      hexPatternCanvas.width = hexPatternWidth;
      hexPatternCanvas.height = hexPatternHeight;
      const hCtx = hexPatternCanvas.getContext('2d');

      // Draw dark dark teal background or thematic background base
      let strokeColor = 'rgba(0, 255, 102, 0.12)';
      if (customTheme) {
        hCtx.fillStyle = '#040b09'; // extremely dark themed background
        strokeColor = customTheme.bgPatternColor;
      } else {
        hCtx.fillStyle = '#051412';
      }
      hCtx.fillRect(0, 0, hexPatternWidth, hexPatternHeight);

      const r = 24; // hexagon radius
      const h = r * Math.sqrt(3);
      const w = r * 1.5;

      hCtx.strokeStyle = strokeColor;
      hCtx.lineWidth = 1.5;

      // Draw tiled hexagons
      for (let x = -r; x < hexPatternWidth + r * 2; x += r * 3) {
        for (let y = -r; y < hexPatternHeight + r * 2; y += h) {
          drawHexagonPath(hCtx, x, y, r);
          hCtx.stroke();

          // Draw offset row
          drawHexagonPath(hCtx, x + w, y + h / 2, r);
          hCtx.stroke();
        }
      }

      // Add random darker/lighter highlights inside hexes for high-tech aesthetic
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

    // --- FULLSCREEN CAPABILITIES API ---
    function toggleFullscreen() {
      const container = document.getElementById('game-container');
      if (!document.fullscreenElement &&
          !document.webkitFullscreenElement &&
          !document.msFullscreenElement &&
          !document.mozFullScreenElement) {
        // Entering Fullscreen
        if (container.requestFullscreen) {
          container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen(); // Safari/iOS Safari support
        } else if (container.msRequestFullscreen) {
          container.msRequestFullscreen(); // IE11 support
        } else if (container.mozRequestFullScreen) {
          container.mozRequestFullScreen(); // Firefox support
        }
      } else {
        // Exiting Fullscreen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        }
      }
    }

    // Register listeners for fullscreen state transitions
    const fsEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    fsEvents.forEach(evt => {
      document.addEventListener(evt, () => {
        initCanvas(); // trigger canvas resize during state transition
      });
    });

    // --- INPUT HANDLERS ---
    function initInputListeners() {
      // Keyboard listeners
      window.addEventListener('keydown', (e) => {
        // Avoid gameplay actions if typing in an input field
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          return;
        }

        if (e.code === 'Space') {
          inputs.space = true;
          e.preventDefault();
        }
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
          inputs.w = true;
        }
        if (e.code === 'KeyF') {
          toggleFullscreen();
          e.preventDefault();
        }
        if (e.code === 'Escape') {
          if (currentGameState === STATE_PLAYING) {
            pauseGame();
          } else if (currentGameState === STATE_PAUSED) {
            resumeGame();
          }
        }
        updateInputActiveState();
      });

      window.addEventListener('keyup', (e) => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          return;
        }

        if (e.code === 'Space') {
          inputs.space = false;
        }
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
          inputs.w = false;
        }
        updateInputActiveState();
      });

      // Pointer (Mouse / Touch) listeners
      window.addEventListener('mousedown', (e) => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          return;
        }

        if (e.button === 0) { // Left click
          inputs.pointer = true;
          updateInputActiveState();
        }
      });

      window.addEventListener('mouseup', (e) => {
        inputs.pointer = false;
        updateInputActiveState();
      });

      // Auto Fullscreen triggers once on mobile touch start to conceal browser navigation bars
      let hasMobileAutoFullscreenTriggered = false;

      window.addEventListener('touchstart', (e) => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          return;
        }

        // Detect if user is on touch/mobile device and trigger once
        if (!hasMobileAutoFullscreenTriggered) {
          // Verify we aren't clicking a close/menu or form input directly
          const isInputField = e.target.tagName === 'INPUT' || e.target.closest('.name-input-container');
          if (!isInputField) {
            hasMobileAutoFullscreenTriggered = true;

            // Invoke fullscreen safely to handle browser URL / nav bars
            const container = document.getElementById('game-container');
            if (!document.fullscreenElement &&
                !document.webkitFullscreenElement &&
                !document.msFullscreenElement &&
                !document.mozFullScreenElement) {
              if (container.requestFullscreen) {
                container.requestFullscreen().catch(err => console.log("Auto-FS blocked or bypassed:", err));
              } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
              }
            }
          }
        }

        // Prevent default zoom or scroll on game container
        if (e.target.closest('#game-container')) {
          inputs.pointer = true;
          updateInputActiveState();
        }
      });

      window.addEventListener('touchend', (e) => {
        inputs.pointer = false;
        updateInputActiveState();
      });
    }

    function updateInputActiveState() {
      inputs.active = inputs.space || inputs.w || inputs.pointer;
    }

    // --- LOCAL STORAGE STATE ---
    function loadSavedData() {
      try {
        // Player name load
        const savedName = localStorage.getItem('plo_io_player_name');
        if (savedName) {
          playerName = savedName;
          const nameField = document.getElementById('player-name-field');
          if (nameField) nameField.value = playerName;
        }

        const savedProgress = localStorage.getItem(SAVE_CLASSIC_PROGRESS);
        if (!savedProgress) {
          const defaultProgress = {};
          for (let i = 1; i <= 50; i++) {
            defaultProgress[i] = i <= 5 ? 0 : null; // Level 1-5 unlocked (0% progress), others locked (null)
          }
          localStorage.setItem(SAVE_CLASSIC_PROGRESS, JSON.stringify(defaultProgress));
        } else {
          // Expand existing progress to 50 levels if less
          const data = JSON.parse(savedProgress);
          let modified = false;
          for (let i = 1; i <= 50; i++) {
            if (i <= 5 && data[i] === null) {
              data[i] = 0;
              modified = true;
            }
            if (data[i] === undefined) {
              data[i] = i <= 5 ? 0 : null;
              modified = true;
            }
          }
          if (modified) {
            localStorage.setItem(SAVE_CLASSIC_PROGRESS, JSON.stringify(data));
          }
        }

        const savedSkins = localStorage.getItem(SAVE_SKINS);
        if (savedSkins) {
          unlockedSkins = JSON.parse(savedSkins);
        } else {
          unlockedSkins = ['wave_triangle'];
          localStorage.setItem(SAVE_SKINS, JSON.stringify(unlockedSkins));
        }

        const savedEquippedSkin = localStorage.getItem(SAVE_EQUIPPED_SKIN);
        if (savedEquippedSkin) {
          equippedSkin = savedEquippedSkin;
        } else {
          equippedSkin = 'wave_triangle';
          localStorage.setItem(SAVE_EQUIPPED_SKIN, equippedSkin);
        }

        const savedHiScore = localStorage.getItem(SAVE_ENDLESS_HI_SCORE);
        if (savedHiScore) {
          endlessDistance = parseInt(savedHiScore, 10);
        }

        const savedRaceWins = localStorage.getItem(SAVE_RACE_WINS);
        if (savedRaceWins) {
          raceWinsCount = parseInt(savedRaceWins, 10);
        }

        const savedCoins = localStorage.getItem(SAVE_COINS);
        if (savedCoins) {
          ploCoins = parseInt(savedCoins, 10);
        } else {
          ploCoins = 0;
          localStorage.setItem(SAVE_COINS, "0");
        }
        updateCoinUI();
      } catch (e) {
        console.error("Failed to load local storage game data:", e);
      }
    }

    function updateCoinUI() {
      document.getElementById('menu-coin-val').innerText = ploCoins;
      document.getElementById('hud-coin-val').innerText = ploCoins;
    }

    function addCoins(amount) {
      ploCoins += amount;
      localStorage.setItem(SAVE_COINS, ploCoins.toString());
      updateCoinUI();
      triggerCoinFloat(amount);
    }

    function triggerCoinFloat(amount) {
      const container = document.getElementById('game-container');
      const floatText = document.createElement('div');
      floatText.className = 'coin-float-text';
      floatText.innerText = `+${amount} 🪙`;
      floatText.style.left = '50%';
      floatText.style.top = '50%';
      container.appendChild(floatText);
      setTimeout(() => {
        floatText.remove();
      }, 1250);
    }

    function buyLevel(lvlNum, cost) {
      if (ploCoins < cost) {
        alert("Not enough PLO Coins! Keep playing to earn more.");
        return;
      }
      if (confirm(`Unlock Level ${lvlNum} for ${cost} PLO Coins?`)) {
        ploCoins -= cost;
        localStorage.setItem(SAVE_COINS, ploCoins.toString());
        updateCoinUI();

        // Unlock in progression
        try {
          const data = JSON.parse(localStorage.getItem(SAVE_CLASSIC_PROGRESS));
          if (data) {
            data[lvlNum] = 0; // unlocked
            localStorage.setItem(SAVE_CLASSIC_PROGRESS, JSON.stringify(data));
            renderLevelGrid();
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    function saveClassicProgress(level, percent) {
      try {
        const data = JSON.parse(localStorage.getItem(SAVE_CLASSIC_PROGRESS));
        if (data) {
          // Update level progress only if the new progress is higher
          const currentBest = data[level] || 0;
          if (percent > currentBest) {
            data[level] = percent;
          }
          // In the store system, we don't automatically unlock the next level
          // but we award coins!
          if (percent >= 100) {
            // Earning: +50 baseline PLO Coins upon successfully completing classic levels
            const coinsEarned = 50;
            addCoins(coinsEarned);
          }
          localStorage.setItem(SAVE_CLASSIC_PROGRESS, JSON.stringify(data));
          renderLevelGrid();
        }
      } catch (e) {
        console.error(e);
      }
    }

    function saveEndlessHighScore(score) {
      try {
        if (score > endlessDistance) {
          endlessDistance = score;
          localStorage.setItem(SAVE_ENDLESS_HI_SCORE, score.toString());
          updateMenuLeaderboardTags();
        }
      } catch (e) {
        console.error(e);
      }
    }

    function incrementRaceWins() {
      try {
        raceWinsCount++;
        localStorage.setItem(SAVE_RACE_WINS, raceWinsCount.toString());
        updateMenuLeaderboardTags();
      } catch (e) {
        console.error(e);
      }
    }

    function updateMenuLeaderboardTags() {
      document.getElementById('endless-high-score').innerText = `Best: ${endlessDistance}m`;
      document.getElementById('race-stats').innerText = `Wins: ${raceWinsCount}`;
    }

    function getLevelCost(lvlNum) {
      if (lvlNum <= 5) return 0;
      return 100; // Levels 1-5 free, others cost 100 coins
    }

    function renderLevelGrid() {
      const grid = document.getElementById('level-grid');
      grid.innerHTML = '';

      try {
        const data = JSON.parse(localStorage.getItem(SAVE_CLASSIC_PROGRESS)) || {};
        for (let i = 1; i <= 50; i++) {
          const progress = data[i];
          const isLocked = progress === null;
          const cost = getLevelCost(i);

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
            // Locked design
            box.onclick = () => buyLevel(i, cost);

            const num = document.createElement('div');
            num.className = 'level-num';
            num.style.color = '#777';
            num.innerText = i;
            box.appendChild(num);

            // Price Display
            const price = document.createElement('div');
            price.className = 'level-price';
            price.innerHTML = `🪙${cost}`;
            box.appendChild(price);

            // Lock SVG Icon
            box.innerHTML += `
              <svg class="lock-icon" viewBox="0 0 24 24">
                <path d="M12 2c-2.76 0-5 2.24-5 5v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm-3 5c0-1.66 1.34-3 3-3s3 1.34 3 3v3H9V7zm3 10c-.55 0-1-.45-1-1v-2c0-.55.45-1 1-1s1 .45 1 1v2c0 .55-.45 1-1 1z"/>
              </svg>
            `;
          }

          // Color boxes based on their thematic zones to look absolutely stunning in grid!
          // Forest: 1-8 (Green), Haunted: 9-16 (Purple), Cyber: 17-25 (Cyan), Volcano: 26-33 (Red), Ice: 34-41 (White/Blue), Space: 42-50 (Pink)
          let themeColor = 'rgba(0, 255, 102, 0.4)';
          if (i <= 8) themeColor = 'rgba(0, 255, 102, 0.4)';
          else if (i <= 16) themeColor = 'rgba(180, 0, 255, 0.4)';
          else if (i <= 25) themeColor = 'rgba(0, 243, 255, 0.4)';
          else if (i <= 33) themeColor = 'rgba(255, 50, 0, 0.4)';
          else if (i <= 41) themeColor = 'rgba(150, 220, 255, 0.4)';
          else themeColor = 'rgba(255, 0, 150, 0.4)';

          if (!isLocked) {
            box.style.borderColor = themeColor;
          }

          grid.appendChild(box);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // --- GAME ENGINE LOOP ---
    function gameLoop(time) {
      if (!lastTime) lastTime = time;
      deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      // Clamp deltaTime to avoid giant jumps on tab unfocus
      if (deltaTime > 0.1) deltaTime = 0.1;

      update(deltaTime);
      render();

      requestAnimationFrame(gameLoop);
    }

    // --- STATE ROUTER & TRANSITIONS ---
    function setGameState(newState) {
      currentGameState = newState;

      // Toggle visibility of overlays
      const screens = {
        [STATE_MENU]: 'main-menu-screen',
        [STATE_LEVEL_SELECT]: 'level-select-screen',
      };

      // Hide all overlays first
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      document.getElementById('hud').classList.remove('active');
      hideAllModals();

      // Show requested overlay
      if (screens[newState]) {
        document.getElementById(screens[newState]).classList.remove('hidden');
      }

      // Handle custom transitions
      if (newState === STATE_PLAYING) {
        document.getElementById('hud').classList.add('active');
        // Instantly start driving synthesizer background loops
        startSynthMusic();
      } else {
        // Stop background sequencers on menus / modals
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

    // --- CORE REPLAY / LEVEL LOADERS ---
    function startClassicLevel(lvlNum) {
      currentGameMode = 'classic';
      currentLevel = lvlNum;
      attemptCount = 1; // resets or increments handled on death

      updatePlayerNameHUDandModals();
      initGameElements();
      setGameState(STATE_PLAYING);
    }

    function startEndlessMode() {
      currentGameMode = 'endless';
      attemptCount = 1;

      updatePlayerNameHUDandModals();
      initGameElements();
      setGameState(STATE_PLAYING);
    }

    function startRaceMode() {
      currentGameMode = 'race';
      attemptCount = 1;

      updatePlayerNameHUDandModals();
      initGameElements();
      setGameState(STATE_PLAYING);
    }

    function updatePlayerNameHUDandModals() {
      // Dynamic rendering of player's customized name to the UI badges on startup
      const nameField = document.getElementById('player-name-field');
      if (nameField) {
        let val = nameField.value.trim().toUpperCase();
        playerName = val ? val.replace(/[^A-Z0-9_]/g, '') : 'NEON_WAVE';
      }
      document.getElementById('hud-player-name').innerText = playerName;
      document.getElementById('pause-player-val').innerText = playerName;
      document.getElementById('fail-player-val').innerText = playerName;
      document.getElementById('win-player-val').innerText = playerName;
    }

    // --- PLAYER PHYSICS & PARTICLE SYSTEMS ---
    function initPlayer() {
      player.x = 150;
      player.y = 337.5;
      player.vy = 0;
      player.targetVy = 0;
      player.angle = 0;
      player.isDead = false;
      player.trail = [];
      player.particles = [];
      player.speedMultiplier = 1;

      // Let speeds vary slightly based on mode/difficulty later
      if (currentGameMode === 'classic') {
        player.baseSpeed = 380 + (currentLevel * 15); // slightly faster on later levels
      } else {
        player.baseSpeed = 400; // endless / race
      }

      camera.x = 0;
      camera.y = 0;
      camera.targetY = 0;
    }

    function updatePlayerPhysics(dt) {
      if (player.isDead) {
        updatePlayerParticles(dt);
        return;
      }

      // 1. Move Player Forward horizontally
      player.x += player.baseSpeed * player.speedMultiplier * dt;

      // 2. Adjust target diagonal velocities based on Inputs
      // Up diagonal is roughly negative Y direction, down diagonal is positive Y direction
      const diagonalSpeed = 390;
      if (inputs.active) {
        player.targetVy = -diagonalSpeed;
      } else {
        player.targetVy = diagonalSpeed;
      }

      // Smooth vertical velocity interpolation for comfortable, fluid wave feel
      const lerpFactor = 16;
      player.vy += (player.targetVy - player.vy) * lerpFactor * dt;

      // 3. Move Player Vertically
      player.y += player.vy * dt;

      // Bound player to ceiling and floor boundaries (leaving room for neon borders)
      const borderTop = 40;
      const borderBottom = height - 40;

      if (player.y < borderTop + player.height / 2) {
        player.y = borderTop + player.height / 2;
        player.vy = 0;
        // Collision or slide check can be added if spikes are placed on ceiling
      }
      if (player.y > borderBottom - player.height / 2) {
        player.y = borderBottom - player.height / 2;
        player.vy = 0;
      }

      // Calculate player visual rotation angle based on current vertical speed
      // Rotates diagonally upwards or downwards
      player.angle = Math.atan2(player.vy, player.baseSpeed) * 0.8;

      // 4. Update Particle Wave Trail
      // Add a trail point at the center back of the player triangle
      const backOffsetAngle = player.angle + Math.PI;
      const backX = player.x + Math.cos(backOffsetAngle) * (player.width / 2);
      const backY = player.y + Math.sin(backOffsetAngle) * (player.width / 2);

      player.trail.push({
        x: backX,
        y: backY,
        time: Date.now()
      });

      // Maintain trail size (e.g. max 120 elements, or filtered by age)
      const now = Date.now();
      player.trail = player.trail.filter(pt => now - pt.time < 900); // 900ms lifetime

      // 5. Emit small drift spark particles from back of player
      if (Math.random() < 0.4) {
        createSpark(backX, backY, -player.vy * 0.2);
      }

      // Emit thematic ambient particle drift
      if (currentGameMode === 'classic' && Math.random() < 0.25) {
        const theme = getLevelTheme(currentLevel);
        let partSize = Math.random() * 2 + 0.5;
        let pColor = theme.spikeColor;
        let pVx = -player.baseSpeed * 0.7 - Math.random() * 100;
        let pVy = (Math.random() - 0.5) * 40;

        if (theme.name === "Forest") {
          // Leaf shape or green dust
          partSize = Math.random() * 4 + 1.5;
          pColor = Math.random() < 0.5 ? "#27ae60" : "#2ecc71";
        } else if (theme.name === "Haunted") {
          // Ghostly fog
          partSize = Math.random() * 8 + 3;
          pColor = "rgba(155, 89, 182, 0.25)";
        } else if (theme.name === "Lava") {
          // Sparks rising/falling
          partSize = Math.random() * 3 + 1;
          pColor = Math.random() < 0.5 ? "#e67e22" : "#e74c3c";
          pVy = -Math.random() * 50; // rise up
        } else if (theme.name === "Cyber") {
          // Digital small pixels
          partSize = Math.random() * 2 + 1;
          pColor = "#3498db";
        } else if (theme.name === "Obsidian") {
          // Nightmare ember bursts
          partSize = Math.random() * 4 + 1;
          pColor = Math.random() < 0.3 ? "#111" : "#e74c3c";
        }

        player.particles.push({
          x: player.x + 800 + Math.random() * 200,
          y: Math.random() * height,
          vx: pVx,
          vy: pVy,
          size: partSize,
          color: pColor,
          alpha: theme.name === "Haunted" ? 0.3 : 0.8,
          life: 2.0
        });
      }

      // Update ambient/explosion particles
      updatePlayerParticles(dt);
    }

    function createSpark(x, y, vyOffset) {
      // Determine spark color based on the current active thematic map
      let sparkColor = 'rgba(0, 255, 102, 0.8)';
      if (currentGameMode === 'classic') {
        const theme = getLevelTheme(currentLevel);
        sparkColor = theme.spikeColor;
      } else {
        const currentSkinObj = SKINS.find(s => s.id === equippedSkin) || SKINS[0];
        sparkColor = currentSkinObj.color;
      }

      player.particles.push({
        x: x,
        y: y,
        vx: -player.baseSpeed * 0.4 + (Math.random() - 0.5) * 60,
        vy: vyOffset + (Math.random() - 0.5) * 80,
        size: Math.random() * 3 + 1,
        color: sparkColor,
        alpha: 1,
        life: 0.5 + Math.random() * 0.3 // seconds
      });
    }

    function triggerCrashExplosion() {
      player.isDead = true;
      player.vy = 0;

      // Stop background music and trigger explosive crash sound
      stopSynthMusic();
      playCrashSound();

      // Emit a spectacular burst of concentric and random glowing neon particles
      const count = 45;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 250 + 80;
        player.particles.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 5 + 2,
          color: Math.random() < 0.5 ? 'rgba(0, 255, 102, 0.9)' : 'rgba(0, 243, 255, 0.9)',
          alpha: 1,
          life: 1.0 + Math.random() * 0.8 // long life for explosion feedback
        });
      }

      // Wait a moment then trigger game over state modal/overlay
      setTimeout(() => {
        if (currentGameState === STATE_PLAYING) {
          triggerGameOverScreen();
        }
      }, 1200);
    }

    function updatePlayerParticles(dt) {
      for (let i = player.particles.length - 1; i >= 0; i--) {
        const p = player.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        p.alpha = Math.max(0, p.life);

        if (p.life <= 0) {
          player.particles.splice(i, 1);
        }
      }
    }

    function drawPlayer(ctx) {
      if (player.isDead) {
        drawPlayerParticles(ctx);
        return;
      }

      // Draw particle trail (Glowing wave path)
      drawPlayerTrail(ctx);

      // Draw actual vehicle shape based on equipped skin
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);

      const currentSkinObj = SKINS.find(s => s.id === equippedSkin) || SKINS[0];
      const skinColor = currentSkinObj.color;

      // Soft back glow beneath player vehicle
      const glowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, player.width);
      glowGrad.addColorStop(0, skinColor);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(0, 0, player.width, 0, Math.PI * 2);
      ctx.fill();

      // Sharp white vehicle borders with neon fill
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(5, 20, 18, 0.95)';
      ctx.shadowColor = skinColor;
      ctx.shadowBlur = 10;

      if (equippedSkin === 'wave_triangle') {
        // Draw stylized arrow/triangle
        ctx.beginPath();
        ctx.moveTo(player.width / 2, 0); // front tip
        ctx.lineTo(-player.width / 2, -player.height / 2); // bottom back
        ctx.lineTo(-player.width / 4, 0); // inner indent back
        ctx.lineTo(-player.width / 2, player.height / 2); // top back
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner outline
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(player.width / 4, 0);
        ctx.lineTo(-player.width / 4, -player.height / 4);
        ctx.lineTo(-player.width / 6, 0);
        ctx.lineTo(-player.width / 4, player.height / 4);
        ctx.closePath();
        ctx.stroke();
      } else if (equippedSkin === 'emerald_leaf') {
        // Leaf shape
        ctx.beginPath();
        ctx.moveTo(player.width / 2, 0);
        ctx.quadraticCurveTo(0, -player.height, -player.width / 2, 0);
        ctx.quadraticCurveTo(0, player.height, player.width / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Center line
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-player.width / 2, 0);
        ctx.lineTo(player.width / 4, 0);
        ctx.stroke();
      } else if (equippedSkin === 'phantom_glow') {
        // Ghost silhouette
        ctx.beginPath();
        ctx.moveTo(player.width / 2, 0);
        ctx.quadraticCurveTo(player.width / 4, -player.height / 2, -player.width / 2, -player.height / 2);
        ctx.lineTo(-player.width / 2, player.height / 2);
        ctx.quadraticCurveTo(player.width / 4, player.height / 2, player.width / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye dots
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(player.width / 6, -player.height / 6, 2.5, 0, Math.PI * 2);
        ctx.arc(player.width / 6, player.height / 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (equippedSkin === 'pyro_cube') {
        // Rotated square
        ctx.save();
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.rect(-player.width / 2.5, -player.width / 2.5, player.width * 0.8, player.width * 0.8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Inner cross details
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-player.width / 4, 0);
        ctx.lineTo(player.width / 4, 0);
        ctx.moveTo(0, -player.height / 4);
        ctx.lineTo(0, player.height / 4);
        ctx.stroke();
      } else if (equippedSkin === 'cyber_pulse') {
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(player.width / 2, 0);
        ctx.lineTo(0, -player.height);
        ctx.lineTo(-player.width / 2, 0);
        ctx.lineTo(0, player.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cyber details
        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-player.width / 6, -player.height / 3, player.width / 3, player.height * 2/3);
      } else if (equippedSkin === 'void_arrow') {
        // Void sharp pointer
        ctx.beginPath();
        ctx.moveTo(player.width / 2, 0);
        ctx.lineTo(-player.width / 2, -player.height / 1.5);
        ctx.lineTo(-player.width / 5, 0);
        ctx.lineTo(-player.width / 2, player.height / 1.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = skinColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-player.width / 5, 0);
        ctx.lineTo(player.width / 3, 0);
        ctx.stroke();
      }

      ctx.restore();

      // Draw explosion particles
      drawPlayerParticles(ctx);
    }

    function drawPlayerTrail(ctx) {
      if (player.trail.length < 2) return;

      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(0, 243, 255, 0.8)';
      ctx.lineWidth = 3.5;

      // Create smooth glowing neon trail using fading lines
      for (let i = 1; i < player.trail.length; i++) {
        const pt1 = player.trail[i - 1];
        const pt2 = player.trail[i];

        // Calculate age-based opacity
        const age = Date.now() - pt2.time;
        const opacity = Math.max(0, 1 - age / 900);

        ctx.strokeStyle = `rgba(0, 243, 255, ${opacity * 0.85})`;
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

    // Camera adjustment logic based on player Y coordinates to prevent tracking issues
    function updateCamera(dt) {
      // Camera X is tied precisely to player position minus margin
      camera.x = player.x - 180;

      // Smoothly interpolate camera Y towards player center
      camera.targetY = player.y - height / 2;
      // Clamp camera targetY to keep grid bounds cleanly in view
      const clampLimit = 120;
      if (camera.targetY < -clampLimit) camera.targetY = -clampLimit;
      if (camera.targetY > clampLimit) camera.targetY = clampLimit;

      camera.y += (camera.targetY - camera.y) * 8 * dt;
    }

    // --- LEVEL GENERATOR & PROCEDURAL ALGORITHMS ---
    function generateLevel() {
      obstacles = [];
      levelProgress = 0;

      if (currentGameMode === 'classic') {
        levelLength = 4000 + (currentLevel * 1000); // Level 1 is 5000px, level 5 is 9000px

        // Classic mode features deterministic, fun, distinct handcrafted level designs (Levels 1 to 5)
        createLevelGates();

        if (currentLevel === 1) {
          // LEVEL 1: Introduction to Waves (Gentle spacing, floor obstacles)
          obstacles.push({ type: 'spike', x: 600, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 1000, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 1400, y: 40, width: 100, height: 180, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 1400, y: height - 220, width: 100, height: 180, color: 'rgba(0, 243, 255, 0.85)' });

          obstacles.push({ type: 'spike', x: 1900, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 1945, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 2400, y: 200, width: 120, height: 100, color: 'rgba(0, 255, 102, 0.85)' });

          obstacles.push({ type: 'spike', x: 2900, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 3300, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 3700, y: 40, width: 80, height: 220, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 3700, y: height - 220, width: 80, height: 180, color: 'rgba(0, 243, 255, 0.85)' });

        } else if (currentLevel === 2) {
          // LEVEL 2: Double Sided Spikes (Alternating ceiling and floor challenges)
          obstacles.push({ type: 'spike', x: 600, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 800, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 1100, y: 250, width: 150, height: 80, color: 'rgba(0, 255, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 1150, y: 250, width: 32, height: 36, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'spike', x: 1500, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 1545, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 1900, y: 40, width: 90, height: 260, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 1900, y: height - 180, width: 90, height: 140, color: 'rgba(0, 243, 255, 0.85)' });

          obstacles.push({ type: 'spike', x: 2300, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 2345, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 2700, y: 150, width: 140, height: 300, color: 'rgba(0, 255, 102, 0.85)' });

          obstacles.push({ type: 'spike', x: 3100, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 3400, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 3700, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 4000, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 4400, y: 40, width: 100, height: 200, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 4400, y: height - 200, width: 100, height: 160, color: 'rgba(0, 243, 255, 0.85)' });

        } else if (currentLevel === 3) {
          // LEVEL 3: Corridor Run (Fast narrow corridors, small gaps)
          obstacles.push({ type: 'block', x: 600, y: 40, width: 150, height: 220, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 600, y: height - 220, width: 150, height: 180, color: 'rgba(0, 243, 255, 0.85)' });

          obstacles.push({ type: 'spike', x: 900, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 1200, y: 40, width: 180, height: 180, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 1200, y: height - 260, width: 180, height: 220, color: 'rgba(0, 243, 255, 0.85)' });

          obstacles.push({ type: 'spike', x: 1600, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 1645, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 2000, y: 180, width: 100, height: 300, color: 'rgba(0, 255, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 2030, y: 180, width: 32, height: 36, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 2400, y: 40, width: 200, height: 250, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 2400, y: height - 150, width: 200, height: 110, color: 'rgba(0, 243, 255, 0.85)' });

          obstacles.push({ type: 'spike', x: 2800, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 3100, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 3400, y: 40, width: 120, height: 150, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 3400, y: height - 300, width: 120, height: 260, color: 'rgba(0, 243, 255, 0.85)' });

          obstacles.push({ type: 'spike', x: 3800, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 4100, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 4500, y: 40, width: 250, height: 200, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 4500, y: height - 200, width: 250, height: 160, color: 'rgba(0, 243, 255, 0.85)' });

        } else if (currentLevel === 4) {
          // LEVEL 4: Spike Slalom (Tight slalom turns around spike blocks)
          obstacles.push({ type: 'spike', x: 600, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 645, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 690, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 1000, y: 40, width: 140, height: 300, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'spike', x: 1050, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 1400, y: height - 340, width: 140, height: 300, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'spike', x: 1450, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'spike', x: 1800, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 2000, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 2300, y: 150, width: 180, height: 100, color: 'rgba(0, 255, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 2350, y: 150, width: 32, height: 36, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 2400, y: 250, width: 32, height: 36, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 2800, y: 40, width: 120, height: 260, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 2800, y: height - 180, width: 120, height: 140, color: 'rgba(0, 243, 255, 0.85)' });

          obstacles.push({ type: 'spike', x: 3200, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 3400, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 3600, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 4000, y: 200, width: 150, height: 275, color: 'rgba(0, 255, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 4050, y: 200, width: 32, height: 36, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 4500, y: 40, width: 150, height: 250, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 4500, y: height - 150, width: 150, height: 110, color: 'rgba(0, 243, 255, 0.85)' });

        } else if (currentLevel === 5) {
          // LEVEL 5: Handcrafted baseline segment + procedural extension
          obstacles.push({ type: 'spike', x: 600, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 750, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 950, y: 40, width: 160, height: 240, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 950, y: height - 240, width: 160, height: 200, color: 'rgba(0, 243, 255, 0.85)' });

          obstacles.push({ type: 'spike', x: 1300, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 1345, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 1650, y: 150, width: 120, height: 350, color: 'rgba(0, 255, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 1690, y: 150, width: 32, height: 36, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'spike', x: 2000, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 2045, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 2350, y: 40, width: 140, height: 180, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 2350, y: height - 340, width: 140, height: 300, color: 'rgba(0, 243, 255, 0.85)' });

          obstacles.push({ type: 'spike', x: 2750, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 2950, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 3250, y: 220, width: 150, height: 120, color: 'rgba(0, 255, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 3300, y: 220, width: 32, height: 36, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 3300, y: 340, width: 32, height: 36, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 3650, y: 40, width: 180, height: 260, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 3650, y: height - 180, width: 180, height: 140, color: 'rgba(0, 243, 255, 0.85)' });

          obstacles.push({ type: 'spike', x: 4100, y: height - 40, width: 40, height: 48, dir: -1, color: 'rgba(255, 0, 102, 0.85)' });
          obstacles.push({ type: 'spike', x: 4300, y: 40, width: 40, height: 48, dir: 1, color: 'rgba(255, 0, 102, 0.85)' });

          obstacles.push({ type: 'block', x: 4600, y: 40, width: 300, height: 220, color: 'rgba(0, 243, 255, 0.85)' });
          obstacles.push({ type: 'block', x: 4600, y: height - 220, width: 300, height: 180, color: 'rgba(0, 243, 255, 0.85)' });

          // Continue procedurally from x = 5200 to levelLength - 1000
          generateProceduralObstacles(5200, levelLength - 1000, currentLevel);

        } else {
          // LEVELS 6 TO 50: Fully procedural maps based on a deterministic seed!
          generateProceduralObstacles(600, levelLength - 1000, currentLevel);
        }

        // Final gate placement
        obstacles.push({
          type: 'gate',
          x: levelLength - 800,
          y: 40,
          width: 15,
          height: height - 80,
          color: '#ffffff'
        });

      } else {
        // Endless Mode: Generated dynamically/infinitely or a massive procedural buffer
        levelLength = 9999999; // effectively endless distance
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
          ambientParticles: "green",
          description: "Emerald Forest"
        };
      } else if (levelNum <= 20) {
        return {
          name: "Haunted",
          spikeColor: "#9b59b6",
          blockColor: "#4a148c",
          bgPatternColor: "rgba(155, 89, 182, 0.08)",
          pitchModifier: 0.6,
          ambientParticles: "purple",
          description: "Haunted Graveyard"
        };
      } else if (levelNum <= 30) {
        return {
          name: "Lava",
          spikeColor: "#e67e22",
          blockColor: "#d35400",
          bgPatternColor: "rgba(230, 126, 34, 0.08)",
          pitchModifier: 0.9,
          ambientParticles: "red",
          description: "Desert & Lava Peak"
        };
      } else if (levelNum <= 40) {
        return {
          name: "Cyber",
          spikeColor: "#3498db",
          blockColor: "#2c3e50",
          bgPatternColor: "rgba(52, 152, 219, 0.08)",
          pitchModifier: 1.1,
          ambientParticles: "cyan",
          description: "Cybernetic Grid"
        };
      } else {
        return {
          name: "Obsidian",
          spikeColor: "#e74c3c",
          blockColor: "#111111",
          bgPatternColor: "rgba(231, 76, 60, 0.08)",
          pitchModifier: 1.4,
          ambientParticles: "crimson",
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
      const speedRatio = Math.min(1, (levelNum - 5) / 45); // 0 at Level 5, 1 at Level 50
      const theme = getLevelTheme(levelNum);

      while (cursorX < endX) {
        const r = seededRandom();

        if (r < 0.22) {
          // Archetype A: Alternating floor and ceiling spikes
          const count = 2 + Math.floor(seededRandom() * 4);
          const spacing = 180 - speedRatio * 50;
          for (let i = 0; i < count; i++) {
            const isCeiling = (i % 2 === 0);
            obstacles.push({
              type: 'spike',
              x: cursorX + i * spacing,
              y: isCeiling ? 40 : height - 40,
              width: 40,
              height: 48,
              dir: isCeiling ? 1 : -1,
              color: theme.spikeColor
            });
          }
          cursorX += count * spacing + 180;

        } else if (r < 0.45) {
          // Archetype B: Double Blocks (Gateways with narrow opening)
          const gapHeight = Math.max(135, 220 - speedRatio * 75);
          const gapY = 160 + seededRandom() * (height - 320);
          const blockWidth = 70 + Math.floor(seededRandom() * 80);

          obstacles.push({
            type: 'block',
            x: cursorX,
            y: 40,
            width: blockWidth,
            height: gapY - gapHeight / 2 - 40,
            color: theme.blockColor
          });
          obstacles.push({
            type: 'block',
            x: cursorX,
            y: gapY + gapHeight / 2,
            width: blockWidth,
            height: (height - 40) - (gapY + gapHeight / 2),
            color: theme.blockColor
          });
          cursorX += blockWidth + 260 - speedRatio * 50;

        } else if (r < 0.65) {
          // Archetype C: Floating mid-columns with spikes
          const colHeight = 110 + seededRandom() * 110;
          const colY = 140 + seededRandom() * (height - colHeight - 280);
          const blockWidth = 90;

          obstacles.push({
            type: 'block',
            x: cursorX,
            y: colY,
            width: blockWidth,
            height: colHeight,
            color: theme.blockColor
          });

          // Add a spike on top or bottom
          const spikeOnTop = seededRandom() < 0.5;
          obstacles.push({
            type: 'spike',
            x: cursorX + 25,
            y: spikeOnTop ? colY : colY + colHeight,
            width: 32,
            height: 36,
            dir: spikeOnTop ? 1 : -1,
            color: theme.spikeColor
          });
          cursorX += blockWidth + 280 - speedRatio * 60;

        } else if (r < 0.85) {
          // Archetype D: Slalom (Staggered ceiling then floor blocks)
          const blockWidth = 110;
          const topH = 140 + seededRandom() * 110;
          const bottomH = 140 + seededRandom() * 110;

          obstacles.push({
            type: 'block',
            x: cursorX,
            y: 40,
            width: blockWidth,
            height: topH,
            color: theme.blockColor
          });
          obstacles.push({
            type: 'block',
            x: cursorX + 220,
            y: height - bottomH - 40,
            width: blockWidth,
            height: bottomH,
            color: theme.blockColor
          });
          cursorX += 450 - speedRatio * 80;

        } else {
          // Archetype E: Tunnel corridor (A narrow stretch of ceiling & floor blocks)
          const tunnelLength = 250 + Math.floor(seededRandom() * 200);
          const tunnelGap = Math.max(150, 210 - speedRatio * 55);
          const tunnelY = 170 + seededRandom() * (height - 340);

          obstacles.push({
            type: 'block',
            x: cursorX,
            y: 40,
            width: tunnelLength,
            height: tunnelY - tunnelGap / 2 - 40,
            color: theme.blockColor
          });
          obstacles.push({
            type: 'block',
            x: cursorX,
            y: tunnelY + tunnelGap / 2,
            width: tunnelLength,
            height: (height - 40) - (tunnelY + tunnelGap / 2),
            color: theme.blockColor
          });

          if (seededRandom() < 0.55) {
            obstacles.push({
              type: 'spike',
              x: cursorX + tunnelLength / 2,
              y: seededRandom() < 0.5 ? tunnelY - tunnelGap / 2 : tunnelY + tunnelGap / 2,
              width: 32,
              height: 36,
              dir: seededRandom() < 0.5 ? 1 : -1,
              color: theme.spikeColor
            });
          }
          cursorX += tunnelLength + 280 - speedRatio * 50;
        }
      }
    }

    function createLevelGates() {
      // Starting platform/gate decoration
      obstacles.push({
        type: 'gate',
        x: 400,
        y: 40,
        width: 15,
        height: height - 80,
        color: '#ffffff'
      });
    }

    // Incremental generation buffer for endless and race modes
    function generateEndlessBuffer(startX, length) {
      let cursorX = Math.max(startX, 600);
      const endX = startX + length;

      while (cursorX < endX) {
        const typeRoll = Math.random();

        if (typeRoll < 0.28) {
          // Spike groups
          const count = Math.floor(Math.random() * 4) + 1;
          const isCeiling = Math.random() < 0.5;
          const spacing = 45;

          for (let i = 0; i < count; i++) {
            obstacles.push({
              type: 'spike',
              x: cursorX + i * spacing,
              y: isCeiling ? 40 : height - 40,
              width: 40,
              height: 48,
              dir: isCeiling ? 1 : -1,
              color: 'rgba(255, 0, 102, 0.85)'
            });
          }
          cursorX += count * spacing + 220;

        } else if (typeRoll < 0.6) {
          // Horizontal double blocks
          const gapY = 160 + Math.random() * 240;
          const gapHeight = 160 + Math.max(-40, 60 - (cursorX * 0.0001)); // gets narrower as distance increases!

          obstacles.push({
            type: 'block',
            x: cursorX,
            y: 40,
            width: 80 + Math.random() * 100,
            height: Math.max(10, gapY - gapHeight / 2 - 40),
            color: 'rgba(0, 243, 255, 0.85)'
          });

          obstacles.push({
            type: 'block',
            x: cursorX,
            y: gapY + gapHeight / 2,
            width: 80 + Math.random() * 100,
            height: Math.max(10, (height - 40) - (gapY + gapHeight / 2)),
            color: 'rgba(0, 243, 255, 0.85)'
          });
          cursorX += 280;

        } else if (typeRoll < 0.8) {
          // Floating blockades
          const blockY = 160 + Math.random() * 240;
          const blockW = 85 + Math.random() * 130;
          const blockH = 70 + Math.random() * 100;

          obstacles.push({
            type: 'block',
            x: cursorX,
            y: blockY,
            width: blockW,
            height: blockH,
            color: 'rgba(0, 255, 102, 0.85)'
          });
          cursorX += blockW + 250;
        } else {
          // Sliding corridors
          const gapY = 220 + Math.random() * 180;
          obstacles.push({
            type: 'block',
            x: cursorX,
            y: 40,
            width: 150,
            height: gapY - 110,
            color: 'rgba(0, 243, 255, 0.85)'
          });
          obstacles.push({
            type: 'block',
            x: cursorX + 220,
            y: gapY + 110,
            width: 150,
            height: (height - 40) - (gapY + 110),
            color: 'rgba(0, 243, 255, 0.85)'
          });
          cursorX += 500;
        }
      }
    }

    // --- COLLISION DETECTION & LEVEL STATE TRACKER ---
    function updateLevelAndCollisions() {
      if (player.isDead) return;

      // Calculate progress percentage
      if (currentGameMode === 'classic') {
        const startX = 150;
        const totalDist = levelLength - 800 - startX;
        const currentDist = player.x - startX;
        levelProgress = Math.max(0, Math.min(100, (currentDist / totalDist) * 100));

        // Update HUD indicators
        document.getElementById('hud-progress-bar').style.width = `${levelProgress}%`;
        document.getElementById('hud-progress-text').innerText = `${Math.floor(levelProgress)}%`;
        document.getElementById('hud-level-text').innerText = `Level ${currentLevel}`;

        // Check Victory/Goal condition
        if (player.x >= levelLength - 800) {
          triggerLevelCleared();
        }
      } else if (currentGameMode === 'endless') {
        // Distance counter in meters survived
        const startX = 150;
        const distMeters = Math.floor((player.x - startX) / 10);
        levelProgress = distMeters; // raw score

        document.getElementById('hud-progress-bar').style.width = '100%';
        document.getElementById('hud-progress-text').innerText = `${distMeters}m`;
        document.getElementById('hud-level-text').innerText = `Endless Mode`;

        // Garbage collection of older off-screen obstacles + infinite layout buffering
        if (obstacles.length > 0 && obstacles[0].x < player.x - 1000) {
          // Remove obstacles far behind the camera
          obstacles = obstacles.filter(o => o.x >= player.x - 1000);
        }

        // Keep generating endless chunks ahead
        const lastObstacleX = obstacles.length > 0 ? obstacles[obstacles.length - 1].x : player.x;
        if (lastObstacleX < player.x + 3000) {
          generateEndlessBuffer(lastObstacleX + 300, 10000);
        }
      }

      // Collisions evaluation
      // Cache player bounding box offsets (narrower than actual sprite for forgiving hitboxes)
      const pW = player.width * 0.55;
      const pH = player.height * 0.55;
      const pX = player.x - pW / 2;
      const pY = player.y - pH / 2;

      // Loop only through obstacles visible on screen or near player (improves efficiency)
      for (const obs of obstacles) {
        if (obs.x < player.x - 100) continue;
        if (obs.x > player.x + 250) continue;

        if (obs.type === 'spike') {
          // Spike is drawn as a triangle. Let's do a fast AABB intersection first
          if (rectsIntersect(pX, pY, pW, pH, obs.x, obs.dir === 1 ? obs.y : obs.y - obs.height, obs.width, obs.height)) {
            // Fine-grained triangle collision checking for accurate gameplay feedback
            if (playerSpikeCollision(obs)) {
              triggerCrashExplosion();
              break;
            }
          }
        } else if (obs.type === 'block') {
          // Block is drawn as a solid rectangle
          if (rectsIntersect(pX, pY, pW, pH, obs.x, obs.y, obs.width, obs.height)) {
            triggerCrashExplosion();
            break;
          }
        }
      }

      // Check boundary walls (ceiling/floor crash)
      const ceilingCrash = player.y - pH / 2 <= 42;
      const floorCrash = player.y + pH / 2 >= height - 42;
      if (ceilingCrash || floorCrash) {
        triggerCrashExplosion();
      }
    }

    function rectsIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
      return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    // Precise Triangle collision check
    function playerSpikeCollision(spike) {
      // Represent player center as target coordinate point
      // Spike coordinates:
      // Base line is at spike.y. Tip is at spike.y - spike.height (or + for top spike)
      const tipY = spike.dir === 1 ? spike.y + spike.height : spike.y - spike.height;
      const tipX = spike.x + spike.width / 2;

      const baseX1 = spike.x;
      const baseY1 = spike.y;

      const baseX2 = spike.x + spike.width;
      const baseY2 = spike.y;

      // Triangle points: A(baseX1, baseY1), B(baseX2, baseY2), C(tipX, tipY)
      // Check if player bounding box corners lie inside spike triangle
      const corners = [
        {x: player.x, y: player.y},
        {x: player.x + player.width*0.25, y: player.y},
        {x: player.x - player.width*0.25, y: player.y}
      ];

      for (const p of corners) {
        if (pointInTriangle(p.x, p.y, baseX1, baseY1, baseX2, baseY2, tipX, tipY)) {
          return true;
        }
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

    // --- RENDER OBSTACLES ---
    function drawObstacles(ctx) {
      ctx.save();

      for (const obs of obstacles) {
        // Skip rendering if way off-screen
        if (obs.x < camera.x - 100 || obs.x > camera.x + width + 100) continue;

        ctx.shadowBlur = 10;
        ctx.shadowColor = obs.color;

        if (obs.type === 'spike') {
          // Spike outline / fill styling
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.fillStyle = obs.color;

          ctx.beginPath();
          if (obs.dir === 1) {
            // Points down from ceiling
            ctx.moveTo(obs.x, obs.y);
            ctx.lineTo(obs.x + obs.width, obs.y);
            ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height);
          } else {
            // Points up from floor
            ctx.moveTo(obs.x, obs.y);
            ctx.lineTo(obs.x + obs.width, obs.y);
            ctx.lineTo(obs.x + obs.width / 2, obs.y - obs.height);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Accent neon core triangle
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
          // Drawing block with a dual border and high-tech glow
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.fillStyle = 'rgba(5, 20, 18, 0.95)'; // dark body

          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

          // Glowing inner bounding box
          ctx.strokeStyle = obs.color;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(obs.x + 4, obs.y + 4, obs.width - 8, obs.height - 8);

        } else if (obs.type === 'gate') {
          // Start / End line gates
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
        }
      }

      ctx.restore();
    }

    // --- GAME SCREEN OVERLAYS TRIGGER CONTROLLERS ---
    function triggerGameOverScreen() {
      setGameState(STATE_GAMEOVER);

      if (currentGameMode === 'classic') {
        document.getElementById('fail-progress-val').innerText = `${Math.floor(levelProgress)}%`;
        document.getElementById('fail-score-val').innerText = `Level ${currentLevel}`;
      } else if (currentGameMode === 'endless') {
        document.getElementById('fail-progress-val').innerText = `${Math.floor(levelProgress)}m`;
        document.getElementById('fail-score-val').innerText = `High Score: ${endlessDistance}m`;
        // Earning: distance-based rewards in Endless Mode (e.g. +1 coin per 20 meters)
        const endlessCoins = Math.floor(levelProgress / 20);
        if (endlessCoins > 0) {
          addCoins(endlessCoins);
        }
        saveEndlessHighScore(levelProgress);
      } else {
        // Race Mode fail
        document.getElementById('fail-progress-val').innerText = `Crashed`;
        document.getElementById('fail-score-val').innerText = `Leaderboard Match`;
      }

      document.getElementById('gameover-modal').classList.add('active');
    }

    function triggerLevelCleared() {
      setGameState(STATE_VICTORY);

      // Stop background music and trigger victory chord sound
      stopSynthMusic();
      playClearedSound();

      if (currentGameMode === 'classic') {
        document.getElementById('win-mode-val').innerText = `Level ${currentLevel} Complete`;
        document.getElementById('win-attempts-val').innerText = attemptCount;

        // Save level progress to local storage
        saveClassicProgress(currentLevel, 100);
        document.getElementById('win-next-btn').style.display = currentLevel < 50 ? 'block' : 'none';
      }

      document.getElementById('win-modal').classList.add('active');
    }

    // Practice mode checkpoints integration
    function togglePracticeMode(enabled) {
      const ctrls = document.getElementById('practice-controls');
      ctrls.style.visibility = enabled ? 'visible' : 'hidden';

      if (!enabled) {
        currentPracticeCheckpoint = null;
      }
    }

    function placeCheckpoint() {
      if (player.isDead) return;

      // Play high-tech ding checkpoint sound
      playCheckpointSound();

      // Save deep copy of the player physics details and camera values
      currentPracticeCheckpoint = {
        x: player.x,
        y: player.y,
        vy: player.vy,
        bgScrollX: bgScrollX,
        bgScrollY: bgScrollY,
        attempt: attemptCount
      };

      // Emit a sparkling green checkpoint banner flash
      const pulseParticles = 12;
      for (let i = 0; i < pulseParticles; i++) {
        const angle = (i / pulseParticles) * Math.PI * 2;
        player.particles.push({
          x: player.x,
          y: player.y,
          vx: Math.cos(angle) * 120,
          vy: Math.sin(angle) * 120,
          size: 4,
          color: 'var(--neon-cyan)',
          alpha: 1,
          life: 0.6
        });
      }
      console.log("Checkpoint saved in practice mode");
    }

    function clearCheckpoints() {
      currentPracticeCheckpoint = null;
      console.log("Checkpoints wiped.");
    }

    // --- RACE MODE BOT AI ALGORITHMS ---
    function initBots() {
      bots = [];
      if (currentGameMode !== 'race') {
        document.getElementById('race-leaderboard').classList.remove('active');
        return;
      }

      document.getElementById('race-leaderboard').classList.add('active');

      const names = ["AeroBot", "HexRunner", "NeonDash", "GridCrasher"];
      const colors = ["#ff0055", "#e5ff00", "#ff00ea", "#00ffff"];

      for (let i = 0; i < 4; i++) {
        bots.push({
          name: names[i],
          x: 150,
          y: 200 + i * 80,
          vy: 0,
          width: 28,
          height: 20,
          angle: 0,
          color: colors[i],
          baseSpeed: 380 + Math.random() * 20, // slightly variable bot speeds
          isDead: false,
          lastDecisionTime: 0,
          decisionInterval: 0.12 + Math.random() * 0.1, // react periodically
          trail: [], // aesthetic trail for bots as well
          targetVy: 390
        });
      }
    }

    function updateBots(dt) {
      if (currentGameMode !== 'race') return;

      const now = Date.now();

      for (const bot of bots) {
        if (bot.isDead) continue;

        // 1. Forward horizontal movement
        bot.x += bot.baseSpeed * dt;

        // 2. Periodic smart AI navigation decisions
        if (now - bot.lastDecisionTime > bot.decisionInterval * 1000) {
          bot.lastDecisionTime = now;
          makeAIDecision(bot);
        }

        // 3. Smooth vertical velocity adjustment
        bot.vy += (bot.targetVy - bot.vy) * 14 * dt;
        bot.y += bot.vy * dt;

        // Clamp inside upper and lower level limits
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

        // Add visual wave trail point for the bot
        bot.trail.push({ x: bot.x, y: bot.y, time: now });
        bot.trail = bot.trail.filter(pt => now - pt.time < 500);

        // 4. Collision checking with level obstacles for the bot
        checkBotCollisions(bot);
      }

      // Update HUD leaderboard rows in Real-time
      updateLeaderboardUI();
    }

    function makeAIDecision(bot) {
      // Lookahead: detect obstacles in a horizontal beam ahead of the bot
      const lookaheadDistance = 240;
      let imminentObstacle = null;

      for (const obs of obstacles) {
        if (obs.x > bot.x && obs.x < bot.x + lookaheadDistance) {
          // Check if obstacle is roughly vertically blocking the bot or near it
          if (obs.type === 'block') {
            // Check if vertical alignment overlap exists
            if (bot.y > obs.y - 40 && bot.y < obs.y + obs.height + 40) {
              imminentObstacle = obs;
              break;
            }
          } else if (obs.type === 'spike') {
            // Check if spike is on the same ceiling/floor side
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
        // Obstacle detected! Determine safest direction to dodge
        if (imminentObstacle.type === 'block') {
          // Check if we should go above or below the block
          // Compare distance to gap edges
          const distToCeiling = imminentObstacle.y - 40;
          const distToFloor = (height - 40) - (imminentObstacle.y + imminentObstacle.height);

          if (distToCeiling > distToFloor) {
            // Safe passage is above the obstacle
            bot.targetVy = -390; // steer upwards
          } else {
            // Safe passage is below the obstacle
            bot.targetVy = 390; // steer downwards
          }
        } else {
          // Spike dodge: steer away from the spike side
          if (imminentObstacle.dir === 1) {
            bot.targetVy = 390; // ceiling spike: steer down
          } else {
            bot.targetVy = -390; // floor spike: steer up
          }
        }
      } else {
        // No immediate threat: keep moving in a smooth sinusoidal wave inside bounds for realistic motion
        if (bot.y < 160) {
          bot.targetVy = 390; // steer down
        } else if (bot.y > height - 160) {
          bot.targetVy = -390; // steer up
        } else {
          // Occasional random trajectory switch to mimic human play
          if (Math.random() < 0.15) {
            bot.targetVy = -bot.targetVy;
          }
        }
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

      // Border bounds crash
      if (bot.y - bH/2 <= 42 || bot.y + bH/2 >= height - 42) {
        killBot(bot);
      }
    }

    function killBot(bot) {
      bot.isDead = true;
      bot.vy = 0;

      // Emit short aesthetic explosion of sparks for the bot
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        player.particles.push({
          x: bot.x,
          y: bot.y,
          vx: Math.cos(angle) * 140,
          vy: Math.sin(angle) * 140,
          size: 2.5,
          color: bot.color,
          alpha: 1,
          life: 0.6
        });
      }
    }

    function updateLeaderboardUI() {
      if (currentGameMode !== 'race') return;

      // Compile competitors list including the human player
      const runners = [];
      if (!player.isDead) {
        runners.push({ name: playerName, x: player.x, isDead: false, color: 'var(--neon-green)', isPlayer: true });
      } else {
        runners.push({ name: playerName, x: player.x, isDead: true, color: 'var(--neon-green)', isPlayer: true });
      }

      for (const b of bots) {
        runners.push({ name: b.name, x: b.x, isDead: b.isDead, color: b.color, isPlayer: false });
      }

      // Sort racers by horizontal position x (descending)
      runners.sort((r1, r2) => r2.x - r1.x);

      const listContainer = document.getElementById('leaderboard-list');
      listContainer.innerHTML = '';

      runners.forEach((runner, idx) => {
        const row = document.createElement('div');
        row.className = `leaderboard-row ${runner.isPlayer ? 'player' : ''}`;
        row.style.color = runner.isDead ? '#666' : (runner.isPlayer ? 'var(--neon-green)' : runner.color);

        row.innerHTML = `
          <span>${idx + 1}. ${runner.name}</span>
          <span>${runner.isDead ? 'CRASH' : Math.floor(runner.x / 10) + 'm'}</span>
        `;
        listContainer.appendChild(row);
      });

      // Win Condition: If player finishes the race (levelLength limit)
      if (!player.isDead && player.x >= levelLength - 800) {
        // Evaluate standings position of YOU
        const standings = runners.findIndex(r => r.isPlayer);
        if (standings === 0) {
          // We won! Increment wins tracker
          incrementRaceWins();
          // Bonus rewards for winning Race Mode (+15 PLO coins)
          addCoins(15);
          triggerLevelCleared();
        } else {
          // Finished but lost
          setGameState(STATE_GAMEOVER);
          document.getElementById('fail-progress-val').innerText = `Finished #${standings + 1}`;
          document.getElementById('fail-score-val').innerText = `Winner: ${runners[0].name}`;
          document.getElementById('gameover-modal').classList.add('active');
        }
      }
    }

    // --- AUDIO SYSTEM (WEB AUDIO API SYNTHESIZER) ---
    function initAudioContext() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    // High-tech electronic background soundtrack loop (Procedural Sequencer)
    function startSynthMusic() {
      if (isMuted) return;
      initAudioContext();
      stopSynthMusic(); // Clear any previous active intervals

      synthBeatsCount = 0;

      // Fast, driving techno-cyberpunk beat at 145 BPM (roughly every 207ms per beat)
      synthIntervalId = setInterval(() => {
        if (currentGameState !== STATE_PLAYING || isMuted) return;

        // Play synthetic elements based on sequencer steps
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

        // 1. Driving Kick Drum on every quarter beat (0, 4, 8, 12)
        if (step % 4 === 0) {
          playKickDrum();
        }

        // 2. High-hat splash on offbeats (2, 6, 10, 14)
        if (step % 4 === 2) {
          playHiHat();
        }

        // 3. Fast arpeggiating electronic bassline melody notes
        // Choose notes from a driving dark minor/Phrygian scale
        // Pitch shift depends on the active map theme!
        let modifier = 1.0;
        if (currentGameMode === 'classic') {
          const theme = getLevelTheme(currentLevel);
          modifier = theme.pitchModifier;
        }
        const melody = [55, 55, 65, 55, 58, 55, 62, 58, 55, 55, 65, 55, 58, 65, 70, 65];
        const freq = melody[step] * modifier;
        playBassSynth(freq);

        // 4. Occasional lead laser sound fx randomly
        if (step === 7 || step === 15) {
          if (Math.random() < 0.6) {
            playLeadLaser(freq * 3);
          }
        }
      } catch (e) {
        console.error("Sequencer error:", e);
      }
    }

    function playKickDrum() {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      // Sweeping pitch down rapidly for kick impact
      osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

      gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.16);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.18);
    }

    function playHiHat() {
      // White noise synthesis for cymbal high hat
      const bufferSize = audioCtx.sampleRate * 0.05; // very short splash
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = audioCtx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7500; // bright metallic hiss

      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      noiseNode.start(audioCtx.currentTime);
      noiseNode.stop(audioCtx.currentTime + 0.05);
    }

    function playBassSynth(freq) {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'sawtooth'; // gritty synth texture
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      // Slide/glissando effect
      osc.frequency.exponentialRampToValueAtTime(freq * 0.98, audioCtx.currentTime + 0.18);

      // Lowpass filter for bass heavy warm vibes
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 650;

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.19);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.2);
    }

    function playLeadLaser(freq) {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.2, audioCtx.currentTime + 0.15);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.16);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.17);
    }

    // Custom sound effect synthesizers triggered on gameplay events
    function playCrashSound() {
      if (isMuted) return;
      initAudioContext();

      // Massive explosive low distortion noise
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.85);

      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.88);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.9);

      // Add a higher-frequency hiss for explosion fire sparks
      const bufferSize = audioCtx.sampleRate * 0.4;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.38);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);

      noiseSource.start(audioCtx.currentTime);
      noiseSource.stop(audioCtx.currentTime + 0.4);
    }

    function playClearedSound() {
      if (isMuted) return;
      initAudioContext();

      // Glorious ascending perfect major chords / electronic victory bells
      const chord = [329.63, 392.00, 523.25, 659.25]; // C major triad
      const now = audioCtx.currentTime;

      chord.forEach((note, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, now + idx * 0.08);
        osc.frequency.exponentialRampToValueAtTime(note * 1.5, now + idx * 0.08 + 0.4);

        gainNode.gain.setValueAtTime(0.12, now + idx * 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);

        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.55);
      });
    }

    function playCheckpointSound() {
      if (isMuted) return;
      initAudioContext();

      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.06); // G5

      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.25);
    }

    // --- DRAW BOTS ---
    function drawBots(ctx) {
      if (currentGameMode !== 'race') return;

      for (const bot of bots) {
        if (bot.isDead) continue;

        // Draw individual bot trail
        if (bot.trail.length >= 2) {
          ctx.save();
          ctx.shadowBlur = 8;
          ctx.shadowColor = bot.color;
          ctx.lineWidth = 2.5;
          for (let i = 1; i < bot.trail.length; i++) {
            const pt1 = bot.trail[i - 1];
            const pt2 = bot.trail[i];
            const age = Date.now() - pt2.time;
            const opacity = Math.max(0, 1 - age / 500);
            ctx.strokeStyle = bot.color;
            ctx.globalAlpha = opacity * 0.75;
            ctx.beginPath();
            ctx.moveTo(pt1.x, pt1.y);
            ctx.lineTo(pt2.x, pt2.y);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Draw bot triangle
        ctx.save();
        ctx.translate(bot.x, bot.y);
        ctx.rotate(bot.angle);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fillStyle = bot.color;
        ctx.shadowColor = bot.color;
        ctx.shadowBlur = 8;

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

    // --- OVERRIDE LEVEL INITIALIZER ---
    function initGameElements() {
      initPlayer();

      // Recreate custom background pattern to match the theme of the level
      if (currentGameMode === 'classic') {
        const theme = getLevelTheme(currentLevel);
        createHexagonPattern(theme);
      } else {
        createHexagonPattern(null);
      }

      generateLevel();
      initBots();

      // If practice mode checkpoint exists and we're restarting the level
      if (document.getElementById('practice-mode-chk').checked && currentPracticeCheckpoint) {
        player.x = currentPracticeCheckpoint.x;
        player.y = currentPracticeCheckpoint.y;
        player.vy = currentPracticeCheckpoint.vy;
        attemptCount = currentPracticeCheckpoint.attempt;
        // Adjust camera instantly
        camera.x = player.x - 180;
        camera.y = player.y - height / 2;
      }
    }

    function pauseGame() {
      if (currentGameState !== STATE_PLAYING) return;
      currentGameState = STATE_PAUSED;
      stopSynthMusic();

      if (currentGameMode === 'classic') {
        document.getElementById('pause-progress-val').innerText = `${Math.floor(levelProgress)}%`;
      } else if (currentGameMode === 'endless') {
        document.getElementById('pause-progress-val').innerText = `${Math.floor(levelProgress)}m`;
      } else {
        document.getElementById('pause-progress-val').innerText = `RACING`;
      }
      document.getElementById('pause-mode-val').innerText = currentGameMode.toUpperCase();
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
        // Only start if unlocked! Otherwise prompt level select
        try {
          const data = JSON.parse(localStorage.getItem(SAVE_CLASSIC_PROGRESS)) || {};
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
      document.getElementById('audio-toggle').innerHTML = isMuted ? '<span>🔇</span> Audio: OFF' : '<span>🔊</span> Audio: ON';
    }

    // --- RENDER & UPDATE ---
    function update(dt) {
      if (currentGameState !== STATE_PLAYING) return;

      updatePlayerPhysics(dt);
      updateBots(dt);
      updateLevelAndCollisions();
      updateCamera(dt);

      // Parallax background offsets tied to player/camera movement
      bgScrollX = camera.x;
      bgScrollY = camera.y;
    }

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save context state for responsive scaling
      ctx.save();
      ctx.scale(scaleX, scaleY);

      // Draw background pattern
      if (hexPatternCanvas) {
        ctx.save();
        // Parallax background: scrolls slower than camera movement
        const offsetLeft = -(bgScrollX * 0.3) % hexPatternWidth;
        const offsetTop = -(bgScrollY * 0.3) % hexPatternHeight;

        ctx.fillStyle = ctx.createPattern(hexPatternCanvas, 'repeat');
        ctx.translate(offsetLeft, offsetTop);
        ctx.fillRect(-offsetLeft, -offsetTop, width, height);
        ctx.restore();
      }

      // 1. Draw level boundary bounds (Ceiling and Floor lines)
      ctx.save();
      ctx.translate(-camera.x, -camera.y);

      // Ceiling and floor glowing lanes
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.4)';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 255, 102, 0.8)';

      // Top boundary
      ctx.beginPath();
      ctx.moveTo(camera.x - 200, 40);
      ctx.lineTo(camera.x + width + 200, 40);
      ctx.stroke();

      // Bottom boundary
      ctx.beginPath();
      ctx.moveTo(camera.x - 200, height - 40);
      ctx.lineTo(camera.x + width + 200, height - 40);
      ctx.stroke();

      ctx.restore();

      // 2. Render Gameplay elements inside camera coordinates
      ctx.save();
      ctx.translate(-camera.x, -camera.y);

      // Draw game obstacles
      drawObstacles(ctx);

      // Draw bot competitors
      drawBots(ctx);

      // Draw player and their trail/particles
      drawPlayer(ctx);

      ctx.restore();

      ctx.restore();
    }

    // --- IN-GAME SHOP SYSTEM JS ---
    function openShop() {
      setGameState(STATE_MENU);
      document.getElementById('shop-modal').classList.add('active');
      renderShopSkins();
      updateShopLevelsUI();
    }

    function closeShop() {
      document.getElementById('shop-modal').classList.remove('active');
    }

    function switchShopTab(tabName) {
      document.querySelectorAll('.shop-tab-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelectorAll('.shop-tab-content').forEach(content => {
        content.classList.remove('active');
      });

      if (tabName === 'levels') {
        document.getElementById('tab-btn-levels').classList.add('active');
        document.getElementById('shop-tab-levels').classList.add('active');
      } else {
        document.getElementById('tab-btn-skins').classList.add('active');
        document.getElementById('shop-tab-skins').classList.add('active');
        renderShopSkins();
      }
    }

    function updateShopLevelsUI() {
      try {
        const data = JSON.parse(localStorage.getItem(SAVE_CLASSIC_PROGRESS)) || {};
        let lockedCount = 0;
        for (let i = 1; i <= 50; i++) {
          if (data[i] === null) lockedCount++;
        }
        const buyAllBtn = document.getElementById('shop-buy-all-btn');
        if (buyAllBtn) {
          if (lockedCount === 0) {
            buyAllBtn.innerText = "All Levels Unlocked 🏆";
            buyAllBtn.classList.add('unlocked-all');
            buyAllBtn.disabled = true;
          } else {
            buyAllBtn.innerText = `Unlock All Remaining Levels (🪙${lockedCount * 100})`;
            buyAllBtn.classList.remove('unlocked-all');
            buyAllBtn.disabled = false;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    function renderShopSkins() {
      const container = document.getElementById('shop-skins-list');
      if (!container) return;
      container.innerHTML = '';

      SKINS.forEach(skin => {
        const isUnlocked = unlockedSkins.includes(skin.id);
        const isEquipped = equippedSkin === skin.id;

        const card = document.createElement('div');
        card.className = `skin-card ${isEquipped ? 'equipped' : ''}`;

        let svgContent = '';
        if (skin.id === 'wave_triangle') {
          svgContent = '<polygon points="32,8 8,48 24,36 40,48" fill="rgba(5, 20, 18, 0.9)" stroke="' + skin.color + '" stroke-width="3"/>';
        } else if (skin.id === 'emerald_leaf') {
          svgContent = '<path d="M32,8 Q48,24 32,48 Q16,24 32,8 Z" fill="rgba(5, 20, 18, 0.9)" stroke="' + skin.color + '" stroke-width="3"/>';
        } else if (skin.id === 'phantom_glow') {
          svgContent = '<path d="M32,8 Q44,8 44,28 L44,48 L36,40 L32,48 L28,40 L20,48 L20,28 Q20,8 32,8 Z" fill="rgba(5, 20, 18, 0.9)" stroke="' + skin.color + '" stroke-width="3"/>';
        } else if (skin.id === 'pyro_cube') {
          svgContent = '<rect x="14" y="14" width="36" height="36" fill="rgba(5, 20, 18, 0.9)" stroke="' + skin.color + '" stroke-width="3" transform="rotate(45 32 32)"/>';
        } else if (skin.id === 'cyber_pulse') {
          svgContent = '<polygon points="32,8 52,32 32,56 12,32" fill="rgba(5, 20, 18, 0.9)" stroke="' + skin.color + '" stroke-width="3"/>';
        } else if (skin.id === 'void_arrow') {
          svgContent = '<polygon points="48,32 16,12 28,32 16,52" fill="rgba(5, 20, 18, 0.9)" stroke="' + skin.color + '" stroke-width="3"/>';
        }

        const previewHTML = '<div class="skin-preview"><svg viewBox="0 0 64 64">' + svgContent + '</svg></div>';

        let actionBtnHTML = '';
        if (isEquipped) {
          actionBtnHTML = '<button class="skin-buy-btn equipped-btn" disabled>Equipped</button>';
        } else if (isUnlocked) {
          actionBtnHTML = '<button class="skin-buy-btn equip" onclick="equipSkin(\'' + skin.id + '\')">Equip</button>';
        } else {
          actionBtnHTML = '<button class="skin-buy-btn buy" onclick="buySkin(\'' + skin.id + '\', ' + skin.cost + ')">🪙' + skin.cost + '</button>';
        }

        card.innerHTML = '<div class="skin-title" style="color: ' + skin.color + ';">' + skin.name + '</div>' + previewHTML + '<div class="skin-desc">' + skin.desc + '</div>' + actionBtnHTML;
        container.appendChild(card);
      });
    }

    function buySkin(skinId, cost) {
      if (ploCoins < cost) {
        alert("Not enough PLO Coins! Keep playing to earn more.");
        return;
      }
      if (confirm("Unlock skin for " + cost + " PLO Coins?")) {
        ploCoins -= cost;
        localStorage.setItem(SAVE_COINS, ploCoins.toString());
        unlockedSkins.push(skinId);
        localStorage.setItem(SAVE_SKINS, JSON.stringify(unlockedSkins));
        updateCoinUI();
        renderShopSkins();
        alert("Skin successfully unlocked!");
      }
    }

    function equipSkin(skinId) {
      if (unlockedSkins.includes(skinId)) {
        equippedSkin = skinId;
        localStorage.setItem(SAVE_EQUIPPED_SKIN, equippedSkin);
        renderShopSkins();
      }
    }

    function buyAllLevels() {
      try {
        const data = JSON.parse(localStorage.getItem(SAVE_CLASSIC_PROGRESS)) || {};
        let lockedCount = 0;
        for (let i = 1; i <= 50; i++) {
          if (data[i] === null) lockedCount++;
        }
        if (lockedCount === 0) {
          alert("All levels are already unlocked!");
          return;
        }
        const cost = lockedCount * 100;
        if (ploCoins < cost) {
          alert("Not enough PLO Coins! Unlocking all " + lockedCount + " levels costs " + cost + " PLO Coins.");
          return;
        }
        if (confirm("Unlock all " + lockedCount + " remaining levels for " + cost + " PLO Coins?")) {
          ploCoins -= cost;
          localStorage.setItem(SAVE_COINS, ploCoins.toString());
          for (let i = 1; i <= 50; i++) {
            if (data[i] === null) data[i] = 0;
          }
          localStorage.setItem(SAVE_CLASSIC_PROGRESS, JSON.stringify(data));
          updateCoinUI();
          renderLevelGrid();
          updateShopLevelsUI();
          alert("Successfully unlocked all levels!");
        }
      } catch (e) {
        console.error(e);
      }
    }
