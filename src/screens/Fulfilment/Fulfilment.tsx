import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage, formatPrice } from '../../lib/format';
import {
  CARRIERS,
  generateTrackingNo,
  type Carrier,
} from '../../lib/tracking';
import {
  fulfilmentClient,
  type FulfilmentState,
  type FulfilmentTask,
} from '../../services/fulfilmentClient';
import './Fulfilment.css';

interface FulfilmentProps {
  onBackToAdmin: () => void;
}

const STATE_LABELS: Record<FulfilmentState, string> = {
  PENDING: 'Pending',
  PICKING: 'Picking',
  PACKED: 'Packed',
  DISPATCHED: 'Dispatched',
  DISPATCH_FAILED: 'Dispatch failed',
};

function isTerminalState(state: FulfilmentState): boolean {
  return state === 'DISPATCHED' || state === 'DISPATCH_FAILED';
}

function totalCents(items: FulfilmentTask['items']): number {
  return items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
}

function shipTo(task: FulfilmentTask): string {
  const { line1, line2, city, postalCode, country } = task.shippingAddress;
  const street = line2 ? `${line1}, ${line2}` : line1;
  return `Ship to: ${street}, ${city} ${postalCode}, ${country}`;
}

export default function Fulfilment({ onBackToAdmin }: FulfilmentProps) {
  const [queue, setQueue] = useState<FulfilmentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [dispatchFor, setDispatchFor] = useState<string | null>(null);
  const [problemFor, setProblemFor] = useState<string | null>(null);
  const [trackingNo, setTrackingNo] = useState('');
  const [carrier, setCarrier] = useState<Carrier>('DHL');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const alertRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQueue(await fulfilmentClient.listTasks());
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (error) {
      alertRef.current?.focus();
    }
  }, [error]);

  const closeForms = () => {
    setDispatchFor(null);
    setProblemFor(null);
    setTrackingNo('');
    setCarrier('DHL');
    setReason('');
  };

  const apply = async (
    orderId: string,
    action: () => Promise<FulfilmentTask>,
  ) => {
    setError(null);
    setBusy(orderId);
    try {
      const updated = await action();
      setQueue((current) =>
        current.map((task) => (task.orderId === updated.orderId ? updated : task)),
      );
      closeForms();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fulfilment">
      <div className="fulfilment__header">
        <div>
          <h1>Order processing</h1>
          <p className="fulfilment__intro">
            Pick, pack and dispatch authorized orders.
          </p>
        </div>
        <button type="button" onClick={onBackToAdmin}>
          Back to Admin
        </button>
      </div>

      {error && (
        <div ref={alertRef} className="fulfilment__alert" role="alert" tabIndex={-1}>
          {error}
        </div>
      )}

      <div className="fulfilment__toolbar">
        <button type="button" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && queue.length === 0 && (
        <p className="fulfilment__empty">Loading fulfilment queue…</p>
      )}

      {!loading && !error && queue.length === 0 && (
        <p className="fulfilment__empty">
          No fulfilment tasks yet — they appear when an order&apos;s payment is
          authorized.
        </p>
      )}

      <ul className="fulfilment-list">
        {queue.map((order) => {
          const terminal = isTerminalState(order.state);
          const working = busy === order.orderId;
          return (
            <li key={order.orderId} className="fulfilment-card">
              <div className="fulfilment-card__top">
                <p className="fulfilment-card__id">{order.orderId}</p>
                <span
                  className={`fulfilment-badge fulfilment-badge--${order.state.toLowerCase()}`}
                >
                  {STATE_LABELS[order.state]}
                </span>
              </div>
              <p className="fulfilment-card__customer">{shipTo(order)}</p>
              <ul className="fulfilment-card__items">
                {order.items.map((item) => (
                  <li key={item.sku}>
                    {item.productName} — qty {item.quantity} —{' '}
                    {formatPrice(item.unitPriceCents * item.quantity)}
                  </li>
                ))}
              </ul>
              <p className="fulfilment-card__total">
                Total: {formatPrice(totalCents(order.items))}
              </p>

              {order.state === 'DISPATCHED' && (
                <p className="fulfilment-card__outcome">
                  Shipped via {order.carrier} — tracking {order.trackingNo}
                </p>
              )}
              {order.state === 'DISPATCH_FAILED' && (
                <p className="fulfilment-card__outcome">
                  Not dispatched: {order.failureReason}
                </p>
              )}

              {!terminal && (
                <div className="fulfilment-card__actions">
                  {order.state === 'PENDING' && (
                    <button
                      type="button"
                      disabled={working}
                      onClick={() =>
                        void apply(order.orderId, () =>
                          fulfilmentClient.startPicking(order.orderId),
                        )
                      }
                    >
                      Start picking
                    </button>
                  )}
                  {order.state === 'PICKING' && (
                    <button
                      type="button"
                      disabled={working}
                      onClick={() =>
                        void apply(order.orderId, () =>
                          fulfilmentClient.pack(order.orderId),
                        )
                      }
                    >
                      Mark packed
                    </button>
                  )}
                  {order.state === 'PACKED' && (
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => {
                        closeForms();
                        setError(null);
                        setCarrier('DHL');
                        setTrackingNo(generateTrackingNo('DHL'));
                        setDispatchFor(order.orderId);
                      }}
                    >
                      Dispatch
                    </button>
                  )}
                  <button
                    type="button"
                    className="fulfilment-card__problem"
                    disabled={working}
                    onClick={() => {
                      closeForms();
                      setError(null);
                      setProblemFor(order.orderId);
                    }}
                  >
                    Report problem
                  </button>
                </div>
              )}

              {dispatchFor === order.orderId && (
                <div className="fulfilment-form">
                  <label htmlFor={`tracking-${order.orderId}`}>
                    Tracking number
                  </label>
                  <input
                    id={`tracking-${order.orderId}`}
                    value={trackingNo}
                    onChange={(event) => setTrackingNo(event.target.value)}
                  />
                  <label htmlFor={`carrier-${order.orderId}`}>Carrier</label>
                  <select
                    id={`carrier-${order.orderId}`}
                    value={carrier}
                    onChange={(event) => {
                      const next = event.target.value as Carrier;
                      setCarrier(next);
                      setTrackingNo(generateTrackingNo(next));
                    }}
                  >
                    {CARRIERS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <div className="fulfilment-form__actions">
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => {
                        if (!trackingNo.trim() || !carrier.trim()) {
                          setError(
                            'Tracking number and carrier are required to dispatch',
                          );
                          return;
                        }
                        void apply(order.orderId, () =>
                          fulfilmentClient.dispatch(
                            order.orderId,
                            trackingNo.trim(),
                            carrier.trim(),
                          ),
                        );
                      }}
                    >
                      Confirm dispatch
                    </button>
                    <button type="button" onClick={closeForms}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {problemFor === order.orderId && (
                <div className="fulfilment-form">
                  <label htmlFor={`reason-${order.orderId}`}>
                    What went wrong?
                  </label>
                  <input
                    id={`reason-${order.orderId}`}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                  <div className="fulfilment-form__actions">
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => {
                        if (!reason.trim()) {
                          setError('A reason is required');
                          return;
                        }
                        void apply(order.orderId, () =>
                          fulfilmentClient.fail(order.orderId, reason.trim()),
                        );
                      }}
                    >
                      Confirm failure
                    </button>
                    <button type="button" onClick={closeForms}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
