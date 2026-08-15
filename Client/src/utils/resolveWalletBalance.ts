/**
 * Spendable wallet total = withdrawable + nonWithdrawable.
 * Total is always derived; never treat a stored total as an independent bucket.
 */
export function resolveWalletBalance(
  wallet: Record<string, unknown> | null | undefined,
  fallback = 0,
): number {
  if (!wallet || typeof wallet !== "object") {
    return Number.isFinite(Number(fallback)) ? Math.max(0, Number(fallback)) : 0;
  }

  const toNum = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const withdrawable = toNum(
    wallet.withdrawable ?? wallet.withdrawableBalance,
  );
  const nonWithdrawable = toNum(wallet.nonWithdrawable);

  if (wallet.withdrawable != null || wallet.nonWithdrawable != null) {
    const w =
      withdrawable ??
      toNum(wallet.affiliateBalance) ??
      0;
    const nw = nonWithdrawable ?? toNum(wallet.cashbackBalance) ?? 0;
    return Math.max(0, w + nw);
  }

  const total = toNum(wallet.totalBalance);
  if (total != null) return Math.max(0, total);

  const affiliate = toNum(wallet.affiliateBalance) ?? 0;
  const cashback = toNum(wallet.cashbackBalance) ?? 0;
  const general = toNum(wallet.generalBalance);

  if (wallet.generalBalance !== undefined && general != null) {
    return Math.max(0, general + cashback + affiliate);
  }

  const amount = toNum(
    wallet.walletAmount ??
      wallet.balance ??
      wallet.currentBalance ??
      wallet.availableBalance ??
      wallet.closingBalance ??
      fallback,
  );

  // Legacy customer docs: walletAmount is general-only.
  if (wallet.cashbackBalance !== undefined || wallet.affiliateBalance !== undefined) {
    return Math.max(0, (amount ?? 0) + cashback + affiliate);
  }

  return Math.max(0, amount ?? (Number.isFinite(Number(fallback)) ? Number(fallback) : 0));
}
