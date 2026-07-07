import { useEffect } from "react";
import { BrowserRouter, Route, Routes, Link, NavLink, Navigate, Outlet } from "react-router";
import { useAuthStore } from "./store/useAuthStore";
import { useCartStore } from "./store/useCartStore";
import {
  ShoppingCart,
  ShoppingBag,
  Package,
  User,
  LogOut,
  LogIn,
  Home,
  Sliders
} from "lucide-react";
import NotificationDropdown from "./components/NotificationDropdown";
import { useNotificationStore } from "./store/useNotificationStore";

import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import AuthPage from "./pages/AuthPage";
import OrdersPage from "./pages/OrdersPage";
import ProfilePage from "./pages/ProfilePage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminProductDetailPage from "./pages/admin/AdminProductDetailPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminBrandsPage from "./pages/admin/AdminBrandsPage";
import AdminCampaignsPage from "./pages/admin/AdminCampaignsPage";
import AdminPromotionsPage from "./pages/admin/AdminPromotionsPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";
import AdminReviewsPage from "./pages/admin/AdminReviewsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAuditLogsPage from "./pages/admin/AdminAuditLogsPage";

const CustomerLayout = () => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const clearCart = useCartStore((state) => state.clearCart);
  const items = useCartStore((state) => state.items);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogout = () => {
    clearAuth();
    clearCart();
    clearNotifications();
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-substrate">
      {/* Announcement Strip */}
      {/* <div className="bg-ink text-substrate text-[11px] font-semibold tracking-wider px-8 py-2.5 text-center uppercase">
        Miễn phí vận chuyển cho mọi đơn hàng từ 500.000đ
      </div> */}

      {/* Main Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="text-xl font-bold tracking-tight text-ink hover:text-hazard transition-colors flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-hazard" />
            TechStore
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6 text-sm font-medium">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-1.5 hover:text-hazard transition-colors ${isActive ? "text-hazard font-semibold" : "text-ink/70"}`
              }
            >
              <Home className="w-4 h-4" />
              <span>Trang chủ</span>
            </NavLink>
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `flex items-center gap-1.5 hover:text-hazard transition-colors ${isActive ? "text-hazard font-semibold" : "text-ink/70"}`
              }
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Sản phẩm</span>
            </NavLink>
            <NavLink
              to="/cart"
              className={({ isActive }) =>
                `flex items-center gap-1.5 hover:text-hazard transition-colors ${isActive ? "text-hazard font-semibold" : "text-ink/70"}`
              }
            >
              <div className="relative flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-hazard text-[8px] font-extrabold text-white leading-none">
                    {cartCount}
                  </span>
                )}
              </div>
              <span>Giỏ hàng</span>
            </NavLink>
            {user ? (
              <>
                <NavLink
                  to="/orders"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 hover:text-hazard transition-colors ${isActive ? "text-hazard font-semibold" : "text-ink/70"}`
                  }
                >
                  <Package className="w-4 h-4" />
                  <span>Đơn hàng</span>
                </NavLink>
                <NotificationDropdown />
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 hover:text-hazard transition-colors ${isActive ? "text-hazard font-semibold" : "text-ink/70"}`
                  }
                >
                  <User className="w-4 h-4" />
                  <span>Tài khoản</span>
                </NavLink>
                {(user.role === "ADMIN" || user.role === "STAFF") && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 hover:text-hazard transition-colors ${isActive ? "text-hazard font-semibold" : "text-ink/70"}`
                    }
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Quản trị</span>
                  </NavLink>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-ink/70 hover:text-hazard cursor-pointer transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất</span>
                </button>
              </>
            ) : (
              <NavLink
                to="/auth"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 hover:text-hazard transition-colors ${isActive ? "text-hazard font-semibold" : "text-ink/70"}`
                }
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <Outlet />
      </main>

    </div>
  );
};

export default function App() {
  const fetchCart = useCartStore((state) => state.fetchCart);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Customer Portal Layout */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<CatalogPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* System Administration Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/orders" replace />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/:id" element={<AdminProductDetailPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="brands" element={<AdminBrandsPage />} />
          <Route path="campaigns" element={<AdminCampaignsPage />} />
          <Route path="promotions" element={<AdminPromotionsPage />} />
          <Route path="coupons" element={<AdminCouponsPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        </Route>

        <Route path="*" element={<div className="p-8 text-center text-sm font-semibold text-hazard">Lỗi 404: Không tìm thấy trang yêu cầu</div>} />
      </Routes>
    </BrowserRouter>
  );
}
