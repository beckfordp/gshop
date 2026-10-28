import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AUTO_DRIVE_FAILURE_PROBABILITY,
  AUTO_DRIVE_INTERVAL_MS,
  shouldAutoFail,
} from './autoDrive';

describe('autoDrive', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('advances every 3 seconds with a 25% failure probability', () => {
    expect(AUTO_DRIVE_INTERVAL_MS).toBe(3000);
    expect(AUTO_DRIVE_FAILURE_PROBABILITY).toBe(0.25);
  });

  it('fails when Math.random falls below the probability', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(shouldAutoFail()).toBe(true);
  });

  it('succeeds at or above the probability', () => {
    vi.spyOn(Math, 'random').mockReturnValue(AUTO_DRIVE_FAILURE_PROBABILITY);
    expect(shouldAutoFail()).toBe(false);
  });
});
