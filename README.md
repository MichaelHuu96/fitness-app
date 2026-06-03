# Workout Tracker

A mobile-friendly 3-day workout app with weight tracking per exercise.

## Saving weights across devices

| Method | Setup | How it works |
|--------|--------|----------------|
| **Cloud sync** | One-time Firebase (free, ~5 min) | Same **sync code** on phone + tablet auto-syncs |
| **Export / Import** | None | **Export** on one device, **Import** on the other |
| **This device only** | None | Weights stay in the browser (localStorage) |

### Quick: move weights without Firebase

1. Open **Sync across devices** on your first phone.
2. Tap **Export** (copies data or opens Share).
3. On your other device, open the app → **Import** → paste.

### Automatic cloud sync (recommended)

1. Create a free project at [Firebase Console](https://console.firebase.google.com).
2. Add a **Web app**, copy the config values.
3. Enable **Firestore Database** (start in test mode, then deploy rules below).
4. Copy `sync-config.example.js` → `sync-config.js` and paste your Firebase config. Set `enabled: true`.
5. Deploy `firestore.rules` in Firebase → Firestore → Rules (paste file contents, publish).
6. Push to GitHub Pages again.

On each device:

1. Open **Sync across devices**.
2. Enter the **same sync code** (8+ characters, or tap 🎲 to generate and copy it to your other device).
3. Weights sync automatically when you change them. Tap **Pull from cloud** if you need to refresh.

**Tip:** Open `https://yoursite.github.io/fitness-app/?sync=YOUR_CODE` on a new device to pre-fill the sync code.

## Workout plan

- **Day 1 — Push** — Incline Smith press, overhead press, lateral raises, dips, extensions, optional push-ups
- **Day 2 — Pull** — Pull-ups, rows, face pulls, shrugs, curls
- **Day 3 — Legs + Shoulders** — Lateral raises, squats, RDLs, lunges, calves, Arnold press

Starred exercises are the main lift for each day.

## Host on GitHub Pages

1. Create a new repository on GitHub (e.g. `fitness-app`).
2. Push this folder to the repo:

   ```bash
   git init
   git add .
   git commit -m "Add workout tracker app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/fitness-app.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Build and deployment → Source**: deploy from branch **main**, folder **/ (root)**.
4. Open the Pages URL on your phone (e.g. `https://YOUR_USERNAME.github.io/fitness-app/`).
5. Optional: **Share → Add to Home Screen** (iOS/Android) for an app-like shortcut.

## Local preview

Open `index.html` in a browser, or run a simple server:

```bash
npx serve .
```

Then visit `http://localhost:3000` on your phone (same Wi‑Fi) to test.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell and day tabs |
| `styles.css` | Mobile-first layout |
| `app.js` | Workout data, rendering, weight storage |
| `manifest.json` | Add-to-home-screen metadata |
