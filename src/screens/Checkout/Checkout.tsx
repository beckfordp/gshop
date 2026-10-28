import { useEffect, useRef, useState } from 'react';
import { cartClient } from '../../services/cartClient';
import { clearCartId, getStoredCartId } from '../../services/cartId';
import { getOrCreateCustomerId } from '../../services/customerId';
import { checkoutGateway } from '../../services/checkoutGateway';
import { setMockScenario, type MockScenario } from '../../services/checkoutMock';
import { AUTH_MOCK_ENABLED, CHECKOUT_MOCK_ENABLED } from '../../services/env';
import { getSession, signOut } from '../../services/mockAuth';
import {
  getCheckoutAddress,
  saveCheckoutAddress,
  type SavedCheckoutAddress,
} from '../../services/savedAddress';
import type { AuthSession } from '../../services/authTypes';
import Auth from '../Auth/Auth';
import type { NewOrderItem, Order } from '../../services/orderClient';
import type { ReservationFailure } from '../../services/checkoutTypes';
import { errorMessage, formatPrice } from '../../lib/format';
import WatchArt from '../../components/WatchArt/WatchArt';
import AddressFields from './AddressFields';
import {
  EMPTY_ADDRESS,
  normalizeCardNumber,
  toAddress,
  toAddressValues,
  validateCheckout,
  type AddressValues,
  type CheckoutErrors,
  type CheckoutFormValues,
} from './validation';
import './Checkout.css';

interface CheckoutProps {
  items: NewOrderItem[];
  onOrderPlaced: (order: Order) => void;
  onBackToCart: () => void;
}

type Failure =
  | { kind: 'declined'; reason: string }
  | { kind: 'stock_unavailable'; failures: ReservationFailure[] }
  | { kind: 'request'; message: string };

const initialForm: CheckoutFormValues = {
  shipping: EMPTY_ADDRESS,
  sameAsShipping: true,
  billing: EMPTY_ADDRESS,
  cardNumber: '',
  expiry: '',
};

function formFromSaved(saved: SavedCheckoutAddress): CheckoutFormValues {
  return {
    shipping: toAddressValues(saved.shipping),
    sameAsShipping: saved.sameAsShipping,
    billing: toAddressValues(saved.billing),
    cardNumber: '',
    expiry: '',
  };
}

export default function Checkout({ items: initialItems, onOrderPlaced, onBackToCart }: CheckoutProps) {
  const [items, setItems] = useState<NewOrderItem[]>(initialItems);
  const [form, setForm] = useState<CheckoutFormValues>(() => {
    const session = AUTH_MOCK_ENABLED ? getSession() : null;
    const saved = session
      ? getCheckoutAddress(session.user.userId)
      : null;
    return saved ? formFromSaved(saved) : initialForm;
  });
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [scenario, setScenario] = useState<MockScenario>('normal');
  const [authSession, setAuthSession] = useState<AuthSession | null>(() =>
    AUTH_MOCK_ENABLED ? getSession() : null,
  );
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const authDialogRef = useRef<HTMLDivElement>(null);
  const authTriggerRef = useRef<HTMLElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (submitted) {
      setErrors(validateCheckout(form));
    }
  }, [form, submitted]);

  useEffect(() => {
    if (failure) {
      alertRef.current?.focus();
    }
  }, [failure]);

  // A signed-in user's saved address prefills checkout after sign-in, but
  // never overwrites an address the customer has already started typing.
  useEffect(() => {
    if (!authSession) {
      return;
    }
    const saved = getCheckoutAddress(authSession.user.userId);
    if (!saved) {
      return;
    }
    setForm((prev) =>
      prev.shipping.line1.trim() ? prev : formFromSaved(saved),
    );
  }, [authSession]);

  // Modal semantics for the auth dialog: Esc closes it, Tab cycles inside it,
  // and closing returns focus to whatever opened it. The Auth screen moves
  // focus to its own heading on mount.
  useEffect(() => {
    if (!authMode) {
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setAuthMode(null);
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }
      const items = Array.from(
        authDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled])',
        ) ?? [],
      );
      if (items.length === 0) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      (authTriggerRef.current ?? previous)?.focus();
    };
  }, [authMode]);

  const updateAddress = (prefix: 'shipping' | 'billing', field: keyof AddressValues, value: string) => {
    setForm((prev) => ({
      ...prev,
      [prefix]: { ...prev[prefix], [field]: value },
    }));
  };

  const handleSameAsShipping = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      sameAsShipping: checked,
      // Unchecking seeds billing with the current shipping address; any
      // subsequent edits are kept until the box is unchecked again.
      ...(checked ? {} : { billing: { ...prev.shipping } }),
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || items.length === 0) {
      return;
    }

    setSubmitted(true);
    const nextErrors = validateCheckout(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setTimeout(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      }, 0);
      return;
    }

    setFailure(null);
    setSubmitting(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await checkoutGateway.submit(
        {
          customerId: authSession?.user.userId ?? getOrCreateCustomerId(),
          items,
          shippingAddress: toAddress(form.shipping),
          billingAddress: toAddress(form.sameAsShipping ? form.shipping : form.billing),
          card: {
            cardNumber: normalizeCardNumber(form.cardNumber),
            expiry: form.expiry.trim(),
          },
        },
        { signal: controller.signal },
      );

      if (controller.signal.aborted) {
        return;
      }

      if (result.kind === 'authorized') {
        if (authSession) {
          saveCheckoutAddress(authSession.user.userId, {
            shipping: toAddress(form.shipping),
            billing: toAddress(
              form.sameAsShipping ? form.shipping : form.billing,
            ),
            sameAsShipping: form.sameAsShipping,
          });
        }
        clearCartId();
        onOrderPlaced(result.order);
        return;
      }

      setFailure(result);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setFailure({ kind: 'request', message: errorMessage(error) });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setSubmitting(false);
      }
    }
  };

  const handleRemoveFailedItem = async (sku: string) => {
    const cartId = getStoredCartId();
    try {
      if (cartId) {
        await cartClient.removeItem(cartId, sku);
      }
      setItems((prev) => prev.filter((item) => item.sku !== sku));
      setFailure((prev) => {
        if (prev?.kind !== 'stock_unavailable') {
          return prev;
        }
        const failures = prev.failures.filter((failure) => failure.sku !== sku);
        return failures.length > 0 ? { kind: 'stock_unavailable', failures } : null;
      });
    } catch (error) {
      setFailure({ kind: 'request', message: errorMessage(error) });
    }
  };

  const handleSignOut = () => {
    signOut();
    setAuthSession(null);
  };

  const total = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );

  return (
    <div className="checkout">
      <h1 ref={headingRef} tabIndex={-1}>
        Checkout
      </h1>

      {items.length === 0 ? (
        <div>
          <p>Your cart is empty.</p>
          <button type="button" onClick={onBackToCart}>
            Back to Cart
          </button>
        </div>
      ) : (
        <form
          ref={formRef}
          className="checkout__form"
          noValidate
          onSubmit={handleSubmit}
          aria-busy={submitting}
        >
          {AUTH_MOCK_ENABLED && (
            <section className="checkout-auth-banner" aria-label="Account">
              {authSession ? (
                <>
                  <div>
                    <p className="checkout-auth-banner__title">
                      Signed in as {authSession.user.email}
                    </p>
                    <p className="checkout-auth-banner__subtitle">
                      Your orders are saved to this account.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="checkout-auth-banner__secondary"
                    onClick={handleSignOut}
                    disabled={submitting}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <p className="checkout-auth-banner__title">
                      Have an account?
                    </p>
                    <p className="checkout-auth-banner__subtitle">
                      Sign in for faster checkout and order history.
                    </p>
                  </div>
                  <div className="checkout-auth-banner__actions">
                    <button
                      type="button"
                      className="checkout-auth-banner__primary"
                      onClick={(event) => {
                        authTriggerRef.current = event.currentTarget;
                        setAuthMode('signin');
                      }}
                      disabled={submitting}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      className="checkout-auth-banner__secondary"
                      onClick={(event) => {
                        authTriggerRef.current = event.currentTarget;
                        setAuthMode('signup');
                      }}
                      disabled={submitting}
                    >
                      Create account
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {failure && (
            <div
              ref={alertRef}
              className="checkout-alert"
              role="alert"
              tabIndex={-1}
              data-kind={failure.kind}
            >
              {failure.kind === 'declined' && (
                <p>
                  Payment declined: {failure.reason}. Try another card and submit
                  again.
                </p>
              )}
              {failure.kind === 'stock_unavailable' && (
                <div className="checkout-alert__reservation">
                  <p>The following items could not be reserved:</p>
                  <ul className="checkout-alert__lines">
                    {failure.failures.map((failed) => {
                      const name =
                        items.find((item) => item.sku === failed.sku)?.productName ??
                        failed.sku;
                      return (
                        <li key={failed.sku} className="checkout-alert__line">
                          <span>
                            {name}: {describeReservationReason(failed.reason)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFailedItem(failed.sku)}
                            disabled={submitting}
                          >
                            Remove {name} from cart
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p>Remove the unavailable items, then submit again.</p>
                </div>
              )}
              {failure.kind === 'request' && <p>{failure.message}</p>}
            </div>
          )}

          <div className="checkout__layout">
            <div className="checkout__fields">
              <fieldset className="checkout-section" disabled={submitting}>
                <legend className="checkout-section__legend">Shipping address</legend>
                <AddressFields
                  idPrefix="shipping"
                  value={form.shipping}
                  errors={errors.shipping ?? {}}
                  disabled={submitting}
                  onChange={(field, value) => updateAddress('shipping', field, value)}
                />
              </fieldset>

              <fieldset className="checkout-section" disabled={submitting}>
                <legend className="checkout-section__legend">Billing address</legend>
                <label className="checkout-checkbox">
                  <input
                    type="checkbox"
                    checked={form.sameAsShipping}
                    disabled={submitting}
                    aria-controls="billing-address-fields"
                    onChange={(event) => handleSameAsShipping(event.target.checked)}
                  />
                  Billing address same as shipping
                </label>
                {!form.sameAsShipping && (
                  <div id="billing-address-fields">
                    <AddressFields
                      idPrefix="billing"
                      value={form.billing}
                      errors={errors.billing ?? {}}
                      disabled={submitting}
                      onChange={(field, value) => updateAddress('billing', field, value)}
                    />
                  </div>
                )}
              </fieldset>

              <fieldset className="checkout-section" disabled={submitting}>
                <legend className="checkout-section__legend">Payment</legend>
                <div className="checkout-field">
                  <label className="checkout-field__label" htmlFor="checkout-card-number">
                    Card number
                  </label>
                  <input
                    id="checkout-card-number"
                    className="checkout-field__input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    spellCheck={false}
                    placeholder="4242 4242 4242 4242"
                    value={form.cardNumber}
                    disabled={submitting}
                    aria-invalid={errors.cardNumber ? true : undefined}
                    aria-describedby={
                      errors.cardNumber ? 'checkout-card-number-error' : undefined
                    }
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, cardNumber: event.target.value }))
                    }
                  />
                  {errors.cardNumber && (
                    <p className="checkout-field__error" id="checkout-card-number-error">
                      {errors.cardNumber}
                    </p>
                  )}
                </div>

                <div className="checkout-field">
                  <label className="checkout-field__label" htmlFor="checkout-expiry">
                    Expiry date
                  </label>
                  <input
                    id="checkout-expiry"
                    className="checkout-field__input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    value={form.expiry}
                    disabled={submitting}
                    aria-invalid={errors.expiry ? true : undefined}
                    aria-describedby={errors.expiry ? 'checkout-expiry-error' : undefined}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, expiry: event.target.value }))
                    }
                  />
                  {errors.expiry && (
                    <p className="checkout-field__error" id="checkout-expiry-error">
                      {errors.expiry}
                    </p>
                  )}
                </div>
              </fieldset>
            </div>

            <aside className="checkout-summary" aria-label="Order summary">
              <h2>Order summary</h2>
              <ul className="checkout-summary__list">
                {items.map((item) => (
                  <li key={item.sku} className="checkout-summary__line">
                    <WatchArt sku={item.sku} name={item.productName} size={40} />
                    <span className="checkout-summary__details">
                      {item.productName} — qty {item.quantity}
                    </span>
                    <span>{formatPrice(item.unitPriceCents * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <p className="checkout-summary__total">Total: {formatPrice(total)}</p>

              {CHECKOUT_MOCK_ENABLED && (
                <div className="checkout-prototype">
                  <label htmlFor="checkout-mock-scenario">Prototype scenario</label>
                  <select
                    id="checkout-mock-scenario"
                    value={scenario}
                    disabled={submitting}
                    onChange={(event) => {
                      const next = event.target.value as MockScenario;
                      setScenario(next);
                      setMockScenario(next);
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="items_unavailable">Some items unavailable</option>
                    <option value="card_declined">Card declined</option>
                    <option value="service_error">Service error</option>
                  </select>
                </div>
              )}

              <button className="checkout-submit" type="submit" disabled={submitting}>
                {submitting ? 'Placing order...' : 'Place order'}
              </button>
              {submitting && <p role="status">Placing order...</p>}
              <button
                className="checkout-back"
                type="button"
                onClick={onBackToCart}
                disabled={submitting}
              >
                Back to Cart
              </button>
            </aside>
          </div>
        </form>
      )}

      {authMode && (
        <div
          className="auth-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAuthMode(null);
            }
          }}
        >
          <div
            ref={authDialogRef}
            className="auth-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
          >
            <Auth
              initialMode={authMode}
              onAuthenticated={(session) => {
                setAuthSession(session);
                setAuthMode(null);
              }}
              onBack={() => setAuthMode(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function describeReservationReason(reason: string): string {
  switch (reason) {
    case 'insufficient_stock':
      return 'insufficient stock';
    case 'unknown_sku':
      return 'unknown item';
    default:
      return reason;
  }
}
