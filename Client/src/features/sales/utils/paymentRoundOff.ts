/**
 * Indian POS / GST-style round-off: nearest whole rupee
 * (≥ ₹0.50 → up, else down).
 */
export function nearestRupee(amount: number): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/** Signed delta: rounded − raw (e.g. +0.40 or −0.30). */
export function roundOffDelta(amount: number): number {
  const raw = Number(amount);
  if (!Number.isFinite(raw)) return 0;
  return Math.round((nearestRupee(raw) - raw) * 100) / 100;
}

export type RoundedPayable = {
  /** Amount before round-off */
  preRound: number;
  /** Amount after nearest-rupee round-off (what customer pays) */
  payable: number;
  /** payable − preRound */
  roundOff: number;
};

export function roundPayable(amount: number): RoundedPayable {
  const preRound = Math.max(0, Number(amount) || 0);
  const payable = nearestRupee(preRound);
  const roundOff = Math.round((payable - preRound) * 100) / 100;
  return { preRound, payable, roundOff };
}
