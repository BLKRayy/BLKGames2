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
}

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
// XP + ACHIEVEMENTS + TRENDING
// =========================
function awardXP(type, amount) {
  if (!currentGame) return;

  if (type === "time") {
    const minutes = amount / 60000;
    const xp = Math.floor(minutes * 10); // fast leveling
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
// DYNAMIC BACKGROUND HOOKS
// =========================
function extractColors(game) {
  if (game.colors) return;
  // Placeholder: simple neon palette
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
    modal.classList.add("hidden");
    modalFrame.src = "";
  };

  newTabBtn.onclick = () => {
    if (!frame.src) return;
    window.open(frame.src, "_blank");
  };

  settingsBtn.onclick = () => {
    if (typeof window.openSettings === "function") window.openSettings();
  };

  window.openGame = function (url) {
    const game = games.find(g => g.url === url);
    if (!game) return;
    addRecent(url);
    openPlayer(game);
  };
}

// =========================
// NAVIGATION
// =========================
function setupNav() {
  const links = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("[id^='section-']");

  links.forEach(btn => {
    btn.onclick = () => {
      const target = btn.getAttribute("data-section");
      links.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      sections.forEach(sec => {
        if (sec.id === "section-" + target) {
          sec.classList.remove("hidden");
          sec.classList.add("active");
        } else {
          sec.classList.add("hidden");
          sec.classList.remove("active");
        }
      });
    };
  });
}

// =========================
// SEARCH
// =========================
function setupSearch() {
  const input = document.getElementById("searchInput");
  const cat = document.getElementById("categoryFilter");
  if (!input || !cat) return;

  input.addEventListener("input", renderAll);
  cat.addEventListener("change", renderAll);

  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
  });
}

// =========================
// THEME TOGGLE
// =========================
function setupTheme() {
  const btn = document.getElementById("themeToggle");
  const body = document.body;
  const saved = localStorage.getItem("blkTheme");
  if (saved === "light") {
    body.classList.remove("theme-dark");
    body.classList.add("theme-light");
    if (btn) btn.textContent = "☀";
  }

  if (!btn) return;

  btn.onclick = () => {
    if (body.classList.contains("theme-dark")) {
      body.classList.remove("theme-dark");
      body.classList.add("theme-light");
      btn.textContent = "☀";
      localStorage.setItem("blkTheme", "light");
    } else {
      body.classList.remove("theme-light");
      body.classList.add("theme-dark");
      btn.textContent = "☾";
      localStorage.setItem("blkTheme", "dark");
    }
  };
}

// =========================
/* REQUEST SYSTEM */
// =========================
function setupRequests() {
  const input = document.getElementById("requestInput");
  const btn = document.getElementById("requestSubmit");
  const status = document.getElementById("requestStatus");
  if (!input || !btn || !status) return;

  btn.onclick = () => {
    const text = input.value.trim();
    if (!text) {
      status.textContent = "Please enter a request first.";
      return;
    }
    const raw = localStorage.getItem("blkRequests");
    let list = [];
    if (raw) {
      try { list = JSON.parse(raw); } catch { list = []; }
    }
    list.push({ text, time: Date.now() });
    localStorage.setItem("blkRequests", JSON.stringify(list));
    input.value = "";
    status.textContent = "Request saved locally for the admin.";
    setTimeout(() => (status.textContent = ""), 3000);
  };
}

// =========================
// AI TUTOR (SIMPLE)
// =========================
function setupAI() {
  const orb = document.getElementById("aiButton");
  const modal = document.getElementById("aiModal");
  const close = document.getElementById("aiClose");
  const messages = document.getElementById("aiMessages");
  const input = document.getElementById("aiInput");
  const send = document.getElementById("aiSend");

  if (!orb || !modal) return;

  function addMessage(text, from) {
    const div = document.createElement("div");
    div.className = "ai-msg " + (from === "user" ? "ai-user" : "ai-bot");
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function respond(prompt) {
    const lower = prompt.toLowerCase();
    let reply = "I’m a simple local tutor. Try asking about math, science, or history.";
    if (lower.includes("math") || lower.match(/\d/)) {
      reply = "Break the problem into smaller steps. What is the first thing you can solve or simplify?";
    } else if (lower.includes("history")) {
      reply = "Think about who, what, when, where, and why. That usually unlocks most history questions.";
    } else if (lower.includes("science")) {
      reply = "Try to identify the variables, the rule or law involved, and what is changing.";
    }
    addMessage(reply, "bot");
  }

  orb.onclick = () => {
    modal.classList.remove("hidden");
  };

  close.onclick = () => {
    modal.classList.add("hidden");
  };

  send.onclick = () => {
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, "user");
    input.value = "";
    respond(text);
  };

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      send.click();
    }
  });
}

// =========================
// ADMIN + LOCKDOWN
// =========================
function loadLockdown() {
  const raw = localStorage.getItem("blkLockdown");
  if (!raw) return { active: false, nextUnlock: 0, message: "" };
  try {
    return JSON.parse(raw);
  } catch {
    return { active: false, nextUnlock: 0, message: "" };
  }
}

function saveLockdown(state) {
  localStorage.setItem("blkLockdown", JSON.stringify(state));
}

function updateLockdownUI() {
  const state = loadLockdown();
  const screen = document.getElementById("lockdownScreen");
  const main = document.querySelector(".main-shell");
  const aiButton = document.getElementById("aiButton");

  if (!screen || !main) return;

  const now = Date.now();
  const active = state.active && now < state.nextUnlock;

  if (active) {
    screen.classList.remove("hidden");
    main.style.filter = "blur(6px)";
    main.style.pointerEvents = "none";
    if (aiButton) aiButton.style.display = "none";

    const timeEl = document.getElementById("lockCurrentTime");
    const nextEl = document.getElementById("lockNextUnlock");
    const msgEl = document.getElementById("lockMsgText");

    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
    if (nextEl) nextEl.textContent = new Date(state.nextUnlock).toLocaleTimeString();
    if (msgEl) msgEl.textContent = state.message || "This arcade is currently locked by an administrator.";
  } else {
    screen.classList.add("hidden");
    main.style.filter = "";
    main.style.pointerEvents = "";
    if (aiButton) aiButton.style.display = "";
    if (state.active) {
      state.active = false;
      saveLockdown(state);
    }
  }
}

function setupAdmin() {
  const topBtn = document.getElementById("adminTopBtn");
  const lockAdminBtn = document.getElementById("lockAdminBtn");
  const lockOverrideBtn = document.getElementById("lockOverrideBtn");

  function adminPromptLockdown() {
    const code = prompt("Enter admin code:");
    if (code !== "0000") {
      alert("Invalid code.");
      return;
    }
    const minutes = parseInt(prompt("Lock for how many minutes? (0 to unlock)"), 10);
    if (isNaN(minutes)) return;

    const state = loadLockdown();
    if (minutes <= 0) {
      state.active = false;
      state.nextUnlock = 0;
      state.message = "";
      saveLockdown(state);
      updateLockdownUI();
      alert("Lockdown disabled.");
      return;
    }

    state.active = true;
    state.nextUnlock = Date.now() + minutes * 60000;
    state.message = prompt("Optional message to show during lockdown:", state.message || "") || "";
    saveLockdown(state);
    updateLockdownUI();
    alert("Lockdown enabled.");
  }

  function adminOverride() {
    const code = prompt("Admin override code:");
    if (code !== "0000") {
      alert("Invalid code.");
      return;
    }
    const state = loadLockdown();
    state.active = false;
    state.nextUnlock = 0;
    saveLockdown(state);
    updateLockdownUI();
    alert("Lockdown overridden.");
  }

  if (topBtn) topBtn.onclick = adminPromptLockdown;
  if (lockAdminBtn) lockAdminBtn.onclick = adminPromptLockdown;
  if (lockOverrideBtn) lockOverrideBtn.onclick = adminOverride;

  updateLockdownUI();
  setInterval(updateLockdownUI, 30000);
}

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", () => {
  loadProfile();
  loadStats();
  setupPlayer();
  setupSettings();
  setupNav();
  setupSearch();
  setupTheme();
  setupRequests();
  setupAI();
  setupAdmin();
  loadGames();
});
