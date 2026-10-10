import { describe, expect, it } from 'vitest';
import { WATCH_IMAGES, imageForSku } from './watchImages';

describe('imageForSku', () => {
  it('returns the same url for the same sku every time', () => {
    const first = imageForSku('watch-rolex-submariner');
    const second = imageForSku('watch-rolex-submariner');
    expect(first).toBe(second);
  });

  it('maps two skus 60 catalog positions apart to the same image', () => {
    // watch-rolex-submariner is catalog position 0, watch-franckmuller-vanguard
    // is position 60 — both should round-robin onto the same (60-image) pool slot.
    const first = imageForSku('watch-rolex-submariner');
    const sixtyLater = imageForSku('watch-franckmuller-vanguard');
    expect(first).toBe(sixtyLater);
  });

  it('gives adjacent catalog positions different images', () => {
    const first = imageForSku('watch-rolex-submariner');
    const second = imageForSku('watch-omega-speedmaster');
    expect(first).not.toBe(second);
  });

  it('falls back to a valid pool image for an unknown sku', () => {
    const result = imageForSku('watch-unknown-future-sku');
    expect(WATCH_IMAGES).toContain(result);
  });
});
