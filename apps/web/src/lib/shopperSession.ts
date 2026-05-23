/**
 * Anonymous shopper session id. Persisted in localStorage so a shopper that
 * placed an order via QR can return later and see their order history without
 * creating an account.
 */
const KEY = 'mallguide_shopper_session';

export function getShopperSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
  }
  return id;
}
