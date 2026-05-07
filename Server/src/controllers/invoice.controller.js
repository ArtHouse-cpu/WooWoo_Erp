import Counter from '../models/counter.model.js';
import Customer from '../models/customer.model.js';
import Invoice from '../models/invoice.model.js';
import Wallet from '../models/wallet.model.js';
import { computeStockByProductNames } from '../utils/inventoryStock.utils.js';
import { appendTransaction } from './wallet.controller.js';

const getStartOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const getNextInvoiceNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    {key: 'invoice_number'},
    {$inc: {value: 1}},
    {new: true, upsert: true, setDefaultsOnInsert: true},
  );
  return counter.value;
};

const buildCreatedBy = (req, fallback = {}) => ({
  m_staff_id: fallback?.m_staff_id ?? req.user?.userId ?? null,
  m_staff_name: fallback?.m_staff_name ?? req.user?.name ?? null,
  m_staff_email: fallback?.m_staff_email ?? req.user?.email ?? null,
});

const findCustomerForInvoice = async ({ customerPhone, customerName }) => {
  const phone = String(customerPhone ?? '').trim();
  if (phone) {
    const byPhone = await Customer.findOne({ mobile: phone });
    if (byPhone) return byPhone;
  }

  const name = String(customerName ?? '').trim();
  if (name) {
    return Customer.findOne({ name });
  }

  return null;
};

const applyWalletDelta = async ({
  customer,
  invoiceCode,
  amount,
  createdBy,
  note,
}) => {
  const numericAmount = Number(amount ?? 0);
  if (!customer || !Number.isFinite(numericAmount) || numericAmount === 0) {
    return;
  }

  let wallet = await Wallet.findOne({ customerId: customer._id });
  if (!wallet) {
    wallet = await Wallet.create({
      customerId: customer._id,
      customerName: String(customer.name ?? '').trim(),
      customerPhone: String(customer.mobile ?? '').trim(),
      walletAmount: 0,
      transactions: [],
    });
  }

  await appendTransaction(wallet, {
    type: numericAmount > 0 ? 'debit' : 'credit',
    amount: Math.abs(numericAmount),
    note,
    referenceType: 'invoice',
    referenceId: invoiceCode,
    createdBy,
  });
};

const createInvoice = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      invoiceDate,
      dueDate,
      salesPersonName,
      notes,
      items,
      subTotal,
      discountTotal,
      grandTotal,
      status,
      mode,
      paymentStatus,
      paymentBreakdown,
      createdBy,
    } = req.body;

    console.log(req.body);

    const walletAmount = Number(paymentBreakdown?.wallet ?? 0);

    if (!customerName || !invoiceDate || !dueDate || !salesPersonName ||!customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Customer, invoice date, due date, and sales person are required.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one invoice item is required.',
      });
    }

    const invoiceDateObj = new Date(invoiceDate);
    const dueDateObj = new Date(dueDate);
    if (Number.isNaN(invoiceDateObj.getTime()) || Number.isNaN(dueDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice date or due date.',
      });
    }

    if (dueDateObj < getStartOfToday()) {
      return res.status(400).json({
        success: false,
        message: 'Due date cannot be before today.',
      });
    }

    const normalizedItems = items.map(item => {
      const qty = Number(item.qty);
      const unitPrice = Number(item.unitPrice);
      const discount = Number(item.discount ?? 0);
      const lineTotal = qty * unitPrice - discount;
      return {
        productName: String(item.productName ?? '').trim(),
        qty,
        unitPrice,
        discount,
        lineTotal,
      };
    });

    const requestNames = normalizedItems.map((item) => item.productName);
    const stockMap = await computeStockByProductNames({ names: requestNames });
    const requestedQtyMap = new Map();

    for (const item of normalizedItems) {
      const name = String(item.productName ?? '').trim();
      const qty = Number(item.qty ?? 0);
      requestedQtyMap.set(name, (requestedQtyMap.get(name) ?? 0) + qty);
    }

    for (const [name, requestedQty] of requestedQtyMap.entries()) {
      const availableQty = Number(stockMap.get(name) ?? 0);
      if (requestedQty > availableQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${name}. Available: ${availableQty}, requested: ${requestedQty}.`,
        });
      }
    }

    if (normalizedItems.some(item => !item.productName || item.qty <= 0 || item.unitPrice < 0 || item.discount < 0 || item.lineTotal < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice item values.',
      });
    }

    const nextNumber = await getNextInvoiceNumber();
    const invoicePrefix = 'INVVWAH';
    const invoiceCode = `${invoicePrefix}-${nextNumber}`;
    const actor = buildCreatedBy(req, createdBy);
    const customer = await findCustomerForInvoice({ customerPhone, customerName });

    if (walletAmount > 0) {
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found for wallet payment.',
        });
      }

      const existingWallet = await Wallet.findOne({ customerId: customer._id });
      const availableWallet = Number(
        existingWallet?.walletAmount ?? customer.walletAmount ?? customer.closingBalance ?? 0,
      );
      if (walletAmount > availableWallet) {
        return res.status(400).json({
          success: false,
          message: 'Wallet amount exceeds available balance.',
        });
      }
    }

    const invoice = await Invoice.create({
      invoicePrefix,
      invoiceNumber: nextNumber,
      invoiceCode,
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      invoiceDate: invoiceDateObj,
      dueDate: dueDateObj,
      salesPersonName: String(salesPersonName).trim(),
      notes: String(notes ?? '').trim(),
      status: status === 'draft' ? 'draft' : 'final',
      items: normalizedItems,
      subTotal: Number(subTotal),
      discountTotal: Number(discountTotal ?? 0),
      grandTotal: Number(grandTotal),
      mode: String(mode ?? 'Cash'),
      paymentStatus: paymentStatus === 'partial' ? 'partial' : 'full',
      paymentBreakdown: {
        cash: Number(paymentBreakdown?.cash ?? 0),
        upi: Number(paymentBreakdown?.upi ?? 0),
        card: Number(paymentBreakdown?.card ?? 0),
        wallet: walletAmount,
        paidAmount: Number(paymentBreakdown?.paidAmount ?? 0),
        dueAmount: Number(paymentBreakdown?.dueAmount ?? 0),
        changeAmount: Number(paymentBreakdown?.changeAmount ?? 0),
      },
      createdBy: actor,
    });

    if (walletAmount > 0 && customer) {
      await applyWalletDelta({
        customer,
        invoiceCode,
        amount: walletAmount,
        createdBy: actor,
        note: `Wallet used for invoice ${invoiceCode}`,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully.',
      invoice,
    });
  } catch (error) {
    console.error('createInvoice error:', error);
    return res.status(500).json({
      success: false,
      message: 'Invoice creation failed.',
    });
  }
};
const getInvoices=async(req,res)=>{
    try {
        const invoices = await Invoice.find().sort({createdAt: -1});
        return res.status(200).json({
            success: true,
            message: 'Invoices fetched successfully.',
            invoices,
        });
      } catch (error) {
        console.error('getInvoices error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch invoices.',
        });
      }
}

const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);

    // check if id exists
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invoice ID is required",
      });
    }

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    const walletAmount = Number(invoice.paymentBreakdown?.wallet ?? 0);
    if (walletAmount > 0) {
      const customer = await findCustomerForInvoice({
        customerPhone: invoice.customerPhone,
        customerName: invoice.customerName,
      });
      if (customer) {
        await applyWalletDelta({
          customer,
          invoiceCode: invoice.invoiceCode,
          amount: -walletAmount,
          createdBy: buildCreatedBy(req),
          note: `Wallet refunded for deleted invoice ${invoice.invoiceCode}`,
        });
      }
    }

    const deletedInvoice = await Invoice.findOneAndDelete({ _id: id });

    return res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
      deletedInvoice,
    });

  } catch (error) {
    console.error("deleteInvoice error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
    });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invoice ID is required" });
    }

    const {
      customerName,
      customerPhone,
      invoiceDate,
      dueDate,
      salesPersonName,
      notes,
      items,
      subTotal,
      discountTotal,
      grandTotal,
      status,
      mode,
      paymentStatus,
      paymentBreakdown,
      createdBy,
    } = req.body;

    const existingInvoice = await Invoice.findById(id);
    if (!existingInvoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    const invoiceDateObj = invoiceDate ? new Date(invoiceDate) : undefined;
    const dueDateObj = dueDate ? new Date(dueDate) : undefined;

    let normalizedItems;
    if (items && Array.isArray(items)) {
      normalizedItems = items.map(item => {
        const qty = Number(item.qty);
        const unitPrice = Number(item.unitPrice);
        const discount = Number(item.discount ?? 0);
        const lineTotal = qty * unitPrice - discount;
        return {
          productName: String(item.productName ?? '').trim(),
          qty,
          unitPrice,
          discount,
          lineTotal,
        };
      });
    }

    if (normalizedItems && normalizedItems.length) {
      const requestNames = normalizedItems.map((item) => item.productName);
      const stockMap = await computeStockByProductNames({
        names: requestNames,
        excludeInvoiceId: id,
      });

      const requestedQtyMap = new Map();
      for (const item of normalizedItems) {
        const name = String(item.productName ?? '').trim();
        const qty = Number(item.qty ?? 0);
        requestedQtyMap.set(name, (requestedQtyMap.get(name) ?? 0) + qty);
      }

      for (const [name, requestedQty] of requestedQtyMap.entries()) {
        const availableQty = Number(stockMap.get(name) ?? 0);
        if (requestedQty > availableQty) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${name}. Available: ${availableQty}, requested: ${requestedQty}.`,
          });
        }
      }
    }

    const updateData = {};
    if (customerName !== undefined) updateData.customerName = String(customerName).trim();
    if (customerPhone !== undefined) updateData.customerPhone = String(customerPhone).trim();
    if (invoiceDateObj !== undefined) updateData.invoiceDate = invoiceDateObj;
    if (dueDateObj !== undefined) updateData.dueDate = dueDateObj;
    if (salesPersonName !== undefined) updateData.salesPersonName = String(salesPersonName).trim();
    if (notes !== undefined) updateData.notes = String(notes).trim();
    if (normalizedItems !== undefined) updateData.items = normalizedItems;
    if (subTotal !== undefined) updateData.subTotal = Number(subTotal);
    if (discountTotal !== undefined) updateData.discountTotal = Number(discountTotal);
    if (grandTotal !== undefined) updateData.grandTotal = Number(grandTotal);
    if (status !== undefined) updateData.status = status;
    if (mode !== undefined) updateData.mode = String(mode);
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (paymentBreakdown !== undefined) {
      updateData.paymentBreakdown = {
        cash: Number(paymentBreakdown?.cash ?? 0),
        upi: Number(paymentBreakdown?.upi ?? 0),
        card: Number(paymentBreakdown?.card ?? 0),
        wallet: Number(paymentBreakdown?.wallet ?? 0),
        paidAmount: Number(paymentBreakdown?.paidAmount ?? 0),
        dueAmount: Number(paymentBreakdown?.dueAmount ?? 0),
        changeAmount: Number(paymentBreakdown?.changeAmount ?? 0),
      };
    }

    const nextCustomerName =
      updateData.customerName ?? existingInvoice.customerName;
    const nextCustomerPhone =
      updateData.customerPhone ?? existingInvoice.customerPhone;
    const nextInvoiceCode = existingInvoice.invoiceCode;
    const previousWalletAmount = Number(existingInvoice.paymentBreakdown?.wallet ?? 0);
    const nextWalletAmount = Number(
      updateData.paymentBreakdown?.wallet ?? existingInvoice.paymentBreakdown?.wallet ?? 0,
    );
    const walletDelta = nextWalletAmount - previousWalletAmount;
    const actor = buildCreatedBy(req, createdBy);

    if (walletDelta !== 0) {
      const customer = await findCustomerForInvoice({
        customerPhone: nextCustomerPhone,
        customerName: nextCustomerName,
      });
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found for wallet update.",
        });
      }

      const wallet = await Wallet.findOne({ customerId: customer._id });
      const availableWallet = Number(
        wallet?.walletAmount ?? customer.walletAmount ?? customer.closingBalance ?? 0,
      );
      if (walletDelta > 0 && walletDelta > availableWallet) {
        return res.status(400).json({
          success: false,
          message: "Wallet amount exceeds available balance.",
        });
      }

      await applyWalletDelta({
        customer,
        invoiceCode: nextInvoiceCode,
        amount: walletDelta,
        createdBy: actor,
        note:
          walletDelta > 0
            ? `Additional wallet used for invoice ${nextInvoiceCode}`
            : `Wallet refunded on invoice update ${nextInvoiceCode}`,
      });
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("updateInvoice error:", error);
    return res.status(500).json({ success: false, message: "Failed to update invoice" });
  }
};

const cancelInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invoice ID is required" });
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }
    if (invoice.status === 'cancelled') {
      return res.status(200).json({
        success: true,
        message: "Invoice already cancelled",
        invoice,
      });
    }

    const walletAmount = Number(invoice.paymentBreakdown?.wallet ?? 0);
    if (walletAmount > 0) {
      const customer = await findCustomerForInvoice({
        customerPhone: invoice.customerPhone,
        customerName: invoice.customerName,
      });
      if (customer) {
        await applyWalletDelta({
          customer,
          invoiceCode: invoice.invoiceCode,
          amount: -walletAmount,
          createdBy: buildCreatedBy(req),
          note: `Wallet refunded for cancelled invoice ${invoice.invoiceCode}`,
        });
      }
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Invoice cancelled successfully",
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("cancelInvoice error:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel invoice" });
  }
};

export { createInvoice, getInvoices, deleteInvoice, updateInvoice, cancelInvoice };
