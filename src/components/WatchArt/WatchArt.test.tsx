import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WatchArt from './WatchArt';

describe('WatchArt', () => {
  it('renders the initials derived from the product name', () => {
    render(<WatchArt sku="watch-rolex-submariner" name="Rolex Submariner" />);
    expect(screen.getByText('RS')).toBeInTheDocument();
  });

  it('renders the same color for two skus sharing a brand', () => {
    render(<WatchArt sku="watch-rolex-submariner" name="Rolex Submariner" />);
    const submariner = screen.getByText('RS');

    render(<WatchArt sku="watch-rolex-daytona" name="Rolex Daytona" />);
    const daytona = screen.getByText('RD');

    expect(submariner.parentElement?.style.getPropertyValue('--watch-hue')).toBe(
      daytona.parentElement?.style.getPropertyValue('--watch-hue'),
    );
  });
});
