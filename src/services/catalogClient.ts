import { CATALOG_SERVICE_URL } from "./env";
import { checkHealth } from "./health";

// Thin client for catalog-service. Browse/list endpoints exist
// (gluon/services/catalog-service/src/main/scala/catalogservice/CatalogRoutes.scala)
// but aren't yet pinned in gluon/docs/system-design.md's REST contracts
// section (that section only documents cross-service calls so far) — add
// real methods here against the service's own tapir-generated /docs
// (Swagger) once US-1's browse screen is actually built, rather than
// guessing the shape now.
export const catalogClient = {
  baseUrl: CATALOG_SERVICE_URL,
  health: () => checkHealth(CATALOG_SERVICE_URL),
};
