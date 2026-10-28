// Simulated carrier tracking numbers for the operator dispatch form. These
// are demo placeholders shaped like each carrier's real format — nothing is
// validated against a carrier and nothing leaves the local cluster.

export const CARRIERS = ['DHL', 'UPS', 'EVRI'] as const;

export type Carrier = (typeof CARRIERS)[number];

const DIGITS = '0123456789';
const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomFrom(alphabet: string, length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function generateTrackingNo(carrier: Carrier): string {
  switch (carrier) {
    case 'DHL':
      return randomFrom(DIGITS, 10);
    case 'UPS':
      return `1Z${randomFrom(ALPHANUMERIC, 16)}`;
    case 'EVRI':
      return randomFrom(DIGITS, 16);
  }
}
