// SPDX-License-Identifier: MIT

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Admin from './Admin';

// Each section has its own suite; keep their tables/buttons out of these
// Admin selectors.
vi.mock('./AdminConsole', () => ({ default: () => null }));
vi.mock('../Fulfilment/Fulfilment', () => ({ default: () => <p>Fulfilment queue</p> }));
vi.mock('./CatalogueAdmin', () => ({ default: () => <p>Catalogue table</p> }));

describe('Admin', () => {
  it('collapses Fulfilment behind Show fulfilment', () => {
    render(<Admin />);

    expect(screen.queryByText('Fulfilment queue')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show fulfilment' }));
    expect(screen.getByText('Fulfilment queue')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide fulfilment' }));
    expect(screen.queryByText('Fulfilment queue')).not.toBeInTheDocument();
  });

  it('collapses the Catalogue behind Show catalogue, replacing the Inventory section', () => {
    render(<Admin />);

    expect(screen.queryByRole('button', { name: 'Show inventory' })).not.toBeInTheDocument();
    expect(screen.queryByText('Catalogue table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show catalogue' }));
    expect(screen.getByText('Catalogue table')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide catalogue' }));
    expect(screen.queryByText('Catalogue table')).not.toBeInTheDocument();
  });

  it('no longer renders the order history section', () => {
    render(<Admin />);

    expect(screen.queryByText(/Order history \(this browser\)/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear order history' })).not.toBeInTheDocument();
  });
});
