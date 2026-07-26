import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Upload, X, Download } from "lucide-react";
import * as XLSX from "xlsx";
import type { VendorImportRow } from "@/services/apiClient";

type Props = {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onImport: (rows: VendorImportRow[]) => Promise<void>;
};

type PreviewRow = VendorImportRow & { _row: number; _error?: string };

function normalizeHeader(key: string) {
  return String(key || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const FIELD_ALIASES = {
  name: ["name", "vendorname", "fullname", "vendor", "supplier", "suppliername"],
  email: ["email", "mail", "emailid", "emailaddress"],
  mobile: [
    "phone",
    "phonenumber",
    "phoneno",
    "mobilenumber",
    "mobileno",
    "mobile",
    "contactnumber",
    "contactno",
    "contact",
  ],
  company: ["company", "companyname", "businessname", "firmname"],
  gstin: ["gstin", "gst", "gstno", "gstnumber"],
  billingAddress1: [
    "billingaddress1",
    "billingaddress",
    "address1",
    "addressline1",
    "address",
  ],
  billingAddress2: ["billingaddress2", "address2", "addressline2"],
  city: ["billingcity", "city"],
  state: ["billingstate", "state"],
  pincode: ["billingpincode", "pincode", "pin", "zip", "zipcode"],
  country: ["billingcountry", "country"],
  openingBalance: ["openingbalance", "openingbal"],
  debitLimit: ["debitlimit", "creditlimit"],
  defaultDueDays: ["defaultduedate", "defaultduedays", "duedays"],
  netBalance: ["netbalance", "balance", "closingbalance"],
  notes: ["notes", "note", "remark", "remarks"],
} as const;

type FieldKey = keyof typeof FIELD_ALIASES;

function pickField(row: Record<string, unknown>, field: FieldKey): unknown {
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
    if (Number.isInteger(value) || Math.abs(value % 1) < 1e-9) {
      return String(Math.trunc(value));
    }
    return String(value);
  }
  const text = String(value).trim();
  if (!text || /^none$/i.test(text) || text === "-") return "";
  return text;
}

function normalizeMobile(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const digits = String(Math.trunc(Math.abs(raw)));
    return digits.length > 10 ? digits.slice(-10) : digits;
  }
  const text = cellToString(raw);
  if (!text) return "";
  if (/e[+-]?\d+/i.test(text)) {
    const asNum = Number(text);
    if (Number.isFinite(asNum)) return normalizeMobile(asNum);
  }
  const digits = text.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizeNumber(raw: unknown, fallback = 0): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const text = cellToString(raw).replace(/[,₹\s]/g, "");
  if (!text) return fallback;
  const num = Number(text);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeState(raw: unknown): string {
  const text = cellToString(raw);
  if (!text) return "";
  const match = text.match(/^\d+\s*[-–]\s*(.+)$/);
  return (match?.[1] || text).trim();
}

function mapSheetRows(rawRows: Record<string, unknown>[]): PreviewRow[] {
  return rawRows.map((row, index) => {
    const companyName = cellToString(pickField(row, "company"));
    const name = cellToString(pickField(row, "name")) || companyName;
    const email = cellToString(pickField(row, "email")).toLowerCase();
    const mobile = normalizeMobile(pickField(row, "mobile"));
    const gstin = cellToString(pickField(row, "gstin")).toUpperCase();
    const billingAddress1 = cellToString(pickField(row, "billingAddress1"));
    const billingAddress2 = cellToString(pickField(row, "billingAddress2"));
    const city = cellToString(pickField(row, "city"));
    const state = normalizeState(pickField(row, "state"));
    const pincode = cellToString(pickField(row, "pincode"));
    const country = cellToString(pickField(row, "country")) || "India";
    const openingBalance = normalizeNumber(pickField(row, "openingBalance"), 0);
    const debitLimit = normalizeNumber(pickField(row, "debitLimit"), 0);
    const defaultDueDays = normalizeNumber(pickField(row, "defaultDueDays"), -1);
    const netBalance = normalizeNumber(
      pickField(row, "netBalance"),
      openingBalance,
    );
    const notes = cellToString(pickField(row, "notes"));

    let _error = "";
    if (!mobile) _error = "Phone required";
    else if (!name) _error = "Name or Company required";
    else if (!/^[6-9]\d{9}$/.test(mobile)) _error = "Invalid phone";

    return {
      _row: index + 2,
      name,
      email,
      mobile,
      companyName: companyName || name,
      gstin,
      billingAddress1,
      billingAddress2,
      city,
      state,
      pincode,
      country,
      openingBalance,
      debitLimit,
      defaultDueDays,
      netBalance,
      closingBalance: netBalance,
      notes,
      _error,
    };
  });
}

function sheetToRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
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

export default function ImportVendorModal({
  open,
  loading = false,
  onClose,
  onImport,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState("");

  const validRows = useMemo(() => rows.filter((r) => !r._error), [rows]);

  if (!open) return null;

  const downloadTemplate = () => {
    const aoa = [
      [
        "Phone",
        "Email",
        "GSTIN",
        "Company",
        "Billing Address 1",
        "Billing Address 2",
        "Billing City",
        "Billing State",
        "Billing Pincode",
        "Billing Country",
        "Opening Balance",
        "Debit Limit",
        "Default Due Date",
        "Net Balance",
        "Notes",
      ],
      [
        "9876543210",
        "vendor@example.com",
        "22AAAAA0000A1Z5",
        "Acme Supplies",
        "Power House",
        "Industrial Area",
        "Bhilai",
        "22-CHATTISGARH",
        "490001",
        "India",
        0,
        0,
        -1,
        16075,
        "",
      ],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    if (sheet.A2) {
      sheet.A2.t = "s";
      sheet.A2.v = "9876543210";
      sheet.A2.z = "@";
    }
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Vendors");
    XLSX.writeFile(book, "vendor-import-template.xlsx");
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
      const hasAnyIdentity = mapped.some((r) => r.name || r.mobile || r.companyName);
      if (!hasAnyIdentity) {
        setParseError(
          "Could not find Phone/Company columns. Use headers like Phone, Email, Company, Billing Address 1, Net Balance.",
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
      validRows.map(
        ({
          name,
          email,
          mobile,
          companyName,
          gstin,
          billingAddress1,
          billingAddress2,
          city,
          state,
          pincode,
          country,
          openingBalance,
          debitLimit,
          defaultDueDays,
          netBalance,
          closingBalance,
          notes,
        }) => ({
          name,
          email,
          mobile,
          companyName,
          gstin,
          billingAddress1,
          billingAddress2,
          city,
          state,
          pincode,
          country,
          openingBalance,
          debitLimit,
          defaultDueDays,
          netBalance,
          closingBalance,
          notes,
        }),
      ),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Import Vendors (Excel)
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Phone, Email, GSTIN, Company, Billing Address 1/2, City, State,
              Pincode, Country, Opening Balance, Debit Limit, Default Due Date,
              Net Balance, Notes
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
                    <th className="px-3 py-2 font-semibold">Company</th>
                    <th className="px-3 py-2 font-semibold">Phone</th>
                    <th className="px-3 py-2 font-semibold">City</th>
                    <th className="px-3 py-2 font-semibold">Net Balance</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((row) => (
                    <tr key={row._row} className="border-t border-gray-50">
                      <td className="px-3 py-2 text-gray-400">{row._row}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {row.companyName || row.name || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.mobile || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.city || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        ₹
                        {Number(row.netBalance || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
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
              Upload your vendor Excel (Phone, Company, Billing Address, Net
              Balance, etc.) to preview before importing.
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
              : `Import ${validRows.length || ""} vendor${validRows.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
