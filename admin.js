let adminGames = [];

/* LOAD GAMES */
async function loadAdminGames() {
  const res = await fetch("games.json");
  adminGames = await res.json();
  renderGameEditor();
}

/* NAVIGATION */
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.section;
    document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));
    document.getElementById("admin-" + target).classList.remove("hidden");
  };
});

/* GAME EDITOR */
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

  const updated = adminGames.map(x =>
    x.url === url ? { ...x, name, category: cat, tag, logo, url: newUrl } : x
  );

  adminGames = updated;
  saveAdminGames();
  renderGameEditor();
}

function saveAdminGames() {
  localStorage.setItem("customGames", JSON.stringify(adminGames));
}

/* IMPORT / EXPORT */
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

/* MAINTENANCE */
document.getElementById("maintToggle").onchange = e => {
  localStorage.setItem("maintenance", e.target.checked ? "true" : "false");
};

/* LOCKDOWN */
document.getElementById("lockBtn").onclick = () => {
  const msg = document.getElementById("lockMsg").value.trim();
  const minutes = parseInt(document.getElementById("lockMinutes").value);

  if (!msg || !minutes) {
    document.getElementById("lockStatus").textContent = "Missing fields.";
    return;
  }

  const end = Date.now() + minutes * 60000;

  localStorage.setItem(
    "blkGlobalLockdown",
    JSON.stringify({ msg, end })
  );

  document.getElementById("lockStatus").textContent = "Lockdown activated.";
};

document.getElementById("unlockBtn").onclick = () => {
  localStorage.removeItem("blkGlobalLockdown");
  document.getElementById("lockStatus").textContent = "Lockdown removed.";
};

/* REQUESTS */
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

/* ANALYTICS */
function loadAnalytics() {
  const profile = JSON.parse(localStorage.getItem("blkArcadeProfile") || "{}");
  document.getElementById("analyticsFavs").textContent = profile.favorites?.length || 0;
  document.getElementById("analyticsRecent").textContent = profile.recent?.length || 0;
}

/* INIT */
document.addEventListener("DOMContentLoaded", async () => {
  await loadAdminGames();
  loadRequests();
  loadAnalytics();
  document.getElementById("serverInfo").textContent = "Server running normally.";
});
