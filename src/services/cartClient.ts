import { CART_SERVICE_URL } from "./env";
import { checkHealth } from "./health";

// Thin client for cart-service (Redis-only, no Postgres — see
// gluon/backlogs/cart-service.md). Add/remove endpoints exist
// (gluon/services/cart-service/src/main/scala/cartservice/CartRoutes.scala)
// but aren't yet pinned in system-design.md's REST contracts section — add
// real methods here against the service's own /docs once US-2's cart
// screen is actually built.
export const cartClient = {
  baseUrl: CART_SERVICE_URL,
  health: () => checkHealth(CART_SERVICE_URL),
};
