import { useQuery } from "@tanstack/react-query";
import { client } from "../../api/client";
import { formatPrice } from "../../utils/price";
import { Link } from "react-router";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Package,
  FolderOpen,
  Award,
  ArrowRight
} from "lucide-react";

export default function AdminDashboardPage() {
  // 1. Fetch Orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await client.get("/admin/orders", { params: { limit: 200 } });
      return res.data;
    },
  });

  // 2. Fetch Products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const res = await client.get("/products", { params: { limit: 200 } });
      return res.data;
    },
  });

  const orders = ordersData?.data || [];
  const products = productsData?.data || [];

  // --- Compute Statistics ---
  const activeOrders = orders.filter((o: any) => o.status !== "CANCELLED");
  const totalRevenue = activeOrders.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
  const totalOrdersCount = orders.length;
  const avgOrderValue = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;
  const totalProductsCount = products.length;

  // --- Category & Brand Breakdown ---
  const categorySales: Record<string, { name: string; sales: number; count: number }> = {};
  const brandSales: Record<string, { name: string; sales: number; count: number }> = {};
  const productSalesMap: Record<string, { name: string; quantity: number; sales: number; brand: string }> = {};

  activeOrders.forEach((o: any) => {
    (o.items || []).forEach((item: any) => {
      const snapshot = item.variantSnapshot || {};
      const qty = Number(item.quantity || 0);
      const itemTotal = Number(item.total || 0);

      // Track by product
      const variantId = item.variantId || "unknown";
      const displayName = snapshot.productName ? `${snapshot.productName} (${snapshot.sku || ""})` : "Sản phẩm ẩn";
      if (!productSalesMap[variantId]) {
        productSalesMap[variantId] = {
          name: displayName,
          quantity: 0,
          sales: 0,
          brand: snapshot.brandName || "Khác"
        };
      }
      productSalesMap[variantId].quantity += qty;
      productSalesMap[variantId].sales += itemTotal;
    });
  });

  // Match products back to their categories and brands for comprehensive dashboard analytics
  products.forEach((p: any) => {
    const catName = p.category?.name || "Chưa phân loại";
    const brandName = p.brand?.name || "Khác";

    // Sum product variant sales if they were ordered
    (p.variants || []).forEach((v: any) => {
      const salesRecord = productSalesMap[v.id];
      if (salesRecord) {
        // Category Accumulation
        if (!categorySales[catName]) {
          categorySales[catName] = { name: catName, sales: 0, count: 0 };
        }
        categorySales[catName].sales += salesRecord.sales;
        categorySales[catName].count += salesRecord.quantity;

        // Brand Accumulation
        if (!brandSales[brandName]) {
          brandSales[brandName] = { name: brandName, sales: 0, count: 0 };
        }
        brandSales[brandName].sales += salesRecord.sales;
        brandSales[brandName].count += salesRecord.quantity;
      }
    });
  });

  // Sort lists
  const sortedCategories = Object.values(categorySales).sort((a, b) => b.sales - a.sales);
  const sortedBrands = Object.values(brandSales).sort((a, b) => b.sales - a.sales);
  const topSellingProducts = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const recentOrders = orders.slice(0, 5);

  const isLoading = ordersLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="text-center py-16 text-xs text-ink/40 font-medium flex items-center justify-center gap-2">
        <span className="animate-spin rounded-full h-4 w-4 border-2 border-ink border-t-transparent"></span>
        Đang tải phân tích dữ liệu hệ thống...
      </div>
    );
  }

  return (
    <div className="space-y-8 text-xs font-semibold">
      {/* Page Title */}
      <div>
        <span className="text-xs text-ink/50 uppercase tracking-widest font-mono">Báo cáo</span>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink mt-1">Tổng quan hoạt động kinh doanh</h1>
      </div>

      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-ink/40 uppercase font-bold tracking-wider">Doanh thu thuần</span>
            <h3 className="text-lg font-bold text-ink tracking-tight">{formatPrice(totalRevenue)}</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* Orders Count Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-ink/40 uppercase font-bold tracking-wider">Tổng đơn hàng</span>
            <h3 className="text-lg font-bold text-ink tracking-tight">{totalOrdersCount} đơn</h3>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <ShoppingBag className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        {/* Average Value Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-ink/40 uppercase font-bold tracking-wider">Đơn giá trung bình</span>
            <h3 className="text-lg font-bold text-ink tracking-tight">{formatPrice(avgOrderValue)}</h3>
          </div>
          <div className="p-3 bg-rose-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-hazard" />
          </div>
        </div>

        {/* Products Count Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] text-ink/40 uppercase font-bold tracking-wider">Sản phẩm kích hoạt</span>
            <h3 className="text-lg font-bold text-ink tracking-tight">{totalProductsCount} sản phẩm</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Grid Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Sales by Category Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
            <FolderOpen className="w-4 h-4 text-hazard" />
            Doanh số theo danh mục
          </h3>
          {sortedCategories.length === 0 ? (
            <div className="text-center py-6 text-ink/30">Chưa có dữ liệu bán hàng.</div>
          ) : (
            <div className="space-y-3.5 pt-1">
              {sortedCategories.map((c) => {
                const percent = Math.min(100, Math.round((c.sales / totalRevenue) * 100)) || 0;
                return (
                  <div key={c.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-ink">{c.name}</span>
                      <span className="text-ink/65">{formatPrice(c.sales)} <span className="text-[10px] text-ink/40 font-mono">({percent}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-ink h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sales by Brand Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
            <Award className="w-4 h-4 text-hazard" />
            Doanh số theo thương hiệu
          </h3>
          {sortedBrands.length === 0 ? (
            <div className="text-center py-6 text-ink/30">Chưa có dữ liệu bán hàng.</div>
          ) : (
            <div className="space-y-3.5 pt-1">
              {sortedBrands.map((b) => {
                const percent = Math.min(100, Math.round((b.sales / totalRevenue) * 100)) || 0;
                return (
                  <div key={b.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-ink">{b.name}</span>
                      <span className="text-ink/65">{formatPrice(b.sales)} <span className="text-[10px] text-ink/40 font-mono">({percent}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-hazard h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Bottom Section: Top Products & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Top Selling Products */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 lg:col-span-1">
          <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
            <TrendingUp className="w-4 h-4 text-hazard" />
            Top sản phẩm bán chạy
          </h3>
          {topSellingProducts.length === 0 ? (
            <div className="text-center py-6 text-ink/30">Chưa ghi nhận số liệu.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {topSellingProducts.map((p, idx) => (
                <div key={p.name} className="py-3 flex justify-between items-start gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-ink/40 font-extrabold w-4 text-center">{idx + 1}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-ink truncate" title={p.name}>{p.name}</div>
                      <div className="text-[10px] text-ink/40 font-bold uppercase mt-0.5">{p.brand}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-ink">{p.quantity} chiếc</div>
                    <div className="text-[10px] text-ink/50 mt-0.5">{formatPrice(p.sales)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 lg:col-span-2 overflow-x-auto">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-hazard" />
              Đơn hàng gần đây
            </h3>
            <Link to="/admin/orders" className="text-ink/50 hover:text-hazard transition-colors flex items-center gap-1 font-bold text-[10px] uppercase">
              Xem tất cả
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-ink/30">Hệ thống chưa ghi nhận đơn hàng.</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 text-ink/40 uppercase text-[10px] font-bold">
                  <th className="pb-2.5 pr-2">Mã đơn</th>
                  <th className="pb-2.5 pr-2">Khách hàng</th>
                  <th className="pb-2.5 pr-2">Tổng tiền</th>
                  <th className="pb-2.5 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-ink font-medium">
                {recentOrders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-gray-50/20">
                    <td className="py-3 pr-2 font-mono font-bold">#{o.orderNumber}</td>
                    <td className="py-3 pr-2">
                      <div className="font-bold text-ink">{o.user?.name}</div>
                      <div className="text-[10px] text-ink/40 font-mono mt-0.5">{o.user?.email}</div>
                    </td>
                    <td className="py-3 pr-2 font-bold text-hazard">{formatPrice(o.total)}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${o.status === "DELIVERED" ? "bg-emerald-100 text-emerald-800" :
                          o.status === "CANCELLED" ? "bg-rose-100 text-rose-800" :
                            o.status === "PENDING" ? "bg-amber-100 text-amber-800" :
                              "bg-blue-100 text-blue-800"
                        }`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

    </div>
  );
}

// Simple placeholder mapping for ClipboardList since Lucide sometimes needs import
import { ClipboardList } from "lucide-react";
