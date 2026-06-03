const STORAGE_KEY = "workout-weights-v1";
const META_KEY = "workout-meta-v1";
const TOKEN_KEY = "github-pat";

const github = window.SYNC_CONFIG?.github ?? {
  owner: "MichaelHuu96",
  repo: "fitness-app",
  branch: "main",
  path: "data/weights.json",
};

const plan = [
  {
    id: "push",
    title: "Day 1 — Push",
    exercises: [
      { id: "incline-smith-press", name: "Incline Smith Machine Press", sets: "2-3", reps: "8-12", primary: true },
      { id: "overhead-press", name: "Overhead Press", sets: "2", reps: "6-10" },
      { id: "lateral-raises", name: "Lateral Raises", sets: "2-3", reps: "15-20" },
      { id: "dips", name: "Dips", sets: "2-3", reps: "8-12" },
      { id: "oh-dumbbell-extension", name: "Overhead Dumbbell Extension", sets: "3", reps: "10-15" },
      { id: "feet-elevated-pushups", name: "Feet-Elevated Push-Ups (Optional)", sets: "2", reps: "Until failure" },
    ],
  },
  {
    id: "pull",
    title: "Day 2 — Pull",
    exercises: [
      { id: "pull-ups", name: "Pull-Ups", sets: "2-3", reps: "5-12", primary: true },
      { id: "barbell-row", name: "Barbell/Dumbbell Row", sets: "3", reps: "8-12" },
      { id: "face-pulls", name: "Face Pulls / Reverse Flys", sets: "3", reps: "12-15" },
      { id: "dumbbell-shrugs", name: "Dumbbell Shrugs", sets: "3", reps: "10-15" },
      { id: "barbell-curl", name: "Barbell/Dumbbell Curl", sets: "2-3", reps: "8-12" },
      { id: "hammer-curl", name: "Hammer Curl", sets: "2-3", reps: "10-15" },
    ],
  },
  {
    id: "legs",
    title: "Day 3 — Legs + Shoulders",
    exercises: [
      { id: "chest-supported-lateral", name: "Chest-Supported Dumbbell Lateral Raises", sets: "2-3", reps: "15-20", primary: true },
      { id: "squats", name: "Squats", sets: "2-3", reps: "6-10" },
      { id: "rdl", name: "Romanian Deadlifts", sets: "3", reps: "8-12" },
      { id: "walking-lunges", name: "Walking Lunges", sets: "3", reps: "10-12 each leg" },
      { id: "calf-raises", name: "Calf Raises", sets: "2-3", reps: "12-20" },
      { id: "arnold-press", name: "Arnold Press", sets: "3", reps: "8-12" },
    ],
  },
];

let activeDay = 0;
let weights = loadWeights();
let meta = loadMeta();
let pushTimer = null;
let fileSha = null;

function loadWeights() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : { updatedAt: null };
  } catch {
    return { updatedAt: null };
  }
}

function saveWeightsLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
  meta.updatedAt = new Date().toISOString();
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(value) {
  const trimmed = value.trim();
  if (trimmed) localStorage.setItem(TOKEN_KEY, trimmed);
  else localStorage.removeItem(TOKEN_KEY);
}

function rawUrl() {
  return `https://raw.githubusercontent.com/${github.owner}/${github.repo}/${github.branch}/${github.path}`;
}

function apiUrl() {
  return `https://api.github.com/repos/${github.owner}/${github.repo}/contents/${github.path}`;
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${getToken()}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function applyRemote(data) {
  const remote = data?.weights;
  const remoteAt = data?.updatedAt;
  if (!remote || typeof remote !== "object") return false;

  const localAt = meta.updatedAt ? Date.parse(meta.updatedAt) : 0;
  const remoteTime = remoteAt ? Date.parse(remoteAt) : 0;

  if (remoteTime >= localAt) {
    weights = { ...remote };
    meta.updatedAt = remoteAt;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    return true;
  }
  return false;
}

async function pullFromGithub() {
  setSyncMessage("Loading…");
  try {
    const res = await fetch(`${rawUrl()}?t=${Date.now()}`);
    if (res.status === 404) {
      updateSyncStatus();
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const changed = applyRemote(data);
    if (changed) renderDay(activeDay);
    updateSyncStatus();
  } catch (err) {
    setSyncMessage("Could not load — check connection");
    console.error(err);
    updateSyncStatus();
  }
}

async function pushToGithub() {
  const token = getToken();
  if (!token) {
    updateSyncStatus();
    return;
  }

  setSyncMessage("Saving…");
  try {
    const getRes = await fetch(apiUrl(), { headers: githubHeaders() });
    if (getRes.ok) {
      const file = await getRes.json();
      fileSha = file.sha;
    } else if (getRes.status !== 404) {
      throw new Error(`GET ${getRes.status}`);
    }

    const payload = {
      weights,
      updatedAt: meta.updatedAt || new Date().toISOString(),
    };
    const body = {
      message: "Update workout weights",
      content: btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2)))),
      branch: github.branch,
    };
    if (fileSha) body.sha = fileSha;

    const putRes = await fetch(apiUrl(), {
      method: "PUT",
      headers: { ...githubHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!putRes.ok) throw new Error(`PUT ${putRes.status}`);
    const result = await putRes.json();
    fileSha = result.content?.sha ?? fileSha;
    setSyncMessage("");
    updateSyncStatus();
  } catch (err) {
    setSyncMessage("Save failed — check token has write access");
    console.error(err);
    updateSyncStatus();
  }
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToGithub, 1200);
}

function saveWeights() {
  saveWeightsLocal();
  schedulePush();
}

function weightKey(dayId, exerciseId) {
  return `${dayId}:${exerciseId}`;
}

function renderDay(dayIndex) {
  const day = plan[dayIndex];
  const main = document.getElementById("workout-main");

  const cards = day.exercises
    .map((ex) => {
      const key = weightKey(day.id, ex.id);
      const value = weights[key] ?? "";
      const primaryClass = ex.primary ? " primary" : "";

      return `
        <li class="exercise-card${primaryClass}">
          <h2 class="exercise-name">${escapeHtml(ex.name)}</h2>
          <div class="exercise-meta">
            <span>Sets: <strong>${escapeHtml(ex.sets)}</strong></span>
            <span>Reps: <strong>${escapeHtml(ex.reps)}</strong></span>
          </div>
          <div class="weight-row">
            <label for="weight-${ex.id}">Weight</label>
            <input
              type="text"
              inputmode="decimal"
              id="weight-${ex.id}"
              class="weight-input"
              placeholder="e.g. 135"
              autocomplete="off"
              data-key="${key}"
              value="${escapeHtml(value)}"
            />
          </div>
        </li>
      `;
    })
    .join("");

  main.innerHTML = `
    <h2 class="day-heading">${escapeHtml(day.title)}</h2>
    <ul class="exercise-list">${cards}</ul>
  `;

  main.querySelectorAll(".weight-input").forEach((input) => {
    input.addEventListener("input", onWeightInput);
    input.addEventListener("change", onWeightInput);
  });
}

function onWeightInput(e) {
  const key = e.target.dataset.key;
  weights[key] = e.target.value.trim();
  saveWeights();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function setActiveTab(dayIndex) {
  activeDay = dayIndex;
  document.querySelectorAll(".day-tab").forEach((tab, i) => {
    const isActive = i === dayIndex;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive);
  });
  renderDay(dayIndex);
}

function setSyncMessage(msg) {
  const el = document.getElementById("sync-message");
  if (el) el.textContent = msg;
}

function updateSyncStatus() {
  const el = document.getElementById("sync-status");
  if (!el) return;
  if (getToken()) {
    el.textContent = "Auto-sync on · same weights on all devices";
  } else {
    el.textContent = "Read-only sync · add token to save edits";
  }
}

function initSyncUI() {
  const toggle = document.getElementById("sync-toggle");
  const body = document.getElementById("sync-body");
  const tokenInput = document.getElementById("github-token");

  if (getToken()) tokenInput.placeholder = "Token saved (enter new to replace)";

  toggle.addEventListener("click", () => {
    const open = body.hidden;
    body.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  });

  document.getElementById("save-token").addEventListener("click", () => {
    setToken(tokenInput.value);
    tokenInput.value = "";
    tokenInput.placeholder = "Token saved (enter new to replace)";
    setSyncMessage("Token saved — edits will sync automatically");
    updateSyncStatus();
    pushToGithub();
  });

  document.getElementById("pull-now").addEventListener("click", pullFromGithub);
}

document.querySelectorAll(".day-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveTab(Number(tab.dataset.day));
  });
});

document.getElementById("clear-weights").addEventListener("click", () => {
  if (!confirm("Clear all weights everywhere? This syncs to GitHub.")) return;
  weights = {};
  saveWeights();
  renderDay(activeDay);
});

initSyncUI();
setActiveTab(0);

pullFromGithub().then(() => {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pullFromGithub();
  });
});
