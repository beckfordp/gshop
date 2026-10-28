import { describe, expect, it } from 'vitest';
import { CARRIERS, generateTrackingNo } from './tracking';

describe('generateTrackingNo', () => {
  it('lists the supported carriers', () => {
    expect(CARRIERS).toEqual(['DHL', 'UPS', 'EVRI']);
  });

  it('generates a 10-digit number for DHL', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateTrackingNo('DHL')).toMatch(/^\d{10}$/);
    }
  });

  it('generates a 1Z + 16-character number for UPS', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateTrackingNo('UPS')).toMatch(/^1Z[0-9A-Z]{16}$/);
    }
  });

  it('generates a 16-digit number for EVRI', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateTrackingNo('EVRI')).toMatch(/^\d{16}$/);
    }
  });

  it('does not repeat the same number back to back', () => {
    const numbers = new Set(
      Array.from({ length: 10 }, () => generateTrackingNo('DHL')),
    );
    expect(numbers.size).toBeGreaterThan(1);
  });
});
