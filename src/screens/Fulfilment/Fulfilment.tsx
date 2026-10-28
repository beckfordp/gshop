import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../../lib/format';
import {
  dispatchOrder,
  getFulfilmentQueue,
  isTerminalState,
  markPacked,
  reportProblem,
  resetFulfilmentQueue,
  startPicking,
  type FulfilmentOrder,
  type FulfilmentState,
} from '../../services/fulfilmentStore';
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

export default function Fulfilment({ onBackToAdmin }: FulfilmentProps) {
  const [queue, setQueue] = useState<FulfilmentOrder[]>(() =>
    getFulfilmentQueue(),
  );
  const [dispatchFor, setDispatchFor] = useState<string | null>(null);
  const [problemFor, setProblemFor] = useState<string | null>(null);
  const [trackingNo, setTrackingNo] = useState('');
  const [carrier, setCarrier] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) {
      alertRef.current?.focus();
    }
  }, [error]);

  const run = (action: () => FulfilmentOrder[]) => {
    setError(null);
    try {
      setQueue(action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const closeForms = () => {
    setDispatchFor(null);
    setProblemFor(null);
    setTrackingNo('');
    setCarrier('');
    setReason('');
    setError(null);
  };

  return (
    <div className="fulfilment">
      <div className="fulfilment__header">
        <div>
          <h1>Order processing</h1>
          <p className="fulfilment__intro">
            Prototype queue — pick, pack and dispatch orders. Mock data only.
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
        <button
          type="button"
          onClick={() => {
            closeForms();
            setQueue(resetFulfilmentQueue());
          }}
        >
          Reset demo queue
        </button>
      </div>

      <ul className="fulfilment-list">
        {queue.map((order) => {
          const terminal = isTerminalState(order.state);
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
              <p className="fulfilment-card__customer">
                {order.customer.type === 'user' ? 'User' : 'Anonymous'} ·{' '}
                {order.customer.label}
              </p>
              <ul className="fulfilment-card__items">
                {order.items.map((item) => (
                  <li key={item.sku}>
                    {item.productName} — qty {item.quantity} —{' '}
                    {formatPrice(item.unitPriceCents * item.quantity)}
                  </li>
                ))}
              </ul>
              <p className="fulfilment-card__total">
                Total: {formatPrice(order.totalCents)}
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
                      onClick={() => run(() => startPicking(order.orderId))}
                    >
                      Start picking
                    </button>
                  )}
                  {order.state === 'PICKING' && (
                    <button
                      type="button"
                      onClick={() => run(() => markPacked(order.orderId))}
                    >
                      Mark packed
                    </button>
                  )}
                  {order.state === 'PACKED' && (
                    <button
                      type="button"
                      onClick={() => {
                        closeForms();
                        setDispatchFor(order.orderId);
                      }}
                    >
                      Dispatch
                    </button>
                  )}
                  <button
                    type="button"
                    className="fulfilment-card__problem"
                    onClick={() => {
                      closeForms();
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
                  <input
                    id={`carrier-${order.orderId}`}
                    value={carrier}
                    onChange={(event) => setCarrier(event.target.value)}
                  />
                  <div className="fulfilment-form__actions">
                    <button
                      type="button"
                      onClick={() =>
                        run(() => dispatchOrder(order.orderId, trackingNo, carrier))
                      }
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
                      onClick={() =>
                        run(() => reportProblem(order.orderId, reason))
                      }
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
