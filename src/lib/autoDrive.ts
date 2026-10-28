// Demo affordance for the operator queue: a toggle that advances tasks
// automatically by calling the real fulfilment-service endpoints. The
// occasional simulated failure keeps the DispatchFailed path visible without
// manual clicks — it is a demo, not a warehouse integration.

export const AUTO_DRIVE_INTERVAL_MS = 3000;

export const AUTO_DRIVE_FAILURE_PROBABILITY = 0.25;

export const AUTO_DRIVE_FAILURE_REASON =
  'Auto-drive simulated warehouse failure';

export function shouldAutoFail(): boolean {
  return Math.random() < AUTO_DRIVE_FAILURE_PROBABILITY;
}
