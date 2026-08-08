import type { ReactNode } from "react";
import { X } from "lucide-react";
import Swal from "sweetalert2";

type Props = {
  open?: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Ask before closing (create/edit). View mode should leave this false. */
  confirmOnClose?: boolean;
  className?: string;
};

/**
 * Full-screen overlay shell for embedding create/view document forms as modals
 * (keeps the user on the list page).
 */
export default function DocumentFormModal({
  open = true,
  onClose,
  children,
  confirmOnClose = false,
  className = "",
}: Props) {
  if (!open) return null;

  const handleClose = async () => {
    if (confirmOnClose) {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "Any unsaved changes will be lost.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#4F46E5",
        cancelButtonColor: "#6B7280",
        confirmButtonText: "Yes, Close",
        cancelButtonText: "Cancel",
      });
      if (!result.isConfirmed) return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-center overflow-y-auto bg-black/40 backdrop-blur-sm sm:items-center sm:p-4 md:p-6"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 cursor-default"
        onClick={() => void handleClose()}
      />
      <div
        className={`relative z-10 flex h-dvh max-h-dvh w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:my-4 sm:h-auto sm:max-h-[92vh] sm:rounded-2xl ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="safe-top flex shrink-0 items-center justify-end border-b border-gray-100 px-3 py-2">
          <button
            type="button"
            onClick={() => void handleClose()}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
          >
            <X size={18} />
            Close
          </button>
        </div>
        <div className="safe-pb min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
