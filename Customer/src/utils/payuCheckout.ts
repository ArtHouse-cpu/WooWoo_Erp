/**
 * Auto-submit a hidden form to PayU hosted checkout.
 */
export function redirectToPayu(
  paymentUrl: string,
  params: Record<string, string | number | undefined | null>,
) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentUrl;
  form.style.display = 'none';

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
