import { create } from "zustand";
import { client } from "../api/client";

export interface NotificationItem {
  id: string;
  userId: string;
  type:
    | "ORDER_PLACED"
    | "ORDER_CONFIRMED"
    | "ORDER_SHIPPED"
    | "ORDER_DELIVERED"
    | "ORDER_CANCELLED"
    | "PROMOTION"
    | "SYSTEM";
  title: string;
  body: string;
  isRead: boolean;
  metadata: any;
  createdAt: string;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const res = await client.get("/notifications", {
        params: { page: 1, limit: 20 },
      });
      set({
        notifications: res.data.data || [],
        unreadCount: res.data.unreadCount || 0,
      });
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await client.patch(`/notifications/${id}/read`);
      const updated = get().notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      const newUnreadCount = Math.max(0, get().unreadCount - 1);
      set({ notifications: updated, unreadCount: newUnreadCount });
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
    }
  },

  markAllAsRead: async () => {
    try {
      await client.patch("/notifications/read-all");
      const updated = get().notifications.map((n) => ({ ...n, isRead: true }));
      set({ notifications: updated, unreadCount: 0 });
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await client.delete(`/notifications/${id}`);
      const notification = get().notifications.find((n) => n.id === id);
      const updated = get().notifications.filter((n) => n.id !== id);
      let newUnreadCount = get().unreadCount;
      if (notification && !notification.isRead) {
        newUnreadCount = Math.max(0, newUnreadCount - 1);
      }
      set({ notifications: updated, unreadCount: newUnreadCount });
    } catch (err) {
      console.error(`Failed to delete notification ${id}:`, err);
    }
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));
