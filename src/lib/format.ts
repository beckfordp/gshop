export function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`;
}

export function errorMessage(error: unknown): string {
  // `error` is `unknown` under strict mode; narrow safely rather than
  // asserting, since a rejected promise isn't guaranteed to be an Error.
  return error instanceof Error ? error.message : String(error);
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
