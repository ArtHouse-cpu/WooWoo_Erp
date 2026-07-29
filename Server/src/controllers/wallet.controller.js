import mongoose from "mongoose";
import Customer from "../models/customer.model.js";
import Wallet from "../models/wallet.model.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildCreatedBy = (req, fallback = {}) => ({
  m_staff_id: fallback?.m_staff_id ?? req.user?.userId ?? null,
  m_staff_name: fallback?.m_staff_name ?? req.user?.name ?? null,
  m_staff_email: fallback?.m_staff_email ?? req.user?.email ?? null,
});

const syncCustomerWalletAmount = async (customerId, walletAmount) => {
  if (!mongoose.Types.ObjectId.isValid(String(customerId))) return;
  await Customer.findByIdAndUpdate(customerId, {
    $set: {
      walletAmount,
      closingBalance: walletAmount,
    },
  });
};

const syncCustomerWalletBuckets = async (
  customerId,
  { walletAmount, affiliateBalance, cashbackBalance },
) => {
  if (!mongoose.Types.ObjectId.isValid(String(customerId))) return;
  const $set = {};
  if (walletAmount !== undefined) {
    $set.walletAmount = walletAmount;
    $set.closingBalance = walletAmount;
  }
  if (affiliateBalance !== undefined) {
    $set.affiliateBalance = affiliateBalance;
  }
  if (cashbackBalance !== undefined) {
    $set.cashbackBalance = cashbackBalance;
  }
  if (!Object.keys($set).length) return;
  await Customer.findByIdAndUpdate(customerId, { $set });
};

const resolveCustomer = async ({ customerId, customerPhone }) => {
  if (customerId && mongoose.Types.ObjectId.isValid(String(customerId))) {
    return Customer.findById(customerId);
  }
  if (customerPhone) {
    return Customer.findOne({ mobile: String(customerPhone).trim() });
  }
  return null;
};

const appendTransaction = async (
  wallet,
  {
    type,
    amount,
    note = "",
    referenceType = "",
    referenceId = "",
    createdBy = {},
    minimumBalance = 0,
    walletType = "general",
  },
) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Valid transaction amount is required.");
  }
  const minimumAllowedBalance = Math.max(Number(minimumBalance) || 0, 0);
  const bucket = ["affiliate", "cashback", "general"].includes(
    String(walletType || "general").toLowerCase(),
  )
    ? String(walletType).toLowerCase()
    : "general";

  const refId = String(referenceId ?? "").trim();
  const txType = String(type ?? "credit").toLowerCase();
  // Prevent double membership cashback (server create + client credit)
  if (refId && txType === "credit" && /cashback/i.test(String(note ?? ""))) {
    const duplicate = (wallet.transactions || []).some(
      tx =>
        String(tx.referenceId || "").trim() === refId &&
        String(tx.type || "").toLowerCase() === "credit" &&
        Math.abs(Number(tx.amount) - numericAmount) < 0.001 &&
        /cashback/i.test(String(tx.note || "")),
    );
    if (duplicate) {
      return wallet;
    }
  }

  // Prefer customer bucket balances (source of truth for withdrawable / cashback)
  const customer = await Customer.findById(wallet.customerId)
    .select("walletAmount affiliateBalance cashbackBalance")
    .lean();

  let generalBalance = Number(
    wallet.walletAmount ?? customer?.walletAmount ?? 0,
  );
  let affiliateBalance = Number(
    customer?.affiliateBalance ?? wallet.affiliateBalance ?? 0,
  );
  let cashbackBalance = Number(
    customer?.cashbackBalance ?? wallet.cashbackBalance ?? 0,
  );

  const previousBalance =
    bucket === "affiliate"
      ? affiliateBalance
      : bucket === "cashback"
        ? cashbackBalance
        : generalBalance;

  const applyDelta = (current) =>
    txType === "debit" ? current - numericAmount : current + numericAmount;

  if (bucket === "affiliate") {
    const nextAffiliate = applyDelta(affiliateBalance);
    if (nextAffiliate < 0) {
      throw new Error("Insufficient withdrawable (affiliate) balance.");
    }
    affiliateBalance = nextAffiliate;
    wallet.affiliateBalance = nextAffiliate;
  } else if (bucket === "cashback") {
    const nextCashback = applyDelta(cashbackBalance);
    if (nextCashback < 0) {
      throw new Error("Insufficient cashback balance.");
    }
    cashbackBalance = nextCashback;
    wallet.cashbackBalance = nextCashback;
  } else {
    const nextGeneral = applyDelta(generalBalance);
    if (nextGeneral < 0) {
      throw new Error("Insufficient wallet balance.");
    }
    if (nextGeneral < minimumAllowedBalance) {
      throw new Error(
        `Final balance cannot be less than minimum balance ${minimumAllowedBalance}.`,
      );
    }
    generalBalance = nextGeneral;
    wallet.walletAmount = nextGeneral;
  }

  wallet.transactions.push({
    type: txType,
    amount: numericAmount,
    walletType: bucket,
    note: String(note ?? "").trim(),
    referenceType: String(referenceType ?? "").trim(),
    referenceId: refId,
    createdBy,
    previousBalance,
    closingBalance:
      bucket === "affiliate"
        ? affiliateBalance
        : bucket === "cashback"
          ? cashbackBalance
          : generalBalance,
    affiliateBalanceAfter: affiliateBalance,
    cashbackBalanceAfter: cashbackBalance,
  });

  await wallet.save();
  await syncCustomerWalletBuckets(wallet.customerId, {
    walletAmount: generalBalance,
    affiliateBalance,
    cashbackBalance,
  });
  return wallet;
};

const getWallets = async (req, res) => {
  try {
    const search = String(req.query.search ?? "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), 5000);
    const query = {};

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { name: regex },
        { mobile: regex },
      ];
    }

    const customers = await Customer.find(query).sort({ updatedAt: -1 }).limit(limit).lean();
    
    const customerIds = customers.map(c => c._id);
    const wallets = await Wallet.find({ customerId: { $in: customerIds } }).lean();
    
    const walletMap = wallets.reduce((acc, w) => {
      acc[w.customerId.toString()] = w;
      return acc;
    }, {});

    const combinedWallets = customers.map(c => {
      const w = walletMap[c._id.toString()];
      // Prefer live wallet document buckets, fall back to customer fields
      const generalBalance = Number(
        (w ? w.walletAmount : undefined) ?? c.walletAmount ?? 0,
      );
      const affiliateBalance = Number(
        (w ? w.affiliateBalance : undefined) ?? c.affiliateBalance ?? 0,
      );
      const cashbackBalance = Number(
        (w ? w.cashbackBalance : undefined) ?? c.cashbackBalance ?? 0,
      );
      const totalBalance = generalBalance + affiliateBalance + cashbackBalance;
      return {
        _id: w ? w._id : c._id,
        customerId: c._id,
        customerName: c.name,
        customerPhone: c.mobile,
        // Wallet Amount column = sum of all buckets (general + cashback + affiliate)
        walletAmount: totalBalance,
        generalBalance,
        affiliateBalance,
        cashbackBalance,
        withdrawableBalance: affiliateBalance,
        totalBalance,
        transactions: w ? w.transactions : [],
        createdAt: w ? w.createdAt : c.createdAt,
        updatedAt: w ? w.updatedAt : c.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Wallets fetched successfully.",
      wallets: combinedWallets,
    });
  } catch (error) {
    console.error("getWallets error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallets.",
    });
  }
};

const createWallet = async (req, res) => {
  try {
    const {
      customerId,
      customerPhone,
      customerName,
      type = "credit",
      amount,
      note,
      referenceType,
      referenceId,
      createdBy,
    } = req.body;

    const customer = await resolveCustomer({ customerId, customerPhone });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    let wallet = await Wallet.findOne({ customerId: customer._id });
    if (!wallet) {
      wallet = await Wallet.create({
        customerId: customer._id,
        customerName: String(customer.name ?? customerName ?? "").trim(),
        customerPhone: String(customer.mobile ?? customerPhone ?? "").trim(),
        walletAmount: 0,
        transactions: [],
      });
    }

    const updatedWallet = await appendTransaction(wallet, {
      type: String(type ?? "credit").toLowerCase(),
      amount,
      note,
      referenceType,
      referenceId,
      minimumBalance: req.body?.minimumBalance,
      walletType:
        req.body?.walletType ||
        (/cashback/i.test(String(note ?? "")) ? "cashback" : "general"),
      createdBy: buildCreatedBy(req, createdBy),
    });

    return res.status(201).json({
      success: true,
      message: "Wallet updated successfully.",
      wallet: updatedWallet,
    });
  } catch (error) {
    console.error("createWallet error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update wallet.",
    });
  }
};

const getWalletById = async (req, res) => {
  try {
    const { id } = req.params;
    let wallet = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      wallet = await Wallet.findById(id);
      if (!wallet) {
        wallet = await Wallet.findOne({ customerId: id });
      }
    }

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Wallet fetched successfully.",
      wallet,
    });
  } catch (error) {
    console.error("getWalletById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallet.",
    });
  }
};

const updateWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      amount,
      note,
      referenceType,
      referenceId,
      createdBy,
      customerName,
      customerPhone,
    } = req.body;
    // console.log(req.body);

    let wallet = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      wallet = await Wallet.findById(id);
      if (!wallet) {
        wallet = await Wallet.findOne({ customerId: id });
      }
    }

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found.",
      });
    }

    if (customerName !== undefined) wallet.customerName = String(customerName).trim();
    if (customerPhone !== undefined) wallet.customerPhone = String(customerPhone).trim();

    const hasTransaction = amount !== undefined || type !== undefined;
    if (hasTransaction) {
      wallet = await appendTransaction(wallet, {
        type: String(type ?? "credit").toLowerCase(),
        amount,
        note,
        referenceType,
        referenceId,
        minimumBalance: req.body?.minimumBalance,
        walletType:
          req.body?.walletType ||
          (/cashback/i.test(String(note ?? "")) ? "cashback" : "general"),
        createdBy: buildCreatedBy(req, createdBy),
      });
    } else {
      await wallet.save();
    }

    return res.status(200).json({
      success: true,
      message: "Wallet updated successfully.",
      wallet,
    });
  } catch (error) {
    console.error("updateWallet error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update wallet.",
    });
  }
};

const deleteWallet = async (req, res) => {
  try {
    const { id } = req.params;
    let wallet = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      wallet = await Wallet.findById(id);
      if (!wallet) {
        wallet = await Wallet.findOne({ customerId: id });
      }
    }

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found.",
      });
    }

    await Wallet.deleteOne({ _id: wallet._id });
    await syncCustomerWalletAmount(wallet.customerId, 0);

    return res.status(200).json({
      success: true,
      message: "Wallet deleted successfully.",
    });
  } catch (error) {
    console.error("deleteWallet error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete wallet.",
    });
  }
};

const bulkUpdateWallets = async (req, res) => {
  try {
    const {
      type = "credit",
      amount,
      note,
      createdBy,
      minimumBalance,
    } = req.body ?? {};
    console.log("This is bulk update:",req.body);
    const normalizedType = String(type).toLowerCase();
const numericAmount = Number(amount);
const minimumAllowedBalance = Math.max(Number(minimumBalance) || 0, 0);

if (!["credit", "debit", "set_minimum"].includes(normalizedType)) {
  return res.status(400).json({
    success: false,
    message: "Transaction type is invalid.",
  });
}

if (normalizedType === "set_minimum") {
  return res.status(200).json({
    success: true,
    message: "Minimum balance updated successfully.",
    minimumBalance: minimumAllowedBalance,
  });
}

if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
  return res.status(400).json({
    success: false,
    message: "Valid transaction amount is required.",
  });
}

    const customers = await Customer.find({}).select("_id name mobile").lean();
    if (customers.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No customers available for bulk wallet update.",
        updatedCount: 0,
      });
    }

    const customerIds = customers.map((entry) => entry._id);
    const wallets = await Wallet.find({ customerId: { $in: customerIds } });
    const walletMap = new Map(wallets.map((entry) => [String(entry.customerId), entry]));

    const invalidCustomers = [];
    for (const customer of customers) {
      const key = String(customer._id);
      const wallet = walletMap.get(key);
      const currentBalance = Number(wallet?.walletAmount ?? 0);

      if (normalizedType === "debit" && !wallet) {
        invalidCustomers.push({
          customerId: key,
          customerName: customer.name,
          customerPhone: customer.mobile,
          reason: "Wallet does not exist.",
        });
        continue;
      }

      const nextBalance =
        normalizedType === "debit"
          ? currentBalance - numericAmount
          : currentBalance + numericAmount;
      if (nextBalance < minimumAllowedBalance) {
        invalidCustomers.push({
          customerId: key,
          customerName: customer.name,
          customerPhone: customer.mobile,
          reason: `Would fall below minimum balance ${minimumAllowedBalance}.`,
        });
      }
    }

    if (invalidCustomers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Bulk update blocked by minimum balance or missing wallet records.",
        invalidCustomers,
      });
    }

    let updatedCount = 0;
    for (const customer of customers) {
      const key = String(customer._id);
      let wallet = walletMap.get(key);

      if (!wallet) {
        wallet = await Wallet.create({
          customerId: customer._id,
          customerName: String(customer.name ?? "").trim(),
          customerPhone: String(customer.mobile ?? "").trim(),
          walletAmount: 0,
          transactions: [],
        });
      }

      await appendTransaction(wallet, {
        type: normalizedType,
        amount: numericAmount,
        note,
        minimumBalance: minimumAllowedBalance,
        createdBy: buildCreatedBy(req, createdBy),
      });
      updatedCount += 1;
    }

    return res.status(200).json({
      success: true,
      message: `Bulk wallet ${normalizedType} applied successfully.`,
      updatedCount,
    });
  } catch (error) {
    console.error("bulkUpdateWallets error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to apply bulk wallet update.",
    });
  }
};

export {
  appendTransaction,
  bulkUpdateWallets,
  createWallet,
  deleteWallet,
  getWalletById,
  getWallets,
  syncCustomerWalletAmount,
  updateWallet,
};
