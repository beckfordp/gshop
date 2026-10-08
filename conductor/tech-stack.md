# Tech Stack — gshop

Inferred from `package.json` (brownfield — documenting what's actually
there, not proposing changes).

## In package.json today
- **React** 18.3.1 + **react-dom** 18.3.1
- **TypeScript** ~5.6.2
- **Vite** ^5.4.10 (`@vitejs/plugin-react` ^4.3.3) — dev server + build
- **ESLint** 9.13.0 + **typescript-eslint** 8.11.0 +
  `eslint-plugin-react-hooks`/`eslint-plugin-react-refresh`

## Not yet in package.json — needed for the first track
Per `product-guidelines.md`'s Testing section (TDD, no test framework
configured yet):
- **Vitest** — reuses `vite.config.ts` directly, no separate Jest config
- **@testing-library/react** + **@testing-library/jest-dom** — component
  tests
- **jsdom** — Vitest's DOM environment

Add when the first track's Red phase needs them, not speculatively now.
