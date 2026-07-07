import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../api/client";
import { formatPrice } from "../../utils/price";
import { ClipboardList, Check, X, Truck, RefreshCw, Info, Calendar, Package } from "lucide-react";

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  const [expandedTracking, setExpandedTracking] = useState<Record<string, boolean>>({});

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await client.get("/admin/orders", { params: { limit: 100 } });
      return res.data;
    },
  });

  const { data: activeOrderDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["admin-order-details", activeModalId],
    queryFn: async () => {
      if (!activeModalId) return null;
      const res = await client.get(`/admin/orders/${activeModalId}`);
      return res.data;
    },
    enabled: !!activeModalId,
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return client.patch(`/admin/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      if (activeModalId) {
        queryClient.invalidateQueries({ queryKey: ["admin-order-details", activeModalId] });
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Lỗi cập nhật trạng thái đơn hàng.");
    },
  });

  const createShipmentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return client.post(`/admin/shipments/orders/${orderId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      if (activeModalId) {
        queryClient.invalidateQueries({ queryKey: ["admin-order-details", activeModalId] });
      }
      alert("Tạo shipment thành công!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Lỗi tạo shipment.");
    },
  });

  const syncShipmentMutation = useMutation({
    mutationFn: async (shipmentId: string) => {
      return client.get(`/admin/shipments/${shipmentId}/sync`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      if (activeModalId) {
        queryClient.invalidateQueries({ queryKey: ["admin-order-details", activeModalId] });
      }
      alert("Đồng bộ trạng thái vận chuyển thành công!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Lỗi đồng bộ trạng thái.");
    },
  });

  const orders = ordersData?.data || [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 space-y-6 w-full backend-layout-fix">
      <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
        <ClipboardList className="w-5 h-5 text-hazard" />
        Tất cả đơn hàng hệ thống
      </h3>

      {isLoading ? (
        <div className="text-center py-10 text-xs text-ink/40 font-medium w-full">Đang tải danh sách đơn hàng...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-10 text-xs text-ink/40 font-medium w-full">Hệ thống chưa ghi nhận đơn hàng nào.</div>
      ) : (
        <div className="w-full text-xs font-semibold">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-gray-200 text-ink/50 uppercase tracking-wider whitespace-nowrap">
                <th className="pb-3 px-3 w-[10%]">Mã đơn</th>
                <th className="pb-3 pr-2 w-[10%]">Ngày đặt</th>
                <th className="pb-3 pr-2 w-[15%]">Khách hàng</th>
                <th className="pb-3 pr-2 w-[22%]">Địa chỉ giao hàng</th>
                <th className="pb-3 pr-2 w-[11%]">Tổng tiền</th>
                <th className="pb-3 pr-2 w-[11%]">Thanh toán</th>
                <th className="pb-3 pr-2 w-[11%]">Trạng thái</th>
                <th className="pb-3 px-3 text-right w-[10%]">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink font-medium">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50/50 align-middle">
                  <td className="py-3 px-3 font-bold font-mono text-ink tracking-tight truncate" title={o.orderNumber}>
                    #{o.orderNumber && o.orderNumber.length > 8 ? `${o.orderNumber.slice(0, 6)}...` : o.orderNumber}
                  </td>
                  <td className="py-3 pr-2 text-ink/65 whitespace-nowrap truncate">
                    {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="py-3 pr-2 truncate">
                    <div className="font-bold text-ink truncate">{o.user?.name}</div>
                    <div className="text-[10px] text-ink/40 font-mono mt-0.5 truncate" title={o.user?.email}>
                      {o.user?.email}
                    </div>
                  </td>
                  <td className="py-3 pr-2 truncate" title={`${o.shippingSnapshot?.fullName} - ${o.shippingSnapshot?.phone}`}>
                    <div className="font-bold text-ink truncate">
                      {o.shippingSnapshot?.fullName || "N/A"} <span className="text-[10px] text-ink/50 font-mono font-normal">({o.shippingSnapshot?.phone})</span>
                    </div>
                    <div className="text-[10px] text-ink/65 truncate mt-0.5" title={`${o.shippingSnapshot?.addressLine}, ${o.shippingSnapshot?.wardName}, ${o.shippingSnapshot?.districtName}, ${o.shippingSnapshot?.provinceName}`}>
                      {[
                        o.shippingSnapshot?.addressLine,
                        o.shippingSnapshot?.wardName,
                        o.shippingSnapshot?.districtName,
                        o.shippingSnapshot?.provinceName
                      ].filter(Boolean).join(", ") || "N/A"}
                    </div>
                  </td>
                  <td className="py-3 font-bold text-hazard pr-2 whitespace-nowrap truncate">
                    {formatPrice(o.total)}
                  </td>
                  <td className="py-3 pr-2 whitespace-nowrap truncate">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="uppercase font-bold text-ink/70 text-[10px]">{o.payment?.method || "COD"}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${o.payment?.status === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                        {o.payment?.status === "PAID" && "Đã thanh toán"}
                        {o.payment?.status === "PENDING" && "Chờ xử lý"}
                        {o.payment?.status === "FAILED" && "Thanh toán lỗi"}
                        {o.payment?.status === "REFUNDED" && "Đã hoàn tiền"}
                        {!o.payment?.status && "Chưa thanh toán"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-2 whitespace-nowrap truncate">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${o.status === "PENDING" ? "bg-amber-100 text-amber-800" :
                      o.status === "CONFIRMED" ? "bg-blue-100 text-blue-800" :
                        o.status === "SHIPPED" ? "bg-purple-100 text-purple-800" :
                          o.status === "DELIVERED" ? "bg-emerald-100 text-emerald-800" :
                            "bg-gray-100 text-gray-600"
                      }`}>
                      {o.status === "PENDING" && "Chờ xử lý"}
                      {o.status === "CONFIRMED" && "Đã xác nhận"}
                      {o.status === "SHIPPED" && "Đang giao"}
                      {o.status === "DELIVERED" && "Đã giao xong"}
                      {o.status === "CANCELLED" && "Đã hủy"}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => setActiveModalId(o.id)}
                      className="inline-flex items-center gap-1 bg-gray-50 hover:bg-gray-150 border border-gray-300 text-ink text-xs font-bold px-3 py-1.5 rounded transition-colors cursor-pointer shadow-2xs"
                    >
                      <Info className="w-3.5 h-3.5 text-ink/70" />
                      Xử lý
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeModalId && (
        <div className="fixed inset-0 z-50 bg-[#000000]/50 backdrop-blur-xs flex items-center justify-center p-4 text-xs font-semibold">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full max-h-[85dvh] overflow-y-auto p-6 relative shadow-lg flex flex-col justify-between">
            <button
              onClick={() => {
                setActiveModalId(null);
                setExpandedTracking({});
              }}
              className="absolute right-4 top-4 hover:bg-gray-100 p-1.5 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            {detailsLoading || !activeOrderDetails ? (
              <div className="py-12 text-center font-medium text-ink/60 flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-ink border-t-transparent"></span>
                Đang tải chi tiết đơn hàng...
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-5 h-5 text-hazard" />
                    Quản lý đơn hàng #{activeOrderDetails.orderNumber}
                  </h3>
                  <div className="text-[11px] text-ink/50 mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Ngày tạo đơn: {new Date(activeOrderDetails.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wider mb-1">Thông tin khách đặt</div>
                    <div className="font-bold text-ink">{activeOrderDetails.user?.name}</div>
                    <div className="text-[11px] text-ink/60 font-mono mt-0.5">{activeOrderDetails.user?.email}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink/40 uppercase tracking-wider mb-1">Địa chỉ giao hàng</div>
                    <div className="font-bold text-ink">{activeOrderDetails.shippingSnapshot?.fullName} - {activeOrderDetails.shippingSnapshot?.phone}</div>
                    <div className="text-[11px] text-ink/65 mt-0.5">
                      {[
                        activeOrderDetails.shippingSnapshot?.addressLine,
                        activeOrderDetails.shippingSnapshot?.wardName,
                        activeOrderDetails.shippingSnapshot?.districtName,
                        activeOrderDetails.shippingSnapshot?.provinceName
                      ].filter(Boolean).join(", ")}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-1.5">
                    Danh sách sản phẩm
                  </h4>
                  <div className="space-y-3 max-h-32 overflow-y-auto pr-1">
                    {activeOrderDetails.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <span className="text-ink/85 font-medium leading-tight">
                          {item.variantSnapshot?.productName || `SKU: ${item.variantSnapshot?.sku}`} <span className="text-ink/45">x{item.quantity}</span>
                        </span>
                        <span className="font-semibold text-ink">{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {activeOrderDetails.coupon && (
                    <div className="flex justify-between text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 rounded p-2.5">
                      <span>Mã giảm giá: {activeOrderDetails.coupon.code}</span>
                      <span>-{formatPrice(activeOrderDetails.discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-3 border-t border-gray-100 font-bold text-xs">
                    <span className="text-ink/65 uppercase tracking-wider">Tổng tiền toàn bộ</span>
                    <span className="text-hazard text-base font-black">{formatPrice(activeOrderDetails.total)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-ink/75 border-t border-gray-100 pt-4 leading-relaxed">
                  <div>
                    <h5 className="font-bold text-ink uppercase tracking-wider mb-1.5">Thanh toán</h5>
                    <div>Hình thức: <span className="uppercase font-bold">{activeOrderDetails.payment?.method || "COD"}</span></div>
                    <div>
                      Trạng thái:{" "}
                      <span className={`font-bold ${activeOrderDetails.payment?.status === "PAID" ? "text-emerald-600" : "text-amber-600"}`}>
                        {activeOrderDetails.payment?.status === "PAID" && "Đã thanh toán"}
                        {activeOrderDetails.payment?.status === "PENDING" && "Chờ thanh toán"}
                        {activeOrderDetails.payment?.status === "FAILED" && "Thanh toán lỗi"}
                        {activeOrderDetails.payment?.status === "REFUNDED" && "Đã hoàn tiền"}
                        {!activeOrderDetails.payment?.status && "Chưa thanh toán"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h5 className="font-bold text-ink uppercase tracking-wider mb-1.5">Giao hàng</h5>
                    <div>Trạng thái đơn: <span className="font-bold uppercase text-ink/80">{activeOrderDetails.status}</span></div>
                    {activeOrderDetails.notes && (
                      <div className="mt-1">Ghi chú: <span className="italic text-ink/70">"{activeOrderDetails.notes}"</span></div>
                    )}
                  </div>
                </div>

                {activeOrderDetails.shipment && (
                  <div className="space-y-3.5 border-t border-gray-100 pt-4">
                    <h4 className="text-[11px] font-bold text-ink uppercase tracking-wider pb-1.5 flex justify-between items-center">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-hazard" />
                        Tiến trình vận chuyển
                      </span>
                      {activeOrderDetails.shipment.trackingHistory && activeOrderDetails.shipment.trackingHistory.length > 0 && (
                        <button
                          onClick={() => setExpandedTracking(prev => ({ ...prev, [activeOrderDetails.shipment.id]: !prev[activeOrderDetails.shipment.id] }))}
                          className="text-hazard hover:underline cursor-pointer font-bold text-[10px] uppercase"
                        >
                          {expandedTracking[activeOrderDetails.shipment.id] ? "Thu gọn log" : "Hiện lịch sử di chuyển"}
                        </button>
                      )}
                    </h4>

                    <div className="text-[11px] text-ink/80 flex flex-wrap gap-x-4 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <div>Đơn vị: <span className="font-bold uppercase text-ink">{activeOrderDetails.shipment.carrier}</span></div>
                      <div>Mã vận đơn: <span className="font-bold text-ink font-mono">{activeOrderDetails.shipment.trackingNumber || "Chưa phát hành"}</span></div>
                      <div>Trạng thái: <span className="font-bold text-ink font-mono uppercase">{activeOrderDetails.shipment.status}</span></div>
                    </div>

                    {expandedTracking[activeOrderDetails.shipment.id] && activeOrderDetails.shipment.trackingHistory && (
                      <div className="border border-gray-100 rounded-lg bg-gray-50/50 p-3 space-y-2 max-h-32 overflow-y-auto">
                        {activeOrderDetails.shipment.trackingHistory.map((history: any) => (
                          <div key={history.id} className="flex gap-3 text-[11px] leading-snug">
                            <span className="text-ink/40 font-mono flex-shrink-0">
                              {new Date(history.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="text-hazard font-bold uppercase flex-shrink-0">[{history.status}]</span>
                            <span className="text-ink/75 font-medium">{history.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
                  {activeOrderDetails.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => updateOrderStatusMutation.mutate({ orderId: activeOrderDetails.id, status: "CONFIRMED" })}
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Xác nhận đơn
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Chắc chắn muốn hủy đơn?")) {
                            updateOrderStatusMutation.mutate({ orderId: activeOrderDetails.id, status: "CANCELLED" });
                          }
                        }}
                        className="inline-flex items-center gap-1 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Hủy đơn
                      </button>
                    </>
                  )}

                  {activeOrderDetails.status === "CONFIRMED" && !activeOrderDetails.shipment && (
                    <button
                      onClick={() => createShipmentMutation.mutate(activeOrderDetails.id)}
                      className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 border border-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer shadow-sm"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      Tạo đơn vận chuyển (Shipment)
                    </button>
                  )}

                  {activeOrderDetails.shipment && (
                    <button
                      onClick={() => syncShipmentMutation.mutate(activeOrderDetails.shipment.id)}
                      className="inline-flex items-center gap-1 bg-white hover:bg-gray-50 border border-gray-300 text-ink px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sync với vận chuyển
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}