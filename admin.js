// SIMPLE HASH (not cryptographic, but hides raw password)
function simpleHash(str) {
  let h = 0;
  for (const ch of str) h += ch.charCodeAt(0);
  return h;
}

const ADMIN_USER = "admin";
const ADMIN_PASS_HASH = simpleHash("loyal"); // 545
const SESSION_KEY = "blkAdminSession";

// AUTH GUARD
function isLoggedIn() {
  return localStorage.getItem(SESSION_KEY) === "active";
}

function showLogin() {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("adminApp").classList.add("hidden");
}

function showAdmin() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("adminApp").classList.remove("hidden");
}

// LOGIN HANDLERS
function setupLogin() {
  const userEl = document.getElementById("loginUser");
  const passEl = document.getElementById("loginPass");
  const btn = document.getElementById("loginBtn");
  const err = document.getElementById("loginError");

  function attempt() {
    const u = userEl.value.trim();
    const p = passEl.value;

    if (u !== ADMIN_USER || simpleHash(p) !== ADMIN_PASS_HASH) {
      err.textContent = "Invalid credentials.";
      return;
    }

    localStorage.setItem(SESSION_KEY, "active");
    err.textContent = "";
    initAdminApp();
    showAdmin();
  }

  btn.onclick = attempt;
  passEl.onkeydown = e => {
    if (e.key === "Enter") attempt();
  };
}

// SIGN OUT
function setupSignOut() {
  const btn = document.getElementById("signOutBtn");
  btn.onclick = () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  };
}

// NAVIGATION
function setupNav() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const target = btn.dataset.section;
      document.querySelectorAll(".content > .panel").forEach(p => p.classList.add("hidden"));
      document.getElementById("admin-" + target).classList.remove("hidden");
    };
  });
}

// GAME EDITOR
let adminGames = [];

async function loadAdminGames() {
  const custom = localStorage.getItem("customGames");
  if (custom) {
    adminGames = JSON.parse(custom);
  } else {
    const res = await fetch("games.json");
    adminGames = await res.json();
  }
  renderGameEditor();
}

function renderGameEditor() {
  const box = document.getElementById("gameList");
  box.innerHTML = "";

  adminGames.forEach(g => {
    const row = document.createElement("div");
    row.className = "panel";
    row.style.marginTop = "6px";

    row.innerHTML = `
      <div class="panel-header">
        <h3>${g.name}</h3>
      </div>
      <p style="font-size:8px;">${g.category} • ${g.tag || ""}</p>
      <button class="pixel-btn small" data-url="${g.url}">EDIT</button>
    `;

    row.querySelector("button").onclick = () => editGame(g.url);
    box.appendChild(row);
  });
}

function editGame(url) {
  const g = adminGames.find(x => x.url === url);
  if (!g) return;

  const name = prompt("Name:", g.name);
  if (!name) return;

  const cat = prompt("Category:", g.category);
  if (!cat) return;

  const tag = prompt("Tag:", g.tag || "");
  const logo = prompt("Logo URL:", g.logo || "");
  const newUrl = prompt("Game URL:", g.url);

  adminGames = adminGames.map(x =>
    x.url === url ? { ...x, name, category: cat, tag, logo, url: newUrl } : x
  );

  saveAdminGames();
  renderGameEditor();
}

function saveAdminGames() {
  localStorage.setItem("customGames", JSON.stringify(adminGames));
}

// IMPORT / EXPORT
function setupImportExport() {
  document.getElementById("exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify(adminGames, null, 2)], {
      type: "application/json"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "games-export.json";
    a.click();
  };

  document.getElementById("importBtn").onclick = () => {
    const file = document.getElementById("importFile").files[0];
    if (!file) {
      document.getElementById("importStatus").textContent = "No file selected.";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        adminGames = JSON.parse(reader.result);
        saveAdminGames();
        renderGameEditor();
        document.getElementById("importStatus").textContent = "Import complete.";
      } catch {
        document.getElementById("importStatus").textContent = "Invalid JSON.";
      }
    };
    reader.readAsText(file);
  };
}

// MAINTENANCE
function setupMaintenance() {
  const toggle = document.getElementById("maintToggle");
  const stored = localStorage.getItem("maintenance") === "true";
  toggle.checked = stored;

  toggle.onchange = e => {
    localStorage.setItem("maintenance", e.target.checked ? "true" : "false");
  };
}

// GLOBAL LOCKDOWN
function setupLockdown() {
  const msgEl = document.getElementById("lockMsg");
  const minEl = document.getElementById("lockMinutes");
  const statusEl = document.getElementById("lockStatus");

  document.getElementById("lockBtn").onclick = () => {
    const msg = msgEl.value.trim();
    const minutes = parseInt(minEl.value);

    if (!msg || !minutes) {
      statusEl.textContent = "Missing fields.";
      return;
    }

    const end = Date.now() + minutes * 60000;
    localStorage.setItem("blkGlobalLockdown", JSON.stringify({ msg, end }));
    statusEl.textContent = "Lockdown activated.";
  };

  document.getElementById("unlockBtn").onclick = () => {
    localStorage.removeItem("blkGlobalLockdown");
    statusEl.textContent = "Lockdown removed.";
  };
}

// REQUESTS
function loadRequests() {
  const list = JSON.parse(localStorage.getItem("blkRequests") || "[]");
  const box = document.getElementById("requestList");
  box.innerHTML = "";

  list.forEach(r => {
    const div = document.createElement("div");
    div.className = "panel";
    div.style.marginTop = "6px";
    div.innerHTML = `
      <p style="font-size:8px;">${r.text}</p>
      <p style="font-size:7px;color:#9ca3af;">${new Date(r.time).toLocaleString()}</p>
    `;
    box.appendChild(div);
  });
}

// ANALYTICS
function loadAnalytics() {
  const profile = JSON.parse(localStorage.getItem("blkArcadeProfile") || "{}");
  document.getElementById("analyticsFavs").textContent = profile.favorites?.length || 0;
  document.getElementById("analyticsRecent").textContent = profile.recent?.length || 0;
}

// INIT ADMIN APP (only after login)
async function initAdminApp() {
  document.getElementById("serverInfo").textContent = "Server running normally.";
  await loadAdminGames();
  loadRequests();
  loadAnalytics();
  setupImportExport();
  setupMaintenance();
  setupLockdown();
  setupNav();
  setupSignOut();
}

// ROOT INIT
document.addEventListener("DOMContentLoaded", () => {
  setupLogin();

  if (isLoggedIn()) {
    initAdminApp();
    showAdmin();
  } else {
    showLogin();
  }
});
