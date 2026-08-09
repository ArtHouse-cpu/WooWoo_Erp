import PurchaseSummaryCard, {
  type ManualDiscountType,
} from "./PurchaseSummaryCard";

type Props = {
  subTotal: number;
  discountTotal: number;
  manualDiscount?: number;
  manualDiscountType?: ManualDiscountType;
  onManualDiscountChange?: (value: number) => void;
  onManualDiscountTypeChange?: (type: ManualDiscountType) => void;
  readOnly?: boolean;
  grandTotal: number;
  onSave: () => void;
  onCredit?: () => void;
  isSaving?: boolean;
  paymentInfo?: {
    purchaseType?: string;
    status?: string;
    paidAmount?: number;
    dueAmount?: number;
  };
};

/** Thin wrapper so existing Purchase Order imports keep working. */
export default function PurchaseOrderSummaryCard(props: Props) {
  return (
    <PurchaseSummaryCard
      {...props}
      title="Purchase Order Summary"
      saveLabel="Save Purchase Order"
      creditLabel="Credit"
    />
  );
}
