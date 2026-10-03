# island-venues-admin

The staff console for **Island Venues**, a demo app for booking event venues across
Mauritius. Staff in the `venue-ops` group use it to:

- see **every booking**, filtered by status (Pending, Approved, Rejected, Cancelled, Paid);
- **approve or reject** pending bookings. The row changes at once (optimistic update)
  and only that row is rolled back, with an explanation, if the API refuses;
- **add a venue** to the public catalogue, with field-level validation.

React 18, Vite and TypeScript (strict). Styling uses CSS Modules with logical
properties (RTL-safe) and a light "lagoon" palette defined in `src/styles/tokens.css`.
Only `react` and `react-dom` ship to the browser; everything else is a dev dependency.

## How it talks to the API

Every call is **same-origin** to `/api/admin/...`. In production the load balancer
routes that prefix to `island-venues-api`, and IAP restricts it to the staff group.
The browser never holds a token: IAP's own cookie authenticates each request.

| Call | Used for |
|---|---|
| `GET /api/admin/bookings` | the bookings table (a bare array, or `{ "bookings": [...] }`) |
| `POST /api/admin/bookings/{id}/approve` | Approve button |
| `POST /api/admin/bookings/{id}/reject` | Reject button |
| `POST /api/admin/venues` | create-venue form, body `{name, town, capacity, pricePerDayMur, description, tags[]}` |

Errors are read from `{"error": "..."}` bodies. Responses are checked at runtime
(`src/api/guards.ts`) so a contract drift shows as a clear message instead of a broken
table. Approve/reject are only offered on `PENDING` bookings: `PAID` is set by the
payment webhook and `CANCELLED` by the guest.

## Run locally

Requires Node.js 20.19 or newer.

```bash
# 1. the API, in another terminal (see its README): DEV_MODE=true, port 8080
# 2. the console
npm ci
DEV_USER=ops@example.com npm run dev   # http://localhost:5173
```

There is no IAP locally. The Vite dev server proxies `/api` to the API and, when
`DEV_USER` is set, adds the `X-Dev-User` header that the API trusts **only** in
`DEV_MODE`. The header is added by the dev proxy, never by the built app.

Other scripts:

```bash
npm test               # Vitest + Testing Library (network mocked with MSW)
npm run typecheck      # tsc, no output
npm run lint           # ESLint; CI fails on any warning
npm run build          # type-check, then production build into dist/
npm run preview        # serve dist/ locally
```

## Environment variables

The bundle has **no runtime or `VITE_` variables**: the API is always same-origin.

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `API_PROXY_TARGET` | `npm run dev` only | `http://localhost:8080` | Where the Vite dev server proxies `/api` |
| `DEV_USER` | `npm run dev` only | unset | Sent as `X-Dev-User` by the dev proxy (API in `DEV_MODE` only) |

## Deployment (Infrastream)

This repository is deployed by [Infrastream](https://infrastream.io) as the
`island-venues-admin` application of the managed tenant `island-venues`
(region `us-central1`). The application, its build definition and the routes are
declared in
[`a-manraj-infrastream/infrastream-organization-manifests-ab204170`](https://github.com/a-manraj-infrastream/infrastream-organization-manifests-ab204170).

- **Build** (`REACT` build type): `npm ci`, `npm audit --audit-level=high --omit=dev`,
  `npm test`, then `npm run build` to produce `dist/`. Keep `package-lock.json` committed.
  The analysis stage also runs ESLint with `--max-warnings=0` and `tsc -b --noEmit`,
  so `npm run lint` and `npm run typecheck` must stay clean.
- **Run**: the engine generates the nginx Dockerfile and deploys it to Cloud Run;
  this repository deliberately has no Dockerfile.
- **Access**: the load balancer puts the app and `/api/admin/*` behind IAP, limited
  to the `venue-ops` and `venue-admins` groups. The API verifies the IAP assertion again on every call.

## Project layout

```
src/
  api/          typed fetch client, wire types and runtime guards
  hooks/        useAdminBookings: loading, optimistic approve/reject, rollback
  components/
    bookings/   BookingsPanel, BookingsTable, StatusFilter
    venues/     CreateVenueForm and its pure validateVenue()
    common/     StatusBadge, VisuallyHidden
    scaffold/   AppShell (title bar, main landmark)
  styles/       tokens.css (design tokens), global.css
  test/         Vitest setup, MSW server, fixtures
```

## License

[Apache-2.0](LICENSE)
