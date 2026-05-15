import type { CartDto } from '@repo/types';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const SESSION_KEY_STORAGE = 'cart.sessionKey';
const CART_SNAPSHOT_STORAGE = 'cart.snapshot';

async function readOrCreateSessionKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(SESSION_KEY_STORAGE);
  if (existing) return existing;
  const fresh = generateUuid();
  await SecureStore.setItemAsync(SESSION_KEY_STORAGE, fresh);
  return fresh;
}

async function clearStoredSessionKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY_STORAGE);
}

async function readCartSnapshot(): Promise<CartDto | null> {
  try {
    const raw = await SecureStore.getItemAsync(CART_SNAPSHOT_STORAGE);
    return raw ? (JSON.parse(raw) as CartDto) : null;
  } catch {
    return null;
  }
}

function writeCartSnapshot(cart: CartDto | null): void {
  // Best-effort offline cache; never throw from the store.
  if (cart) {
    void SecureStore.setItemAsync(CART_SNAPSHOT_STORAGE, JSON.stringify(cart)).catch(
      () => undefined,
    );
  } else {
    void SecureStore.deleteItemAsync(CART_SNAPSHOT_STORAGE).catch(() => undefined);
  }
}

function generateUuid(): string {
  // React Native lacks `crypto.randomUUID` on older runtimes — use a small
  // RFC4122 v4 generator.
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface CartState {
  cart: CartDto | null;
  sessionKey: string | null;
  pendingMutationCount: number;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  clearSessionKey: () => Promise<void>;
  setCart: (cart: CartDto | null) => void;
  beginMutation: () => void;
  endMutation: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  sessionKey: null,
  pendingMutationCount: 0,
  isHydrated: false,

  hydrate: async () => {
    if (get().isHydrated) return;
    const [sessionKey, snapshot] = await Promise.all([
      readOrCreateSessionKey(),
      readCartSnapshot(),
    ]);
    // Show the last-known cart immediately (offline-friendly); a live fetch
    // overwrites it via setCart once the network is back.
    set({ sessionKey, cart: snapshot, isHydrated: true });
  },

  clearSessionKey: async () => {
    await clearStoredSessionKey();
    writeCartSnapshot(null);
    set({ sessionKey: null, cart: null });
  },

  setCart: (cart) => {
    writeCartSnapshot(cart);
    set({ cart });
  },
  beginMutation: () => set({ pendingMutationCount: get().pendingMutationCount + 1 }),
  endMutation: () => set({ pendingMutationCount: Math.max(0, get().pendingMutationCount - 1) }),
}));

/** Pure reducer, identical to web's — unit-tested. */
export interface MergeInput {
  userItems: { menuItemId: string; quantity: number; fingerprint: string }[];
  guestItems: { menuItemId: string; quantity: number; fingerprint: string }[];
}

export function mergeCartItems(input: MergeInput): {
  menuItemId: string;
  quantity: number;
  fingerprint: string;
}[] {
  const merged = new Map<string, { menuItemId: string; quantity: number; fingerprint: string }>();
  const keyFor = (it: { menuItemId: string; fingerprint: string }) =>
    `${it.menuItemId}|${it.fingerprint}`;
  for (const it of input.userItems) {
    merged.set(keyFor(it), { ...it });
  }
  for (const it of input.guestItems) {
    const key = keyFor(it);
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += it.quantity;
    } else {
      merged.set(key, { ...it });
    }
  }
  return Array.from(merged.values());
}
