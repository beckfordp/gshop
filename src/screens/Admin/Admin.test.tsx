import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Admin from './Admin';
import { catalogClient, type CatalogItem } from '../../services/catalogClient';
import { inventoryClient, type InventoryItem } from '../../services/inventoryClient';

vi.mock('../../services/catalogClient', () => ({
  catalogClient: { list: vi.fn() },
}));

vi.mock('../../services/inventoryClient', () => ({
  inventoryClient: { list: vi.fn(), adjust: vi.fn() },
}));

// The prototype has its own suite; keep its demo tables/buttons out of the
// existing Admin selectors.
vi.mock('./WorkflowDemo', () => ({ default: () => null }));

const catalogList = vi.mocked(catalogClient.list);
const inventoryList = vi.mocked(inventoryClient.list);
const inventoryAdjust = vi.mocked(inventoryClient.adjust);

function makeInventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-1',
    sku: 'watch-rolex-submariner',
    quantityAvailable: 5,
    quantityReserved: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCatalogItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: 'catalog-1',
    name: 'Rolex Submariner',
    description: 'A watch',
    priceCents: 950000,
    sku: 'watch-rolex-submariner',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

async function showInventory() {
  fireEvent.click(await screen.findByRole('button', { name: 'Show complete inventory' }));
  await screen.findByText('Rolex Submariner');
}

describe('Admin', () => {
  beforeEach(() => {
    catalogList.mockReset();
    inventoryList.mockReset();
    inventoryAdjust.mockReset();
    catalogList.mockResolvedValue({ items: [makeCatalogItem()], total: 1 });
    inventoryList.mockResolvedValue([makeInventoryItem()]);
  });

  it('hides the inventory table until Show complete inventory is clicked', async () => {
    render(<Admin />);

    const button = await screen.findByRole('button', { name: 'Show complete inventory' });
    expect(screen.queryByText('Rolex Submariner')).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(await screen.findByText('Rolex Submariner')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Show complete inventory' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('watch-rolex-submariner')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide inventory' }));

    expect(screen.queryByText('Rolex Submariner')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show complete inventory' }),
    ).toBeInTheDocument();
  });

  it('no longer renders the order history section', async () => {
    render(<Admin />);

    await screen.findByRole('button', { name: 'Show complete inventory' });
    expect(screen.queryByText(/Order history \(this browser\)/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Clear order history' }),
    ).not.toBeInTheDocument();
  });

  it('shows a loading state while fetching inventory', async () => {
    let resolveList!: (value: InventoryItem[]) => void;
    inventoryList.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );

    render(<Admin />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    resolveList([]);
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  });

  it('shows an error and working Retry when the inventory fetch fails', async () => {
    inventoryList.mockRejectedValueOnce(new Error('inventory down')).mockResolvedValueOnce([
      makeInventoryItem(),
    ]);

    render(<Admin />);

    await screen.findByText('inventory down');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await showInventory();
    expect(screen.queryByText('inventory down')).not.toBeInTheDocument();
  });

  it('+1 adjusts quantityAvailable up, sending the unchanged quantityReserved', async () => {
    inventoryAdjust.mockResolvedValue(makeInventoryItem({ quantityAvailable: 6, quantityReserved: 1 }));

    render(<Admin />);
    await showInventory();

    fireEvent.click(screen.getByRole('button', { name: '+1' }));

    await waitFor(() => expect(screen.getByText('6')).toBeInTheDocument());
    expect(inventoryAdjust).toHaveBeenCalledWith('inv-1', 6, 1);
  });

  it('-1 adjusts quantityAvailable down and disables itself at 0', async () => {
    inventoryList.mockResolvedValue([makeInventoryItem({ quantityAvailable: 1, quantityReserved: 0 })]);
    inventoryAdjust.mockResolvedValue(makeInventoryItem({ quantityAvailable: 0, quantityReserved: 0 }));

    render(<Admin />);
    await showInventory();

    fireEvent.click(screen.getByRole('button', { name: '−1' }));

    await waitFor(() => expect(inventoryAdjust).toHaveBeenCalledWith('inv-1', 0, 0));
    await waitFor(() => expect(screen.getByRole('button', { name: '−1' })).toBeDisabled());
  });

  it('shows an inline error and working Retry when an adjustment fails', async () => {
    inventoryAdjust
      .mockRejectedValueOnce(new Error('adjust failed'))
      .mockResolvedValueOnce(makeInventoryItem({ quantityAvailable: 6, quantityReserved: 1 }));

    render(<Admin />);
    await showInventory();

    fireEvent.click(screen.getByRole('button', { name: '+1' }));

    await screen.findByText('adjust failed');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('6')).toBeInTheDocument());
    expect(screen.queryByText('adjust failed')).not.toBeInTheDocument();
  });
});
