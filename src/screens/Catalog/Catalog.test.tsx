import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Catalog from './Catalog';
import { catalogClient, type CatalogItem } from '../../services/catalogClient';

vi.mock('../../services/catalogClient', () => ({
  catalogClient: { list: vi.fn() },
}));

const list = vi.mocked(catalogClient.list);

function makeItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: '1',
    name: 'Widget',
    description: 'A widget',
    priceCents: 1999,
    sku: 'WID-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Catalog', () => {
  beforeEach(() => {
    list.mockReset();
  });

  it('shows a loading state on mount', async () => {
    let resolveList!: (value: { items: CatalogItem[]; total: number }) => void;
    list.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );

    render(<Catalog />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    resolveList({ items: [], total: 0 });
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  });

  it('renders fetched items with name, sku, and formatted price', async () => {
    list.mockResolvedValue({
      items: [makeItem({ name: 'Widget', sku: 'WID-1', priceCents: 1999 })],
      total: 1,
    });

    render(<Catalog />);

    expect(await screen.findByText(/Widget/)).toBeInTheDocument();
    expect(screen.getByText(/WID-1/)).toBeInTheDocument();
    expect(screen.getByText(/\$19\.99/)).toBeInTheDocument();
  });

  it('loads more on click, appends the next page, and hides the button at total', async () => {
    list
      .mockResolvedValueOnce({
        items: [makeItem({ id: '1', name: 'First' })],
        total: 2,
      })
      .mockResolvedValueOnce({
        items: [makeItem({ id: '2', name: 'Second' })],
        total: 2,
      });

    render(<Catalog />);

    await screen.findByText(/First/);
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    await screen.findByText(/Second/);
    expect(list).toHaveBeenLastCalledWith({ limit: 20, offset: 1 });
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('shows an error and working Retry button when the initial fetch fails', async () => {
    list
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ items: [makeItem()], total: 1 });

    render(<Catalog />);

    await screen.findByText('network down');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await screen.findByText(/Widget/);
    expect(screen.queryByText('network down')).not.toBeInTheDocument();
  });

  it('shows an error and working Retry button when load-more fails, keeping existing items', async () => {
    list
      .mockResolvedValueOnce({ items: [makeItem({ id: '1' })], total: 2 })
      .mockRejectedValueOnce(new Error('load more failed'))
      .mockResolvedValueOnce({
        items: [makeItem({ id: '2', name: 'Second' })],
        total: 2,
      });

    render(<Catalog />);

    await screen.findByText(/Widget/);
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    await screen.findByText('load more failed');
    expect(screen.getByText(/Widget/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await screen.findByText(/Second/);
    expect(screen.queryByText('load more failed')).not.toBeInTheDocument();
  });
});
