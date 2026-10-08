// Backend base URLs, one per Gluon service this app calls. Every generated
// service defaults to port 8080 (see gluon/docs/system-design.md's "Service
// discovery & ports") and there's no documented port map yet for running
// several of them on localhost at once — so there's no safe default to fall
// back to here. Set these in a local .env (gitignored) when running against
// real services; undefined until then. Swapping in k8s service DNS names per
// environment (see ADR 0007 in gluon/docs/adr/) is a config change here, not
// a code change.
export const CATALOG_SERVICE_URL = import.meta.env.VITE_CATALOG_SERVICE_URL;
export const CART_SERVICE_URL = import.meta.env.VITE_CART_SERVICE_URL;
export const ORDER_SERVICE_URL = import.meta.env.VITE_ORDER_SERVICE_URL;
export const INVENTORY_SERVICE_URL = import.meta.env.VITE_INVENTORY_SERVICE_URL;
export const PAYMENT_SERVICE_URL = import.meta.env.VITE_PAYMENT_SERVICE_URL;
