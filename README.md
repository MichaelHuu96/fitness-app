# Workout Tracker

A mobile-friendly 3-day workout app with weight tracking. Weights auto-sync via your GitHub repo — no export/import.

## Use on your phone

1. Make the repo **public** (free GitHub Pages).
2. **Settings → Pages** → deploy from **main** / **root**.
3. Open `https://michaelhuu96.github.io/fitness-app/` on your phone.
4. Optional: **Add to Home Screen**.

## Sync across devices (one-time per device)

1. Open **Sync setup** in the app.
2. Create a [fine-grained GitHub token](https://github.com/settings/tokens?type=beta):
   - Repository access: **Only** `fitness-app`
   - Permissions: **Contents → Read and write**
3. Paste the token → **Save token**.

After that, when you change a weight it saves to `data/weights.json` in your repo. Any other device loads the latest automatically when you open the app (and when you switch back to the tab).

**Without a token:** you can still *read* weights from the repo on any device. You need the token on a device to *save* edits from that device.

Keep your token private (like a password). It stays only in that browser’s storage.

## Workout plan

- **Day 1 — Push**
- **Day 2 — Pull**
- **Day 3 — Legs + Shoulders**

Starred exercises are the main lift for each day.

## Local preview

```bash
npx serve .
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell |
| `app.js` | Workout UI + GitHub sync |
| `data/weights.json` | Synced weight data |
| `sync-config.js` | GitHub repo settings |
