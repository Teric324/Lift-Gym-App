# Deploying to Cloudflare Pages

The app is a static site: `npm run build` produces `dist/`. Cloudflare Pages builds it from the
GitHub repo on every push to `main` and serves it over HTTPS (needed for the service worker and
for installing it on the iPhone).

## One-time setup (done by the owner, in the browser)

1. Create a free account at <https://dash.cloudflare.com/sign-up> and verify the email.
2. In the dashboard open **Workers & Pages** → **Create application** → **Pages** →
   **Connect to Git**. (Cloudflare now also promotes Workers for new projects; Pages is still
   available under the "Looking to deploy Pages?" link.)
3. Sign in with GitHub, choose **Only select repositories**, pick `Teric324/Lift-Gym-App`, then
   **Install & Authorize** → **Begin setup**.
4. Project name: `lift` (this becomes `https://lift.pages.dev`; if the name is taken Cloudflare
   suggests another one). Production branch: `main`.
5. Build settings:
   - Framework preset: **Vite** (or None)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable (optional, the repo's `.nvmrc` already says 24): `NODE_VERSION` = `24`
6. **Save and Deploy**. The first build takes a minute or two. The site is then live at the
   `*.pages.dev` address.

## Things that are already handled in the repo

- **Deep links and reload**: there is no `404.html`, so Pages treats the site as a single-page
  app and serves `index.html` for any path (e.g. `/settings`). Do not add a `404.html`.
- **Fresh versions**: `public/_headers` makes `sw.js`, `index.html` and the manifest always
  revalidate, so a new deploy is noticed. The hashed files under `/assets/` are cached forever.
- **Offline**: the service worker precaches the whole app on the first visit.

## After a deploy

- Open the site in a normal browser once; it should load without errors.
- Run `docs/iphone-checklist.md` on the phone.
- Pushing to `main` deploys to production. Branches and pull requests get preview URLs.

## If the build fails

- Check the build log in Cloudflare → the project → **Deployments**.
- Common causes: wrong build command or output directory, or a Node version too old. Set
  `NODE_VERSION` to `24`.
- Reproduce locally with `npm ci && npm run build`.
