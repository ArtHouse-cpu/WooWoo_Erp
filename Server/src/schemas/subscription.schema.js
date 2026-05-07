const MOBILE_RE = /^[6-9]\d{9}$/;

const getStartOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const toNumber = value => Number(value);

const normalizeRepeat = ({repeatType, repeatEvery, repeatUnit}, errors, isPatch = false) => {
  const hasAnyRepeatField =
    repeatType !== undefined || repeatEvery !== undefined || repeatUnit !== undefined;

  if (isPatch && !hasAnyRepeatField) {
    return {};
  }

  const nextRepeatType = ['monthly', 'yearly', 'lifetime'].includes(repeatType)
    ? repeatType
    : 'monthly';

  if (nextRepeatType === 'lifetime') {
    return {
      repeatType: 'lifetime',
      repeatEvery: null,
      repeatUnit: null,
    };
  }

  const every = repeatEvery === undefined || repeatEvery === null ? 1 : toNumber(repeatEvery);
  if (Number.isNaN(every) || every <= 0) {
    errors.push('repeatEvery must be greater than 0.');
  }

  const unit = nextRepeatType === 'yearly' ? 'year' : 'month';
  if (repeatUnit !== undefined && repeatUnit !== null && repeatUnit !== unit) {
    errors.push(`repeatUnit must be '${unit}' for ${nextRepeatType} repeatType.`);
  }

  return {
    repeatType: nextRepeatType,
    repeatEvery: every,
    repeatUnit: unit,
  };
};

const normalizeItems = (items, errors) => {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('At least one line item is required.');
    return [];
  }

  const normalized = items.map((item, idx) => {
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

  const bad = normalized.find(
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

  return normalized.map(({_idx, ...rest}) => rest);
};

export function validateSubscriptionCreateBody(body) {
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
    createdBy,
    repeatType,
    repeatEvery,
    repeatUnit,
  } = body ?? {};

  if (!customerName || !String(customerName).trim()) errors.push('Customer name is required.');
  if (!customerPhone || !String(customerPhone).trim()) {
    errors.push('Customer phone is required.');
  } else if (!MOBILE_RE.test(String(customerPhone).trim())) {
    errors.push('Invalid customer phone (10-digit Indian mobile).');
  }
  if (!salesPersonName || !String(salesPersonName).trim()) errors.push('Sales person is required.');

  const invoiceDateObj = invoiceDate ? new Date(invoiceDate) : null;
  const dueDateObj = dueDate ? new Date(dueDate) : invoiceDateObj;
  if (!invoiceDateObj || Number.isNaN(invoiceDateObj.getTime())) errors.push('Valid start date is required.');
  if (!dueDateObj || Number.isNaN(dueDateObj.getTime())) errors.push('Valid end date is required.');
  if (invoiceDateObj && dueDateObj && dueDateObj < getStartOfToday()) {
    errors.push('End date cannot be before today.');
  }
  if (invoiceDateObj && dueDateObj && dueDateObj < invoiceDateObj) {
    errors.push('End date cannot be before start date.');
  }

  const normalizedItems = normalizeItems(items, errors);

  const st = Number(subTotal);
  const dt = Number(discountTotal ?? 0);
  const gt = Number(grandTotal);
  if (Number.isNaN(st) || st < 0) errors.push('Invalid subTotal.');
  if (Number.isNaN(dt) || dt < 0) errors.push('Invalid discountTotal.');
  if (Number.isNaN(gt) || gt < 0) errors.push('Invalid grandTotal.');

  const repeatData = normalizeRepeat({repeatType, repeatEvery, repeatUnit}, errors);

  if (errors.length) return {ok: false, errors};

  const allowedStatus = ['draft', 'active', 'completed', 'expired', 'error', 'cancelled'];
  const normalizedStatus = allowedStatus.includes(status) ? status : 'active';

  return {
    ok: true,
    data: {
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      invoiceDate: invoiceDateObj,
      dueDate: dueDateObj,
      startDate: invoiceDateObj,
      endDate: dueDateObj,
      salesPersonName: String(salesPersonName).trim(),
      notes: String(notes ?? '').trim(),
      items: normalizedItems,
      subTotal: st,
      discountTotal: dt,
      grandTotal: gt,
      status: normalizedStatus,
      createdBy: createdBy ?? null,
      ...repeatData,
    },
  };
}

export function validateSubscriptionUpdateBody(body) {
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
    createdBy,
    repeatType,
    repeatEvery,
    repeatUnit,
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
    if (Number.isNaN(d.getTime())) errors.push('Invalid start date.');
    else {
      update.invoiceDate = d;
      update.startDate = d;
    }
  }
  if (dueDate !== undefined) {
    const d = new Date(dueDate);
    if (Number.isNaN(d.getTime())) errors.push('Invalid end date.');
    else {
      if (d < getStartOfToday()) errors.push('End date cannot be before today.');
      update.dueDate = d;
      update.endDate = d;
    }
  }

  if (update.startDate && update.endDate && update.endDate < update.startDate) {
    errors.push('End date cannot be before start date.');
  }

  if (items !== undefined) {
    update.items = normalizeItems(items, errors);
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
    if (!['draft', 'active', 'completed', 'expired', 'error', 'cancelled'].includes(status)) {
      errors.push('Invalid status.');
    } else {
      update.status = status;
    }
  }
  if (createdBy !== undefined) update.createdBy = createdBy;

  const repeatData = normalizeRepeat({repeatType, repeatEvery, repeatUnit}, errors, true);
  Object.assign(update, repeatData);

  if (errors.length) return {ok: false, errors};
  if (Object.keys(update).length === 0) {
    return {ok: false, errors: ['No valid fields to update.']};
  }
  return {ok: true, data: update};
}
