const STORAGE_KEY = "workout-weights-v1";
const SYNC_CODE_KEY = "workout-sync-code";

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
let syncCode = getSyncCode();
let cloudSaveTimer = null;
let firestore = null;

const cloudEnabled = isCloudEnabled();

function isCloudEnabled() {
  const cfg = window.SYNC_CONFIG;
  return Boolean(
    cfg?.enabled &&
      cfg.apiKey &&
      cfg.projectId &&
      cfg.apiKey !== "YOUR_API_KEY" &&
      typeof firebase !== "undefined"
  );
}

function initFirebase() {
  if (!cloudEnabled || firestore) return;
  const cfg = window.SYNC_CONFIG;
  if (!firebase.apps.length) {
    firebase.initializeApp({
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
    });
  }
  firestore = firebase.firestore();
}

function loadWeights() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveWeightsLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
}

function getSyncCode() {
  const params = new URLSearchParams(location.search);
  const fromUrl = params.get("sync")?.trim();
  if (fromUrl) {
    localStorage.setItem(SYNC_CODE_KEY, fromUrl);
    return fromUrl;
  }
  return localStorage.getItem(SYNC_CODE_KEY) || "";
}

function setSyncCode(code) {
  syncCode = code.trim();
  if (syncCode) {
    localStorage.setItem(SYNC_CODE_KEY, syncCode);
  } else {
    localStorage.removeItem(SYNC_CODE_KEY);
  }
  updateSyncStatus();
}

function isValidSyncCode(code) {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(code);
}

function scheduleCloudSave() {
  if (!cloudEnabled || !syncCode || !isValidSyncCode(syncCode)) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(pushToCloud, 800);
}

async function pushToCloud() {
  if (!cloudEnabled || !syncCode || !isValidSyncCode(syncCode)) return;
  initFirebase();
  setSyncMessage("Saving to cloud…");
  try {
    await firestore.collection("weights").doc(syncCode).set({
      data: weights,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    setSyncMessage("Saved to cloud");
  } catch (err) {
    setSyncMessage("Cloud save failed — check Firebase setup");
    console.error(err);
  }
}

async function pullFromCloud() {
  if (!cloudEnabled) {
    setSyncMessage("Cloud not set up — use Export/Import or see README");
    return;
  }
  if (!syncCode || !isValidSyncCode(syncCode)) {
    setSyncMessage("Enter a sync code (8+ characters)");
    return;
  }
  initFirebase();
  setSyncMessage("Loading from cloud…");
  try {
    const snap = await firestore.collection("weights").doc(syncCode).get();
    if (!snap.exists) {
      setSyncMessage("No cloud data yet for this code");
      return;
    }
    const remote = snap.data()?.data;
    if (remote && typeof remote === "object") {
      weights = { ...weights, ...remote };
      saveWeightsLocal();
      renderDay(activeDay);
      setSyncMessage("Loaded from cloud");
    }
  } catch (err) {
    setSyncMessage("Cloud load failed — check Firebase setup");
    console.error(err);
  }
}

function saveWeights() {
  saveWeightsLocal();
  scheduleCloudSave();
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
  if (cloudEnabled && syncCode && isValidSyncCode(syncCode)) {
    el.textContent = "Cloud sync on · same code on all devices";
  } else if (syncCode) {
    el.textContent = "Sync code set · enable cloud or use Export/Import";
  } else {
    el.textContent = "3-day split · saved on this device";
  }
}

function generateSyncCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  for (const b of bytes) code += chars[b % chars.length];
  return code;
}

async function exportWeights() {
  const payload = JSON.stringify({ version: 1, weights, syncCode }, null, 2);
  const filename = "workout-weights.json";

  if (navigator.share) {
    try {
      const file = new File([payload], filename, { type: "application/json" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Workout weights" });
        setSyncMessage("Shared — open Import on your other device");
        return;
      }
    } catch (err) {
      if (err.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(payload);
    setSyncMessage("Copied! Paste via Import on your other device");
  } catch {
    prompt("Copy this data and paste on your other device:", payload);
  }
}

function importWeights() {
  const raw = prompt("Paste exported workout data:");
  if (!raw?.trim()) return;
  try {
    const parsed = JSON.parse(raw);
    const imported = parsed.weights ?? parsed;
    if (typeof imported !== "object") throw new Error("Invalid format");
    weights = { ...weights, ...imported };
    if (parsed.syncCode) {
      setSyncCode(parsed.syncCode);
      document.getElementById("sync-code").value = parsed.syncCode;
    }
    saveWeights();
    renderDay(activeDay);
    setSyncMessage("Imported successfully");
    if (cloudEnabled) scheduleCloudSave();
  } catch {
    setSyncMessage("Import failed — invalid data");
  }
}

function initSyncUI() {
  const toggle = document.getElementById("sync-toggle");
  const body = document.getElementById("sync-body");
  const codeInput = document.getElementById("sync-code");

  codeInput.value = syncCode;

  toggle.addEventListener("click", () => {
    const open = body.hidden;
    body.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  });

  codeInput.addEventListener("change", () => {
    setSyncCode(codeInput.value);
    if (cloudEnabled && isValidSyncCode(syncCode)) pullFromCloud();
  });

  codeInput.addEventListener("blur", () => {
    setSyncCode(codeInput.value);
  });

  document.getElementById("generate-sync-code").addEventListener("click", () => {
    const code = generateSyncCode();
    codeInput.value = code;
    setSyncCode(code);
    setSyncMessage("New code — use this on every device");
  });

  document.getElementById("pull-cloud").addEventListener("click", pullFromCloud);
  document.getElementById("export-weights").addEventListener("click", exportWeights);
  document.getElementById("import-weights").addEventListener("click", importWeights);
}

document.querySelectorAll(".day-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveTab(Number(tab.dataset.day));
  });
});

document.getElementById("clear-weights").addEventListener("click", async () => {
  if (!confirm("Clear all weights on this device? (Cloud copy stays unless you clear there too)")) return;
  weights = {};
  saveWeights();
  renderDay(activeDay);
});

initSyncUI();
updateSyncStatus();
setActiveTab(0);

if (cloudEnabled && syncCode && isValidSyncCode(syncCode)) {
  initFirebase();
  pullFromCloud();
}
