import type {ThermalPrintProps} from  '../../thermalPrint/ThermalPrint';
import type {ActivityInvoiceDetail} from '../../types/auth';


function formatInvoiceDate(value?:string){
    if(!value) return '-';

    const d=new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function mapActivityInvoiceToThermalPrint(
  data: ActivityInvoiceDetail,
  customer: { name?: string; mobile?: string; membershipType?: string },
): ThermalPrintProps {
  const items = (data.items || []).map((it) => ({
    name: it.productName || 'Item',
    qty: Number(it.qty) || 0,
    price: Number(it.unitPrice) || 0,
    discount: Number(it.discount) || 0,
  }));
  const totalMRP =
    items.reduce((s, it) => s + it.qty * it.price, 0) ||
    Number(data.subTotal) ||
    0;
  const totalQty = items.reduce((s, it) => s + it.qty, 0);


  return {
    documentType: 'INVOICE',
    invoiceNo: data.invoiceNumber || '—',
    date: formatInvoiceDate(data.dateTime ||data.createdAt ),
     dueDate: formatInvoiceDate(data.dateTime || data.createdAt),
    customerName: customer.name || 'Customer',
    customerPhone: customer.mobile || '—',
    salesPerson: data.billedBy?.staffName || '—',
    membershipType: customer.membershipType || '—',
    items,
    totalMRP,
  discountTotal: Number(data.discountAmount ?? data.discount ?? 0) || 0,
    cashbackAmount: Number(data.cashbackAmount ?? data.cashback ?? 0) || 0,
    finalAmount: Number(data.totalPaid ?? data.paidAmount ?? 0) || 0,
    totalDue: Number(data.pendingAmount ?? 0) || 0,
    totalQty,
    extraCharges: [],
  }
}