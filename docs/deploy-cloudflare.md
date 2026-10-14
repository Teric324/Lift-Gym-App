# Deploying to Cloudflare Pages

The app is a static site: `npm run build` produces `dist/`. Cloudflare Pages builds it from the
GitHub repo on every push to `main` and serves it over HTTPS (needed for the service worker and
for installing it on the iPhone).

- Cloudflare Pages project: **`lift-tracker-dwa`**
- Production URL: **https://lift-tracker-dwa.pages.dev**
- Repo: `Teric324/Lift-Gym-App`, production branch `main`

## Important: the data is tied to this URL

Everything the app stores (IndexedDB, the service worker, the Home Screen install) belongs to the
**origin**: scheme + host, here `https://lift-tracker-dwa.pages.dev`. A different address is a
different origin with its own, empty database.

If the address ever changes (a renamed or recreated Pages project, a custom domain, moving to
Workers), the app on the phone starts **empty**, and the old data is still on the old origin.
Before changing the address:

1. In the app on the old address: Settings → **Export backup** and save the file in Files.
2. Add the new address to the Home Screen (open it in Safari, Share → Add to Home Screen).
3. In the new app: Settings → **Choose backup file…** and import the file.

Do not rename or delete the `lift-tracker-dwa` project, and do not set up a custom domain
without doing the export/import above first. Preview deployments (`<hash>.lift-tracker-dwa.pages.dev`
and branch URLs) are also different origins: they have their own empty data, so never use them for
real workouts.

## Project settings (already configured)

- Framework preset: Vite (or None)
- Build command: `npm run build`
- Build output directory: `dist`
- Node: the repo's `.nvmrc` says 24; if a build ever uses an older Node, set the environment
  variable `NODE_VERSION` = `24` in the project settings.

To create the project from scratch (only if it is ever lost): dashboard → **Workers & Pages** →
**Create application** → **Pages** → **Connect to Git**, pick the repo, use the settings above.
Remember that a new project means a new URL and therefore an empty phone database (see above).

## Things that are already handled in the repo

- **Deep links and reload**: there is no `404.html`, so Pages treats the site as a single-page
  app and serves `index.html` for any path (e.g. `/settings`). Do not add a `404.html`.
- **Fresh versions**: `public/_headers` makes `sw.js`, `index.html` and the manifest always
  revalidate, so a new deploy is noticed. The hashed files under `/assets/` are cached forever.
- **Offline**: the service worker precaches the whole app on the first visit.

## After a deploy

- Open https://lift-tracker-dwa.pages.dev in a normal browser once; it should load without errors.
- Run `docs/iphone-checklist.md` on the phone when the PWA, storage or backup code changed.
- Pushing to `main` deploys to production. Branches and pull requests get preview URLs (see the
  warning above: do not use them for real data).

## If the build fails

- Check the build log in Cloudflare → the project → **Deployments**.
- Common causes: wrong build command or output directory, or a Node version too old. Set
  `NODE_VERSION` to `24`.
- Reproduce locally with `npm ci && npm run build`.
