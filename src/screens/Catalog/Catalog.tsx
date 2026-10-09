import { useCallback, useEffect, useState } from 'react';
import { catalogClient, type CatalogItem } from '../../services/catalogClient';
import { cartClient } from '../../services/cartClient';
import { getOrCreateCartId } from '../../services/cartId';
import './Catalog.css';

type AddToCartState = 'idle' | 'adding' | 'added' | 'error';

const PAGE_SIZE = 20;

function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`;
}

function errorMessage(error: unknown): string {
  // `error` is `unknown` under strict mode; narrow safely rather than
  // asserting, since a rejected promise isn't guaranteed to be an Error.
  return error instanceof Error ? error.message : String(error);
}

export default function Catalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [addToCartState, setAddToCartState] = useState<Record<string, AddToCartState>>({});
  const [addToCartError, setAddToCartError] = useState<Record<string, string>>({});

  const fetchInitial = useCallback(async () => {
    setInitialLoading(true);
    setInitialError(null);
    try {
      const result = await catalogClient.list({ limit: PAGE_SIZE, offset: 0 });
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      setInitialError(errorMessage(error));
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const fetchMore = async () => {
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const result = await catalogClient.list({ limit: PAGE_SIZE, offset: items.length });
      setItems((prev) => [...prev, ...result.items]);
      setTotal(result.total);
    } catch (error) {
      setLoadMoreError(errorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAddToCart = async (item: CatalogItem) => {
    setAddToCartState((prev) => ({ ...prev, [item.id]: 'adding' }));
    setAddToCartError((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    try {
      const cartId = await getOrCreateCartId();
      await cartClient.addItem(cartId, item.sku, 1);
      setAddToCartState((prev) => ({ ...prev, [item.id]: 'added' }));
    } catch (error) {
      setAddToCartState((prev) => ({ ...prev, [item.id]: 'error' }));
      setAddToCartError((prev) => ({ ...prev, [item.id]: errorMessage(error) }));
    }
  };

  if (initialLoading) {
    return <p>Loading...</p>;
  }

  if (initialError) {
    return (
      <div className="catalog-error">
        <p role="alert">{initialError}</p>
        <button onClick={fetchInitial}>Retry</button>
      </div>
    );
  }

  const hasMore = items.length < total;

  return (
    <div className="catalog">
      <ul className="catalog-list">
        {items.map((item) => {
          const state = addToCartState[item.id] ?? 'idle';
          return (
            <li key={item.id} className="catalog-item">
              {item.name} — {item.sku} — {formatPrice(item.priceCents)}
              <button onClick={() => handleAddToCart(item)} disabled={state === 'adding'}>
                {state === 'adding' ? 'Adding...' : state === 'added' ? 'Added' : 'Add to cart'}
              </button>
              {state === 'error' && (
                <span className="catalog-error">
                  <span role="alert">{addToCartError[item.id]}</span>
                  <button onClick={() => handleAddToCart(item)}>Retry</button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {loadMoreError && (
        <div className="catalog-error">
          <p role="alert">{loadMoreError}</p>
          <button onClick={fetchMore}>Retry</button>
        </div>
      )}
      {hasMore && !loadMoreError && (
        <button onClick={fetchMore} disabled={loadingMore}>
          {loadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
