const INVITE_REF_KEY = 'woowoo_invite_ref';

export const saveInviteRef = (ref?: string | null) => {
  const code = String(ref || '').trim().toUpperCase();
  if (!code) return;
  try {
    localStorage.setItem(INVITE_REF_KEY, code);
  } catch {
    // ignore storage errors
  }
};

export const getInviteRef = () => {
  try {
    return localStorage.getItem(INVITE_REF_KEY) || '';
  } catch {
    return '';
  }
};

export const clearInviteRef = () => {
  try {
    localStorage.removeItem(INVITE_REF_KEY);
  } catch {
    // ignore
  }
};

export const captureInviteRefFromSearch = (search: string) => {
  const params = new URLSearchParams(search);
  const ref = params.get('ref') || params.get('invite') || params.get('referral');
  if (ref) saveInviteRef(ref);
  return ref ? String(ref).trim().toUpperCase() : '';
};
