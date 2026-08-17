import {useEffect, useMemo, useState} from 'react';
import {
  Banknote,
  Check,
  CreditCard,
  Gift,
  Loader2,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {useAppSelector} from '@/store/hooks';
import {handleCreateReturnSale} from '@/services/apiClient';
import {
  buildReturnLines,
  computeReturnPreview,
  roundMoney,
  withGiftFlag,
  withUpdatedQty,
  type SelectedReturnLine,
} from '@/features/sales/utils/salesReturn';

type Intent = 'return' | 'cancel';
type SplitKey = 'cash' | 'upi' | 'card' | 'wallet';
type SplitPayments = Record<SplitKey, number>;

const EMPTY_SPLIT: SplitPayments = {cash: 0, upi: 0, card: 0, wallet: 0};

const MODE_OPTIONS = [
  {id: 'Cash', key: 'cash' as SplitKey, icon: Banknote, color: 'text-green-600'},
  {id: 'UPI', key: 'upi' as SplitKey, icon: Smartphone, color: 'text-indigo-600'},
  {id: 'Card', key: 'card' as SplitKey, icon: CreditCard, color: 'text-blue-600'},
  {id: 'Wallet', key: 'wallet' as SplitKey, icon: Wallet, color: 'text-amber-600'},
] as const;

type Props = {
  open: boolean;
  invoice: any;
  intent: Intent;
  onClose: () => void;
  onSuccess: () => void;
};

function formatInr(value: number) {
  return roundMoney(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SalesReturnFlowModal({
  open,
  invoice,
  intent,
  onClose,
  onSuccess,
}: Props) {
  const staff = useAppSelector(state => state.user);
  const [step, setStep] = useState<'items' | 'refund'>('items');
  const [lines, setLines] = useState<SelectedReturnLine[]>([]);
  const [refundMode, setRefundMode] = useState<'Wallet' | 'Cash' | 'UPI' | 'Card' | 'MULTI'>(
    'Wallet',
  );
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayments>(EMPTY_SPLIT);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !invoice) return;
    const next = buildReturnLines(invoice);
    setLines(
      intent === 'cancel'
        ? next.map(line => ({
            ...line,
            selected: line.remainingQty > 0,
            returnQty: line.remainingQty,
          }))
        : next.map(line => ({
            ...line,
            selected: line.remainingQty > 0,
          })),
    );
    setStep('items');
    setRefundMode('Wallet');
    setIsMultiMode(false);
    setSplitPayments(EMPTY_SPLIT);
    setLoading(false);
  }, [open, invoice, intent]);

  const preview = useMemo(() => computeReturnPreview(invoice, lines), [invoice, lines]);
  const splitTotal = roundMoney(
    Number(splitPayments.cash) +
      Number(splitPayments.upi) +
      Number(splitPayments.card) +
      Number(splitPayments.wallet),
  );
  const remainingRefund = roundMoney(preview.refundable - (isMultiMode ? splitTotal : 0));

  if (!open || !invoice) return null;

  const invoiceCode = invoice.invoiceCode || invoice.bill || 'Invoice';
  const title = intent === 'cancel' ? 'Cancel Invoice' : 'Sales Return';

  const goToRefund = () => {
    if (preview.selected.length === 0) {
      Swal.fire('Select items', 'Choose at least one item and return quantity.', 'info');
      return;
    }
    setIsMultiMode(false);
    setRefundMode('Wallet');
    setSplitPayments(EMPTY_SPLIT);
    setStep('refund');
  };

  const setSplitAmount = (key: SplitKey, value: number) => {
    setSplitPayments(prev => ({...prev, [key]: Math.max(0, roundMoney(value))}));
  };

  const addRestTo = (key: SplitKey) => {
    const others = roundMoney(
      Object.entries(splitPayments)
        .filter(([k]) => k !== key)
        .reduce((sum, [, v]) => sum + Number(v || 0), 0),
    );
    setSplitAmount(key, Math.max(0, roundMoney(preview.refundable - others)));
  };

  const confirmReturn = async () => {
    if (preview.refundable > 0) {
      const paid = isMultiMode
        ? splitTotal
        : refundMode === 'Wallet'
          ? preview.refundable
          : refundMode === 'Cash'
            ? preview.refundable
            : refundMode === 'UPI'
              ? preview.refundable
              : refundMode === 'Card'
                ? preview.refundable
                : 0;
      if (isMultiMode && Math.abs(splitTotal - preview.refundable) > 0.05) {
        Swal.fire(
          'Split refund incomplete',
          `Allocate exactly ₹${formatInr(preview.refundable)} across payment methods.`,
          'warning',
        );
        return;
      }
      if (!isMultiMode && Math.abs(paid - preview.refundable) > 0.05) {
        Swal.fire('Refund required', 'Select a refund method for the full amount.', 'warning');
        return;
      }
    }

    const breakdown: SplitPayments = isMultiMode
      ? splitPayments
      : {
          cash: refundMode === 'Cash' ? preview.refundable : 0,
          upi: refundMode === 'UPI' ? preview.refundable : 0,
          card: refundMode === 'Card' ? preview.refundable : 0,
          wallet: refundMode === 'Wallet' ? preview.refundable : 0,
        };
    const modeLabel = isMultiMode
      ? 'MULTI'
      : preview.refundable <= 0
        ? 'NONE'
        : refundMode;

    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate(),
    ).padStart(2, '0')}`;

    const digits = String(invoice.customerPhone || invoice.phone || '').replace(/\D/g, '');
    const phone = digits.length >= 10 ? digits.slice(-10) : '';
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Swal.fire(
        'Invalid customer phone',
        'A valid 10-digit mobile is required to record the return.',
        'error',
      );
      return;
    }

    setLoading(true);
    try {
      await handleCreateReturnSale({
        customerName: String(invoice.customerName || invoice.customer || '').trim(),
        customerPhone: phone,
        invoiceDate: invoice.invoiceDate || ymd,
        dueDate: ymd,
        salesPersonName: String(
          invoice.invoiceBy?.staffName || invoice.salesPersonName || staff.m_staff_name || 'Staff',
        ).trim(),
        notes:
          intent === 'cancel'
            ? `Cancel / return against invoice ${invoiceCode}`
            : `Sales return against invoice ${invoiceCode}`,
        items: preview.selected.map(line => ({
          productName: line.productName,
          qty: line.returnQty,
          unitPrice: line.unitPrice,
          discount: roundMoney((line.discount / Math.max(1, line.purchasedQty)) * line.returnQty),
          lineIndex: line.lineIndex,
          originalQty: line.purchasedQty,
          isGift: line.isGift,
          refundAmount: line.refundAmount,
          lineTotal: line.refundAmount,
        })),
        subTotal: preview.returnValue,
        discountTotal: preview.originalDiscount,
        grandTotal: preview.returnValue,
        status: 'final',
        originalInvoiceId: invoice._id,
        originalInvoiceCode: invoiceCode,
        intent,
        refundMode: modeLabel,
        refundBreakdown: {
          ...breakdown,
          paidAmount: roundMoney(
            breakdown.cash + breakdown.upi + breakdown.card + breakdown.wallet,
          ),
        },
        createdBy: {
          m_staff_id: staff.m_staff_id || null,
          m_staff_name: staff.m_staff_name || null,
          m_staff_email: staff.m_staff_email || null,
        },
      });

      const refundMsg =
        preview.refundable > 0
          ? `Refunded ₹${formatInr(preview.refundable)}${
              breakdown.wallet > 0 ? ` (₹${formatInr(breakdown.wallet)} to wallet)` : ''
            }.`
          : preview.dueReduce > 0
            ? `Outstanding due reduced by ₹${formatInr(preview.dueReduce)}.`
            : 'Return recorded.';

      await Swal.fire({
        icon: 'success',
        title: intent === 'cancel' ? 'Invoice return processed' : 'Sales return created',
        text: refundMsg,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      Swal.fire(
        'Could not complete return',
        error?.response?.data?.message || error?.message || 'Please try again.',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {invoiceCode} · {invoice.customerName || invoice.customer || 'Customer'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'items' ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-xl bg-slate-50 p-2">
                  <p className="text-slate-500">Original</p>
                  <p className="font-bold text-slate-900">
                    ₹{formatInr(Number(invoice.grandTotal) || 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-2">
                  <p className="text-amber-700">Already returned</p>
                  <p className="font-bold text-amber-800">
                    ₹{formatInr(Number(invoice.returnedAmount) || 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 p-2">
                  <p className="text-blue-700">This return</p>
                  <p className="font-bold text-blue-800">₹{formatInr(preview.returnValue)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {lines.map(line => {
                  const disabled = line.remainingQty <= 0;
                  return (
                    <div
                      key={line.lineIndex}
                      className={`rounded-2xl border p-3 ${
                        line.selected && !disabled
                          ? 'border-blue-200 bg-blue-50/40'
                          : 'border-slate-200 bg-white'
                      } ${disabled ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-blue-600"
                          checked={line.selected && !disabled}
                          disabled={disabled}
                          onChange={e => {
                            const checked = e.target.checked;
                            setLines(prev =>
                              prev.map(item =>
                                item.lineIndex === line.lineIndex
                                  ? {
                                      ...item,
                                      selected: checked,
                                      returnQty: checked
                                        ? Math.max(1, item.returnQty || item.remainingQty)
                                        : 0,
                                      refundAmount: checked
                                        ? item.isGift
                                          ? 0
                                          : roundMoney(item.unitNet * Math.max(1, item.returnQty || item.remainingQty))
                                        : 0,
                                    }
                                  : item,
                              ),
                            );
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-slate-900">{line.productName}</p>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() =>
                                setLines(prev =>
                                  prev.map(item =>
                                    item.lineIndex === line.lineIndex
                                      ? withGiftFlag(item, !item.isGift)
                                      : item,
                                  ),
                                )
                              }
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                                line.isGift
                                  ? 'bg-pink-100 text-pink-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <Gift className="h-3 w-3" />
                              {line.isGift ? 'Gift Item' : 'Sale Item'}
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Purchased {line.purchasedQty} · Returned {line.alreadyReturned} · Remaining{' '}
                            {line.remainingQty}
                          </p>
                          {!line.isGift ? (
                            <p className="mt-1 text-[11px] text-slate-500">
                              Price ₹{formatInr(line.unitPrice)}
                              {line.discount > 0
                                ? ` · Discount ₹${formatInr(
                                    line.purchasedQty > 0
                                      ? line.discount / line.purchasedQty
                                      : 0,
                                  )} (already applied)`
                                : ''}
                              {' · Paid ₹'}
                              {formatInr(line.unitNet)}
                            </p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                            <label className="text-[11px] font-semibold text-slate-600">
                              Return qty
                              <input
                                type="number"
                                min={0}
                                max={line.remainingQty}
                                disabled={disabled || !line.selected}
                                value={line.selected ? line.returnQty : 0}
                                onChange={e => {
                                  const qty = Number(e.target.value) || 0;
                                  setLines(prev =>
                                    prev.map(item =>
                                      item.lineIndex === line.lineIndex
                                        ? withUpdatedQty({...item, selected: qty > 0}, qty)
                                        : item,
                                    ),
                                  );
                                }}
                                className="mt-1 w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-bold text-slate-900 disabled:bg-slate-50"
                              />
                            </label>
                            <p className="text-right text-sm font-extrabold text-slate-900">
                              {line.isGift ? (
                                <span className="text-pink-600">Gift · ₹0</span>
                              ) : (
                                <>₹{formatInr(line.selected ? line.refundAmount : 0)}</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">Total return amount</span>
                <span className="text-lg font-extrabold text-slate-900">
                  ₹{formatInr(preview.returnValue)}
                </span>
              </div>
              <button
                type="button"
                onClick={goToRefund}
                className="w-full rounded-xl bg-[#1448F5] py-3 text-sm font-bold text-white hover:bg-[#0F3FD6]"
              >
                Continue to refund
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-2 rounded-2xl border border-slate-100 p-3">
                {preview.selected.map(line => (
                  <div
                    key={line.lineIndex}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {line.productName}
                        {line.isGift ? (
                          <span className="ml-1 text-[10px] font-bold text-pink-600">GIFT</span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Qty {line.returnQty}
                        {!line.isGift && line.discount > 0
                          ? ` · original discount ₹${formatInr(
                              (line.discount / Math.max(1, line.purchasedQty)) * line.returnQty,
                            )} (not reapplied)`
                          : ''}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-slate-900">
                      ₹{formatInr(line.refundAmount)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1.5 text-sm">
                {preview.originalDiscount > 0 ? (
                  <div className="flex justify-between text-slate-500">
                    <span>Original discount (already applied)</span>
                    <span>₹{formatInr(preview.originalDiscount)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-slate-500">
                  <span>Amount originally paid</span>
                  <span>₹{formatInr(preview.itemsNet)}</span>
                </div>
                {preview.dueReduce > 0 ? (
                  <div className="flex justify-between text-amber-700">
                    <span>Applied to outstanding due</span>
                    <span>- ₹{formatInr(preview.dueReduce)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-base font-extrabold text-slate-900">
                  <span>Amount to refund</span>
                  <span>₹{formatInr(preview.refundable)}</span>
                </div>
              </div>

              {preview.refundable > 0 ? (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Refund method</p>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1">
                      <input
                        type="checkbox"
                        checked={isMultiMode}
                        onChange={e => {
                          setIsMultiMode(e.target.checked);
                          setSplitPayments(EMPTY_SPLIT);
                        }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Split
                      </span>
                    </label>
                  </div>

                  {!isMultiMode ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {MODE_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        const active = refundMode === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRefundMode(opt.id)}
                            className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-bold ${
                              active
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 text-slate-600'
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${opt.color}`} />
                            {opt.id === 'Wallet' ? 'Add to Wallet' : opt.id}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {MODE_OPTIONS.map(opt => (
                          <label key={opt.key} className="text-[11px] font-semibold text-slate-600">
                            {opt.id === 'Wallet' ? 'Wallet credit' : opt.id}
                            <input
                              type="number"
                              min={0}
                              value={splitPayments[opt.key] || ''}
                              onChange={e =>
                                setSplitAmount(opt.key, Number(e.target.value) || 0)
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"
                            />
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {MODE_OPTIONS.map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => addRestTo(opt.key)}
                            className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-600"
                          >
                            + Add rest to {opt.id}
                          </button>
                        ))}
                      </div>
                      <p
                        className={`mt-2 text-xs font-semibold ${
                          Math.abs(remainingRefund) < 0.05 ? 'text-green-600' : 'text-amber-600'
                        }`}
                      >
                        {Math.abs(remainingRefund) < 0.05
                          ? 'Split amount matches the refund.'
                          : `Remaining to allocate: ₹${formatInr(Math.max(0, remainingRefund))}`}
                      </p>
                    </>
                  )}

                  {!isMultiMode && refundMode === 'Wallet' ? (
                    <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      ₹{formatInr(preview.refundable)} will be credited to the customer wallet
                      immediately.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-5 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  No cash refund is due
                  {preview.dueReduce > 0
                    ? ` — ₹${formatInr(preview.dueReduce)} will be reduced from outstanding due.`
                    : ' for gift / unpaid value.'}
                </p>
              )}
            </div>
            <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('items')}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void confirmReturn()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#111111] py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Confirm return
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
