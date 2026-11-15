/** User-dismiss only. Closes directly without confirmation prompt. */
export function closeIfConfirmed(onClose: () => void) {
  onClose();
  return Promise.resolve();
}
