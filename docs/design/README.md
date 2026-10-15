# Lift design (approved)

The look the app is being moved to: dark, yellow and black. These files are the reference; the
app's CSS tokens are in `src/app/theme.css`.

## Decisions

- **Palette:** background `#0A0A0B`, surfaces `#141416` / `#1C1C1F` / `#26262A`, lines `#2E2E33`,
  text `#F5F5F6`, secondary text `#A4A4AC`, brand yellow `#FFD60A` (black text on it),
  danger `#FF5A52`, warning `#FF9F0A`. Dark only (no light mode).
- **Fonts:** Inter (variable, latin and latin-ext, for all text, one weight step bolder than the
  default) and **Black Ops One** for page titles (capitals). Both ship inside the app and are
  precached; nothing comes from Google Fonts.
- **Wordmark:** `L⚡FT`: the lit yellow bolt stands where the I of LIFT is, letters heavy and
  white (`wordmark.svg`). Flat black-on-yellow and all-yellow variants exist.
- **App icon:** flat black bolt on a yellow tile, no gradient, light or shadow (`icon.svg`).
- **Navigation:** bar at the bottom with four items; Workouts uses the bolt.
- **Weights picker:** bottom sheet that follows the visual viewport (same logic as today).
- **Motion:** none beyond a short press state. Inputs stay at 16 px or more.

## Files

- `shots/`: PNG captures at 375 px of the approved mockups (workouts, workout, picker,
  picker-landscape, history, exercises) plus the palette and brand boards.
- `mockups/`: the static HTML mockups and the small scripts that built them
  (`build.mjs` writes the pages, `shoot.mjs` renders PNGs with headless Edge,
  `build-prototype.mjs` builds the clickable prototype). They expect the font files next to them
  (`fonts/` and `fonts-display/`, from the `@fontsource-variable/inter` and
  `@fontsource/black-ops-one` packages); without them the pages fall back to a system font.
- `reference-mina.jpg`: the lettering reference for the page titles.

## Order of application

1. Tokens and fonts (`theme.css`, `fonts.css`, precache). No markup changes.
2. Wordmark, bottom navigation, top bar, PWA icons, `theme-color`.
3. The workout screen and the weight picker sheet.
4. Workouts, History, Exercises, Settings, editors, dialogs, empty states.
5. Polish: 320 px, landscape with the keyboard, this folder's notes.

Each stage ends with a test on the iPhone (see `docs/iphone-checklist.md`).
