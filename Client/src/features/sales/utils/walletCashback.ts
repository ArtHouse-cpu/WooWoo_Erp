import {
  handleCreateWallet,
  handleGetWalletById,
  handleUpdateWallet,
} from "@/services/apiClient";

type CreditWalletCashbackParams = {
  customerId?: string | null;
  customerPhone: string;
  customerName?: string;
  amount: number;
  note: string;
  referenceId?: string;
  createdBy?: {
    m_staff_id?: string | null;
    m_staff_name?: string | null;
    m_staff_email?: string | null;
  };
};

/** Credits cashback via PATCH /wallet/:id (wallet document id when available). */
export async function creditWalletCashback(
  params: CreditWalletCashbackParams,
): Promise<void> {
  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const customerId = params.customerId
    ? String(params.customerId).trim()
    : "";
  const customerPhone = String(params.customerPhone ?? "").trim();
  const txBody = {
    type: "credit" as const,
    amount,
    note: params.note,
    referenceType: "invoice",
    referenceId: params.referenceId ?? "",
    customerName: params.customerName,
    customerPhone,
    walletType: "cashback",
    createdBy: params.createdBy,
  };

  let patchId: string | null = null;

  if (customerId) {
    try {
      const res = await handleGetWalletById(customerId);
      const wallet = res?.wallet ?? res?.data ?? null;
      if (wallet?._id) {
        patchId = String(wallet._id);
      } else {
        patchId = customerId;
      }
    } catch {
      patchId = customerId;
    }
  }

  if (patchId) {
    try {
      await handleUpdateWallet(patchId, txBody);
      return;
    } catch {
      // Wallet may not exist yet — create via POST
    }
  }

  await handleCreateWallet({
    ...txBody,
    customerId: customerId || undefined,
    customerPhone,
    customerName: params.customerName,
  });
}
