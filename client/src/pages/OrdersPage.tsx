import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../api/client";
import { formatPrice } from "../utils/price";
import {
  X,
  Package,
  Calendar,
  Info,
  Truck,
  AlertCircle
} from "lucide-react";

interface OrderItem {
  id: string;
  variantId: string;
  sku: string;
  name: string;
  price: string;
  quantity: number;
}

interface Payment {
  id: string;
  method: string;
  status: string;
  amount: string;
  transactionId?: string | null;
}

interface ShipmentTracking {
  id: string;
  status: string;
  description: string;
  createdAt: string;
}

interface Shipment {
  id: string;
  trackingNumber?: string | null;
  status: string;
  provider: string;
  trackingHistory?: ShipmentTracking[];
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  notes?: string | null;
  createdAt: string;
  items: OrderItem[];
  payment?: Payment | null;
  shipment?: Shipment | null;
}

export default function OrdersPage() {
  const queryClient = useQueryClient();

  // Modal tracking states
  const [activeModalId, setActiveModalId] = useState<string | null>(null);
  const [expandedTracking, setExpandedTracking] = useState<Record<string, boolean>>({});

  // Fetch all user orders
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const res = await client.get("/orders/my", { params: { limit: 50 } });
      return res.data;
    },
  });

  const orders: Order[] = data?.data || [];

  // Fetch single order details when modal is active
  const { data: activeOrderDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["order-details", activeModalId],
    queryFn: async () => {
      if (!activeModalId) return null;
      const res = await client.get(`/orders/my/${activeModalId}`);
      return res.data;
    },
    enabled: !!activeModalId,
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return client.patch(`/orders/my/${orderId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      if (activeModalId) {
        queryClient.invalidateQueries({ queryKey: ["order-details", activeModalId] });
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Không thể hủy đơn hàng này.");
    },
  });

  // Retry payment mutation
  const retryPaymentMutation = useMutation({
    mutationFn: async ({ orderId, method }: { orderId: string; method: string }) => {
      const res = await client.post(`/payments/orders/${orderId}`, {
        method,
        returnUrl: window.location.origin + "/orders",
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      if (variables.method === "VNPAY" && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Khởi tạo thanh toán thất bại.");
    },
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "Đã giao hàng";
      case "CANCELLED":
        return "Đã hủy";
      case "PENDING":
        return "Chờ xử lý";
      case "CONFIRMED":
        return "Đã xác nhận";
      case "SHIPPED":
        return "Đang vận chuyển";
      default:
        return status;
    }
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "CANCELLED":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "PENDING":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "SHIPPED":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case "PAID":
        return "Đã thanh toán";
      case "FAILED":
        return "Thanh toán lỗi";
      case "REFUNDED":
        return "Đã hoàn tiền";
      default:
        return "Chờ thanh toán";
    }
  };

  const getPaymentStatusClass = (status: string) => {
    switch (status) {
      case "PAID":
        return "text-emerald-600 font-semibold";
      case "FAILED":
        return "text-hazard font-semibold";
      case "REFUNDED":
        return "text-indigo-600 font-semibold";
      default:
        return "text-amber-600 font-semibold";
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    return method === "VNPAY" ? "Thanh toán trực tuyến VNPAY" : "Thanh toán COD";
  };

  const toggleTrackingDetails = (shipmentId: string) => {
    setExpandedTracking((prev) => ({
      ...prev,
      [shipmentId]: !prev[shipmentId],
    }));
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="border-b border-gray-200 pb-6">
        <span className="text-xs text-ink/50 uppercase tracking-widest font-mono">Tài khoản</span>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink mt-1">
          Lịch sử mua hàng
        </h1>
      </div>

      {isLoading ? (
        <div className="border border-gray-200 rounded-lg p-12 text-center bg-white font-medium text-ink/60 flex items-center justify-center gap-2">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-ink border-t-transparent"></span>
          Đang tải danh sách đơn hàng...
        </div>
      ) : error ? (
        <div className="border border-hazard/20 bg-hazard/5 p-6 rounded-lg text-sm text-hazard flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Lỗi: Không thể đồng bộ lịch sử mua hàng của bạn.
        </div>
      ) : orders.length === 0 ? (
        <div className="border border-gray-200 rounded-lg p-12 text-center text-sm text-ink/40">
          Bạn chưa thực hiện bất kỳ giao dịch nào.
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isCancellable = order.status === "PENDING" || order.status === "CONFIRMED";
            const isPaymentPending = order.payment?.status === "PENDING" && order.payment?.method === "VNPAY";

            return (
              <div key={order.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden hover:shadow-xs transition-shadow">
                {/* Header info */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50">
                  <div className="text-xs">
                    <span className="text-ink/50 uppercase font-bold tracking-wider">Mã đơn</span>{" "}
                    <span className="font-bold text-ink">#{order.orderNumber}</span>
                    <span className="text-gray-300 mx-2.5">|</span>
                    <span className="text-ink/60">{new Date(order.createdAt).toISOString().slice(0, 10)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-2.5 py-1 border text-[11px] font-bold rounded-md uppercase ${getStatusColorClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <button
                      onClick={() => setActiveModalId(order.id)}
                      className="text-xs font-bold text-hazard hover:underline uppercase cursor-pointer flex items-center gap-1"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Xem chi tiết
                    </button>
                  </div>
                </div>

                {/* Short items brief */}
                <div className="px-6 py-6 space-y-4">
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <span className="text-ink/75 truncate">
                          {item.name} <span className="text-ink/40 font-medium">x{item.quantity}</span>
                        </span>
                        <span className="font-semibold text-ink">{formatPrice(Number(item.price) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="text-xs text-ink/50">
                      Thanh toán: <span className="font-semibold text-ink">{getPaymentMethodLabel(order.payment?.method || "COD")}</span> &bull; Trạng thái:{" "}
                      <span className={getPaymentStatusClass(order.payment?.status || "PENDING")}>
                        {getPaymentStatusLabel(order.payment?.status || "PENDING")}
                      </span>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-sm font-medium text-ink">
                        Tổng tiền: <span className="font-bold text-hazard text-base">{formatPrice(order.total)}</span>
                      </div>

                      {/* Cancel order button */}
                      {isCancellable && (
                        <button
                          onClick={() => cancelOrderMutation.mutate(order.id)}
                          disabled={cancelOrderMutation.isPending}
                          className="border border-hazard text-hazard hover:bg-hazard hover:text-substrate px-3.5 py-2 rounded-md text-[11px] font-bold uppercase transition-colors cursor-pointer"
                        >
                          {cancelOrderMutation.isPending ? "..." : "Hủy đơn hàng"}
                        </button>
                      )}

                      {/* Retry payment button */}
                      {isPaymentPending && (
                        <button
                          onClick={() =>
                            retryPaymentMutation.mutate({
                              orderId: order.id,
                              method: order.payment?.method || "VNPAY",
                            })
                          }
                          disabled={retryPaymentMutation.isPending}
                          className="bg-hazard text-substrate hover:bg-ink px-3.5 py-2 rounded-md text-[11px] font-bold uppercase transition-colors cursor-pointer"
                        >
                          {retryPaymentMutation.isPending ? "..." : "Thanh toán lại"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Overlay Modal for Order details */}
      {activeModalId && (
        <div className="fixed inset-0 z-50 bg-[#000000]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full max-h-[85dvh] overflow-y-auto p-6 relative shadow-lg animate-fadeIn flex flex-col justify-between">
            {/* Close trigger */}
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
                {/* Header */}
                <div>
                  <h3 className="text-lg font-bold text-ink flex items-center gap-1.5">
                    <Package className="w-5 h-5 text-hazard" />
                    Chi tiết đơn hàng #{activeOrderDetails.orderNumber}
                  </h3>
                  <div className="text-xs text-ink/50 mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Ngày tạo đơn: {new Date(activeOrderDetails.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>

                {/* Status bar */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-ink/40 uppercase tracking-wider">Trạng thái:</span>
                  <span className={`px-2.5 py-1 border text-[11px] font-bold rounded-md uppercase ${getStatusColorClass(activeOrderDetails.status)}`}>
                    {getStatusLabel(activeOrderDetails.status)}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-1.5">
                    Danh sách sản phẩm
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {activeOrderDetails.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <span className="text-ink/85 font-medium leading-tight">
                          {item.name || `SKU: ${item.sku}`} <span className="text-ink/45">x{item.quantity}</span>
                        </span>
                        <span className="font-semibold text-ink">{formatPrice(Number(item.price) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  {/* Coupon Details */}
                  {activeOrderDetails.coupon && (
                    <div className="flex justify-between text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 rounded p-2.5">
                      <span>Mã giảm giá đã áp dụng: {activeOrderDetails.coupon.code}</span>
                      <span>
                        -{activeOrderDetails.coupon.discountType === "PERCENT"
                          ? `${activeOrderDetails.coupon.discountValue}%`
                          : formatPrice(activeOrderDetails.coupon.discountValue)}
                      </span>
                    </div>
                  )}
                  {/* Total sums */}
                  <div className="flex justify-between pt-3 border-t border-gray-100 font-bold text-xs">
                    <span className="text-ink/65 uppercase tracking-wider">Tổng tiền thanh toán</span>
                    <span className="text-hazard text-base font-black">{formatPrice(activeOrderDetails.total)}</span>
                  </div>
                </div>

                {/* Invoice and Shipment details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-ink/75 border-t border-gray-100 pt-4 leading-relaxed">
                  <div>
                    <h5 className="font-bold text-ink uppercase tracking-wider mb-2">Thanh toán</h5>
                    <div>Hình thức: {getPaymentMethodLabel(activeOrderDetails.payment?.method || "COD")}</div>
                    <div>Trạng thái: <span className={getPaymentStatusClass(activeOrderDetails.payment?.status || "PENDING")}>{getPaymentStatusLabel(activeOrderDetails.payment?.status || "PENDING")}</span></div>
                  </div>
                  {activeOrderDetails.notes && (
                    <div>
                      <h5 className="font-bold text-ink uppercase tracking-wider mb-2">Ghi chú nhận hàng</h5>
                      <div className="italic text-ink/70">"{activeOrderDetails.notes}"</div>
                    </div>
                  )}
                </div>

                {/* GHN Shipment progress log */}
                {activeOrderDetails.shipment && (
                  <div className="space-y-3.5 border-t border-gray-100 pt-4">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider pb-1.5 flex justify-between items-center">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-hazard" />
                        Tiến trình vận chuyển
                      </span>
                      {activeOrderDetails.shipment.trackingHistory &&
                        activeOrderDetails.shipment.trackingHistory.length > 0 && (
                          <button
                            onClick={() => toggleTrackingDetails(activeOrderDetails.shipment!.id)}
                            className="text-hazard hover:underline cursor-pointer font-bold text-[10px] uppercase"
                          >
                            {expandedTracking[activeOrderDetails.shipment!.id]
                              ? "Thu gọn log"
                              : "Hiện lịch sử di chuyển"}
                          </button>
                        )}
                    </h4>

                    <div className="text-xs text-ink/80 flex flex-wrap gap-x-4">
                      <div>Đơn vị vận chuyển: <span className="font-semibold text-ink uppercase">{activeOrderDetails.shipment.provider}</span></div>
                      <div>Mã vận đơn: <span className="font-semibold text-ink">{activeOrderDetails.shipment.trackingNumber || "Chưa phát hành"}</span></div>
                    </div>

                    {/* Detailed history records inside modal */}
                    {expandedTracking[activeOrderDetails.shipment.id] &&
                      activeOrderDetails.shipment.trackingHistory && (
                        <div className="border border-gray-100 rounded-lg bg-gray-50 p-4 space-y-2.5 max-h-40 overflow-y-auto">
                          {activeOrderDetails.shipment.trackingHistory.map((history: any) => (
                            <div key={history.id} className="flex gap-4 text-[11px] leading-snug">
                              <span className="text-ink/40 font-mono flex-shrink-0">
                                {new Date(history.createdAt).toISOString().slice(11, 16)}
                              </span>
                              <span className="text-hazard font-bold uppercase flex-shrink-0">[{history.status}]</span>
                              <span className="text-ink/75 font-medium">{history.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
