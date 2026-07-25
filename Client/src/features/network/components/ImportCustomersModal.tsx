import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Upload, X, Download } from "lucide-react";
import * as XLSX from "xlsx";
import type { CustomerImportRow } from "@/services/apiClient";

type Props = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onImport: (rows: CustomerImportRow[]) => Promise<void>;
};

type PreviewRow = CustomerImportRow & { _row: number; _error?: string };

/** Strip BOM/punctuation so "Mobile No." ≈ "mobileno" ≈ "mobile number". */
function normalizeHeader(key: string) {
  return String(key || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const FIELD_ALIASES: Record<"name" | "email" | "mobile" | "balance", string[]> =
  {
    name: ["name", "customername", "fullname", "customer", "clientname"],
    email: ["email", "mail", "emailid", "emailaddress"],
    mobile: [
      "mobilenumber",
      "mobileno",
      "phonenumber",
      "phoneno",
      "contactnumber",
      "contactno",
      "whatsappnumber",
      "cellphone",
      "mobile",
      "phone",
      "whatsapp",
      "contact",
      "cell",
    ],
    balance: [
      "walletamount",
      "closingbalance",
      "walletbalance",
      "openingbalance",
      "wallet",
      "balance",
    ],
  };

function pickField(
  row: Record<string, unknown>,
  field: keyof typeof FIELD_ALIASES,
): unknown {
  // Prefer longer/more specific aliases first so "S.No" / bare "Number" don't win
  for (const alias of FIELD_ALIASES[field]) {
    for (const [key, value] of Object.entries(row)) {
      if (value === undefined || value === null) continue;
      if (normalizeHeader(key) === alias) return value;
    }
  }
  return "";
}

function cellToString(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    // Avoid scientific notation for phone-like integers
    if (Number.isInteger(value) || Math.abs(value % 1) < 1e-9) {
      return String(Math.trunc(value));
    }
    return String(value);
  }
  return String(value).trim();
}

function normalizeMobile(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const digits = String(Math.trunc(Math.abs(raw)));
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  const text = cellToString(raw);
  if (!text) return "";

  // Excel sometimes formats large numbers as "9.87654E+09"
  if (/e[+-]?\d+/i.test(text)) {
    const asNum = Number(text);
    if (Number.isFinite(asNum)) return normalizeMobile(asNum);
  }

  const digits = text.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizeBalance(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, raw);
  }
  const text = cellToString(raw).replace(/[,₹\s]/g, "");
  if (!text) return 0;
  const num = Number(text);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
}

function mapSheetRows(rawRows: Record<string, unknown>[]): PreviewRow[] {
  return rawRows.map((row, index) => {
    const name = cellToString(pickField(row, "name"));
    const email = cellToString(pickField(row, "email")).toLowerCase();
    const mobile = normalizeMobile(pickField(row, "mobile"));
    const walletAmount = normalizeBalance(pickField(row, "balance"));

    let _error = "";
    if (!name || !mobile) _error = "Name and mobile required";
    else if (!/^[6-9]\d{9}$/.test(mobile)) _error = "Invalid mobile";

    return {
      _row: index + 2,
      name,
      email,
      mobile,
      walletAmount,
      _error,
    };
  });
}

/** Prefer raw cell values so phone numbers stay numeric, not scientific text. */
function sheetToRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  // Wipe scientific formatted text on numeric cells before JSON conversion
  Object.keys(sheet).forEach((addr) => {
    if (addr.startsWith("!")) return;
    const cell = sheet[addr] as XLSX.CellObject | undefined;
    if (cell?.t === "n" && cell.w && /e[+-]?\d+/i.test(String(cell.w))) {
      delete cell.w;
      cell.z = "0";
    }
  });

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
}

export default function ImportCustomersModal({
  open,
  loading = false,
  onClose,
  onImport,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState("");

  const validRows = useMemo(
    () => rows.filter((r) => !r._error),
    [rows],
  );

  if (!open) return null;

  const downloadTemplate = () => {
    // Use AOA so mobile stays text-friendly in Excel
    const aoa = [
      ["name", "email", "mobile", "walletAmount"],
      ["Rahul Anand", "rahul@example.com", "9876543210", 150],
      ["Priya Singh", "priya@example.com", "8765432109", 0],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    // Force mobile column as text format
    ["C2", "C3"].forEach((addr) => {
      if (sheet[addr]) {
        sheet[addr].t = "s";
        sheet[addr].v = String(sheet[addr].v);
        sheet[addr].z = "@";
      }
    });
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Customers");
    XLSX.writeFile(book, "customer-import-template.xlsx");
  };

  const onFileChange = async (file?: File | null) => {
    setParseError("");
    setRows([]);
    setFileName("");
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setParseError("Excel file has no sheets.");
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      const json = sheetToRows(sheet);
      if (!json.length) {
        setParseError("No data rows found in the Excel file.");
        return;
      }

      const mapped = mapSheetRows(json);
      const hasAnyIdentity = mapped.some((r) => r.name || r.mobile);
      if (!hasAnyIdentity) {
        setParseError(
          "Could not find name/mobile columns. Use headers like name, mobile / Mobile No., email, walletAmount / balance.",
        );
        return;
      }

      setFileName(file.name);
      setRows(mapped);
    } catch {
      setParseError("Could not read Excel file. Use .xlsx / .xls / .csv.");
    }
  };

  const handleImport = async () => {
    if (!validRows.length) return;
    await onImport(
      validRows.map(({ name, email, mobile, walletAmount }) => ({
        name,
        email,
        mobile,
        walletAmount,
      })),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Import Customers (Excel)
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Columns: name, email/mail, mobile/Mobile No., walletAmount/balance
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Download size={14} />
              Download template
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Upload size={14} />
              Choose Excel file
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                void onFileChange(e.target.files?.[0]);
                // allow re-selecting the same file
                e.target.value = "";
              }}
            />
          </div>

          {fileName ? (
            <div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <FileSpreadsheet size={14} />
              {fileName} · {rows.length} rows · {validRows.length} valid
            </div>
          ) : null}

          {parseError ? (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              {parseError}
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="overflow-auto rounded-xl border border-gray-100">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Row</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Mobile</th>
                    <th className="px-3 py-2 font-semibold">Balance</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((row) => (
                    <tr key={row._row} className="border-t border-gray-50">
                      <td className="px-3 py-2 text-gray-400">{row._row}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {row.name || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.email || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.mobile || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        ₹{Number(row.walletAmount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2">
                        {row._error ? (
                          <span className="text-red-500">{row._error}</span>
                        ) : (
                          <span className="text-emerald-600">Ready</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 ? (
                <div className="border-t border-gray-100 px-3 py-2 text-[11px] text-gray-400">
                  Showing first 50 of {rows.length} rows
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-xs text-gray-400">
              Upload an Excel file to preview customers before importing.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !validRows.length}
            onClick={() => void handleImport()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Importing…"
              : `Import ${validRows.length || ""} customer${validRows.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
