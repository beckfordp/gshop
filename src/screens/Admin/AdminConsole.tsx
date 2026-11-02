import { useCallback, useEffect, useState } from 'react';
import { errorMessage, formatPrice } from '../../lib/format';
import {
  adminClient,
  type Reservation,
  type SentEmail,
  type ServiceReconciliation,
  type UserAccount,
} from '../../services/adminClient';
import { fulfilmentClient, type FulfilmentTask } from '../../services/fulfilmentClient';
import type { Order } from '../../services/orderClient';
import './AdminConsole.css';

// Admin console (ADM-7/8), real-wired. Writes are asynchronous fan-outs over
// Kafka: the console shows what each service reports now, and Refresh
// re-reads it — nothing here simulates the downstream effects.

type Tab = 'orders' | 'customers';

type Action = 'operator' | 'expire';

interface Result {
  ok: boolean;
  message: string;
}

/** `undefined` while loading; `null` = no account (anonymous checkout). */
type Accounts = Record<string, UserAccount | null | undefined>;

function formatWhen(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

function badge(status: string): string {
  return `admin-console__badge admin-console__badge--${status
    .toLowerCase()
    .replace(/_/g, '-')}`;
}

function refusalReason(order: Order): string {
  switch (order.status) {
    case 'dispatched':
    case 'confirmed':
      return 'Past cancelling — returns/refunds are out of scope (US-23).';
    case 'cancelled':
      return 'Already cancelled.';
    case 'payment_failed':
      return 'Payment failed after dispatch — manual reconciliation, not cancellable.';
    default:
      return 'Only an authorized order can be cancelled.';
  }
}

export default function AdminConsole() {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Accounts>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      setOrders(await adminClient.listOrders());
    } catch (error) {
      setOrdersError(errorMessage(error));
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Customer identity lives in user-service; resolve each distinct id once.
  useEffect(() => {
    const missing = [...new Set(orders.map((order) => order.customerId))].filter(
      (id) => !(id in accounts),
    );
    if (missing.length === 0) return;
    setAccounts((prev) => ({
      ...prev,
      ...Object.fromEntries(missing.map((id) => [id, undefined])),
    }));
    missing.forEach((id) => {
      adminClient
        .user(id)
        // A lookup failure leaves the raw id shown; only a 404 means guest.
        .catch(() => undefined)
        .then((account) => setAccounts((prev) => ({ ...prev, [id]: account })));
    });
  }, [orders, accounts]);

  const customerLabel = (customerId: string): string => {
    const account = accounts[customerId];
    if (account === undefined) return customerId;
    if (account) return account.email;
    // ADM-10: a guest order carries the email captured at checkout.
    const guestEmail = orders.find(
      (order) => order.customerId === customerId && order.guestEmail,
    )?.guestEmail;
    return guestEmail ? `Guest ${guestEmail}` : `Guest ${customerId.slice(0, 8)}`;
  };

  const openOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setTab('orders');
  };

  const openCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setTab('customers');
  };

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  // Only the first load blanks the panels; a refresh keeps the open detail
  // (and its pending result message) mounted.
  const initialLoading = ordersLoading && orders.length === 0;
  const showPanels = !initialLoading && !ordersError;

  return (
    <section className="admin-console" aria-labelledby="admin-console-heading">
      <div className="admin-console__header">
        <div>
          <h2 id="admin-console-heading">Operations</h2>
          <p className="admin-console__note">
            Live cluster data. Cancellations and expiry fan out asynchronously over Kafka — use
            Refresh to see each service catch up.
          </p>
        </div>
        <button type="button" onClick={loadOrders}>
          Refresh
        </button>
      </div>

      <div className="admin-console__tabs" role="tablist" aria-label="Admin views">
        <button
          type="button"
          role="tab"
          id="admin-orders-tab"
          aria-selected={tab === 'orders'}
          aria-controls="admin-orders-panel"
          onClick={() => setTab('orders')}
        >
          Orders
        </button>
        <button
          type="button"
          role="tab"
          id="admin-customers-tab"
          aria-selected={tab === 'customers'}
          aria-controls="admin-customers-panel"
          onClick={() => setTab('customers')}
        >
          Customers
        </button>
      </div>

      {result && (
        <p
          className={`admin-console__result ${
            result.ok ? 'admin-console__result--ok' : 'admin-console__result--error'
          }`}
          role={result.ok ? 'status' : 'alert'}
        >
          {result.message}
        </p>
      )}

      {initialLoading && <p>Loading...</p>}
      {ordersError && (
        <div className="admin-error">
          <p role="alert">{ordersError}</p>
          <button onClick={loadOrders}>Retry</button>
        </div>
      )}

      {showPanels && tab === 'orders' && (
        <div
          id="admin-orders-panel"
          role="tabpanel"
          aria-labelledby="admin-orders-tab"
          className="admin-console__panel"
        >
          {selectedOrder ? (
            <OrderDetail
              order={selectedOrder}
              customerLabel={customerLabel(selectedOrder.customerId)}
              onBack={() => setSelectedOrderId(null)}
              onOpenCustomer={() => openCustomer(selectedOrder.customerId)}
              onResult={setResult}
              onChanged={loadOrders}
            />
          ) : (
            <>
              <OrderTable orders={orders} customerLabel={customerLabel} onOpenOrder={openOrder} />
              <ReconciliationQueue onOpenOrder={openOrder} onResult={setResult} />
            </>
          )}
        </div>
      )}

      {showPanels && tab === 'customers' && (
        <div
          id="admin-customers-panel"
          role="tabpanel"
          aria-labelledby="admin-customers-tab"
          className="admin-console__panel"
        >
          {selectedCustomerId ? (
            <CustomerDetail
              customerId={selectedCustomerId}
              label={customerLabel(selectedCustomerId)}
              account={accounts[selectedCustomerId]}
              orders={orders.filter((order) => order.customerId === selectedCustomerId)}
              onOpenOrder={openOrder}
              onBack={() => setSelectedCustomerId(null)}
            />
          ) : (
            <CustomerTable
              orders={orders}
              customerLabel={customerLabel}
              onOpenCustomer={openCustomer}
            />
          )}
        </div>
      )}
    </section>
  );
}

interface OrderTableProps {
  orders: Order[];
  customerLabel: (customerId: string) => string;
  onOpenOrder: (orderId: string) => void;
}

function OrderTable({ orders, customerLabel, onOpenOrder }: OrderTableProps) {
  if (orders.length === 0) return <p>No orders yet.</p>;
  return (
    <table className="admin-console__table" aria-label="Orders">
      <thead>
        <tr>
          <th>Order</th>
          <th>Customer</th>
          <th>Status</th>
          <th>Total</th>
          <th>Placed</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>
              <button
                type="button"
                className="admin-console__link"
                onClick={() => onOpenOrder(order.id)}
              >
                {order.id}
              </button>
            </td>
            <td>{customerLabel(order.customerId)}</td>
            <td>
              <span className={badge(order.status)}>{statusLabel(order.status)}</span>
            </td>
            <td>{formatPrice(order.totalCents)}</td>
            <td>{formatWhen(order.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface ReconciliationTableProps {
  rows: ServiceReconciliation[];
  label: string;
  onOpenOrder?: (orderId: string) => void;
  onResolve: (row: ServiceReconciliation, note: string) => Promise<void>;
}

function ReconciliationTable({ rows, label, onOpenOrder, onResolve }: ReconciliationTableProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const key = (row: ServiceReconciliation) => `${row.service}:${row.orderId}`;

  return (
    <table className="admin-console__table" aria-label={label}>
      <thead>
        <tr>
          <th>Service</th>
          <th>Order</th>
          <th>Reason</th>
          <th>Status</th>
          <th>Flagged</th>
          <th>Resolution</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={key(row)}>
            <td>{row.service}</td>
            <td>
              {onOpenOrder ? (
                <button
                  type="button"
                  className="admin-console__link"
                  onClick={() => onOpenOrder(row.orderId)}
                >
                  {row.orderId}
                </button>
              ) : (
                row.orderId
              )}
            </td>
            <td>{statusLabel(row.reason)}</td>
            <td>
              <span className={badge(row.status)}>{row.status}</span>
            </td>
            <td>{formatWhen(row.createdAt)}</td>
            <td>
              {row.status === 'open' ? (
                <span className="admin-console__toolbar">
                  <input
                    className="admin-console__note-input"
                    aria-label={`Note for ${row.service} ${row.orderId}`}
                    placeholder="Note (optional)"
                    value={notes[key(row)] ?? ''}
                    onChange={(event) =>
                      setNotes((prev) => ({ ...prev, [key(row)]: event.target.value }))
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Resolve ${row.service} flag for ${row.orderId}`}
                    disabled={busy === key(row)}
                    onClick={async () => {
                      setBusy(key(row));
                      try {
                        await onResolve(row, (notes[key(row)] ?? '').trim());
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    Resolve
                  </button>
                </span>
              ) : (
                <>
                  {row.operatorId} · {formatWhen(row.resolvedAt)}
                  {row.note ? ` · ${row.note}` : ''}
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface ReconciliationQueueProps {
  onOpenOrder: (orderId: string) => void;
  onResult: (result: Result) => void;
}

function ReconciliationQueue({ onOpenOrder, onResult }: ReconciliationQueueProps) {
  const [showResolved, setShowResolved] = useState(false);
  const [rows, setRows] = useState<ServiceReconciliation[]>([]);
  const [failures, setFailures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const loaded = await adminClient.allReconciliations(
      showResolved ? {} : { status: 'open' },
    );
    setRows(loaded.rows);
    setFailures(loaded.failures);
    setLoading(false);
  }, [showResolved]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (row: ServiceReconciliation, note: string) => {
    try {
      await adminClient.resolveReconciliation(row.service, row.orderId, note || undefined);
      onResult({ ok: true, message: `Resolved ${row.service} flag for ${row.orderId}.` });
    } catch (error) {
      onResult({ ok: false, message: errorMessage(error) });
    }
    await load();
  };

  return (
    <div className="admin-console__detail">
      <h3>Reconciliation queue</h3>
      <div className="admin-console__toolbar">
        <label>
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(event) => setShowResolved(event.target.checked)}
          />{' '}
          Include resolved
        </label>
        <button type="button" onClick={load}>
          Refresh queue
        </button>
      </div>
      {failures.map((failure) => (
        <p key={failure} role="alert" className="admin-console__note">
          {failure}
        </p>
      ))}
      {loading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p>No {showResolved ? '' : 'open '}reconciliation flags.</p>
      ) : (
        <ReconciliationTable
          rows={rows}
          label="Reconciliation flags"
          onOpenOrder={onOpenOrder}
          onResolve={resolve}
        />
      )}
    </div>
  );
}

interface OrderDetailProps {
  order: Order;
  customerLabel: string;
  onBack: () => void;
  onOpenCustomer: () => void;
  onResult: (result: Result) => void;
  onChanged: () => Promise<void>;
}

interface OrderFacts {
  reservations: Reservation[] | string;
  task: FulfilmentTask | null | string;
  flags: ServiceReconciliation[];
  flagFailures: string[];
  emails: SentEmail[] | string;
}

function OrderDetail({
  order,
  customerLabel,
  onBack,
  onOpenCustomer,
  onResult,
  onChanged,
}: OrderDetailProps) {
  const [facts, setFacts] = useState<OrderFacts | null>(null);
  const [confirm, setConfirm] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [reservations, tasks, flags, emails] = await Promise.allSettled([
      adminClient.reservations(order.id),
      fulfilmentClient.listTasks(),
      adminClient.allReconciliations({ orderId: order.id }),
      adminClient.emails({ orderId: order.id }),
    ]);
    setFacts({
      reservations:
        reservations.status === 'fulfilled' ? reservations.value : errorMessage(reservations.reason),
      task:
        tasks.status === 'fulfilled'
          ? (tasks.value.find((task) => task.orderId === order.id) ?? null)
          : errorMessage(tasks.reason),
      flags: flags.status === 'fulfilled' ? flags.value.rows : [],
      flagFailures:
        flags.status === 'fulfilled' ? flags.value.failures : [errorMessage(flags.reason)],
      emails: emails.status === 'fulfilled' ? emails.value : errorMessage(emails.reason),
    });
  }, [order.id]);

  useEffect(() => {
    load();
  }, [load, order.status]);

  const refresh = async () => {
    await onChanged();
    await load();
  };

  const apply = async (action: Action) => {
    setBusy(true);
    try {
      if (action === 'operator') {
        await adminClient.operatorCancel(order.id);
        onResult({
          ok: true,
          message: `Order ${order.id} cancelled by operator. Payment void, reservation release and fulfilment abort follow asynchronously — Refresh to watch them land.`,
        });
      } else {
        const payment = await adminClient.expireAuthorization(order.id);
        onResult({
          ok: true,
          message: `Authorization for ${order.id} expired (payment ${payment.status}). The order cancellation follows via PaymentAuthorizationExpired — Refresh to watch it land.`,
        });
      }
    } catch (error) {
      onResult({ ok: false, message: errorMessage(error) });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
    await refresh();
  };

  const resolve = async (row: ServiceReconciliation, note: string) => {
    try {
      await adminClient.resolveReconciliation(row.service, row.orderId, note || undefined);
      onResult({ ok: true, message: `Resolved ${row.service} flag for ${row.orderId}.` });
    } catch (error) {
      onResult({ ok: false, message: errorMessage(error) });
    }
    await load();
  };

  const productName = (sku: string) =>
    order.items.find((line) => line.sku === sku)?.productName ?? sku;

  return (
    <div className="admin-console__detail">
      <button type="button" className="admin-console__link" onClick={onBack}>
        ← Back to orders
      </button>
      <h3>Order {order.id}</h3>
      <p>
        Customer:{' '}
        <button type="button" className="admin-console__link" onClick={onOpenCustomer}>
          {customerLabel}
        </button>
      </p>

      <dl className="admin-console__facts">
        <dt>Order status</dt>
        <dd>
          <span className={badge(order.status)}>{statusLabel(order.status)}</span>
        </dd>
        <dt>Fulfilment</dt>
        <dd>
          {facts === null
            ? '…'
            : typeof facts.task === 'string'
              ? facts.task
              : facts.task
                ? statusLabel(facts.task.state)
                : 'No task'}
        </dd>
        <dt>Total</dt>
        <dd>{formatPrice(order.totalCents)}</dd>
        <dt>Updated</dt>
        <dd>{formatWhen(order.updatedAt)}</dd>
      </dl>

      {order.status === 'authorized' ? (
        confirm ? (
          <div className="admin-console__confirm" role="group" aria-label="Confirm action">
            <p>
              {confirm === 'operator'
                ? 'Operator cancel this order?'
                : 'Expire the payment authorization now?'}{' '}
              The payment hold is voided, reservations released and a cancellation email sent.
            </p>
            <button
              type="button"
              disabled={busy}
              aria-label={`Confirm ${confirm === 'operator' ? 'operator cancel' : 'authorization expiry'} for ${order.id}`}
              onClick={() => apply(confirm)}
            >
              {confirm === 'operator' ? 'Confirm operator cancel' : 'Confirm expiry'}
            </button>
            <button type="button" onClick={() => setConfirm(null)}>
              Keep order
            </button>
          </div>
        ) : (
          <div className="admin-console__actions">
            <button
              type="button"
              aria-label={`Operator cancel ${order.id}`}
              onClick={() => setConfirm('operator')}
            >
              Operator cancel
            </button>
            <button
              type="button"
              aria-label={`Expire authorization for ${order.id}`}
              onClick={() => setConfirm('expire')}
            >
              Expire authorization now
            </button>
          </div>
        )
      ) : (
        <p className="admin-console__note">{refusalReason(order)}</p>
      )}

      <div className="admin-console__toolbar">
        <button type="button" onClick={refresh}>
          Refresh order
        </button>
      </div>

      <h4>Reservation ledger</h4>
      {facts === null ? (
        <p>Loading...</p>
      ) : typeof facts.reservations === 'string' ? (
        <p role="alert">{facts.reservations}</p>
      ) : facts.reservations.length === 0 ? (
        <p>No reservation lines.</p>
      ) : (
        <table className="admin-console__table" aria-label={`Reservations for ${order.id}`}>
          <thead>
            <tr>
              <th>Line</th>
              <th>Sku</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Reserved</th>
              <th>Released</th>
            </tr>
          </thead>
          <tbody>
            {facts.reservations.map((line) => (
              <tr key={line.orderItemId}>
                <td>{line.lineNo}</td>
                <td>{line.sku}</td>
                <td>{productName(line.sku)}</td>
                <td>{line.quantity}</td>
                <td>
                  <span className={badge(line.status)}>{statusLabel(line.status)}</span>
                </td>
                <td>{formatWhen(line.reservedAt)}</td>
                <td>{formatWhen(line.releasedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h4>Reconciliation</h4>
      {facts?.flagFailures.map((failure) => (
        <p key={failure} role="alert" className="admin-console__note">
          {failure}
        </p>
      ))}
      {facts === null ? (
        <p>Loading...</p>
      ) : facts.flags.length === 0 ? (
        <p>No reconciliation flags for this order.</p>
      ) : (
        <ReconciliationTable
          rows={facts.flags}
          label={`Reconciliation flags for ${order.id}`}
          onResolve={resolve}
        />
      )}

      <h4>Emails</h4>
      {facts === null ? (
        <p>Loading...</p>
      ) : typeof facts.emails === 'string' ? (
        <p role="alert">{facts.emails}</p>
      ) : (
        <EmailList emails={facts.emails} empty="No emails for this order." />
      )}
    </div>
  );
}

interface CustomerTableProps {
  orders: Order[];
  customerLabel: (customerId: string) => string;
  onOpenCustomer: (customerId: string) => void;
}

function CustomerTable({ orders, customerLabel, onOpenCustomer }: CustomerTableProps) {
  const counts = new Map<string, number>();
  orders.forEach((order) => counts.set(order.customerId, (counts.get(order.customerId) ?? 0) + 1));
  if (counts.size === 0) return <p>No customers with orders yet.</p>;
  return (
    <table className="admin-console__table" aria-label="Customers">
      <thead>
        <tr>
          <th>Customer</th>
          <th>Customer id</th>
          <th>Orders</th>
        </tr>
      </thead>
      <tbody>
        {[...counts.entries()].map(([customerId, count]) => (
          <tr key={customerId}>
            <td>
              <button
                type="button"
                className="admin-console__link"
                onClick={() => onOpenCustomer(customerId)}
              >
                {customerLabel(customerId)}
              </button>
            </td>
            <td>{customerId}</td>
            <td>{count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface CustomerDetailProps {
  customerId: string;
  label: string;
  account: UserAccount | null | undefined;
  orders: Order[];
  onOpenOrder: (orderId: string) => void;
  onBack: () => void;
}

function CustomerDetail({
  customerId,
  label,
  account,
  orders,
  onOpenOrder,
  onBack,
}: CustomerDetailProps) {
  const [emails, setEmails] = useState<SentEmail[] | string | null>(null);

  const load = useCallback(async () => {
    try {
      setEmails(await adminClient.emails({ customerId }));
    } catch (error) {
      setEmails(errorMessage(error));
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="admin-console__detail">
      <button type="button" className="admin-console__link" onClick={onBack}>
        ← Back to customers
      </button>
      <h3>{label}</h3>
      <p>
        {account === null
          ? 'Guest checkout — no user-service account. '
          : account
            ? `Signed up ${formatWhen(account.createdAt)} · `
            : ''}
        customer id {customerId}
      </p>

      <h4>Orders</h4>
      <table className="admin-console__table" aria-label={`Orders for ${label}`}>
        <thead>
          <tr>
            <th>Order</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <button
                  type="button"
                  className="admin-console__link"
                  onClick={() => onOpenOrder(order.id)}
                >
                  {order.id}
                </button>
              </td>
              <td>
                <span className={badge(order.status)}>{statusLabel(order.status)}</span>
              </td>
              <td>{formatPrice(order.totalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="admin-console__toolbar">
        <h4>Emails</h4>
        <button type="button" onClick={load}>
          Refresh emails
        </button>
      </div>
      {emails === null ? (
        <p>Loading...</p>
      ) : typeof emails === 'string' ? (
        <p role="alert">{emails}</p>
      ) : (
        <EmailList emails={emails} empty="No emails for this customer." />
      )}
    </div>
  );
}

function EmailList({ emails, empty }: { emails: SentEmail[]; empty: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (emails.length === 0) return <p>{empty}</p>;
  return (
    <ul className="admin-console__emails">
      {emails.map((email) => {
        const open = expanded === email.id;
        return (
          <li key={email.id} className="admin-console__email">
            <div className="admin-console__email-summary">
              <div>
                <strong>{email.subject}</strong>{' '}
                <span className={badge(email.status)}>{email.status}</span>
                <p>
                  {email.eventType}
                  {email.reason ? ` (${email.reason})` : ''} ·{' '}
                  {formatWhen(email.sentAt ?? email.createdAt)} · to{' '}
                  {email.recipientEmail ?? email.recipientKey} ({email.recipientType})
                  {email.error ? ` · ${email.error}` : ''}
                </p>
              </div>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`email-body-${email.id}`}
                onClick={() => setExpanded(open ? null : email.id)}
              >
                {open ? 'Hide email' : 'Show email'}
              </button>
            </div>
            {open && (
              <p id={`email-body-${email.id}`} className="admin-console__email-body">
                {email.body}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
