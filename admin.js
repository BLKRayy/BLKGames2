// SIMPLE HASH (not cryptographic, just hides raw password)
function simpleHash(str) {
  let h = 0;
  for (const ch of str) h += ch.charCodeAt(0);
  return h;
}

const ADMIN_USER = "admin";
const ADMIN_PASS_HASH = simpleHash("loyal");
const SESSION_KEY = "blkAdminSession";

/* AUTH */
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

/* SIGN OUT */
function setupSignOut() {
  const btn = document.getElementById("signOutBtn");
  btn.onclick = () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  };
}

/* NAV */
function setupNav() {
  const buttons = document.querySelectorAll(".nav-link");
  const sections = {
    dashboard: "admin-dashboard",
    games: "admin-games",
    importexport: "admin-importexport",
    lockdown: "admin-lockdown",
    requests: "admin-requests"
  };

  buttons.forEach(btn => {
    btn.onclick = () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      Object.values(sections).forEach(id => {
        document.getElementById(id).classList.add("hidden");
      });
      document.getElementById(sections[btn.dataset.section]).classList.remove("hidden");
    };
  });
}

/* GAME EDITOR */
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
    row.className = "panel glass";
    row.style.padding = "10px 12px";
    row.style.marginTop = "6px";

    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:13px;font-weight:500;">${g.name}</div>
          <div style="font-size:10px;color:#9ca3af;">${g.category} • ${g.tag || ""}</div>
        </div>
        <button class="btn btn-ghost small" data-url="${g.url}">EDIT</button>
      </div>
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

/* IMPORT / EXPORT */
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
    const status = document.getElementById("importStatus");
    if (!file) {
      status.textContent = "No file selected.";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        adminGames = JSON.parse(reader.result);
        saveAdminGames();
        renderGameEditor();
        status.textContent = "Import complete.";
      } catch {
        status.textContent = "Invalid JSON.";
      }
    };
    reader.readAsText(file);
  };
}

/* GLOBAL LOCKDOWN */
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

/* REQUESTS */
function loadRequests() {
  const list = JSON.parse(localStorage.getItem("blkRequests") || "[]");
  const box = document.getElementById("requestList");
  box.innerHTML = "";
  list.forEach(r => {
    const div = document.createElement("div");
    div.className = "panel glass";
    div.style.padding = "10px 12px";
    div.style.marginTop = "6px";
    div.innerHTML = `
      <div style="font-size:12px;">${r.text}</div>
      <div style="font-size:10px;color:#9ca3af;margin-top:4px;">${new Date(r.time).toLocaleString()}</div>
    `;
    box.appendChild(div);
  });
}

/* ANALYTICS */
function loadAnalytics() {
  const profile = JSON.parse(localStorage.getItem("blkArcadeProfile") || "{}");
  document.getElementById("analyticsFavs").textContent = profile.favorites?.length || 0;
  document.getElementById("analyticsRecent").textContent = profile.recent?.length || 0;
}

/* INIT ADMIN APP */
async function initAdminApp() {
  await loadAdminGames();
  loadRequests();
  loadAnalytics();
  setupImportExport();
  setupLockdown();
  setupNav();
  setupSignOut();
}

/* ROOT INIT */
document.addEventListener("DOMContentLoaded", () => {
  setupLogin();
  if (isLoggedIn()) {
    initAdminApp();
    showAdmin();
  } else {
    showLogin();
  }
});
