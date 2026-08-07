// --- GENERAL UI MODAL CONTROLLER AND PERSISTENCE SYSTEMS ---
const SAVE_CLASSIC_PROGRESS = 'plo_io_classic_progress';
const SAVE_ENDLESS_HI_SCORE = 'plo_io_endless_hiscore';
const SAVE_RACE_WINS = 'plo_io_race_wins';
const SAVE_COINS = 'plo_io_coins';
const SAVE_SKINS = 'plo_io_skins_unlocked';
const SAVE_EQUIPPED_SKIN = 'plo_io_equipped_skin';
const SAVE_TRAILS = 'plo_io_trails_unlocked';
const SAVE_EQUIPPED_TRAIL = 'plo_io_equipped_trail';
const SAVE_CLAIM_DATE = 'plo_io_last_claim_date';
const SAVE_ACHIEVEMENTS = 'plo_io_achievements';

window.getClassicProgress = function() {
  try {
    let dataRaw = localStorage.getItem(SAVE_CLASSIC_PROGRESS);
    if (!dataRaw) {
      const defaultData = {};
      for (let i = 1; i <= 50; i++) {
        defaultData[i] = i <= 5 ? 0 : null;
      }
      localStorage.setItem(SAVE_CLASSIC_PROGRESS, JSON.stringify(defaultData));
      return defaultData;
    }
    const data = JSON.parse(dataRaw) || {};
    let changed = false;
    for (let i = 1; i <= 50; i++) {
      if (data[i] === undefined) {
        data[i] = i <= 5 ? 0 : null;
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(SAVE_CLASSIC_PROGRESS, JSON.stringify(data));
    }
    return data;
  } catch (e) {
    const defaultData = {};
    for (let i = 1; i <= 50; i++) {
      defaultData[i] = i <= 5 ? 0 : null;
    }
    return defaultData;
  }
};

const SKINS = [
  { id: 'wave_triangle', name: 'Wave Triangle', cost: 0, desc: 'Classic aerodynamic vector shape.', color: '#00ff66' },
  { id: 'emerald_leaf', name: 'Emerald Leaf', cost: 150, desc: 'Woodland leaf with green aura.', color: '#2ecc71' },
  { id: 'phantom_glow', name: 'Phantom Glow', cost: 250, desc: 'Ghost model with purple trails.', color: '#9b59b6' },
  { id: 'pyro_cube', name: 'Pyro Cube', cost: 350, desc: 'Lava-themed square vessel.', color: '#e67e22' },
  { id: 'cyber_pulse', name: 'Cyber Pulse', cost: 500, desc: 'Neon blue geometric diamond.', color: '#3498db' },
  { id: 'golden_arrow', name: 'Golden Arrow', cost: 750, desc: 'Rare championship arrow skin.', color: '#ffd700' }
];

const TRAILS = [
  { id: 'neon_stream', name: 'Neon Stream', cost: 0, desc: 'Standard cyan stream trail.', color: '#00f3ff' },
  { id: 'rainbow_run', name: 'Rainbow Run', cost: 200, desc: 'Splendid cycling color spectrum.', color: 'rainbow' },
  { id: 'fire_trail', name: 'Fire Sparks', cost: 350, desc: 'Ember-spitting red heat trail.', color: '#ff3300' },
  { id: 'matrix_green', name: 'Matrix Green', cost: 500, desc: 'Streaming digital code trail.', color: '#00ff66' }
];

const MILESTONES = [
  { id: 'first_win', name: 'First Win', desc: 'Clear level 1 in Classic Mode.', reward: 150, icon: '🚀' },
  { id: 'haunted_survivor', name: 'Haunted Survivor', desc: 'Unlock and reach the Haunted Zone (Level 11).', reward: 300, icon: '💀' },
  { id: 'coins_1000', name: '1000 Coins', desc: 'Amass 1,000 PLO Coins in total balance.', reward: 250, icon: '💰' },
  { id: 'daily_claimer', name: 'Daily Claimer', desc: 'Spin the Daily lucky bonus wheel.', reward: 100, icon: '🎁' },
  { id: 'collector_skins', name: 'Collector', desc: 'Unlock 3 custom geometry vehicle skins.', reward: 400, icon: '👑' }
];

const MODALS_HTML = `
<!-- Level Selection Screen Overlay -->
<div id="level-select-screen" class="screen hidden">
  <button class="back-btn" onclick="openMainMenu()">← Menu</button>

  <div class="title-container">
    <h2 class="title-logo" style="font-size: 44px;">Level Select</h2>
    <div class="subtitle">Classic Mode Courses</div>
  </div>

  <div id="level-grid" class="level-grid">
    <!-- Generically populated by JS to load states -->
  </div>

  <div></div> <!-- Spacer -->
</div>

<!-- HUD Overlay during Gameplay -->
<div id="hud">
  <div class="hud-top">
    <div style="display: flex; gap: 8px; pointer-events: auto;">
      <button class="hud-btn pause-btn" onclick="pauseGame()">⏸</button>
      <button id="hud-audio-btn" class="hud-btn pause-btn" onclick="toggleMuteHUD()" title="Toggle Sound">🔊</button>
    </div>

    <div id="hud-player-name" class="hud-player-name">NEON_WAVE</div>

    <div class="hud-center-info">
      <div id="hud-level-text" class="hud-level-indicator">Level 1</div>
      <div class="progress-container">
        <div id="hud-progress-bar" class="progress-bar"></div>
        <div id="hud-progress-text" class="progress-text">0%</div>
      </div>
    </div>

    <div class="hud-coin-display">
      <span>🪙</span>
      <span id="hud-coin-val">0</span>
    </div>

    <div class="practice-toggle-box">
      <input type="checkbox" id="practice-mode-chk" onchange="togglePracticeMode(this.checked)">
      <label for="practice-mode-chk" class="practice-checkbox-custom"></label>
      <label for="practice-mode-chk" class="practice-label">Practice</label>
    </div>

    <button class="hud-btn pause-btn" onclick="toggleFullscreen()" style="margin-left: 10px;" title="Toggle Fullscreen">⛶</button>
  </div>

  <div class="hud-top" style="justify-content: space-between; align-items: flex-end; width: 100%;">
    <!-- Practice check-pointing controls and best run indicator -->
    <div id="practice-controls" class="hud-practice-controls" style="visibility: hidden;">
      <button class="hud-btn practice-action-btn place" onclick="placeCheckpoint()">
        🟢 Place Checkpoint
      </button>
      <button class="hud-btn practice-action-btn clear" onclick="clearCheckpoints()">
        🔴 Clear All
      </button>
      <div id="ghost-status-text" style="font-size: 10px; font-weight: bold; color: var(--neon-cyan); text-shadow: 0 0 5px rgba(0,243,255,0.4); text-transform: uppercase; margin-top: 4px;">
        👻 Ghost Replay Active
      </div>
    </div>

    <!-- Real-time bot leaderboard for Race Mode -->
    <div id="race-leaderboard" class="hud-leaderboard">
      <div class="leaderboard-title">Race Positions</div>
      <div id="leaderboard-list">
        <!-- Dynamically populated -->
      </div>
    </div>
  </div>
</div>

<!-- Pause Modal -->
<div id="pause-modal" class="modal-overlay">
  <div class="modal-content">
    <h2 class="modal-title">Paused</h2>
    <div class="modal-stats">
      <div class="stat-line">
        <span>Player</span>
        <span id="pause-player-val" class="val">NEON_WAVE</span>
      </div>
      <div class="stat-line">
        <span>Current Progress</span>
        <span id="pause-progress-val" class="val">0%</span>
      </div>
      <div class="stat-line">
        <span>Game Mode</span>
        <span id="pause-mode-val" class="val">Classic</span>
      </div>
    </div>
    <div class="modal-buttons">
      <button class="modal-btn primary" onclick="resumeGame()">Resume</button>
      <button class="modal-btn secondary" onclick="restartLevel()">Restart</button>
      <button class="modal-btn secondary" onclick="quitToMenu()">Quit to Menu</button>
    </div>
  </div>
</div>

<!-- Game Over Modal -->
<div id="gameover-modal" class="modal-overlay">
  <div class="modal-content" style="border-color: #ff0066; box-shadow: 0 10px 30px rgba(255, 0, 102, 0.2);">
    <h2 class="modal-title fail">Crashed</h2>
    <div class="modal-stats">
      <div class="stat-line">
        <span>Player</span>
        <span id="fail-player-val" class="val">NEON_WAVE</span>
      </div>
      <div class="stat-line">
        <span>Final Progress</span>
        <span id="fail-progress-val" class="val">0%</span>
      </div>
      <div class="stat-line">
        <span>Score Gained</span>
        <span id="fail-score-val" class="val">0m</span>
      </div>
    </div>
    <div class="modal-buttons">
      <button class="modal-btn primary" style="background: #ff0066;" onclick="restartLevel()">Retry</button>
      <button class="modal-btn secondary" onclick="quitToMenu()">Main Menu</button>
    </div>
  </div>
</div>

<!-- Level Complete / Victory Modal -->
<div id="win-modal" class="modal-overlay">
  <div class="modal-content" style="border-color: var(--neon-cyan); box-shadow: 0 10px 30px rgba(0, 243, 255, 0.2);">
    <h2 class="modal-title win">Cleared!</h2>
    <div class="modal-stats">
      <div class="stat-line">
        <span>Player</span>
        <span id="win-player-val" class="val">NEON_WAVE</span>
      </div>
      <div class="stat-line">
        <span>Completed Mode</span>
        <span id="win-mode-val" class="val">Level 1</span>
      </div>
      <div class="stat-line">
        <span>Attempt Count</span>
        <span id="win-attempts-val" class="val">1</span>
      </div>
    </div>
    <div class="modal-buttons">
      <button id="win-next-btn" class="modal-btn primary" style="background: var(--neon-cyan);" onclick="nextLevel()">Next Level</button>
      <button class="modal-btn secondary" onclick="quitToMenu()">Main Menu</button>
    </div>
  </div>
</div>

<!-- Shop Modal -->
<div id="shop-modal" class="modal-overlay">
  <div class="shop-modal-content">
    <h2 class="modal-title" style="color: var(--neon-cyan); text-shadow: var(--cyan-glow); font-size: 28px;">🛍️ GEOMETRY SHOP</h2>

    <!-- Shop Tabs -->
    <div class="shop-tabs">
      <button id="tab-btn-skins" class="shop-tab-btn active" onclick="switchShopTab('skins')">Skins</button>
      <button id="tab-btn-trails" class="shop-tab-btn" onclick="switchShopTab('trails')">Trails</button>
      <button id="tab-btn-levels" class="shop-tab-btn" onclick="switchShopTab('levels')">Levels</button>
    </div>

    <!-- Skins Tab Content -->
    <div id="shop-tab-skins" class="shop-tab-content active">
      <div id="shop-skins-list" class="skin-grid">
        <!-- Dynamically populated from JS -->
      </div>
    </div>

    <!-- Trails Tab Content -->
    <div id="shop-tab-trails" class="shop-tab-content">
      <div id="shop-trails-list" class="skin-grid">
        <!-- Dynamically populated from JS -->
      </div>
    </div>

    <!-- Levels Tab Content -->
    <div id="shop-tab-levels" class="shop-tab-content">
      <div style="padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 15px; text-align: left;">
        <h3 style="color: #ffd700; font-size: 16px; margin-bottom: 5px; text-transform: uppercase;">Classic Level Store</h3>
        <p style="font-size: 12px; color: #8faeab; line-height: 1.4;">
          Levels 1-5 are unlocked by default. Higher tier levels (6-50) can be unlocked individually in the Classic Level Select grid for <strong style="color: #ffd700;">100 PLO Coins</strong> each. Alternatively, you can unlock all remaining locked levels instantly below!
        </p>
      </div>
      <button id="shop-buy-all-btn" class="shop-buy-all-btn" onclick="buyAllLevels()">
        Unlock All Levels
      </button>
    </div>

    <button class="modal-btn secondary" style="width: auto; align-self: center; padding: 8px 30px;" onclick="closeShop()">Close</button>
  </div>
</div>

<!-- Daily Rewards Modal -->
<div id="daily-modal" class="modal-overlay">
  <div class="modal-content spin-modal-content">
    <h2 class="modal-title" style="color: #ffd700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.6); font-size: 28px;">🎁 DAILY REWARD</h2>
    <p style="color: #8faeab; font-size: 12px; margin-bottom: 12px;">Spin the lucky wheel once every 24 hours to gain free PLO Coins!</p>

    <!-- Spin Wheel -->
    <div class="wheel-container">
      <div class="wheel-pointer">▼</div>
      <div id="spin-wheel" class="spin-wheel">
        <!-- Angle segments: 5 slices of 72 degrees each -->
        <div class="wheel-segment segment-1" style="transform: rotate(0deg);"><span class="seg-text">100</span></div>
        <div class="wheel-segment segment-2" style="transform: rotate(72deg);"><span class="seg-text">200</span></div>
        <div class="wheel-segment segment-3" style="transform: rotate(144deg);"><span class="seg-text">300</span></div>
        <div class="wheel-segment segment-4" style="transform: rotate(216deg);"><span class="seg-text">400</span></div>
        <div class="wheel-segment segment-5" style="transform: rotate(288deg);"><span class="seg-text">500</span></div>
      </div>
    </div>

    <div style="margin-top: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
      <button id="spin-btn" class="modal-btn primary" style="background: #ffd700; color: #051412; width: auto; padding: 10px 40px;" onclick="spinTheWheel()">SPIN NOW</button>
      <div id="spin-result-text" style="color: #ffd700; font-weight: bold; font-size: 16px; min-height: 20px;"></div>
    </div>

    <button class="modal-btn secondary" style="width: auto; align-self: center; padding: 6px 20px; margin-top: 10px;" onclick="closeDailyReward()">Close</button>
  </div>
</div>

<!-- Achievements Modal -->
<div id="achievements-modal" class="modal-overlay">
  <div class="modal-content achievements-modal-content">
    <h2 class="modal-title" style="color: var(--neon-green); text-shadow: var(--neon-glow); font-size: 28px;">🏆 MILESTONES</h2>
    <p style="color: #8faeab; font-size: 12px; margin-bottom: 15px;">Unlock milestones to earn premium badges and claim massive PLO Coin prizes!</p>

    <div id="achievements-list" class="achievements-list">
      <!-- Populated dynamically -->
    </div>

    <button class="modal-btn secondary" style="width: auto; align-self: center; padding: 8px 30px; margin-top: 15px;" onclick="closeAchievements()">Close</button>
  </div>
</div>

<!-- Achievement Toast Notification -->
<div id="achievement-toast" class="achievement-toast">
  <div style="font-size: 24px; filter: drop-shadow(0 0 5px rgba(0, 255, 102, 0.5));">🏆</div>
  <div style="text-align: left;">
    <div class="toast-title">Achievement Unlocked!</div>
    <div id="toast-name" class="toast-name">First Win</div>
  </div>
</div>
`;

let ploCoins = 0;
let unlockedSkins = ['wave_triangle'];
let equippedSkin = 'wave_triangle';
let unlockedTrails = ['neon_stream'];
let equippedTrail = 'neon_stream';
let earnedAchievements = [];
let isUIInitialized = false;

// Async Mount on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('game-container').insertAdjacentHTML('beforeend', MODALS_HTML);
  loadSavedData();
  initUIListeners();
  isUIInitialized = true;
  if (window.renderLevelGrid) window.renderLevelGrid();
});

function loadSavedData() {
  try {
    const savedCoins = localStorage.getItem(SAVE_COINS);
    ploCoins = savedCoins ? parseInt(savedCoins, 10) : 0;

    const savedSkins = localStorage.getItem(SAVE_SKINS);
    if (savedSkins) unlockedSkins = JSON.parse(savedSkins);

    const savedEquippedSkin = localStorage.getItem(SAVE_EQUIPPED_SKIN);
    if (savedEquippedSkin) equippedSkin = savedEquippedSkin;

    const savedTrails = localStorage.getItem(SAVE_TRAILS);
    if (savedTrails) unlockedTrails = JSON.parse(savedTrails);

    const savedEquippedTrail = localStorage.getItem(SAVE_EQUIPPED_TRAIL);
    if (savedEquippedTrail) equippedTrail = savedEquippedTrail;

    const savedAchs = localStorage.getItem(SAVE_ACHIEVEMENTS);
    if (savedAchs) earnedAchievements = JSON.parse(savedAchs);

    updateCoinUI();
  } catch (e) {
    console.error("Error reading saved UI data:", e);
  }
}

function updateCoinUI() {
  const coinMenu = document.getElementById('menu-coin-val');
  const coinHUD = document.getElementById('hud-coin-val');
  if (coinMenu) coinMenu.innerText = ploCoins;
  if (coinHUD) coinHUD.innerText = ploCoins;

  // Triggers checking achievements upon balance update
  checkMilestone('coins_1000', () => ploCoins >= 1000);
}

function addCoins(amount) {
  ploCoins += amount;
  localStorage.setItem(SAVE_COINS, ploCoins.toString());
  updateCoinUI();
  triggerCoinFloat(amount);
  if (window.playCoinCollectSound) window.playCoinCollectSound();
}

function triggerCoinFloat(amount) {
  const container = document.getElementById('game-container');
  if (!container) return;
  const floatText = document.createElement('div');
  floatText.className = 'coin-float-text';
  floatText.innerText = `+${amount} 🪙`;
  floatText.style.left = '50%';
  floatText.style.top = '50%';
  container.appendChild(floatText);
  setTimeout(() => floatText.remove(), 1250);
}

function initUIListeners() {
  // Setup player name listener
  const nameField = document.getElementById('player-name-field');
  if (nameField) {
    const savedName = localStorage.getItem('plo_io_player_name') || 'NEON_WAVE';
    nameField.value = savedName;
    window.playerName = savedName;
    nameField.addEventListener('input', (e) => {
      let val = e.target.value.trim().toUpperCase();
      window.playerName = val ? val.replace(/[^A-Z0-9_]/g, '') : 'NEON_WAVE';
      localStorage.setItem('plo_io_player_name', window.playerName);
    });
  }
}

// --- SHOP NAVIGATION CONTROLLER ---
let activeShopTab = 'skins';

function openShop() {
  const modal = document.getElementById('shop-modal');
  if (modal) {
    modal.classList.add('active');
    renderShopSkins();
    renderShopTrails();
    updateShopLevelsUI();
  }
}

function closeShop() {
  const modal = document.getElementById('shop-modal');
  if (modal) modal.classList.remove('active');
}

function switchShopTab(tabName) {
  activeShopTab = tabName;
  document.querySelectorAll('.shop-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.shop-tab-content').forEach(content => content.classList.remove('active'));

  if (tabName === 'skins') {
    document.getElementById('tab-btn-skins').classList.add('active');
    document.getElementById('shop-tab-skins').classList.add('active');
  } else if (tabName === 'trails') {
    document.getElementById('tab-btn-trails').classList.add('active');
    document.getElementById('shop-tab-trails').classList.add('active');
  } else {
    document.getElementById('tab-btn-levels').classList.add('active');
    document.getElementById('shop-tab-levels').classList.add('active');
  }
}

function renderShopSkins() {
  const list = document.getElementById('shop-skins-list');
  if (!list) return;
  list.innerHTML = '';

  SKINS.forEach(skin => {
    const isUnlocked = unlockedSkins.includes(skin.id);
    const isEquipped = equippedSkin === skin.id;

    const card = document.createElement('div');
    card.className = `skin-card ${isEquipped ? 'equipped' : ''}`;

    let svgMarkup = '';
    if (skin.id === 'wave_triangle') {
      svgMarkup = `<polygon points="32,8 8,48 24,36 40,48" fill="rgba(5, 20, 18, 0.9)" stroke="${skin.color}" stroke-width="3"/>`;
    } else if (skin.id === 'emerald_leaf') {
      svgMarkup = `<path d="M32,8 Q48,24 32,48 Q16,24 32,8 Z" fill="rgba(5, 20, 18, 0.9)" stroke="${skin.color}" stroke-width="3"/>`;
    } else if (skin.id === 'phantom_glow') {
      svgMarkup = `<path d="M32,8 Q44,8 44,28 L44,48 L36,40 L32,48 L28,40 L20,48 L20,28 Q20,8 32,8 Z" fill="rgba(5, 20, 18, 0.9)" stroke="${skin.color}" stroke-width="3"/>`;
    } else if (skin.id === 'pyro_cube') {
      svgMarkup = `<rect x="14" y="14" width="36" height="36" fill="rgba(5, 20, 18, 0.9)" stroke="${skin.color}" stroke-width="3" transform="rotate(45 32 32)"/>`;
    } else if (skin.id === 'cyber_pulse') {
      svgMarkup = `<polygon points="32,8 52,32 32,56 12,32" fill="rgba(5, 20, 18, 0.9)" stroke="${skin.color}" stroke-width="3"/>`;
    } else if (skin.id === 'golden_arrow') {
      svgMarkup = `<polygon points="48,32 16,12 28,32 16,52" fill="rgba(5, 20, 18, 0.9)" stroke="${skin.color}" stroke-width="3"/>`;
    }

    let btnHTML = '';
    if (isEquipped) {
      btnHTML = `<button class="skin-buy-btn equipped-btn" disabled>Equipped</button>`;
    } else if (isUnlocked) {
      btnHTML = `<button class="skin-buy-btn equip" onclick="equipSkin('${skin.id}')">Equip</button>`;
    } else {
      btnHTML = `<button class="skin-buy-btn buy" onclick="buySkin('${skin.id}', ${skin.cost})">🪙${skin.cost}</button>`;
    }

    card.innerHTML = `
      <div class="skin-title" style="color: ${skin.color}">${skin.name}</div>
      <div class="skin-preview"><svg viewBox="0 0 64 64">${svgMarkup}</svg></div>
      <div class="skin-desc">${skin.desc}</div>
      ${btnHTML}
    `;
    list.appendChild(card);
  });
}

function buySkin(skinId, cost) {
  if (ploCoins < cost) {
    alert("Insufficient PLO Coins!");
    return;
  }
  if (confirm(`Buy this skin for ${cost} PLO Coins?`)) {
    ploCoins -= cost;
    localStorage.setItem(SAVE_COINS, ploCoins.toString());
    unlockedSkins.push(skinId);
    localStorage.setItem(SAVE_SKINS, JSON.stringify(unlockedSkins));
    updateCoinUI();
    renderShopSkins();
    checkMilestone('collector_skins', () => unlockedSkins.length >= 3);
  }
}

function equipSkin(skinId) {
  if (unlockedSkins.includes(skinId)) {
    equippedSkin = skinId;
    localStorage.setItem(SAVE_EQUIPPED_SKIN, skinId);
    if (window.player) window.player.equippedSkin = skinId;
    renderShopSkins();
  }
}

function renderShopTrails() {
  const list = document.getElementById('shop-trails-list');
  if (!list) return;
  list.innerHTML = '';

  TRAILS.forEach(trail => {
    const isUnlocked = unlockedTrails.includes(trail.id);
    const isEquipped = equippedTrail === trail.id;

    const card = document.createElement('div');
    card.className = `skin-card ${isEquipped ? 'equipped' : ''}`;

    let streamColor = trail.color === 'rainbow' ? 'linear-gradient(90deg, #ff0055, #00f3ff)' : trail.color;
    let previewHTML = `<div style="width: 50px; height: 10px; background: ${streamColor}; border-radius: 5px;"></div>`;

    let btnHTML = '';
    if (isEquipped) {
      btnHTML = `<button class="skin-buy-btn equipped-btn" disabled>Equipped</button>`;
    } else if (isUnlocked) {
      btnHTML = `<button class="skin-buy-btn equip" onclick="equipTrail('${trail.id}')">Equip</button>`;
    } else {
      btnHTML = `<button class="skin-buy-btn buy" onclick="buyTrail('${trail.id}', ${trail.cost})">🪙${trail.cost}</button>`;
    }

    card.innerHTML = `
      <div class="skin-title" style="color: ${trail.color === 'rainbow' ? '#ff00ff' : trail.color}">${trail.name}</div>
      <div class="skin-preview">${previewHTML}</div>
      <div class="skin-desc">${trail.desc}</div>
      ${btnHTML}
    `;
    list.appendChild(card);
  });
}

function buyTrail(trailId, cost) {
  if (ploCoins < cost) {
    alert("Insufficient PLO Coins!");
    return;
  }
  if (confirm(`Buy this trail for ${cost} PLO Coins?`)) {
    ploCoins -= cost;
    localStorage.setItem(SAVE_COINS, ploCoins.toString());
    unlockedTrails.push(trailId);
    localStorage.setItem(SAVE_TRAILS, JSON.stringify(unlockedTrails));
    updateCoinUI();
    renderShopTrails();
  }
}

function equipTrail(trailId) {
  if (unlockedTrails.includes(trailId)) {
    equippedTrail = trailId;
    localStorage.setItem(SAVE_EQUIPPED_TRAIL, trailId);
    if (window.player) window.player.equippedTrail = trailId;
    renderShopTrails();
  }
}

function updateShopLevelsUI() {
  try {
    const data = window.getClassicProgress();
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

function buyAllLevels() {
  try {
    const data = window.getClassicProgress();
    let lockedCount = 0;
    for (let i = 1; i <= 50; i++) {
      if (data[i] === null) lockedCount++;
    }
    if (lockedCount === 0) {
      alert("All levels unlocked!");
      return;
    }
    const cost = lockedCount * 100;
    if (ploCoins < cost) {
      alert(`Not enough coins! Unlocking all remaining levels costs ${cost} PLO Coins.`);
      return;
    }
    if (confirm(`Unlock all ${lockedCount} locked levels instantly for ${cost} PLO Coins?`)) {
      ploCoins -= cost;
      localStorage.setItem(SAVE_COINS, ploCoins.toString());
      for (let i = 1; i <= 50; i++) {
        if (data[i] === null) data[i] = 0;
      }
      localStorage.setItem(SAVE_CLASSIC_PROGRESS, JSON.stringify(data));
      updateCoinUI();
      updateShopLevelsUI();
      if (window.renderLevelGrid) window.renderLevelGrid();
      alert("All classic course levels successfully unlocked!");
    }
  } catch (e) {
    console.error(e);
  }
}

// --- DAILY SPIN WHEEL SYSTEM ---
let isSpinning = false;

function openDailyReward() {
  const modal = document.getElementById('daily-modal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('spin-result-text').innerText = '';

    // Check if claimed today
    const lastClaim = localStorage.getItem(SAVE_CLAIM_DATE);
    const spinBtn = document.getElementById('spin-btn');
    if (lastClaim && lastClaim === new Date().toDateString()) {
      spinBtn.innerText = "ALREADY CLAIMED TODAY";
      spinBtn.disabled = true;
    } else {
      spinBtn.innerText = "SPIN WHEEL";
      spinBtn.disabled = false;
    }
  }
}

function closeDailyReward() {
  if (isSpinning) return;
  const modal = document.getElementById('daily-modal');
  if (modal) modal.classList.remove('active');
}

function spinTheWheel() {
  if (isSpinning) return;

  // Last verification claim check
  const lastClaim = localStorage.getItem(SAVE_CLAIM_DATE);
  const todayStr = new Date().toDateString();
  if (lastClaim && lastClaim === todayStr) {
    alert("You have already claimed your daily reward!");
    return;
  }

  isSpinning = true;
  const wheel = document.getElementById('spin-wheel');
  const spinBtn = document.getElementById('spin-btn');
  spinBtn.disabled = true;

  // Generate a random segment
  const segmentIndex = Math.floor(Math.random() * 5); // 0 to 4
  const rewards = [100, 200, 300, 400, 500];
  const segmentDeg = 72;
  const spins = 5; // multiple full rotations

  // Calculate final angle to center the pointer on the chosen slice
  const targetDeg = (spins * 360) + (segmentIndex * segmentDeg);

  wheel.style.transform = `rotate(-${targetDeg}deg)`;

  // Trigger high pitch speed ticking sound effects
  let tickCount = 0;
  const tickInterval = setInterval(() => {
    if (window.playJumpSound) window.playJumpSound(600 + tickCount * 25);
    tickCount++;
    if (tickCount >= 18) clearInterval(tickInterval);
  }, 220);

  setTimeout(() => {
    isSpinning = false;
    const prize = rewards[(5 - segmentIndex) % 5] || 100;

    document.getElementById('spin-result-text').innerText = `CONGRATS! Gained +${prize} PLO Coins! 🪙`;
    addCoins(prize);

    // Lock daily date
    localStorage.setItem(SAVE_CLAIM_DATE, todayStr);

    checkMilestone('daily_claimer', () => true);
  }, 5000);
}

// --- ACHIEVEMENT / MILESTONE UNLOCK CHECKS ---
function openAchievements() {
  const modal = document.getElementById('achievements-modal');
  if (modal) {
    modal.classList.add('active');
    renderAchievements();
  }
}

function closeAchievements() {
  const modal = document.getElementById('achievements-modal');
  if (modal) modal.classList.remove('active');
}

function renderAchievements() {
  const container = document.getElementById('achievements-list');
  if (!container) return;
  container.innerHTML = '';

  MILESTONES.forEach(ach => {
    const isUnlocked = earnedAchievements.includes(ach.id);
    const card = document.createElement('div');
    card.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;

    card.innerHTML = `
      <div class="badge-icon">${ach.icon}</div>
      <div class="achievement-details">
        <div class="achievement-name">${ach.name}</div>
        <div class="achievement-desc">${ach.desc}</div>
      </div>
      <div class="achievement-status">${isUnlocked ? 'UNLOCKED' : `+🪙${ach.reward}`}</div>
    `;
    container.appendChild(card);
  });
}

function checkMilestone(milestoneId, conditionFn) {
  if (earnedAchievements.includes(milestoneId)) return;

  if (conditionFn()) {
    earnedAchievements.push(milestoneId);
    localStorage.setItem(SAVE_ACHIEVEMENTS, JSON.stringify(earnedAchievements));

    // Grant badge coin prize
    const milestone = MILESTONES.find(m => m.id === milestoneId);
    if (milestone) {
      addCoins(milestone.reward);
      triggerAchievementToast(milestone.name);
    }
  }
}

function triggerAchievementToast(name) {
  const toast = document.getElementById('achievement-toast');
  const toastName = document.getElementById('toast-name');
  if (toast && toastName) {
    toastName.innerText = name;
    toast.classList.add('active');
    if (window.playVictorySound) window.playVictorySound();
    setTimeout(() => {
      toast.classList.remove('active');
    }, 4000);
  }
}

// Expose bindings to global window
window.addCoins = addCoins;
window.openShop = openShop;
window.closeShop = closeShop;
window.switchShopTab = switchShopTab;
window.buySkin = buySkin;
window.equipSkin = equipSkin;
window.buyTrail = buyTrail;
window.equipTrail = equipTrail;
window.buyAllLevels = buyAllLevels;
window.openDailyReward = openDailyReward;
window.closeDailyReward = closeDailyReward;
window.spinTheWheel = spinTheWheel;
window.openAchievements = openAchievements;
window.closeAchievements = closeAchievements;
window.checkMilestone = checkMilestone;
window.updateShopLevelsUI = updateShopLevelsUI;
