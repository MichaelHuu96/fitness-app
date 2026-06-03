const STORAGE_KEY = "workout-weights-v1";

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

function loadWeights() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveWeights() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
}

function weightKey(dayId, exerciseId) {
  return `${dayId}:${exerciseId}`;
}

function googleSearchUrl(exerciseName) {
  const query = encodeURIComponent(`${exerciseName} exercise form`);
  return `https://www.google.com/search?q=${query}`;
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
          <h2 class="exercise-name">
            <a
              class="exercise-link"
              href="${googleSearchUrl(ex.name)}"
              target="_blank"
              rel="noopener noreferrer"
            >${escapeHtml(ex.name)}</a>
          </h2>
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

document.querySelectorAll(".day-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveTab(Number(tab.dataset.day));
  });
});

document.getElementById("clear-weights").addEventListener("click", () => {
  if (!confirm("Clear all weights on this device?")) return;
  weights = {};
  saveWeights();
  renderDay(activeDay);
});

setActiveTab(0);
