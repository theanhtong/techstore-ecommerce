import React, { useState, useEffect, useRef } from "react";
import { useNotificationStore, NotificationItem } from "../store/useNotificationStore";
import {
  Bell,
  Trash2,
  Check,
  ShoppingBag,
  Package,
  Truck,
  XCircle,
  Percent,
  CheckCheck,
  Loader2
} from "lucide-react";
import { Link } from "react-router";

export default function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    const className = "w-4 h-4";
    switch (type) {
      case "ORDER_PLACED":
        return <ShoppingBag className={`${className} text-blue-500`} />;
      case "ORDER_CONFIRMED":
        return <Package className={`${className} text-indigo-500`} />;
      case "ORDER_SHIPPED":
        return <Truck className={`${className} text-orange-500`} />;
      case "ORDER_DELIVERED":
        return <Package className={`${className} text-green-500`} />;
      case "ORDER_CANCELLED":
        return <XCircle className={`${className} text-hazard`} />;
      case "PROMOTION":
        return <Percent className={`${className} text-purple-500`} />;
      default:
        return <Bell className={`${className} text-gray-500`} />;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHr / 24);

      if (diffSec < 60) return "Vừa xong";
      if (diffMin < 60) return `${diffMin} phút trước`;
      if (diffHr < 24) return `${diffHr} giờ trước`;
      if (diffDays < 7) return `${diffDays} ngày trước`;

      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    markAsRead(id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    deleteNotification(id);
  };

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 hover:text-hazard transition-all duration-200 uppercase text-xs font-bold tracking-wider cursor-pointer ${
          isOpen ? "text-hazard" : "text-ink/75"
        }`}
        aria-label="Toggle notifications"
      >
        <div className="relative flex items-center justify-center">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-hazard animate-pulse" />
          )}
        </div>
        <span>Thông báo {unreadCount > 0 ? `(${unreadCount})` : ""}</span>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden transform origin-top-right transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-substrate-dark">
            <span className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-hazard" />
              Thông báo
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-hazard hover:underline font-medium cursor-pointer flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
            {loading && notifications.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-ink/40 text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-hazard" />
                Đang tải thông báo...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center text-ink/40 text-xs flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <Bell className="w-5 h-5 stroke-[1.5]" />
                </div>
                <span>Không có thông báo nào dành cho bạn.</span>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => !item.isRead && markAsRead(item.id)}
                  className={`group relative px-4 py-3 flex gap-3 hover:bg-gray-50 transition-colors duration-200 cursor-pointer ${!item.isRead ? "bg-red-50/20" : ""
                    }`}
                >
                  {/* Icon */}
                  <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-gray-100/80 flex items-center justify-center">
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-xs text-ink break-words ${!item.isRead ? "font-bold" : "font-medium"}`}>
                        {item.title}
                      </p>
                      {!item.isRead && (
                        <span className="flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-hazard" />
                      )}
                    </div>
                    <p className="text-[11px] text-ink/60 mt-0.5 leading-relaxed break-words">
                      {item.body}
                    </p>
                    <span className="text-[10px] text-ink/40 mt-1 block">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute right-2 top-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {!item.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(e, item.id)}
                        title="Đánh dấu đã đọc"
                        className="p-1 rounded bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-green-600 shadow-sm cursor-pointer animate-none"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      title="Xóa thông báo"
                      className="p-1 rounded bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-hazard shadow-sm cursor-pointer animate-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-substrate border-t border-gray-100 text-center">
            <Link
              to="/orders"
              onClick={() => setIsOpen(false)}
              className="text-xs text-ink/60 hover:text-hazard transition-colors font-medium inline-block py-1 px-4 hover:bg-gray-100 rounded-lg"
            >
              Xem lịch sử đơn hàng
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
