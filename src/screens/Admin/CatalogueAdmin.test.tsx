import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CatalogueAdmin from './CatalogueAdmin';
import { catalogClient, type CatalogItem } from '../../services/catalogClient';
import { inventoryClient, type InventoryItem } from '../../services/inventoryClient';

vi.mock('../../services/catalogClient', () => ({
  catalogClient: { list: vi.fn() },
}));

vi.mock('../../services/inventoryClient', () => ({
  inventoryClient: { list: vi.fn(), adjust: vi.fn() },
}));

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

async function renderCatalogue() {
  render(<CatalogueAdmin />);
  return screen.findByRole('table', { name: 'Catalogue' });
}

function row(sku: string) {
  return screen.getByRole('cell', { name: sku }).closest('tr') as HTMLElement;
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('CatalogueAdmin', () => {
  beforeEach(() => {
    catalogList.mockReset();
    inventoryList.mockReset();
    inventoryAdjust.mockReset();
    catalogList.mockResolvedValue({
      items: [
        makeCatalogItem(),
        makeCatalogItem({
          id: 'catalog-2',
          name: 'Omega Speedmaster',
          sku: 'watch-omega-speedmaster',
          priceCents: 650000,
        }),
      ],
      total: 2,
    });
    inventoryList.mockResolvedValue([makeInventoryItem()]);
  });

  it('joins the real catalogue with its stock and flags the prototype', async () => {
    await renderCatalogue();

    expect(screen.getByText(/Prototype — product edits are simulated/)).toBeInTheDocument();
    const rolex = row('watch-rolex-submariner');
    expect(within(rolex).getByText('Rolex Submariner')).toBeInTheDocument();
    expect(within(rolex).getByText('$9500.00')).toBeInTheDocument();
    expect(within(rolex).getByText('5')).toBeInTheDocument();
    expect(within(row('watch-omega-speedmaster')).getByText('No stock record')).toBeInTheDocument();
    expect(catalogList).toHaveBeenCalledWith({ limit: 100, offset: 0 });
  });

  it('searches by name or SKU', async () => {
    await renderCatalogue();

    fill('Search products', 'omega');

    expect(screen.queryByRole('cell', { name: 'watch-rolex-submariner' })).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'watch-omega-speedmaster' })).toBeInTheDocument();
    expect(screen.getByText('1 of 2 products')).toBeInTheDocument();
  });

  it('validates a new product and rejects a duplicate SKU', async () => {
    await renderCatalogue();
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));

    fill('SKU', 'watch-rolex-submariner');
    fill('Price ($)', '-3');
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));

    expect(screen.getByText('SKU already exists')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText(/Price must be a positive amount/)).toBeInTheDocument();
    expect(screen.getByLabelText('SKU')).toHaveAttribute('aria-invalid', 'true');
  });

  it('adds a simulated product with no stock record yet', async () => {
    await renderCatalogue();
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));

    fill('SKU', 'watch-tudor-black-bay');
    fill('Name', 'Tudor Black Bay');
    fill('Price ($)', '3900');
    fill('Initial stock', '4');
    expect(screen.getByRole('figure', { name: 'Storefront preview' })).toHaveTextContent(
      'Tudor Black Bay',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Saved Tudor Black Bay (simulated).',
    );
    const tudor = row('watch-tudor-black-bay');
    expect(within(tudor).getByText('$3900.00')).toBeInTheDocument();
    expect(within(tudor).getByText('simulated')).toBeInTheDocument();
    expect(within(tudor).getByText(/would start at 4/)).toBeInTheDocument();
  });

  it('edits a price but keeps the SKU read-only', async () => {
    await renderCatalogue();
    fireEvent.click(screen.getByRole('button', { name: 'Edit watch-rolex-submariner' }));

    expect(screen.getByLabelText('SKU')).toHaveAttribute('readonly');
    fill('Price ($)', '9900.50');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await screen.findByRole('status');
    expect(within(row('watch-rolex-submariner')).getByText('$9900.50')).toBeInTheDocument();
  });

  it('retires after confirmation, hides it from Active and restores it', async () => {
    await renderCatalogue();

    fireEvent.click(screen.getByRole('button', { name: 'Retire watch-omega-speedmaster' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm retire watch-omega-speedmaster' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('cell', { name: 'watch-omega-speedmaster' }),
      ).not.toBeInTheDocument(),
    );
    fill('Product status', 'retired');
    expect(
      within(row('watch-omega-speedmaster')).getByText(/would be hidden from the storefront/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore watch-omega-speedmaster' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('cell', { name: 'watch-omega-speedmaster' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('shows an error and working Retry when loading fails', async () => {
    inventoryList
      .mockRejectedValueOnce(new Error('inventory down'))
      .mockResolvedValueOnce([makeInventoryItem()]);
    render(<CatalogueAdmin />);

    await screen.findByText('inventory down');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('table', { name: 'Catalogue' })).toBeInTheDocument();
    expect(screen.queryByText('inventory down')).not.toBeInTheDocument();
  });

  it('+1 adjusts real stock up, sending quantityAvailable only', async () => {
    inventoryAdjust.mockResolvedValue(
      makeInventoryItem({ quantityAvailable: 6, quantityReserved: 1 }),
    );
    await renderCatalogue();

    fireEvent.click(
      screen.getByRole('button', { name: 'Increase stock for watch-rolex-submariner' }),
    );

    await waitFor(() =>
      expect(within(row('watch-rolex-submariner')).getByText('6')).toBeInTheDocument(),
    );
    expect(inventoryAdjust).toHaveBeenCalledWith('inv-1', 6);
  });

  it('-1 adjusts real stock down and disables itself at 0', async () => {
    inventoryList.mockResolvedValue([
      makeInventoryItem({ quantityAvailable: 1, quantityReserved: 0 }),
    ]);
    inventoryAdjust.mockResolvedValue(
      makeInventoryItem({ quantityAvailable: 0, quantityReserved: 0 }),
    );
    await renderCatalogue();
    const decrease = screen.getByRole('button', {
      name: 'Decrease stock for watch-rolex-submariner',
    });

    fireEvent.click(decrease);

    await waitFor(() => expect(inventoryAdjust).toHaveBeenCalledWith('inv-1', 0));
    await waitFor(() => expect(decrease).toBeDisabled());
  });

  it('shows an inline error and working Retry when an adjustment fails', async () => {
    inventoryAdjust
      .mockRejectedValueOnce(new Error('adjust failed'))
      .mockResolvedValueOnce(makeInventoryItem({ quantityAvailable: 6, quantityReserved: 1 }));
    await renderCatalogue();

    fireEvent.click(
      screen.getByRole('button', { name: 'Increase stock for watch-rolex-submariner' }),
    );
    await screen.findByText('adjust failed');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() =>
      expect(within(row('watch-rolex-submariner')).getByText('6')).toBeInTheDocument(),
    );
    expect(screen.queryByText('adjust failed')).not.toBeInTheDocument();
  });
});
