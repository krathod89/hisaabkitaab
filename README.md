# HisaabKitaab

Daily consumption & billing tracker for recurring purchases (milk, water cans, newspaper, medication…). Log what you use in one tap, watch the running total, and get an accurate, shareable bill when the cycle closes. **Phase 1 = single-user, offline, local-only.**

**Live web (PWA):** https://krathod89.github.io/hisaabkitaab/ — open in mobile Safari/Chrome and "Add to Home Screen". Served from the `gh-pages` branch of `krathod89/hisaabkitaab`. (A Vercel deploy at the domain root is the primary target — see below.)

## Stack
- Expo (React Native) SDK 57 · React 19 · TypeScript (strict) · expo-router
- Local-first **SQLite** (`expo-sqlite`) — works fully offline; no backend in Phase 1
- Sora + Work Sans + Material Symbols · warm amber accent

## Run it
```bash
cd hisaabkitaab
npm install --legacy-peer-deps   # if node_modules is missing
npx expo start                   # then press a (Android), i (iOS), or scan with Expo Go
```
Demo data seeds automatically on first launch (three items, ~2 weeks of logs this
cycle, and one locked prior-month bill). Reset it from **Settings → Reset demo data**.

## Verify
```bash
npx tsc --noEmit                          # types
npx expo export --platform android        # bundles the app
```

## Web / PWA build
The browser build swaps the data layer to **sql.js** on web only (see
`src/db/client.web.ts`) — expo-sqlite's web mode (worker + SharedArrayBuffer +
OPFS) was too fragile to host. Native builds are unaffected.

- **Vercel (primary, domain root):** `vercel.json` runs `npx expo export -p web` →
  `dist/`, installs with `--legacy-peer-deps`, and rewrites unknown routes to
  `index.html`. Auto-deploys on push to `main`. No base-URL config needed (root).
- **GitHub Pages (subpath):** serves under `/hisaabkitaab/`, so build with
  `experiments.baseUrl: "/hisaabkitaab"` set in `app.json`, then:
  ```bash
  npx expo export -p web
  cd dist && touch .nojekyll && cp index.html 404.html   # Jekyll off + SPA fallback
  # push dist/ to the gh-pages branch
  ```

Web caveats: "Share image" (view-shot) and the date picker are native-only;
PDF export falls back to the browser print dialog.

## Structure
- `app/**` — screens (expo-router): `(auth)/onboarding`, `(tabs)/{home,bill,history,settings}`, `item/edit` (modal), `bill/[cycleId]` (locked bill + PDF/image share).
- `src/theme` — design tokens (OKLCH→hex) + typography + `components/ui.tsx` primitives.
- `src/models` · `src/db` · `src/repositories` — types, SQLite schema/client, data access.
- `src/billing/engine.ts` — versioned-price computation, running total, cycle lock.
- `src/store.tsx` — reactive layer over the repositories (`useItems`, `useBill`, `useSession`).

See `CONTRACT.md` for the full screen-implementation API.

## Not yet built (Phase 2+)
Cloud sync + real OTP auth, shared lists & split billing, dose-type items & adherence,
trend analytics, home-screen widgets. See `../consumption-tracker-prd.md`.
