import { useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";

export type ProductBulkImportRow = {
  productName: string;
  variant: string;
  category: string;
  barcode: string;
  sellingPrice: number;
  itemCode: string;
  stockQty: number;
  purchasePrice: number;
};

type Props = {
  onClose: () => void;
  loading?: boolean;
  onImport: (rows: ProductBulkImportRow[]) => Promise<void>;
};

type PreviewRow = ProductBulkImportRow & { _row: number; _error?: string };

type FieldKey = keyof ProductBulkImportRow;

/** Strip BOM/punctuation so "Unit Price" ≈ "unitprice" ≈ "sellingprice". */
function normalizeHeader(key: string) {
  return String(key || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  productName: [
    "product",
    "productname",
    "itemname",
    "name",
    "item",
  ],
  variant: ["variant", "variantname", "size", "color"],
  category: [
    "category",
    "categories",
    "categoryname",
    "productcategory",
    "productcategories",
  ],
  barcode: ["barcode", "barcodeno", "barcodenumber", "ean", "upc"],
  sellingPrice: [
    "unitprice",
    "sellingprice",
    "saleprice",
    "price",
    "mrp",
    "sellprice",
  ],
  itemCode: ["itemcode", "sku", "code", "productcode", "itemsku"],
  stockQty: ["qty", "quantity", "stock", "stockqty", "stockquantity"],
  purchasePrice: [
    "purchaseprice",
    "costprice",
    "cost",
    "buyprice",
    "purchase",
  ],
};

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
  return String(value).trim();
}

function normalizeAmount(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, raw);
  }
  const text = cellToString(raw).replace(/[,₹\s]/g, "");
  if (!text) return 0;
  const num = Number(text);
  return Number.isFinite(num) ? Math.max(0, num) : 0;
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

function mapSheetRows(rawRows: Record<string, unknown>[]): PreviewRow[] {
  const seen = new Map<string, number>();

  const identityKey = (row: {
    productName: string;
    variant: string;
    itemCode: string;
    barcode: string;
  }) => {
    const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
    const code = norm(row.itemCode);
    if (code) return `item:${code}`;
    const barcode = norm(row.barcode);
    if (barcode) return `barcode:${barcode}`;
    return `name:${norm(row.productName)}|variant:${norm(row.variant)}`;
  };

  return rawRows.map((row, index) => {
    const productName = cellToString(pickField(row, "productName"));
    const variant = cellToString(pickField(row, "variant"));
    const category = cellToString(pickField(row, "category"));
    const barcode = cellToString(pickField(row, "barcode"));
    const sellingPrice = normalizeAmount(pickField(row, "sellingPrice"));
    const itemCode = cellToString(pickField(row, "itemCode"));
    const stockQty = 0; // Stock comes from purchases, not product master
    const purchasePrice = normalizeAmount(pickField(row, "purchasePrice"));
    const excelRow = index + 2;

    let _error = "";
    if (!productName) _error = "Product name required";
    else if (!(sellingPrice > 0)) _error = "Unit / Selling Price must be > 0";
    else if (!category) _error = "Category required";
    else {
      const key = identityKey({ productName, variant, itemCode, barcode });
      if (seen.has(key)) {
        _error = `Duplicate in file (first on row ${seen.get(key)})`;
      } else {
        seen.set(key, excelRow);
      }
    }

    return {
      _row: excelRow,
      productName,
      variant,
      category,
      barcode,
      sellingPrice,
      itemCode,
      stockQty,
      purchasePrice,
      _error,
    };
  });
}

export default function UploadBulkProductModal({
  onClose,
  loading = false,
  onImport,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState("");

  const validRows = useMemo(() => rows.filter((r) => !r._error), [rows]);

  const downloadTemplate = () => {
    const aoa = [
      [
        "Product",
        "Variant",
        "Category",
        "Barcode",
        "Unit Price",
        "Item Code",
        "Purchase Price",
      ],
      [
        "Canvas Tote Bag",
        "Large",
        "Bags",
        "8901234567890",
        499,
        "TOTE-L",
        280,
      ],
      [
        "Ceramic Mug",
        "",
        "Home",
        "8901234567891",
        299,
        "MUG-01",
        150,
      ],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Products");
    XLSX.writeFile(book, "product-bulk-import-template.xlsx");
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
      const hasAnyProduct = mapped.some((r) => r.productName);
      if (!hasAnyProduct) {
        setParseError(
          "Could not find Product / Product Name column. Use headers like Product, Variant, Category, Barcode, Unit Price, Item Code, Purchase Price.",
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
    if (!validRows.length || loading) return;
    await onImport(
      validRows.map(
        ({
          productName,
          variant,
          category,
          barcode,
          sellingPrice,
          itemCode,
          stockQty,
          purchasePrice,
        }) => ({
          productName,
          variant,
          category,
          barcode,
          sellingPrice,
          itemCode,
          stockQty,
          purchasePrice,
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
              Bulk Upload Products (Excel)
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Columns: Product, Variant, Category, Barcode, Unit Price, Item
              Code, Purchase Price. Stock starts at 0 and updates from purchases
              (Qty in Excel is ignored). Missing categories are auto-created.
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
                    <th className="px-3 py-2 font-semibold">Product</th>
                    <th className="px-3 py-2 font-semibold">Variant</th>
                    <th className="px-3 py-2 font-semibold">Category</th>
                    <th className="px-3 py-2 font-semibold">Barcode</th>
                    <th className="px-3 py-2 font-semibold">Unit Price</th>
                    <th className="px-3 py-2 font-semibold">Item Code</th>
                    <th className="px-3 py-2 font-semibold">Purchase</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((row) => (
                    <tr key={row._row} className="border-t border-gray-50">
                      <td className="px-3 py-2 text-gray-400">{row._row}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {row.productName || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.variant || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.category || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.barcode || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        ₹{row.sellingPrice.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.itemCode || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        ₹{row.purchasePrice.toLocaleString("en-IN")}
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
              Upload your exported Excel to preview products before importing.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={!validRows.length || loading}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Importing..."
              : `Import ${validRows.length || 0} product${validRows.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
