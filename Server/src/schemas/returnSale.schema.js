/**
 * Pure validation helpers for return sale HTTP bodies (no DB).
 * Mirrors Mongoose rules in `returnSale.model.js`.
 */

const MOBILE_RE = /^[6-9]\d{9}$/;

const getStartOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function validateReturnSaleCreateBody(body) {
  const errors = [];

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
    originalInvoiceId,
    createdBy,
  } = body ?? {};

  if (!customerName || !String(customerName).trim()) {
    errors.push('Customer name is required.');
  }
  if (!customerPhone || !String(customerPhone).trim()) {
    errors.push('Customer phone is required.');
  } else if (!MOBILE_RE.test(String(customerPhone).trim())) {
    errors.push('Invalid customer phone (10-digit Indian mobile).');
  }
  if (!salesPersonName || !String(salesPersonName).trim()) {
    errors.push('Sales person is required.');
  }

  const invoiceDateObj = invoiceDate ? new Date(invoiceDate) : null;
  const dueDateObj = dueDate ? new Date(dueDate) : null;
  if (!invoiceDateObj || Number.isNaN(invoiceDateObj.getTime())) {
    errors.push('Valid return / invoice date is required.');
  }
  if (!dueDateObj || Number.isNaN(dueDateObj.getTime())) {
    errors.push('Valid due date is required.');
  }
  if (invoiceDateObj && dueDateObj && dueDateObj < getStartOfToday()) {
    errors.push('Due date cannot be before today.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('At least one line item is required.');
  }

  let normalizedItems;
  if (Array.isArray(items) && items.length) {
    normalizedItems = items.map((item, idx) => {
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
        _idx: idx,
      };
    });

    const bad = normalizedItems.find(
      item =>
        !item.productName ||
        item.qty <= 0 ||
        item.unitPrice < 0 ||
        item.discount < 0 ||
        item.lineTotal < 0,
    );
    if (bad) {
      errors.push(`Invalid item at index ${bad._idx + 1}.`);
    }
    normalizedItems = normalizedItems.map(({_idx, ...rest}) => rest);
  }

  const st = Number(subTotal);
  const dt = Number(discountTotal ?? 0);
  const gt = Number(grandTotal);
  if (Number.isNaN(st) || st < 0) errors.push('Invalid subTotal.');
  if (Number.isNaN(dt) || dt < 0) errors.push('Invalid discountTotal.');
  if (Number.isNaN(gt) || gt < 0) errors.push('Invalid grandTotal.');

  if (errors.length) {
    return {ok: false, errors};
  }

  const allowedStatus = ['draft', 'final', 'cancelled'];
  const stNorm = allowedStatus.includes(status) ? status : 'final';

  return {
    ok: true,
    data: {
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      invoiceDate: invoiceDateObj,
      dueDate: dueDateObj,
      salesPersonName: String(salesPersonName).trim(),
      notes: String(notes ?? '').trim(),
      items: normalizedItems,
      subTotal: st,
      discountTotal: dt,
      grandTotal: gt,
      status: stNorm,
      originalInvoiceId: originalInvoiceId || null,
      createdBy:
        createdBy ?? null,
    },
  };
}

export function validateReturnSaleUpdateBody(body) {
  const errors = [];
  const update = {};

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
    originalInvoiceId,
  } = body ?? {};

  if (customerName !== undefined) {
    if (!String(customerName).trim()) errors.push('Customer name cannot be empty.');
    else update.customerName = String(customerName).trim();
  }
  if (customerPhone !== undefined) {
    const p = String(customerPhone).trim();
    if (!p) errors.push('Customer phone cannot be empty.');
    else if (!MOBILE_RE.test(p)) errors.push('Invalid customer phone.');
    else update.customerPhone = p;
  }
  if (salesPersonName !== undefined) {
    if (!String(salesPersonName).trim()) errors.push('Sales person cannot be empty.');
    else update.salesPersonName = String(salesPersonName).trim();
  }
  if (notes !== undefined) update.notes = String(notes).trim();

  if (invoiceDate !== undefined) {
    const d = new Date(invoiceDate);
    if (Number.isNaN(d.getTime())) errors.push('Invalid return / invoice date.');
    else update.invoiceDate = d;
  }
  if (dueDate !== undefined) {
    const d = new Date(dueDate);
    if (Number.isNaN(d.getTime())) errors.push('Invalid due date.');
    else {
      if (d < getStartOfToday()) errors.push('Due date cannot be before today.');
      update.dueDate = d;
    }
  }

  if (items !== undefined) {
    if (!Array.isArray(items) || !items.length) {
      errors.push('At least one line item is required when updating items.');
    } else {
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
      if (
        normalizedItems.some(
          item =>
            !item.productName ||
            item.qty <= 0 ||
            item.unitPrice < 0 ||
            item.discount < 0 ||
            item.lineTotal < 0,
        )
      ) {
        errors.push('Invalid line item values.');
      } else {
        update.items = normalizedItems;
      }
    }
  }

  if (subTotal !== undefined) {
    const n = Number(subTotal);
    if (Number.isNaN(n) || n < 0) errors.push('Invalid subTotal.');
    else update.subTotal = n;
  }
  if (discountTotal !== undefined) {
    const n = Number(discountTotal);
    if (Number.isNaN(n) || n < 0) errors.push('Invalid discountTotal.');
    else update.discountTotal = n;
  }
  if (grandTotal !== undefined) {
    const n = Number(grandTotal);
    if (Number.isNaN(n) || n < 0) errors.push('Invalid grandTotal.');
    else update.grandTotal = n;
  }
  if (status !== undefined) {
    if (!['draft', 'final', 'cancelled'].includes(status)) {
      errors.push('Invalid status.');
    } else {
      update.status = status;
    }
  }
  if (originalInvoiceId !== undefined) {
    update.originalInvoiceId = originalInvoiceId || null;
  }

  if (errors.length) {
    return {ok: false, errors};
  }
  if (Object.keys(update).length === 0) {
    return {ok: false, errors: ['No valid fields to update.']};
  }

  return {ok: true, data: update};
}
