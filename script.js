let games = [];
let profile = { favorites: [], recent: [] };
let heroGame = null;

/* LOAD GAMES */
async function loadGames() {
  const res = await fetch("games.json");
  games = await res.json();
}

/* RENDER HELPERS */
function renderGames(list, containerId) {
  const el = document.getElementById(containerId);
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
    star.className = "pixel-btn small game-star";
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

  updateHero();
}

/* HERO */
function updateHero() {
  const featured = games.filter(g => g.featured);
  heroGame = featured[0] || games[0];
  if (!heroGame) return;
  document.getElementById("heroTitle").textContent = heroGame.name;
  document.getElementById("heroGameName").textContent = heroGame.name.toUpperCase();
  document.getElementById("heroDesc").textContent =
    heroGame.description || "Jump in and play instantly.";
}

/* FAVORITES + RECENT */
function toggleFavorite(url) {
  const i = profile.favorites.indexOf(url);
  if (i === -1) profile.favorites.push(url);
  else profile.favorites.splice(i, 1);
  saveProfile();
  renderAll();
}

function openGame(url) {
  window.open(url, "_blank");
  const i = profile.recent.indexOf(url);
  if (i !== -1) profile.recent.splice(i, 1);
  profile.recent.unshift(url);
  if (profile.recent.length > 12) profile.recent.pop();
  saveProfile();
  renderAll();
}

/* PROFILE STORAGE */
function loadProfile() {
  const saved = localStorage.getItem("blkArcadeProfile");
  if (saved) profile = JSON.parse(saved);
}

function saveProfile() {
  localStorage.setItem("blkArcadeProfile", JSON.stringify(profile));
}

/* CATEGORIES */
function populateCategories() {
  const select = document.getElementById("categoryFilter");
  const cats = new Set(["All"]);
  games.forEach(g => cats.add(g.category));
  select.innerHTML = "";
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

/* NAVIGATION */
function setupNav() {
  const buttons = document.querySelectorAll(".nav-btn");
  const sections = {
    home: ["section-favorites", "section-recent", "section-all"],
    favorites: ["section-favorites"],
    recent: ["section-recent"],
