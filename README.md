# daysoff-app

Frontend for **Daysoff**, an open-source, self-hosted vacation day tracker for small teams: a React web app plus a thin Tauri v2 desktop shell for macOS and Windows. The backend lives at [daysoff-api](https://github.com/CareyScott/daysoff-api).

## White-label branding

Admins customize the workspace in-app (Settings → Workspace), stored in your own database:

- Company name (sidebar, login screen, browser tab title)
- Team color or a two-color gradient
- Company logo (shown in the app and used as the favicon)

The desktop app icon is baked in at build time by Tauri. To ship desktop builds with your own icon, replace the source image and regenerate before tagging a release:

```sh
npx tauri icon path/to/your-icon.png
```

## Stack

React 19, Vite 7, TypeScript, Tailwind v4, Radix primitives, TanStack Query, React Router 7. The app talks to the API with plain `fetch` + JSON + Bearer auth; no Tauri APIs are used, so web and desktop run the identical code.

## Development

```sh
npm install
npm run dev          # http://localhost:1420 (expects the API on localhost:3000)
npm run typecheck
npm run build
npm run tauri dev    # desktop shell around the dev server
```

`VITE_API_URL` sets the API base URL (see `.env.example`). Production builds fall back to the hosted API URL in `src/lib/api.ts` — change that constant when self-hosting.

## Deploy your own

1. Deploy the [API + database](https://github.com/CareyScott/daysoff-api) first.
2. Create a Vercel project from this repo (framework: Vite). Set `VITE_API_URL` to your API URL.
3. `vercel deploy --prod` (or use the GitHub integration). `vercel.json` includes the SPA fallback rewrite.
4. Add your web app URL to the API's `ALLOWED_ORIGINS` env var.

## Desktop releases

Pushing a tag `v*` runs the GitHub Actions workflow: macOS (Apple Silicon + Intel) and Windows installers are built and attached to a GitHub Release. Builds are unsigned; first launch requires right-click → Open on macOS or SmartScreen → "Run anyway" on Windows.

## License

MIT
