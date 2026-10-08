// Every Gluon service generator includes a `GET /health` endpoint (see
// e.g. gluon/services/catalog-service/src/main/scala/catalogservice/HealthRoutes.scala)
// — a safe, confirmed-real connectivity check reused by every client below.
export async function checkHealth(baseUrl: string | undefined): Promise<boolean> {
  if (!baseUrl) return false;
  const res = await fetch(`${baseUrl}/health`);
  return res.ok;
}
