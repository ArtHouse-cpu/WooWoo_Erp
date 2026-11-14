/** Visual options shared by Sales and Purchase tables so they match the CVP list. */
export const cvpMaterialTableProps = {
  enableColumnActions: false,
  enableColumnOrdering: false,
  enableDensityToggle: false,
  enableFullScreenToggle: false,
  enableHiding: false,
  enablePagination: true,
  enableBottomToolbar: true,
  paginationDisplayMode: "pages" as const,
  positionPagination: "bottom" as const,
  initialState: {
    density: "compact" as const,
    pagination: { pageIndex: 0, pageSize: 8 },
  },
  muiTablePaperProps: {
    elevation: 0,
    sx: {
      borderRadius: "16px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 2px rgb(0 0 0 / 0.05)",
      overflow: "hidden",
      backgroundColor: "#ffffff",
    },
  },
  muiTableContainerProps: {
    sx: {
      maxWidth: "100%",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
    },
  },
  muiTableHeadCellProps: {
    sx: {
      backgroundColor: "#f8fafc",
      color: "#94a3b8",
      fontWeight: 600,
      fontSize: "10px",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      padding: "10px 12px",
      borderBottom: "1px solid #f1f5f9",
      whiteSpace: "nowrap",
    },
  },
  muiTableBodyCellProps: {
    sx: {
      fontSize: "12px",
      color: "#334155",
      padding: "8px 12px",
      borderBottom: "1px solid #f1f5f9",
    },
  },
  muiTableBodyRowProps: {
    hover: true,
    sx: {
      "&:hover": { backgroundColor: "#f8fafc" },
      "&:last-of-type td": { borderBottom: "none" },
    },
  },
  muiTopToolbarProps: {
    sx: {
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #f1f5f9",
      minHeight: "52px",
      "& .MuiInputBase-root": {
        fontSize: "12px",
        fontWeight: 600,
      },
    },
  },
  muiBottomToolbarProps: {
    sx: {
      backgroundColor: "#ffffff",
      borderTop: "1px solid #f1f5f9",
      minHeight: "44px",
      "& .MuiTypography-root, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
        fontSize: "11px",
        color: "#64748b",
      },
    },
  },
  muiPaginationProps: {
    shape: "rounded" as const,
    size: "small" as const,
    variant: "outlined" as const,
    color: "standard" as const,
    showFirstButton: false,
    showLastButton: false,
    rowsPerPageOptions: [8, 16, 24],
    sx: {
      "& .MuiPaginationItem-root": {
        fontSize: "11px",
        minWidth: 28,
        height: 28,
        borderRadius: "8px",
        borderColor: "#e2e8f0",
        color: "#475569",
      },
      "& .Mui-selected": {
        backgroundColor: "#0f172a !important",
        borderColor: "#0f172a !important",
        color: "#ffffff !important",
      },
    },
  },
};

export const cvpActionButtonClass =
  "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50";

export const cvpShareButtonClass =
  "inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50";

export const cvpFilterSelectClass =
  "h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 outline-none";

export const cvpFilterDateClass =
  "h-9 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-800 outline-none";

export const cvpFilterBarClass =
  "flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm";

export const cvpPageClass = "mx-auto hidden min-w-0 max-w-7xl space-y-4 px-4 py-5 md:block";

export const cvpWebPageClass = "mx-auto min-w-0 max-w-7xl space-y-4 px-4 py-5";

export const cvpTitleClass = "text-xl font-bold text-slate-900";

export const cvpPrimaryButtonClass =
  "inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white";
