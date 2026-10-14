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

## 9. Workout session (step 8)

Do this on the updated app (Settings → bottom line shows the new `Version ...`). Export a backup
first (Settings → Export backup).

Start and fill in:
- [ ] Workouts → a workout with at least one exercise → **Start**. The session opens at once.
- [ ] Exercises you have trained before show the last sets already filled in (weight and reps),
      unchecked. An exercise with no history starts with no rows; **Add set** adds one.
- [ ] Tap the big square on the right of a row: it fills in (✓) in one tap. Tap again: it empties.
- [ ] A row with a blank weight or reps cannot be checked (the square is dimmed).
- [ ] Change a weight before checking, then check. Change a weight of a checked row: it stays
      checked with the new weight.
- [ ] Type `27,5` in a weight field (comma) and `27.5` (dot): both work. Type `abc`: the field is
      marked red with "Not saved. Keeping ... kg." and the old value stays.
- [ ] Type `600` in a weight: a yellow "Over 500 kg" note appears; the value is still kept.
- [ ] Reps: `+` and `−` change by one; typing `0` or `101` is marked and not saved.
- [ ] **Add set** copies the last row's values. **✕** removes a row; on a checked row it asks first.

Closing the app in the middle of a workout (the important one):
- [ ] Start a workout with two or more exercises. Check two sets. Change the weight of a third,
      unchecked set (for example from 80 to 82,5) **without checking it**. Do not tap anywhere else.
- [ ] Better still: tap into a weight field and type a new value, leave the keyboard open.
- [ ] Open the app switcher and **swipe the app away**. Wait about 10 seconds.
- [ ] Open the app again from the Home Screen. Go to Workouts: the banner "Workout in progress"
      is there; tap **Resume**.
- [ ] The two checked sets are still checked, the third still shows the edited value and is still
      unchecked, and the value typed with the keyboard open is there too.
- [ ] Do the same once with the app sent to the background (home gesture, then another app for
      a minute) instead of swiped away.

Several sessions and the forgotten one:
- [ ] With a workout in progress, go to Workouts and tap **Start** on another one (or the same):
      a dialog says a workout is already in progress and offers **Resume it** (no way to start a
      second one).
- [ ] Leave a workout in progress overnight (or change the phone date forward by a day for a
      moment). Next day, tap **Start**: the dialog says "You have an unfinished workout" with the
      date, and offers **Open it**, **Finish it and start the new one** and **Cancel**. **Discard
      it** appears only if that session has no checked sets. Nothing is finished by itself.
- [ ] After "Finish it and start the new one", the next workout's pre-fill comes from the
      finished session.

Finish:
- [ ] **Finish workout** with unchecked sets left: asks "1 set is not checked and will not be
      saved". Cancel keeps you in the workout. **Finish anyway** returns to the list and the
      banner is gone.
- [ ] Start the same workout again: the pre-fill is the sets you checked last time (not the
      unchecked ones).
- [ ] With nothing checked the button says **Discard workout**; it asks, then removes the
      session.
- [ ] Settings → Export, then Import that file: the finished session's sets are intact.

## 10. Weight picker (step 9)

Do this on the updated app (Settings → bottom line shows the new `Version ...`).

The weight in the row:
- [ ] In a workout, the weight is a bordered button (for example `82.5 kg`), as tall as the check
      square next to it. It is easy to hit with a thumb. The row still fits the width of the
      phone, with no sideways scrolling.
- [ ] Tap it: a window opens with the weight list. It does **not** open the keyboard by itself.

The list and the jumps:
- [ ] The list is centred on the current weight (or the nearest step), which is marked "now".
      Nothing is selected until you tap.
- [ ] The values follow the exercise's step: with step 2.5 you see 77.5, 80, 82.5, 85 ... With step
      1.25 (set it on the exercise's screen) you see 3.75, 5, 6.25 ...
- [ ] Tap a value: it is applied at once and the window closes. The row shows the new weight.
- [ ] Reach 100 kg: start from a lighter weight, open the picker and tap **+25 kg** a couple of
      times (and **+10 kg**) until `100 kg` is on screen; tap it. The jumps only move the list.
      They never change the weight by themselves. **−25 kg** and **−10 kg** go back.
- [ ] **0 kg · bodyweight** sets 0 in one tap (for pull-ups and similar).
- [ ] Tap **Done**, or tap outside the window: it closes and nothing changes.

The keyboard (important on iPhone):
- [ ] In the picker tap **Type a weight (kg)**. The keyboard opens. The typing field, the title and
      the **Done** button all stay visible above the keyboard, and the list is still scrollable in
      the remaining space. Nothing is hidden behind the keyboard.
- [ ] Type `27,5`: the row behind shows `27.5 kg` right away (every valid value is saved as you
      type). Then type `27,5x`: the field turns red with "Not saved. Keeping 27.5 kg." and the
      row still shows 27.5.
- [ ] Type `600`: a yellow note says "Over 500 kg", the value is still kept.
- [ ] Press **Done** on the keyboard (or the Done button): the window closes.
- [ ] With the keyboard open, rotate the phone to landscape and back: the window still fits.
- [ ] Open the picker, type a new weight, leave the keyboard open, swipe the app away from the app
      switcher, and open it again: the typed weight is saved in the row.

Checked sets:
- [ ] Change the weight of a checked set from the picker: it stays checked with the new weight.
- [ ] After Finish, export a backup and import it back: the weights are the same.

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
