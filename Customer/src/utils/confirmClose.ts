import Swal from 'sweetalert2';

/** User-dismiss only. Successful save paths should call onClose directly. */
export function closeIfConfirmed(onClose: () => void) {
  if (Swal.isVisible()) return Promise.resolve();
  return Swal.fire({
    title: 'Do you really want to close?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, close',
    cancelButtonText: 'No',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    reverseButtons: true,
    focusCancel: true,
  }).then(result => {
    if (result.isConfirmed) onClose();
  });
}
