import { describe, expect, it } from 'vitest';
import { hueFromSku, initialsFromName } from './watchArt';

describe('hueFromSku', () => {
  it('returns the same hue for the same sku every time', () => {
    const first = hueFromSku('watch-rolex-submariner');
    const second = hueFromSku('watch-rolex-submariner');
    expect(first).toBe(second);
  });

  it('returns the same hue for different models of the same brand', () => {
    const submariner = hueFromSku('watch-rolex-submariner');
    const daytona = hueFromSku('watch-rolex-daytona');
    expect(submariner).toBe(daytona);
  });

  it('returns a different hue for a different brand', () => {
    const rolex = hueFromSku('watch-rolex-submariner');
    const omega = hueFromSku('watch-omega-speedmaster-moonwatch');
    expect(rolex).not.toBe(omega);
  });

  it('returns a value within the valid hue range', () => {
    const hue = hueFromSku('watch-patek-philippe-nautilus');
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });
});

describe('initialsFromName', () => {
  it('extracts the first letter of each word, uppercased', () => {
    expect(initialsFromName('Rolex Submariner')).toBe('RS');
  });

  it('limits to two characters for longer names', () => {
    expect(initialsFromName('Omega Speedmaster Moonwatch')).toBe('OS');
  });

  it('handles a single-word name', () => {
    expect(initialsFromName('Submariner')).toBe('S');
  });
});
