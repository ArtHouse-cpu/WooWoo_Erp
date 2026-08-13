/**
 * Indian POS / GST-style round-off: nearest whole rupee on the
 * final payable total (≥ ₹0.50 → up, else down).
 * Line items stay in paise; only the bill total is rounded.
 */

/** Snap to 2 decimal places (paise) to avoid float drift before round-off. */
export function roundToPaise(amount: number): number {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function nearestRupee(amount: number): number {
  const n = roundToPaise(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/** Signed delta: rounded − raw (e.g. +0.40 or −0.30). */
export function roundOffDelta(amount: number): number {
  const raw = roundToPaise(amount);
  if (!Number.isFinite(raw)) return 0;
  return roundToPaise(nearestRupee(raw) - raw);
}

export type RoundedPayable = {
  /** Amount before round-off (paise-precise) */
  preRound: number;
  /** Amount after nearest-rupee round-off (what customer pays) */
  payable: number;
  /** payable − preRound */
  roundOff: number;
};

/** Round off the final bill / payable total only. */
export function roundPayable(amount: number): RoundedPayable {
  const preRound = Math.max(0, roundToPaise(amount));
  const payable = nearestRupee(preRound);
  const roundOff = roundToPaise(payable - preRound);
  return { preRound, payable, roundOff };
}
