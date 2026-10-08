import { ORDER_SERVICE_URL } from "./env";
import { checkHealth } from "./health";

// Thin client for order-service. Checkout (US-3.1) and order-history
// (US-8.1) endpoints exist
// (gluon/services/order-service/src/main/scala/orderservice/OrderRoutes.scala)
// but aren't yet pinned in system-design.md's REST contracts section — add
// real methods here against the service's own /docs once US-3/US-8's
// checkout and order-status screens are actually built.
export const orderClient = {
  baseUrl: ORDER_SERVICE_URL,
  health: () => checkHealth(ORDER_SERVICE_URL),
};
