/**
 * Lets the header cart icon open the cart drawer, which lives in the (shop)
 * layout's CartContainer. Pages without that container (marketing pages) fall
 * back to navigating instead.
 */
const EVENT = 'szef:open-cart';
let mounted = 0;

/** Called by CartContainer; returns the cleanup for its effect. */
export function registerCartDrawer(open: () => void): () => void {
  mounted += 1;
  const handler = () => open();
  window.addEventListener(EVENT, handler);
  return () => {
    mounted -= 1;
    window.removeEventListener(EVENT, handler);
  };
}

/** Opens the drawer if one is mounted on this page; returns false otherwise. */
export function openCartDrawer(): boolean {
  if (typeof window === 'undefined' || mounted === 0) return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}
