import { useCallback, useEffect, useState } from "react";
import { catalogClient, type CatalogItem } from "../../services/catalogClient";
import "./Catalog.css";

const PAGE_SIZE = 20;

function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`;
}

export function Catalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const fetchInitial = useCallback(async () => {
    setInitialLoading(true);
    setInitialError(null);
    try {
      const result = await catalogClient.list({ limit: PAGE_SIZE, offset: 0 });
      setItems(result.items);
      setTotal(result.total);
    } catch (error) {
      setInitialError((error as Error).message);
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
      setLoadMoreError((error as Error).message);
    } finally {
      setLoadingMore(false);
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
        {items.map((item) => (
          <li key={item.id} className="catalog-item">
            {item.name} — {item.sku} — {formatPrice(item.priceCents)}
          </li>
        ))}
      </ul>
      {loadMoreError && (
        <div className="catalog-error">
          <p role="alert">{loadMoreError}</p>
          <button onClick={fetchMore}>Retry</button>
        </div>
      )}
      {hasMore && !loadMoreError && (
        <button onClick={fetchMore} disabled={loadingMore}>
          {loadingMore ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}
