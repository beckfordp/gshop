import { INVENTORY_SERVICE_URL } from "./env";
import { checkHealth } from "./health";

// Thin client for inventory-service. Note: per system-design.md's "Sync
// vs. async boundaries", the only documented REST contract
// (`POST /inventorys/reservations`) is server-to-server (order-service
// calls it during checkout) — shopping likely never calls inventory-service
// directly; stock/reservation outcome reaches the UI via order-service's
// own status instead. Kept here for symmetry and in case a read-only
// stock-check screen is ever added; drop it if US work confirms it's
// unneeded.
export const inventoryClient = {
  baseUrl: INVENTORY_SERVICE_URL,
  health: () => checkHealth(INVENTORY_SERVICE_URL),
};
