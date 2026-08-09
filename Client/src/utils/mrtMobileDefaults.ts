/**
 * Shared Material React Table props so wide tables scroll inside the
 * admin shell on phones instead of stretching the page.
 */
export const mrtMobilePaperProps = {
  elevation: 0,
  square: false,
  sx: {
    boxShadow: "none",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    maxWidth: "100%",
    overflow: "hidden",
  },
} as const;

export const mrtMobileContainerProps = {
  sx: {
    maxWidth: "100%",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  },
} as const;
