import { PAYMENT_SERVICE_URL } from "./env";
import { checkHealth } from "./health";

// Thin client for payment-service. Per system-design.md, payment-service is
// fully event-driven today (consumes `order.reserved`, publishes
// `payment.settled`/`payment.failed` — no documented frontend-facing REST
// contract yet) — shopping likely sees payment outcome via order-service's
// status, not a direct call here. Kept for symmetry; drop or fill in once
// a real read endpoint is confirmed in the service's own /docs.
export const paymentClient = {
  baseUrl: PAYMENT_SERVICE_URL,
  health: () => checkHealth(PAYMENT_SERVICE_URL),
};
