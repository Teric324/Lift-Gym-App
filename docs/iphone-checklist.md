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

## 8. Exercises and workouts (step 7)

Do this on the **updated** installed app (see "How to update the installed app" below). Settings
shows `Version <hash> · <time>` at the bottom; it must match the latest deploy.

Exercises (the **Exercises** tab):
- [ ] The starter list (about 20 exercises) is there, each with "Step 2.5 kg".
- [ ] **Add exercise** → type a name → Add: it appears in the list. Typing in the field does not
      zoom the page.
- [ ] Add the same name again, in other capitals: an error, nothing added.
- [ ] Tap an exercise → **Rename** → Save: the new name shows everywhere.
- [ ] Weight step: tap `1 kg`, then type `1,25` in "Custom step" → Set step: the line "Picker:"
      reads `1.25, 2.5, 3.75, 5 …`. Type `abc`, `0`, `-1`: a clear error each time.
- [ ] **Archive** an exercise: a confirmation, then it moves to "Archived (1)" at the bottom of
      the list. **Restore** brings it back. Adding its name again offers "Restore this exercise?".

Workouts (the **Workouts** tab, the home screen):
- [ ] **New workout** → name it "Push" → the editor opens.
- [ ] **Add exercises**: tick two exercises, then type a new name and tap `Create "..."`: the
      button says "Add 3" and all three are added in the order of the list.
- [ ] Use ↑ and ↓ to reorder; the first row's ↑ and the last row's ↓ are disabled. ✕ removes.
- [ ] Close the app completely and reopen it: the workout and its order are unchanged.
- [ ] Archive an exercise that is inside the workout: in the workout it shows as "Archived", greyed.
- [ ] **Archive** the workout: it leaves the list, appears under "Archived (1)", and **Restore**
      brings it back.
- [ ] Settings → Export backup, then Import that same file: confirmation shows the counts and the
      workout names and archived state are the same afterwards.

Old backup compatibility (only if you still have a backup made before this version):
- [ ] Import it: it is accepted (format 1), and all workouts come back as active.

## How to update the installed app

An installed Home Screen app is a separate copy of the site that updates itself in the background.
It never replaces itself during a workout.

1. Push to `main`, then wait until the Cloudflare deployment is green (Workers & Pages →
   `lift-tracker-dwa` → Deployments, about 1 to 2 minutes).
2. On the phone, with internet on, open the installed app. Wait 10 to 30 seconds. An **Update
   available** button appears in the top bar.
3. Tap it. The app reloads on the new version. Check Settings → bottom line (`Version ...`).

If the button does not appear:

- Close the app completely (app switcher, swipe it away), wait a few seconds, open it again; wait
  another 30 seconds and check the top bar. Sometimes it takes two cold starts: the first one
  downloads the new version, the second one runs it.
- During a workout in progress the button is hidden on purpose and a note says the update will
  install later. Finish the workout, or close and reopen the app.
- The first time after installing the new version on the phone there is a one-off schema upgrade
  of the database (version 2). It takes a moment and keeps all data. Export a backup **before**
  updating anyway.
- Last resort: delete the app from the Home Screen, open the site in Safari, add it again, and
  import your latest backup (Settings → Choose backup file…).

## Result

Date tested: __________  iOS version: __________  Device: __________

Anything that failed (copy the step number and what you saw):
