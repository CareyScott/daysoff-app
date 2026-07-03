# BV Vacation

A friction-free vacation-day tracker for small teams. Book vacation and sick days in two clicks, see your remaining allowance at a glance, and keep an eye on who is out across the whole year — all on a single Personizer-style year calendar.

**Features**

- Year-at-a-glance calendar with weekday-aligned month rows; click any free weekday to book
- Allowance ring showing remaining days for the selected year
- Team overview with per-user year strips
- Admin area: manage users, yearly allowances, passwords, activation
- Forced password change on first login

This is the web frontend. It talks to a separate Rust API (`bv-vacation-api`) over plain JSON + Bearer auth, and is designed to later be wrapped in Tauri without code changes (no Tauri APIs are used — plain `fetch` only).

## Development

```sh
npm install
npm run dev        # http://localhost:1420
```

Other scripts:

```sh
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build locally
```

## Environment variables

Env files are not committed. Create them locally:

`.env.development`

```
VITE_API_URL=http://localhost:3000
```

`.env.production`

```
VITE_API_URL=https://bv-vacation-api.vercel.app
```

`VITE_API_URL` is the base URL of the BV Vacation API. All requests are sent to `${VITE_API_URL}/api/...` with an `Authorization: Bearer <token>` header once logged in.

## Tech stack

React 19, Vite 7, TypeScript, react-router-dom 7, TanStack Query 5, Tailwind CSS v4, Radix UI primitives, lucide-react, zod.

## Open source

Licensed under the [MIT License](./LICENSE). Contributions and issues welcome.
