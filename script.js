let games = [];
let profile = { favorites: [], recent: [] };
let heroGame = null;

async function loadGames() {
  const res = await fetch("games.json");
  games = await res.json();
}

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
    meta.innerHTML = `<span>${g.category}</span><span>${g.tag || ""}</span>`;

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
  const q = document.getElementById("searchInput").value.toLowerCase();
  const cat = document.getElementById("categoryFilter").value;

  const filtered = games.filter(g =>
    g.name.toLowerCase().includes(q) &&
    (cat === "All" || g.category === cat)
  );

  renderGames(filtered, "allGames");

  const favGames = games.filter(g => profile.favorites.includes(g.url));
  renderGames(favGames, "favoriteGames");

  const recentGames = profile.recent
    .map(url => games.find(g => g.url === url))
    .filter(Boolean);
  renderGames(recentGames, "recentGames");

  renderGames(favGames, "favoriteGamesSolo");
  renderGames(recentGames, "recentGamesSolo");
  renderGames(filtered, "allGamesSolo");

  updateHero();
}

function updateHero() {
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
}

function toggleFavorite(url) {
  const i = profile.favorites.indexOf(url);
  if (i === -1) profile.favorites.push(url);
  else profile.favorites.splice(i, 1);
  saveProfile();
  renderAll();
}

/* SAVE STATE ENGINE */
function saveState(url, data) {
  localStorage.setItem("save_" + url, JSON.stringify(data));
}

function loadState(url) {
  const raw = localStorage.getItem("save_" + url);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

/* SETTINGS PANEL */
function setupSettings() {
  const panel = document.getElementById("settingsPanel");
  const close = document.getElementById("settingsClose");
  const reset = document.getElementById("settingsReset");

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

/* HYBRID PLAYER + MODAL FULLSCREEN */
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

  function openPlayer(game) {
