# iPhone verification checklist

Run this on a real iPhone after each deploy that touches the PWA, storage or backup. It cannot
be verified from a desktop browser. Use Safari (not Chrome) for installing.

Prerequisite: the app is deployed on HTTPS (see `docs/deploy-cloudflare.md`).

## 1. Install on the Home Screen

- [ ] Open the site in **Safari**.
- [ ] Share button → **Add to Home Screen** → Add. The icon is a white/blue barbell on dark, and
      the name under it is "Lift".
- [ ] Open it from the Home Screen icon. There is no Safari address bar or toolbar (standalone).
- [ ] The dark top bar sits under the clock/battery without overlapping them; the white status bar
      text is readable. Nothing is hidden by the notch or the home indicator at the bottom.
- [ ] Rotate to landscape and back: content stays out of the notch/rounded corners.

## 2. Storage protection

- [ ] Settings → **Storage** says "Protected". (If it says "Not guaranteed", note it: export
      backups regularly. Do not rely on the data staying on the phone.)

## 3. Works offline (airplane mode)

- [ ] With the app open and loaded once online, close it completely (swipe it away).
- [ ] Turn on **Airplane Mode** (and Wi-Fi off).
- [ ] Open the app from the Home Screen: it opens and shows the Home screen.
- [ ] Open Settings, then close and reopen the app while still on `/settings` or after pulling
      to refresh: the page still loads (no browser error page).
- [ ] Data is still there (once workouts exist: start a session, check a set).
- [ ] Turn Airplane Mode off again.

## 4. Export through the Share sheet

- [ ] Settings → **Export backup**: the iOS Share sheet opens with `lift-backup-YYYY-MM-DD.json`.
- [ ] Choose **Save to Files** (iCloud Drive or On My iPhone). Open Files and confirm the file is
      there and is not empty.
- [ ] Back in the app, Settings shows "Last backup: today".
- [ ] Cancel the Share sheet once: nothing breaks and "Last backup" does not change.

## 5. Import

- [ ] Settings → **Choose backup file…** → pick the file from Files.
- [ ] The confirmation shows the counts (exercises, workouts, sessions, sets).
- [ ] Because the phone has data, the Share sheet opens first to save a copy; after saving, the
      data is replaced and the success message appears.
- [ ] Pick a random non-backup file (e.g. a photo or text file): a clear error, nothing changed.

## 6. Close and reopen

- [ ] Close the app (swipe away from the app switcher) and open it again: data is intact.
- [ ] Wait a few minutes in the background, reopen: still intact, no login or reload loop.

## 7. Updates

After deploying a new version:

- [ ] Open the app online. After a moment an **Update available** button appears in the top bar
      (it is not shown while a workout is in progress; a note says it will install later).
- [ ] Tap it: the app reloads on the new version and the data is unchanged.
- [ ] Or, without tapping: swipe the app away and open it again; it is on the new version.
- [ ] With an active workout, the update is **not** applied while you use the app.

## Result

Date tested: __________  iOS version: __________  Device: __________

Anything that failed (copy the step number and what you saw):
