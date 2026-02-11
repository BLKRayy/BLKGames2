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

/* HERO */
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

/* FAVORITES + RECENT */
function toggleFavorite(url) {
  const i = profile.favorites.indexOf(url);
  if (i === -1) profile.favorites.push(url);
  else profile.favorites.splice(i, 1);
  saveProfile();
  renderAll();
}

/* HYBRID GAME PLAYER */
function setupPlayer() {
  const player = document.getElementById("gamePlayer");
  const frame = document.getElementById("playerFrame");
  const title = document.getElementById("playerTitle");
  const closeBtn = document.getElementById("playerClose");
  const fsBtn = document.getElementById("playerFullscreen");
  const newTabBtn = document.getElementById("playerNewTab");

  function openPlayer(game) {
    title.textContent = game.name.toUpperCase();
    frame.src = game.url;
    player.classList.remove("hidden");

    window.scrollTo({
      top: player.offsetTop - 20,
      behavior: "smooth"
    });
  }

  function closePlayer() {
    frame.src = "";
    player.classList.add("hidden");
  }

  closeBtn.onclick = closePlayer;

  fsBtn.onclick = () => {
    if (!document.fullscreenElement) {
      player.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  newTabBtn.onclick = () => {
    if (frame.src) window.open(frame.src, "_blank");
  };

  window.openGame = url => {
    const game = games.find(g => g.url === url);
    if (!game) return;

    const i = profile.recent.indexOf(url);
    if (i !== -1) profile.recent.splice(i, 1);
    profile.recent.unshift(url);
    if (profile.recent.length > 12) profile.recent.pop();
    saveProfile();

    openPlayer(game);
    renderAll();
  };
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
  const buttons = document.querySelectorAll(".nav-link");
  const sections = {
    home: "section-home",
    favorites: "section-favorites",
    recent: "section-recent",
    all: "section-all",
    request: "section-request"
  };

  buttons.forEach(btn => {
    btn.onclick = () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const target = btn.dataset.section;
      Object.values(sections).forEach(id => {
        document.getElementById(id).classList.add("hidden");
      });
      document.getElementById(sections[target]).classList.remove("hidden");
    };
  });
}

/* REQUESTS */
function setupRequests() {
  const input = document.getElementById("requestInput");
  const submit = document.getElementById("requestSubmit");
  const status = document.getElementById("requestStatus");

  submit.onclick = () => {
    const text = input.value.trim();
    if (!text) {
      status.textContent = "Please enter a request.";
      return;
    }
    const list = JSON.parse(localStorage.getItem("blkRequests") || "[]");
    list.push({ text, time: Date.now() });
    localStorage.setItem("blkRequests", JSON.stringify(list));
    input.value = "";
    status.textContent = "Request submitted.";
    setTimeout(() => (status.textContent = ""), 2000);
  };
}

/* AI TUTOR */
function setupAI() {
  const orb = document.getElementById("aiButton");
  const modal = document.getElementById("aiModal");
  const close = document.getElementById("aiClose");
  const send = document.getElementById("aiSend");
  const input = document.getElementById("aiInput");
  const messages = document.getElementById("aiMessages");

  function addMessage(label, text) {
    const wrap = document.createElement("div");
    wrap.className = "ai-msg";
    wrap.innerHTML = `
      <div class="ai-msg-label">${label}</div>
      <div class="ai-msg-text">${text}</div>
    `;
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  function respond() {
    const q = input.value.trim();
    if (!q) return;
    addMessage("You", q);
    input.value = "";
    addMessage("Tutor", "I can't access the internet here, but try breaking the problem into smaller steps and checking each one.");
  }

  orb.onclick = () => {
    modal.classList.remove("hidden");
    input.focus();
  };
  close.onclick = () => {
    modal.classList.add("hidden");
  };
  send.onclick = respond;
  input.onkeydown = e => {
    if (e.key === "Enter") respond();
  };
}

/* THEME TOGGLE */
function setupTheme() {
  const btn = document.getElementById("themeToggle");
  const stored = localStorage.getItem("blkTheme") || "dark";
  if (stored === "light") {
    document.body.classList.remove("theme-dark");
    document.body.classList.add("theme-light");
  }

  btn.onclick = () => {
    const isDark = document.body.classList.contains("theme-dark");
    if (isDark) {
      document.body.classList.remove("theme-dark");
      document.body.classList.add("theme-light");
      localStorage.setItem("blkTheme", "light");
    } else {
      document.body.classList.remove("theme-light");
      document.body.classList.add("theme-dark");
      localStorage.setItem("blkTheme", "dark");
    }
  };
}

/* SEARCH + SHORTCUTS */
function setupSearch() {
  const input = document.getElementById("searchInput");
  const select = document.getElementById("categoryFilter");

  input.oninput = renderAll;
  select.onchange = renderAll;

  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
  });
}

/* ADMIN BUTTON */
function setupAdminButton() {
  const topBtn = document.getElementById("adminTopBtn");
  const lockBtn = document.getElementById("lockAdminBtn");
  const overrideBtn = document.getElementById("lockOverrideBtn");

  function goAdmin() {
    window.location.href = "admin.html";
  }

  topBtn.onclick = goAdmin;
  if (lockBtn) lockBtn.onclick = goAdmin;
  if (overrideBtn) overrideBtn.onclick = goAdmin;
}

/* GLOBAL LOCKDOWN CHECK */
function checkLockdown() {
  const raw = localStorage.getItem("blkGlobalLockdown");
  const overlay = document.getElementById("lockdownScreen");
  if (!raw) {
    overlay.classList.add("hidden");
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    overlay.classList.add("hidden");
    return;
  }

  const now = Date.now();
  if (!data.end || now >= data.end) {
    localStorage.removeItem("blkGlobalLockdown");
    overlay.classList.add("hidden");
    return;
  }

  overlay.classList.remove("hidden");
  updateLockdownUI(data);
  const interval = setInterval(() => {
    const raw2 = localStorage.getItem("blkGlobalLockdown");
    if (!raw2) {
      overlay.classList.add("hidden");
      clearInterval(interval);
      return;
    }
    let d2;
    try {
      d2 = JSON.parse(raw2);
    } catch {
      overlay.classList.add("hidden");
      clearInterval(interval);
      return;
    }
    const now2 = Date.now();
    if (!d2.end || now2 >= d2.end) {
      localStorage.removeItem("blkGlobalLockdown");
      overlay.classList.add("hidden");
      clearInterval(interval);
      return;
    }
    updateLockdownUI(d2);
  }, 1000);
}

function updateLockdownUI(data) {
  const now = new Date();
  document.getElementById("lockCurrentTime").textContent = now.toLocaleString();
  document.getElementById("lockMsgText").textContent = data.msg || "This arcade is currently locked by an administrator.";
  const end = new Date(data.end);
  document.getElementById("lockNextUnlock").textContent = end.toLocaleString();
}

/* INIT */
document.addEventListener("DOMContentLoaded", async () => {
  loadProfile();
  await loadGames();
  populateCategories();
  setupNav();
  setupRequests();
  setupAI();
  setupTheme();
  setupSearch();
  setupAdminButton();
  setupPlayer();
  renderAll();
  checkLockdown();
});
