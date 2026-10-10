import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WatchArt from './WatchArt';
import { imageForSku } from '../../data/watchImages';

describe('WatchArt', () => {
  it('renders the photo for the given sku with the product name as alt text', () => {
    render(<WatchArt sku="watch-rolex-submariner" name="Rolex Submariner" />);
    const img = screen.getByAltText('Rolex Submariner');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', imageForSku('watch-rolex-submariner'));
  });

  it('renders the same photo for two skus mapped to the same image', () => {
    const { container: first } = render(
      <WatchArt sku="watch-rolex-submariner" name="Rolex Submariner" />,
    );
    const { container: second } = render(
      <WatchArt sku="watch-franckmuller-vanguard" name="Franck Muller Vanguard" />,
    );

    const firstSrc = first.querySelector('img')?.getAttribute('src');
    const secondSrc = second.querySelector('img')?.getAttribute('src');
    expect(firstSrc).toBe(secondSrc);
  });
});
