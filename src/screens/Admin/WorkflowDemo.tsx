import { useState } from 'react';
import { formatPrice } from '../../lib/format';
import {
  emailsForCustomer,
  orderById,
  reservationsForOrder,
  userById,
  workflowDemoStore,
  type DemoMutationResult,
  type DemoOrder,
  type DemoSnapshot,
  type DemoUser,
  type WorkflowDemoStore,
} from '../../services/workflowDemo';
import './WorkflowDemo.css';

interface WorkflowDemoProps {
  store?: WorkflowDemoStore;
}

type Tab = 'orders' | 'customers';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString();
}

function refusalReason(order: DemoOrder): string {
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

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export default function WorkflowDemo({ store = workflowDemoStore }: WorkflowDemoProps = {}) {
  const [snapshot, setSnapshot] = useState<DemoSnapshot>(() => store.snapshot());
  const [tab, setTab] = useState<Tab>('customers');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    orderId: string;
    reason: 'operator' | 'auth_expired';
  } | null>(null);
  const [result, setResult] = useState<DemoMutationResult | null>(null);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  const selectedOrder = selectedOrderId ? orderById(snapshot, selectedOrderId) : undefined;
  const selectedCustomer = selectedCustomerId ? userById(snapshot, selectedCustomerId) : undefined;

  const refresh = () => setSnapshot(store.snapshot());

  const reset = () => {
    store.reset();
    refresh();
    setConfirm(null);
    setResult(null);
    setExpandedEmailId(null);
    setSelectedOrderId(null);
    setSelectedCustomerId(null);
  };

  const apply = (reason: 'operator' | 'auth_expired') => {
    if (!confirm) {
      return;
    }
    setResult(store.cancel(confirm.orderId, reason));
    refresh();
    setConfirm(null);
  };

  const openCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setTab('customers');
  };

  const openOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setTab('orders');
  };

  const customerName = (customerId: string) =>
    userById(snapshot, customerId)?.name ?? customerId;

  return (
    <section className="workflow-demo" aria-labelledby="workflow-demo-heading">
      <div className="workflow-demo__header">
        <div>
          <h2 id="workflow-demo-heading">Workflow demo</h2>
          <p className="workflow-demo__note">
            Prototype — mock data. Cancelling here simulates the order/payment/inventory/
            fulfilment/notification fan-out; it does not touch the real cluster.
          </p>
        </div>
        <button type="button" onClick={reset}>
          Reset demo
        </button>
      </div>

      <div className="workflow-demo__tabs" role="tablist" aria-label="Workflow demo views">
        <button
          type="button"
          role="tab"
          id="workflow-customers-tab"
          aria-selected={tab === 'customers'}
          aria-controls="workflow-customers-panel"
          onClick={() => setTab('customers')}
        >
          Customers
        </button>
        <button
          type="button"
          role="tab"
          id="workflow-orders-tab"
          aria-selected={tab === 'orders'}
          aria-controls="workflow-orders-panel"
          onClick={() => setTab('orders')}
        >
          Orders
        </button>
      </div>

      {result && (
        <p
          className={`workflow-demo__result ${
            result.ok ? 'workflow-demo__result--ok' : 'workflow-demo__result--error'
          }`}
          role={result.ok ? 'status' : 'alert'}
        >
          {result.message}
        </p>
      )}

      {tab === 'orders' && (
        <div
          id="workflow-orders-panel"
          role="tabpanel"
          aria-labelledby="workflow-orders-tab"
          className="workflow-demo__panel"
        >
          {selectedOrder ? (
            <OrderDetail
              order={selectedOrder}
              customerName={customerName(selectedOrder.customerId)}
              reservations={reservationsForOrder(snapshot, selectedOrder.id)}
              confirm={confirm}
              onBack={() => {
                setSelectedOrderId(null);
                setConfirm(null);
              }}
              onOpenCustomer={() => openCustomer(selectedOrder.customerId)}
              onAskCancel={(reason) => setConfirm({ orderId: selectedOrder.id, reason })}
              onConfirm={apply}
              onDismiss={() => setConfirm(null)}
            />
          ) : (
            <OrderTable
              snapshot={snapshot}
              customerName={customerName}
              onOpenOrder={setSelectedOrderId}
            />
          )}
        </div>
      )}

      {tab === 'customers' && (
        <div
          id="workflow-customers-panel"
          role="tabpanel"
          aria-labelledby="workflow-customers-tab"
          className="workflow-demo__panel"
        >
          {selectedCustomer ? (
            <CustomerDetail
              customer={selectedCustomer}
              snapshot={snapshot}
              expandedEmailId={expandedEmailId}
              onToggleEmail={(id) => setExpandedEmailId((current) => (current === id ? null : id))}
              onOpenOrder={openOrder}
              onBack={() => setSelectedCustomerId(null)}
            />
          ) : (
            <CustomerTable
              snapshot={snapshot}
              orderCount={(userId) =>
                snapshot.orders.filter((order) => order.customerId === userId).length
              }
              onOpenCustomer={setSelectedCustomerId}
            />
          )}
        </div>
      )}
    </section>
  );
}

function badge(status: string): string {
  return `workflow-demo__badge workflow-demo__badge--${status.replace(/_/g, '-')}`;
}

interface OrderTableProps {
  snapshot: DemoSnapshot;
  customerName: (customerId: string) => string;
  onOpenOrder: (orderId: string) => void;
}

function OrderTable({ snapshot, customerName, onOpenOrder }: OrderTableProps) {
  return (
    <table className="workflow-demo__table" aria-label="Prototype orders">
      <thead>
        <tr>
          <th>Order</th>
          <th>Customer</th>
          <th>Status</th>
          <th>Payment</th>
          <th>Fulfilment</th>
          <th>Total</th>
          <th>Authorization expires</th>
        </tr>
      </thead>
      <tbody>
        {snapshot.orders.map((order) => (
          <tr key={order.id}>
            <td>
              <button
                type="button"
                className="workflow-demo__link"
                onClick={() => onOpenOrder(order.id)}
              >
                {order.id}
              </button>
            </td>
            <td>{customerName(order.customerId)}</td>
            <td>
              <span className={badge(order.status)}>{statusLabel(order.status)}</span>
            </td>
            <td>{order.paymentStatus}</td>
            <td>{statusLabel(order.fulfilmentState)}</td>
            <td>{formatPrice(order.totalCents)}</td>
            <td>{order.authExpiresAt ? formatWhen(order.authExpiresAt) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface OrderDetailProps {
  order: DemoOrder;
  customerName: string;
  reservations: ReturnType<typeof reservationsForOrder>;
  confirm: { orderId: string; reason: 'operator' | 'auth_expired' } | null;
  onBack: () => void;
  onOpenCustomer: () => void;
  onAskCancel: (reason: 'operator' | 'auth_expired') => void;
  onConfirm: (reason: 'operator' | 'auth_expired') => void;
  onDismiss: () => void;
}

function OrderDetail({
  order,
  customerName,
  reservations,
  confirm,
  onBack,
  onOpenCustomer,
  onAskCancel,
  onConfirm,
  onDismiss,
}: OrderDetailProps) {
  return (
    <div className="workflow-demo__detail">
      <button type="button" className="workflow-demo__link" onClick={onBack}>
        ← Back to orders
      </button>
      <h3>Order {order.id}</h3>
      <p>
        Customer:{' '}
        <button type="button" className="workflow-demo__link" onClick={onOpenCustomer}>
          {customerName}
        </button>
      </p>

      <dl className="workflow-demo__facts">
        <dt>Order status</dt>
        <dd>
          <span className={badge(order.status)}>{statusLabel(order.status)}</span>
        </dd>
        <dt>Payment</dt>
        <dd>{order.paymentStatus}</dd>
        <dt>Fulfilment</dt>
        <dd>{statusLabel(order.fulfilmentState)}</dd>
        <dt>Authorization expires</dt>
        <dd>{order.authExpiresAt ? formatWhen(order.authExpiresAt) : '—'}</dd>
        <dt>Total</dt>
        <dd>{formatPrice(order.totalCents)}</dd>
      </dl>

      <h4>Reservation ledger</h4>
      <table className="workflow-demo__table" aria-label={`Reservations for ${order.id}`}>
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
          {reservations.map((line) => (
            <tr key={line.orderItemId}>
              <td>{line.lineNo}</td>
              <td>{line.sku}</td>
              <td>{line.productName}</td>
              <td>{line.quantity}</td>
              <td>
                <span className={badge(line.status)}>{statusLabel(line.status)}</span>
              </td>
              <td>{formatWhen(line.reservedAt)}</td>
              <td>{line.releasedAt ? formatWhen(line.releasedAt) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {order.status === 'authorized' ? (
        confirm?.orderId === order.id ? (
          <div className="workflow-demo__confirm" role="group" aria-label="Confirm cancellation">
            <p>
              {confirm.reason === 'operator'
                ? 'Operator cancel this order?'
                : 'Simulate the authorization expiring now?'}{' '}
              Payment will be voided, reservation lines released, and a cancellation email
              queued.
            </p>
            <button
              type="button"
              aria-label={`Confirm ${confirm.reason} cancellation for ${order.id}`}
              onClick={() => onConfirm(confirm.reason)}
            >
              {confirm.reason === 'operator' ? 'Confirm operator cancel' : 'Confirm simulated timeout'}
            </button>
            <button type="button" onClick={onDismiss}>
              Keep order
            </button>
          </div>
        ) : (
          <div className="workflow-demo__actions">
            <button
              type="button"
              aria-label={`Operator cancel ${order.id}`}
              onClick={() => onAskCancel('operator')}
            >
              Operator cancel
            </button>
            <button
              type="button"
              aria-label={`Simulate authorization timeout for ${order.id}`}
              onClick={() => onAskCancel('auth_expired')}
            >
              Simulate authorization timeout
            </button>
          </div>
        )
      ) : (
        <p className="workflow-demo__note">{refusalReason(order)}</p>
      )}
    </div>
  );
}

interface CustomerTableProps {
  snapshot: DemoSnapshot;
  orderCount: (userId: string) => number;
  onOpenCustomer: (customerId: string) => void;
}

function CustomerTable({ snapshot, orderCount, onOpenCustomer }: CustomerTableProps) {
  return (
    <table className="workflow-demo__table" aria-label="Prototype customers">
      <thead>
        <tr>
          <th>Customer</th>
          <th>Email</th>
          <th>Orders</th>
        </tr>
      </thead>
      <tbody>
        {snapshot.users.map((user) => (
          <tr key={user.id}>
            <td>
              <button
                type="button"
                className="workflow-demo__link"
                onClick={() => onOpenCustomer(user.id)}
              >
                {user.name}
              </button>
            </td>
            <td>{user.email}</td>
            <td>{orderCount(user.id)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface CustomerDetailProps {
  customer: DemoUser;
  snapshot: DemoSnapshot;
  expandedEmailId: string | null;
  onToggleEmail: (emailId: string) => void;
  onOpenOrder: (orderId: string) => void;
  onBack: () => void;
}

function CustomerDetail({
  customer,
  snapshot,
  expandedEmailId,
  onToggleEmail,
  onOpenOrder,
  onBack,
}: CustomerDetailProps) {
  const orders = snapshot.orders.filter((order) => order.customerId === customer.id);
  const emails = emailsForCustomer(snapshot, customer);

  return (
    <div className="workflow-demo__detail">
      <button type="button" className="workflow-demo__link" onClick={onBack}>
        ← Back to customers
      </button>
      <h3>{customer.name}</h3>
      <p>
        {customer.email} · customer id {customer.id}
      </p>

      <h4>Orders</h4>
      <table className="workflow-demo__table" aria-label={`Orders for ${customer.name}`}>
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
                  className="workflow-demo__link"
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

      <h4>Emails</h4>
      {emails.length === 0 && <p>No emails for this customer.</p>}
      <ul className="workflow-demo__emails">
        {emails.map((email) => {
          const expanded = expandedEmailId === email.id;
          return (
            <li key={email.id} className="workflow-demo__email">
              <div className="workflow-demo__email-summary">
                <div>
                  <strong>{email.subject}</strong>
                  <p>
                    {email.eventType} · {formatWhen(email.sentAt)} · to {email.to} (
                    {email.recipient})
                  </p>
                </div>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`email-body-${email.id}`}
                  onClick={() => onToggleEmail(email.id)}
                >
                  {expanded ? 'Hide email' : 'Show email'}
                </button>
              </div>
              {expanded && (
                <p id={`email-body-${email.id}`} className="workflow-demo__email-body">
                  {email.body}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
