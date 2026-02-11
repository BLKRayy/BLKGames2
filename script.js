// =========================
// GLOBAL STATE
// =========================
let games = [];
let profile = { favorites: [], recent: [] };
let heroGame = null;

let blkStats = {
  totalXP: 0,
  totalPlayTime: 0,
  achievements: [],
  trending: [],
  lastUpdated: 0
};

let currentGame = null;
let playTimer = null;
let playStart = 0;

// =========================
// PROFILE + STATS STORAGE
// =========================
function loadProfile() {
  const raw = localStorage.getItem("blkProfile");
  if (raw) {
    try {
      profile = JSON.parse(raw);
    } catch {
      profile = { favorites: [], recent: [] };
    }
  }
}

function saveProfile() {
  localStorage.setItem("blkProfile", JSON.stringify(profile));
}

function loadStats() {
  const raw = localStorage.getItem("blkStats");
  if (raw) {
    try {
      blkStats = JSON.parse(raw);
    } catch {
      blkStats = {
        totalXP: 0,
        totalPlayTime: 0,
        achievements: [],
        trending: [],
        lastUpdated: 0
      };
    }
  }
}

function saveStats() {
  localStorage.setItem("blkStats", JSON.stringify(blkStats));
}

function loadGamesMeta() {
  const raw = localStorage.getItem("blkGameMeta");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveGamesMeta() {
  const meta = {};
  games.forEach(g => {
    meta[g.url] = {
      added: g.added,
      plays: g.plays,
      timePlayed: g.timePlayed,
      xp: g.xp,
      achievements: g.achievements,
      colors: g.colors
    };
  });
  localStorage.setItem("blkGameMeta", JSON.stringify(meta));
}

// =========================
// GAME LOADING
// =========================
async function loadGames() {
  const res = await fetch("games.json");
  const rawGames = await res.json();
  const meta = loadGamesMeta();

  games = rawGames.map(g => {
    const m = meta[g.url] || {};
    return {
      ...g,
      added: m.added || Date.now(),
      plays: m.plays || 0,
      timePlayed: m.timePlayed || 0,
      xp: m.xp || 0,
      achievements: m.achievements || [],
      colors: m.colors || null
    };
  });

  populateCategories();
  updateHero();
  renderAll();
  renderHomePanels();
  renderProfile();
}

// =========================
// RENDERING
// =========================
function renderGames(list, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  list.forEach(g => {
    const card = document.createElement("div");
    card.className = "game-card";
    card.onclick = () => openGame(g.url);

    const thumb = document.createElement("div");
    thumb.className = "game-thumb";
    thumb.innerHTML = `<img src="${g.logo || ""}" alt="">`;

    const title = document.createElement("div");
    title.className = "game-title";
    title.textContent = g.name;

    const meta = document.createElement("div");
    meta.className = "game-meta";
    meta.innerHTML = `<span>${g.category || "Game"}</span><span>${g.tag || ""}</span>`;

    const actions = document.createElement("div");
    actions.className = "game-actions";

    const star = document.createElement("button");
    star.className = "game-star";
    star.textContent = profile.favorites.includes(g.url) ? "★" : "☆";
    star.onclick = e => {
      e.stopPropagation();
      toggleFavorite(g.url);
    };

    actions.appendChild(star);
    card.appendChild(thumb);
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(actions);
    el.appendChild(card);
  });
}

function renderAll() {
  const searchEl = document.getElementById("searchInput");
  const catEl = document.getElementById("categoryFilter");
  const q = (searchEl?.value || "").toLowerCase();
  const cat = catEl?.value || "All";

  const filtered = games.filter(g =>
    g.name.toLowerCase().includes(q) &&
    (cat === "All" || g.category === cat)
  );

  const favGames = games.filter(g => profile.favorites.includes(g.url));
  const recentGames = profile.recent
    .map(url => games.find(g => g.url === url))
    .filter(Boolean);

  renderGames(filtered, "allGames");
  renderGames(favGames, "favoriteGames");
  renderGames(recentGames, "recentGames");

  renderGames(favGames, "favoriteGamesSolo");
  renderGames(recentGames, "recentGamesSolo");
  renderGames(filtered, "allGamesSolo");

  updateHero();
  renderHomePanels();
}

// =========================
// HOME PANELS (TRENDING + RECENTLY ADDED)
// =========================
function renderHomePanels() {
  const trendingEl = document.getElementById("trendingGames");
  const recentAddedEl = document.getElementById("recentlyAddedGames");
  if (!trendingEl || !recentAddedEl) return;

  const trendingList = blkStats.trending
    .map(t => games.find(g => g.url === t.url))
    .filter(Boolean);

  trendingEl.innerHTML = "";
  renderGames(trendingList, "trendingGames");

  const recentAdded = getRecentlyAdded();
  recentAddedEl.innerHTML = "";
  renderGames(recentAdded, "recentlyAddedGames");
}

// =========================
// HERO
// =========================
function updateHero() {
  if (!games.length) return;
  const featured = games.filter(g => g.featured);
  heroGame = featured[0] || games[0];
  if (!heroGame) return;

  document.getElementById("heroTitle").textContent = heroGame.name;
  document.getElementById("heroGameName").textContent = heroGame.name.toUpperCase();
  document.getElementById("heroDesc").textContent =
    heroGame.description || "Jump in and play instantly.";
  document.getElementById("heroCategory").textContent = heroGame.category || "Game";
  document.getElementById("heroTag").textContent = heroGame.tag || "Featured";

  document.getElementById("heroPlay").onclick = () => openGame(heroGame.url);

  applyDynamicHeroColors(heroGame);
}

// =========================
// CATEGORIES
// =========================
function populateCategories() {
  const select = document.getElementById("categoryFilter");
  if (!select) return;
  const cats = Array.from(new Set(games.map(g => g.category || "Other"))).sort();
  select.innerHTML = "";
  const allOpt = document.createElement("option");
  allOpt.value = "All";
  allOpt.textContent = "All Categories";
  select.appendChild(allOpt);
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

// =========================
// FAVORITES + RECENT
// =========================
function toggleFavorite(url) {
  const i = profile.favorites.indexOf(url);
  if (i === -1) profile.favorites.push(url);
  else profile.favorites.splice(i, 1);
  saveProfile();
  renderAll();
}

function addRecent(url) {
  profile.recent = profile.recent.filter(u => u !== url);
  profile.recent.unshift(url);
  if (profile.recent.length > 20) profile.recent.pop();
  saveProfile();
}

// =========================
// SAVE STATE ENGINE
// =========================
function saveState(url, data) {
  localStorage.setItem("save_" + url, JSON.stringify(data));
}

function loadState(url) {
  const raw = localStorage.getItem("save_" + url);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

// =========================
// SETTINGS PANEL
// =========================
function setupSettings() {
  const panel = document.getElementById("settingsPanel");
  const close = document.getElementById("settingsClose");
  const reset = document.getElementById("settingsReset");

  if (!panel) return;

  window.openSettings = () => {
    panel.classList.remove("hidden");
  };

  close.onclick = () => panel.classList.add("hidden");

  reset.onclick = () => {
    const url = document.getElementById("playerFrame").src;
    localStorage.removeItem("save_" + url);
    alert("Save data cleared.");
  };
}

// =========================
// XP + LEVEL + ACHIEVEMENTS + TRENDING
// =========================
function awardXP(type, amount) {
  if (!currentGame) return;

  if (type === "time") {
    const minutes = amount / 60000;
    const xp = Math.floor(minutes * 10);
    blkStats.totalXP += xp;
    currentGame.xp += xp;
  }

  if (type === "firstPlay") {
    blkStats.totalXP += 50;
    currentGame.xp += 50;
  }

  if (type === "achievement") {
    blkStats.totalXP += 100;
    currentGame.xp += 100;
  }

  saveStats();
}

const achievementRules = [
  { id: "first_play", check: g => g.plays >= 1 },
  { id: "10_min", check: g => g.timePlayed >= 600000 },
  { id: "1_hour", check: g => g.timePlayed >= 3600000 },
  { id: "5_games", check: () => profile.recent.length >= 5 },
  { id: "100_xp", check: () => blkStats.totalXP >= 100 },
  { id: "500_xp", check: () => blkStats.totalXP >= 500 },
  { id: "1000_xp", check: () => blkStats.totalXP >= 1000 }
];

function checkAchievements(game) {
  achievementRules.forEach(rule => {
    if (!blkStats.achievements.includes(rule.id) && rule.check(game)) {
      blkStats.achievements.push(rule.id);
      awardXP("achievement");
    }
  });
  saveStats();
}

function updateTrending() {
  const now = Date.now();
  const day = 86400000;

  const scored = games.map(g => {
    const score =
      (g.plays || 0) * 3 +
      (g.xp || 0) * 0.5 +
      (g.timePlayed || 0) / 60000 +
      (now - (g.added || now) < day ? 50 : 0);

    return { url: g.url, score };
  });

  scored.sort((a, b) => b.score - a.score);
  blkStats.trending = scored.slice(0, 10);
  blkStats.lastUpdated = now;
  saveStats();
}

function getRecentlyAdded() {
  return games
    .slice()
    .sort((a, b) => (b.added || 0) - (a.added || 0))
    .slice(0, 10);
}

// =========================
// LEVEL SYSTEM
// =========================
function computeLevelFromXP(xp) {
  const level = Math.floor(xp / 100) + 1;
  const currentLevelXP = (level - 1) * 100;
  const nextLevelXP = level * 100;
  const progress = (xp - currentLevelXP) / (nextLevelXP - currentLevelXP);
  return { level, currentLevelXP, nextLevelXP, progress: Math.max(0, Math.min(1, progress)) };
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = (minutes / 60).toFixed(1);
  return `${hours} hr`;
}

// =========================
// PROFILE PAGE RENDERER
// =========================
function renderProfile() {
  const xpBarFill = document.getElementById("xpBarFill");
  const xpCurrent = document.getElementById("xpCurrent");
  const xpNext = document.getElementById("xpNext");
  const levelTag = document.getElementById("profileLevelTag");
  const statXP = document.getElementById("statTotalXP");
  const statTime = document.getElementById("statTotalTime");
  const statPlays = document.getElementById("statTotalPlays");
  const achGrid = document.getElementById("achievementsGrid");

  if (!xpBarFill || !xpCurrent || !xpNext || !levelTag || !achGrid) return;

  const { level, nextLevelXP, progress } = computeLevelFromXP(blkStats.totalXP);

  xpBarFill.style.width = `${progress * 100}%`;
  xpCurrent.textContent = `${blkStats.totalXP} XP`;
  xpNext.textContent = `Next: ${nextLevelXP} XP`;
  levelTag.textContent = `LVL ${level}`;

  if (statXP) statXP.textContent = blkStats.totalXP;
  if (statTime) statTime.textContent = formatTime(blkStats.totalPlayTime);

  const totalPlays = games.reduce((sum, g) => sum + (g.plays || 0), 0);
  if (statPlays) statPlays.textContent = totalPlays;

  achGrid.innerHTML = "";

  const achievementMeta = [
    { id: "first_play", title: "First Launch", desc: "Play any game once." },
    { id: "10_min", title: "Warming Up", desc: "Play for 10 minutes total." },
    { id: "1_hour", title: "Locked In", desc: "Play for 1 hour total." },
    { id: "5_games", title: "Explorer", desc: "Play 5 different games." },
    { id: "100_xp", title: "Rookie", desc: "Reach 100 XP." },
    { id: "500_xp", title: "Grinder", desc: "Reach 500 XP." },
    { id: "1000_xp", title: "No‑Life", desc: "Reach 1000 XP." }
  ];

  achievementMeta.forEach(a => {
    const unlocked = blkStats.achievements.includes(a.id);
    const div = document.createElement("div");
    div.className = "achievement" + (unlocked ? " unlocked" : " locked");

    const title = document.createElement("div");
    title.className = "achievement-title";
    title.textContent = a.title;

    const desc = document.createElement("div");
    desc.className = "achievement-desc";
    desc.textContent = a.desc;

    div.appendChild(title);
    div.appendChild(desc);
    achGrid.appendChild(div);
  });
}

// =========================
// DYNAMIC BACKGROUND HOOKS
// =========================
function extractColors(game) {
  if (game.colors) return;
  game.colors = {
    primary: "#00c8ff",
    secondary: "#0a0f1f"
  };
  saveGamesMeta();
}

function applyDynamicHeroColors(game) {
  if (!game) return;
  extractColors(game);
  const hero = document.querySelector(".hero");
  const glow = document.querySelector(".hero-glow");
  if (!hero || !glow) return;
  const c = game.colors || { primary: "#00c8ff", secondary: "#020617" };
  hero.style.background = `radial-gradient(circle at top left, ${c.primary}22, ${c.secondary}ff)`;
  glow.style.boxShadow = `0 0 60px ${c.primary}aa`;
}

// =========================
// HYBRID PLAYER + MODAL FULLSCREEN
// =========================
function setupPlayer() {
  const player = document.getElementById("gamePlayer");
  const frame = document.getElementById("playerFrame");
  const title = document.getElementById("playerTitle");
  const closeBtn = document.getElementById("playerClose");
  const fsBtn = document.getElementById("playerFullscreen");
  const newTabBtn = document.getElementById("playerNewTab");
  const settingsBtn = document.getElementById("playerSettings");

  const modal = document.getElementById("playerModal");
  const modalFrame = document.getElementById("modalFrame");
  const modalClose = document.getElementById("modalClose");

  if (!player) return;

  function trackPlayTime() {
    if (!currentGame || !playStart) return;
    const now = Date.now();
    const diff = now - playStart;
    currentGame.timePlayed += diff;
    blkStats.totalPlayTime += diff;
    playStart = now;
    awardXP("time", diff);
    checkAchievements(currentGame);
    saveStats();
    saveGamesMeta();
  }

  function openPlayer(game) {
    currentGame = game;

    if (!game.plays) game.plays = 0;
    if (!game.timePlayed) game.timePlayed = 0;
    if (!game.xp) game.xp = 0;
    if (!game.achievements) game.achievements = [];

    game.plays++;
    awardXP("firstPlay");
    extractColors(game);
    checkAchievements(game);
    updateTrending();
    saveGamesMeta();
    saveStats();

    frame.src = game.url;
    title.textContent = game.name || "GAME";
    player.classList.remove("hidden");

    player.scrollIntoView({ behavior: "smooth", block: "start" });

    if (playTimer) clearInterval(playTimer);
    playStart = Date.now();
    playTimer = setInterval(trackPlayTime, 60000);
  }

  function closePlayer() {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
    playStart = 0;
    frame.src = "";
    player.classList.add("hidden");
    currentGame = null;
  }

  closeBtn.onclick = () => closePlayer();

  fsBtn.onclick = () => {
    if (!frame.src) return;
    modalFrame.src = frame.src;
    modal.classList.remove("hidden");
  };

  modalClose.onclick = () => {
    modal.classList
