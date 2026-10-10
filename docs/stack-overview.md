# gshop development stack — a beginner's overview

This is a plain-language tour of the tools and conventions this project
uses. If you're not familiar with the React/frontend world, start here.

## What gshop actually is

A website (no app store, nothing to install) that a browser downloads and
runs. It shows a product catalog, a cart, a checkout flow, and order
history — all by talking directly to the real backend services (no fake/
mock data). "Running gshop" means two things happening at once:

1. A **dev server** on your machine serves the website to your browser.
2. The website's code makes network calls to backend services (catalog,
   cart, order) to get real data.

## The core pieces

### React — builds the UI out of reusable "components"
Instead of writing one big HTML page, you write small reusable pieces
called **components** — e.g. `Catalog`, `Cart`, `Checkout` each live in
their own file (`src/screens/Catalog/Catalog.tsx`, etc.) and render a
piece of the page. A component is just a function that returns what
should appear on screen; React re-runs that function and updates the page
whenever the component's data changes.

- **JSX**: the HTML-looking syntax inside `.tsx` files (e.g.
  `<button onClick={...}>Checkout</button>`) is not actually HTML — it's
  JavaScript that *describes* HTML. It gets compiled into real DOM
  updates.
- **Hooks** (functions starting with `use`): `useState` holds a piece of
  data that can change (e.g. "is the cart loading right now?");
  `useEffect` runs some code when a component first appears or when
  something it depends on changes (e.g. "fetch the cart when this screen
  mounts"). You'll see both all over `src/screens/*/*.tsx`.
- **Props**: how a parent component passes data down to a child — e.g.
  `App.tsx` passes `onCheckoutSuccess` into `<Cart onCheckoutSuccess={...} />`
  so Cart can tell App "checkout succeeded, here's the order."

### TypeScript — JavaScript with types
Every `.ts`/`.tsx` file is TypeScript: regular JavaScript, plus type
annotations (`function formatPrice(priceCents: number): string`) that get
checked *before* the code ever runs. This catches a whole class of bugs
(passing the wrong shape of data, typos in property names) at build time
instead of in the browser. `npm run build` is what runs this check.

### Vite — the dev server and build tool
Vite does two jobs:
- `npm run dev` — starts a local server (usually `http://localhost:5173`)
  that serves the site and instantly reflects file changes in the browser
  (no manual refresh needed).
- `npm run build` — type-checks everything, then bundles all the source
  files into a handful of optimized files in `dist/`, ready to be hosted
  for real.

`vite.config.ts` is Vite's configuration — in this project it also
configures a **dev-only proxy** (see "Talking to real backend services"
below) and wires up the test runner.

### npm / `package.json` — dependencies and scripts
`package.json` lists every library the project depends on
(`dependencies`) and development-only tools (`devDependencies`), plus
named shortcuts under `"scripts"`. `npm install` reads this file and
downloads everything into `node_modules/` (never committed to git —
see `.gitignore`). Running `npm run <script-name>` runs one of those
shortcuts — see the table below.

## How the code is organized

```
src/
  App.tsx              top-level component: decides which screen is showing
  screens/
    Catalog/            the "browse products" screen
    Cart/                the cart screen (also triggers checkout)
    Checkout/            the order-confirmation screen
    OrderHistory/        past-orders screen
  services/
    catalogClient.ts     talks to catalog-service
    cartClient.ts        talks to cart-service
    orderClient.ts       talks to order-service
    cartId.ts            manages the anonymous cart's id (localStorage)
    customerId.ts         manages a persistent anonymous customer id
  lib/
    format.ts             small shared helpers (price/status/error formatting)
```

Each screen folder has three files: the component (`.tsx`), its styling
(`.css`), and its tests (`.test.tsx`) — see "Testing" below.

`localStorage` (mentioned in `cartId.ts`/`customerId.ts`) is a small
built-in browser storage that survives page reloads — it's how gshop
remembers "which cart is mine" and "who am I" without a login system.

## Testing

- **Vitest** — the test runner (`npm test` / `npm run test:coverage`).
  Reuses Vite's config, so it's fast and needs no separate setup.
- **React Testing Library** — lets tests render a component and interact
  with it the way a user would (click a button, check that some text
  appeared) rather than poking at internal implementation details.
- Every screen/service has a co-located `*.test.tsx`/`*.test.ts` file.
  This project follows **TDD** (test-driven development): a failing test
  is written first, confirming it fails for the right reason, then just
  enough code is added to make it pass.

## Linting

**ESLint** (`npm run lint`) checks the code for common mistakes and style
issues (unused variables, React-specific pitfalls, etc.) without actually
running it — separate from TypeScript's type checking.

## Common commands

| Command | What it does |
|---|---|
| `npm install` | Download dependencies (run once, or after `package.json` changes) |
| `npm run dev` | Start the local dev server with live reload |
| `npm run build` | Type-check everything + produce a production bundle in `dist/` |
| `npm run lint` | Check code style/common mistakes |
| `npm test` | Run all tests once |
| `npm run test:coverage` | Run tests and report how much code they exercise |

## Talking to real backend services (local dev)

The backend services (catalog/cart/order) run in a local Kubernetes
cluster (via OrbStack) and aren't reachable from your laptop's browser by
default. Two things have to happen:

1. **`kubectl port-forward`** — makes one backend service reachable at a
   `localhost` port, e.g.:
   ```bash
   kubectl port-forward -n gluon-local svc/catalog-service 8081:8080
   ```
2. **A Vite dev-only proxy** — the backend services don't send the CORS
   headers browsers require for cross-origin requests, so gshop's own
   `fetch()` calls would otherwise be silently blocked by the browser. To
   work around this in dev, `vite.config.ts` proxies requests
   (`/api/catalog/...` → `http://localhost:8081/...`) so the browser only
   ever talks to its own origin, and Vite forwards the request
   server-to-server (not subject to browser CORS). `.env` (gitignored,
   not committed) points each service's client at its proxy path, e.g.
   `VITE_CATALOG_SERVICE_URL=/api/catalog`.

See `conductor/tech-stack.md`'s "Local dev against a running backend"
section for the full up-to-date picture, including known gotchas.

## A couple of terms you'll see mentioned around this project

- **CORS** (Cross-Origin Resource Sharing): a browser security rule that
  blocks a website from calling a *different* website's API unless that
  API explicitly allows it. The proxy above is how gshop works around
  backend services that don't allow it yet.
- **SKU**: short for "stock keeping unit" — the unique code identifying a
  specific product (e.g. `watch-rolex-submariner`).

## The Conductor workflow (this project's process, not a React thing)

You've seen `conductor/`, "tracks", specs and plans come up a lot — that's
a separate, project-specific workflow for planning and tracking features
(not something that ships with React/Vite). Each unit of work gets a
spec (what to build), a plan (TDD steps), gets implemented, reviewed, and
then archived to `conductor/archive/`. `conductor/product.md` and
`conductor/tech-stack.md` are the living docs that get updated as each
piece lands — worth skimming for the current state of the app.
