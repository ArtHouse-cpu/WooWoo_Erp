import type { CatalogueLookupItem } from "@/services/apiClient";

type CatalogueNameParts = {
  parentName: string;
  variantName: string | null;
  fullLabel: string;
};

/** Split catalogue row into clear parent + variant labels for selection UI. */
export function getCatalogueNameParts(
  item: Pick<
    CatalogueLookupItem,
    "productName" | "name" | "variantName" | "parentProductName"
  >,
): CatalogueNameParts {
  const variantName = String(item.variantName ?? "").trim() || null;
  const parentFromApi = String(item.parentProductName ?? "").trim();
  const full =
    String(item.productName || item.name || "").trim() || "Untitled";

  if (variantName) {
    let parentName = parentFromApi;
    if (!parentName) {
      const sep = ` - ${variantName}`;
      parentName = full.endsWith(sep)
        ? full.slice(0, -sep.length).trim()
        : full;
    }
    return {
      parentName: parentName || full,
      variantName,
      fullLabel: `${parentName || full} (${variantName})`,
    };
  }

  return {
    parentName: full,
    variantName: null,
    fullLabel: full,
  };
}

type Props = {
  item: Pick<
    CatalogueLookupItem,
    "productName" | "name" | "variantName" | "parentProductName"
  >;
  /** denser layout for small product cards */
  compact?: boolean;
  className?: string;
};

/**
 * Clear product title for Quick Select / POS:
 * parent name on first line, variant in brackets on second (when present).
 */
export default function CatalogueItemLabel({
  item,
  compact = false,
  className = "",
}: Props) {
  const { parentName, variantName, fullLabel } = getCatalogueNameParts(item);

  if (!variantName) {
    return (
      <div
        className={`break-words font-semibold leading-snug text-gray-900 ${
          compact ? "text-[11px] sm:text-xs" : "text-sm"
        } ${className}`}
        title={fullLabel}
      >
        {parentName}
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${className}`} title={fullLabel}>
      <div
        className={`break-words font-semibold leading-snug text-gray-900 ${
          compact ? "text-[11px] sm:text-xs" : "text-sm"
        }`}
      >
        {parentName}
      </div>
      <div
        className={`mt-0.5 break-words font-semibold leading-snug text-violet-700 ${
          compact ? "text-[10px] sm:text-[11px]" : "text-xs"
        }`}
      >
        ({variantName})
      </div>
    </div>
  );
}
