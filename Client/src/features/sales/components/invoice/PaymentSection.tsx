import { useState } from "react";

type Payment = {
  notes: string;
  amount: number;
  mode: string;
  bank: string;
};

const paymentModes = ["Cash", "UPI", "Card", "Bank Transfer"];

export default function PaymentSection() {
  const [payments, setPayments] = useState<Payment[]>([
    { notes: "", amount: 0, mode: "UPI", bank: "" },
  ]);

  const [markPaid, setMarkPaid] = useState(false);

  const handleChange = (
    index: number,
    field: keyof Payment,
    value: string | number
  ) => {
    const updated = [...payments];
    updated[index][field] = value as never;
    setPayments(updated);
  };

  const addSplitPayment = () => {
    setPayments([
      ...payments,
      { notes: "", amount: 0, mode: "Cash", bank: "" },
    ]);
  };

  return (
    <div className="bg-[#dfeae6] rounded-lg p-4 space-y-4">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-gray-700">
          Add payment (Payment Notes, Amount and Mode)
        </h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={markPaid}
            onChange={() => setMarkPaid(!markPaid)}
          />
          Mark as fully paid
        </label>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-3 text-sm text-gray-600 font-medium">
        <div className="col-span-6">Notes</div>
        <div className="col-span-2">Amount</div>
        <div className="col-span-2">Payment Mode</div>
        <div className="col-span-2">Account</div>
      </div>

      {/* Rows */}
      {payments.map((p, index) => (
        <div
          key={index}
          className="grid grid-cols-12 gap-3 items-center"
        >
          {/* Notes */}
          <input
            type="text"
            placeholder="Advance received, UTR number etc..."
            className="col-span-6 p-2 rounded border"
            value={p.notes}
            onChange={(e) =>
              handleChange(index, "notes", e.target.value)
            }
          />

          {/* Amount */}
          <input
            type="number"
            className="col-span-2 p-2 rounded border"
            value={p.amount}
            onChange={(e) =>
              handleChange(index, "amount", Number(e.target.value))
            }
          />

          {/* Mode */}
          <select
            className="col-span-2 p-2 rounded border"
            value={p.mode}
            onChange={(e) =>
              handleChange(index, "mode", e.target.value)
            }
          >
            {paymentModes.map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>

          {/* Bank */}
          <select
            className="col-span-2 p-2 rounded border"
            value={p.bank}
            onChange={(e) =>
              handleChange(index, "bank", e.target.value)
            }
          >
            <option value="">Select</option>
            <option>HDFC</option>
            <option>SBI</option>
            <option>ICICI</option>
          </select>
        </div>
      ))}

      {/* Split Payment */}
      <button
        onClick={addSplitPayment}
        className="text-sm text-gray-700 flex items-center gap-2"
      >
        ➕ Split Payment
      </button>
    </div>
  );
}