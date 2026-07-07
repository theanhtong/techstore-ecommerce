import { create } from "zustand";
import { client } from "../api/client";
import { useAuthStore } from "./useAuthStore";

export interface CartItem {
  id: string; // cartItemId or variantId (for guest)
  variantId: string;
  quantity: number;
  effectivePrice: number;
  variant: {
    id: string;
    sku: string;
    price: number;
    salePrice: number | null;
    product: {
      id: string;
      name: string;
      slug: string;
      status: string;
    };
    images: { id: string; url: string; order: number }[];
    inventory?: { quantity: number; reservedQuantity: number };
  };
}

interface CartState {
  items: CartItem[];
  subtotal: number;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (variantId: string, quantity: number, variantDetails?: any) => Promise<void>;
  updateItemQuantity: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const getGuestCart = (): { items: CartItem[]; subtotal: number } => {
  try {
    const raw = localStorage.getItem("guest_cart");
    if (!raw) return { items: [], subtotal: 0 };
    const items = JSON.parse(raw);
    const subtotal = items.reduce((sum: number, item: CartItem) => {
      const price = item.effectivePrice || item.variant.price;
      return sum + price * item.quantity;
    }, 0);
    return { items, subtotal };
  } catch {
    return { items: [], subtotal: 0 };
  }
};

const saveGuestCart = (items: CartItem[]) => {
  localStorage.setItem("guest_cart", JSON.stringify(items));
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  subtotal: 0,
  loading: false,

  fetchCart: async () => {
    const isAuth = !!useAuthStore.getState().accessToken;
    if (isAuth) {
      set({ loading: true });
      try {
        const res = await client.get("/cart");
        set({ items: res.data.items, subtotal: res.data.subtotal });
      } catch (err) {
        console.error("Failed to fetch cart", err);
      } finally {
        set({ loading: false });
      }
    } else {
      const { items, subtotal } = getGuestCart();
      set({ items, subtotal });
    }
  },

  addItem: async (variantId, quantity, variantDetails) => {
    const isAuth = !!useAuthStore.getState().accessToken;
    if (isAuth) {
      set({ loading: true });
      try {
        await client.post("/cart/items", { variantId, quantity });
        await get().fetchCart();
      } catch (err) {
        console.error("Failed to add cart item", err);
        throw err;
      } finally {
        set({ loading: false });
      }
    } else {
      const { items } = getGuestCart();
      const existing = items.find((i) => i.variantId === variantId);
      if (existing) {
        existing.quantity += quantity;
      } else if (variantDetails) {
        items.push({
          id: variantId, // use variantId as item id for guest
          variantId,
          quantity,
          effectivePrice: variantDetails.salePrice ?? variantDetails.price,
          variant: variantDetails,
        });
      }
      saveGuestCart(items);
      await get().fetchCart();
    }
  },

  updateItemQuantity: async (id, quantity) => {
    const isAuth = !!useAuthStore.getState().accessToken;
    if (isAuth) {
      set({ loading: true });
      try {
        await client.patch(`/cart/items/${id}`, { quantity });
        await get().fetchCart();
      } catch (err) {
        console.error("Failed to update cart item quantity", err);
        throw err;
      } finally {
        set({ loading: false });
      }
    } else {
      const { items } = getGuestCart();
      const item = items.find((i) => i.id === id);
      if (item) {
        item.quantity = quantity;
        saveGuestCart(items);
        await get().fetchCart();
      }
    }
  },

  removeItem: async (id) => {
    const isAuth = !!useAuthStore.getState().accessToken;
    if (isAuth) {
      set({ loading: true });
      try {
        await client.delete(`/cart/items/${id}`);
        await get().fetchCart();
      } catch (err) {
        console.error("Failed to delete cart item", err);
        throw err;
      } finally {
        set({ loading: false });
      }
    } else {
      const { items } = getGuestCart();
      const filtered = items.filter((i) => i.id !== id);
      saveGuestCart(filtered);
      await get().fetchCart();
    }
  },

  clearCart: async () => {
    const isAuth = !!useAuthStore.getState().accessToken;
    if (isAuth) {
      set({ loading: true });
      try {
        await client.delete("/cart");
        set({ items: [], subtotal: 0 });
      } catch (err) {
        console.error("Failed to clear cart", err);
      } finally {
        set({ loading: false });
      }
    } else {
      saveGuestCart([]);
      set({ items: [], subtotal: 0 });
    }
  },
}));
