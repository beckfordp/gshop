import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// RTL's auto-cleanup only self-registers when it finds a global `afterEach`
// (true under Jest, or Vitest's `globals: true`) — neither applies here
// since we use explicit per-file imports, so register it ourselves.
afterEach(() => {
  cleanup()
})
