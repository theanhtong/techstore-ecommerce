import { Outlet, NavLink, Link, Navigate } from "react-router";
import { useAuthStore } from "../../store/useAuthStore";
import { useCartStore } from "../../store/useCartStore";
import { useNotificationStore } from "../../store/useNotificationStore";
import {
  Sliders,
  ClipboardList,
  Package,
  FolderOpen,
  Award,
  Calendar,
  Tag,
  Ticket,
  Star,
  Users,
  ShieldAlert,
  Home,
  LogOut
} from "lucide-react";

export default function AdminLayout() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const clearCart = useCartStore((state) => state.clearCart);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);

  const handleLogout = () => {
    clearAuth();
    clearCart();
    clearNotifications();
  };

  // Guard Clause for unauthorized roles
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    return <Navigate to="/" replace />;
  }

  const SIDEBAR_ITEMS = [
    { to: "/admin/orders", label: "Đơn hàng", icon: ClipboardList },
    { to: "/admin/products", label: "Sản phẩm", icon: Package },
    { to: "/admin/categories", label: "Danh mục", icon: FolderOpen },
    { to: "/admin/brands", label: "Thương hiệu", icon: Award },
    { to: "/admin/campaigns", label: "Chiến dịch", icon: Calendar },
    { to: "/admin/promotions", label: "Khuyến mãi", icon: Tag },
    { to: "/admin/coupons", label: "Mã giảm giá", icon: Ticket },
    { to: "/admin/reviews", label: "Đánh giá", icon: Star },
    { to: "/admin/users", label: "Người dùng", icon: Users },
    { to: "/admin/audit-logs", label: "Nhật ký hoạt động", icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-ink flex flex-col selection:bg-hazard selection:text-white">
      {/* Top Navigation Admin header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Sliders className="w-5 h-5 text-hazard animate-pulse" />
          <span className="font-extrabold text-sm tracking-tight uppercase">Hệ thống quản trị TechStore</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold">
          <Link to="/" className="text-ink/65 hover:text-hazard transition-colors flex items-center gap-1.5">
            <Home className="w-4 h-4" />
            Trang khách hàng
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-ink/50 font-mono">{user.email} ({user.role})</span>
          <span className="text-gray-300">|</span>
          <button onClick={handleLogout} className="text-ink/65 hover:text-hazard transition-colors cursor-pointer flex items-center gap-1.5">
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Main dashboard viewport */}
      <div className="flex-1 flex flex-col md:flex-row p-6 gap-8 max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200 pb-6 md:pb-0 md:pr-6">
          <nav className="space-y-1">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold transition-all uppercase tracking-wider text-left ${isActive
                      ? "bg-ink text-white"
                      : "text-ink/60 hover:bg-gray-100 hover:text-ink"
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Right Outlet view */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
