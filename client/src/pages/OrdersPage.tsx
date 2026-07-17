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
  quantity: number;
  unitPrice: string;
  total: string;
  variantSnapshot?: {
    sku: string;
    price: number;
    salePrice: number | null;
    color?: string | null;
    productName: string;
    productSlug: string;
    imageUrl?: string | null;
  } | null;
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
  cancelReason?: string | null;
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

  // Cancellation modal states
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelReasonOption, setCancelReasonOption] = useState("Thay đổi ý định mua sắm");
  const [cancelReasonCustom, setCancelReasonCustom] = useState("");

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
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      return client.patch(`/orders/my/${orderId}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      if (activeModalId) {
        queryClient.invalidateQueries({ queryKey: ["order-details", activeModalId] });
      }
      setCancellingOrderId(null);
      setCancelReasonOption("Thay đổi ý định mua sắm");
      setCancelReasonCustom("");
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
    <div className="space-y-8 animate-fadeIn">
      {/* Title */}
      <div className="border-b border-gray-150 pb-6">
        <span className="text-xs text-ink/50 uppercase tracking-widest font-bold font-mono">Tài khoản</span>
        <h1 className="text-3xl font-black tracking-tight text-ink mt-1 uppercase">
          Lịch sử mua hàng
        </h1>
      </div>

      {isLoading ? (
        <div className="border border-gray-200 rounded-xl p-12 text-center bg-white font-medium text-ink/60 flex items-center justify-center gap-2">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-ink border-t-transparent"></span>
          Đang tải danh sách đơn hàng...
        </div>
      ) : error ? (
        <div className="border border-hazard/20 bg-hazard/5 p-6 rounded-xl text-xs font-bold uppercase tracking-wider text-hazard flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Lỗi: Không thể đồng bộ lịch sử mua hàng của bạn.
        </div>
      ) : orders.length === 0 ? (
        <div className="border border-gray-200 rounded-xl p-12 text-center text-xs font-bold uppercase tracking-wider text-ink/40">
          Bạn chưa thực hiện bất kỳ giao dịch nào.
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isCancellable = order.status === "PENDING" || order.status === "CONFIRMED";
            const isPaymentPending = order.payment?.status === "PENDING" && order.payment?.method === "VNPAY";

            return (
              <div key={order.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-2xs hover:shadow-xs transition-shadow">
                {/* Header info */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-50/50">
                  <div className="text-xs font-bold text-ink/60 uppercase tracking-wider">
                    <span>Mã đơn: </span>
                    <span className="text-ink font-mono font-black">#{order.orderNumber}</span>
                    <span className="text-gray-300 mx-2.5">|</span>
                    <span className="font-mono">{new Date(order.createdAt).toISOString().slice(0, 10)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-2.5 py-1 border text-[10px] font-bold rounded-md uppercase tracking-wider ${getStatusColorClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <button
                      onClick={() => setActiveModalId(order.id)}
                      className="text-xs font-bold text-hazard hover:underline uppercase tracking-wider cursor-pointer flex items-center gap-1"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Chi tiết
                    </button>
                  </div>
                </div>

                {/* Short items brief */}
                <div className="px-6 py-6 space-y-4">
                  <div className="space-y-3.5">
                    {order.items.map((item) => {
                      const snapshot = item.variantSnapshot || ({} as any);
                      const displayName = snapshot.productName || "Sản phẩm";
                      const displayPrice = item.unitPrice || snapshot.salePrice || snapshot.price || 0;
                      return (
                        <div key={item.id} className="flex justify-between items-center text-xs gap-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {snapshot.imageUrl && (
                              <img
                                src={snapshot.imageUrl}
                                alt={displayName}
                                className="w-8 h-8 object-contain rounded-md border border-neutral-150 p-0.5 flex-shrink-0 bg-neutral-50"
                              />
                            )}
                            <span className="text-ink/80 truncate font-semibold">
                              {displayName} {snapshot.color ? `(${snapshot.color})` : ""} <span className="text-ink/40 font-bold">x{item.quantity}</span>
                            </span>
                          </div>
                          <span className="font-bold text-ink flex-shrink-0">{formatPrice(Number(displayPrice) * item.quantity)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="text-[10px] text-ink/50 font-bold uppercase tracking-wider">
                      Thanh toán: <span className="text-ink">{getPaymentMethodLabel(order.payment?.method || "COD")}</span> &bull; Trạng thái:{" "}
                      <span className={getPaymentStatusClass(order.payment?.status || "PENDING")}>
                        {getPaymentStatusLabel(order.payment?.status || "PENDING")}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-xs font-bold text-ink uppercase tracking-wider">
                        Tổng tiền: <span className="font-black text-hazard text-base ml-1">{formatPrice(order.total)}</span>
                      </div>

                      {/* Cancel order button */}
                      {isCancellable && (
                        <button
                          onClick={() => setCancellingOrderId(order.id)}
                          className="btn btn-secondary btn-sm"
                        >
                          Hủy đơn
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
                          className="btn btn-primary btn-sm"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full max-h-[85dvh] overflow-y-auto p-6 relative shadow-xl animate-fadeIn flex flex-col justify-between">
            {/* Close trigger */}
            <button
              onClick={() => {
                setActiveModalId(null);
                setExpandedTracking({});
              }}
              className="absolute right-4 top-4 hover:bg-neutral-50 p-1.5 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {detailsLoading || !activeOrderDetails ? (
              <div className="py-12 text-center font-medium text-ink/65 flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-ink border-t-transparent"></span>
                Đang tải chi tiết đơn hàng...
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h3 className="text-base font-black text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-5 h-5 text-hazard" />
                    Chi tiết đơn hàng #{activeOrderDetails.orderNumber}
                  </h3>
                  <div className="text-xs text-ink/50 mt-1 flex items-center gap-1 font-bold uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    Ngày tạo: {new Date(activeOrderDetails.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>

                {/* Status bar */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-ink/40 uppercase tracking-widest">Trạng thái:</span>
                  <span className={`px-2.5 py-1 border text-[10px] font-bold rounded-md uppercase tracking-wider ${getStatusColorClass(activeOrderDetails.status)}`}>
                    {getStatusLabel(activeOrderDetails.status)}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-bold text-ink/40 uppercase tracking-widest border-b border-gray-100 pb-1.5">
                    Danh sách sản phẩm
                  </h4>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {activeOrderDetails.items.map((item: any) => {
                      const snapshot = item.variantSnapshot || ({} as any);
                      const displayName = snapshot.productName || "Sản phẩm";
                      const displayPrice = item.unitPrice || snapshot.salePrice || snapshot.price || 0;
                      return (
                        <div key={item.id} className="flex justify-between items-center text-xs gap-4 py-1">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {snapshot.imageUrl && (
                              <img
                                src={snapshot.imageUrl}
                                alt={displayName}
                                className="w-8 h-8 object-contain rounded border border-gray-100 p-0.5 bg-neutral-50 flex-shrink-0"
                              />
                            )}
                            <span className="text-ink/85 font-semibold leading-tight truncate">
                              {displayName} {snapshot.color ? `(${snapshot.color})` : ""} <span className="text-ink/45">x{item.quantity}</span>
                            </span>
                          </div>
                          <span className="font-bold text-ink flex-shrink-0">{formatPrice(Number(displayPrice) * item.quantity)}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Coupon Details */}
                  {activeOrderDetails.coupon && (
                    <div className="flex justify-between text-xs text-emerald-700 font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                      <span>Mã giảm giá đã áp dụng: {activeOrderDetails.coupon.code}</span>
                      <span>
                        -{activeOrderDetails.coupon.discountType === "PERCENT"
                          ? `${activeOrderDetails.coupon.discountValue}%`
                          : formatPrice(activeOrderDetails.coupon.discountValue)}
                      </span>
                    </div>
                  )}
                  {/* Total sums */}
                  <div className="flex justify-between pt-3 border-t border-gray-150 font-bold text-xs">
                    <span className="text-ink/50 uppercase tracking-widest">Tổng thanh toán</span>
                    <span className="text-hazard text-base font-black">{formatPrice(activeOrderDetails.total)}</span>
                  </div>
                </div>

                {/* Invoice and Shipment details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-ink/75 border-t border-gray-100 pt-4 leading-relaxed font-semibold">
                  <div>
                    <h5 className="font-bold text-ink uppercase tracking-wider mb-2">Thanh toán</h5>
                    <div>Hình thức: {getPaymentMethodLabel(activeOrderDetails.payment?.method || "COD")}</div>
                    <div>Trạng thái: <span className={getPaymentStatusClass(activeOrderDetails.payment?.status || "PENDING")}>{getPaymentStatusLabel(activeOrderDetails.payment?.status || "PENDING")}</span></div>
                  </div>
                  {activeOrderDetails.notes && (
                    <div>
                      <h5 className="font-bold text-ink uppercase tracking-wider mb-2">Ghi chú đơn hàng</h5>
                      <div className="italic text-ink/70">"{activeOrderDetails.notes}"</div>
                    </div>
                  )}
                  {activeOrderDetails.status === "CANCELLED" && activeOrderDetails.cancelReason && (
                    <div className="col-span-1 md:col-span-2 bg-rose-50 border border-rose-100 rounded-xl p-4 text-rose-800">
                      <span className="font-bold uppercase text-[10px] tracking-wider block mb-1">Lý do hủy đơn hàng:</span>
                      <p className="font-bold text-xs">{activeOrderDetails.cancelReason}</p>
                    </div>
                  )}
                </div>

                {/* GHN Shipment progress log */}
                {activeOrderDetails.shipment && (
                  <div className="space-y-3.5 border-t border-gray-100 pt-4">
                    <h4 className="text-[10px] font-bold text-ink/40 uppercase tracking-widest pb-1.5 flex justify-between items-center">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-hazard" />
                        Tiến trình vận chuyển
                      </span>
                      {activeOrderDetails.shipment.trackingHistory &&
                        activeOrderDetails.shipment.trackingHistory.length > 0 && (
                          <button
                            onClick={() => toggleTrackingDetails(activeOrderDetails.shipment!.id)}
                            className="text-hazard hover:underline cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                          >
                            {expandedTracking[activeOrderDetails.shipment!.id]
                              ? "Thu gọn log"
                              : "Hiện lịch sử"}
                          </button>
                        )}
                    </h4>

                    <div className="text-xs text-ink/80 flex flex-wrap gap-x-4 font-semibold uppercase tracking-wider">
                      <div>Đơn vị: <span className="font-bold text-ink uppercase">{activeOrderDetails.shipment.provider}</span></div>
                      <div>Mã vận đơn: <span className="font-bold text-ink font-mono">{activeOrderDetails.shipment.trackingNumber || "Chưa phát hành"}</span></div>
                    </div>

                    {/* Detailed history records inside modal */}
                    {expandedTracking[activeOrderDetails.shipment.id] &&
                      activeOrderDetails.shipment.trackingHistory && (
                        <div className="border border-gray-100 rounded-xl bg-neutral-50 p-4 space-y-2.5 max-h-40 overflow-y-auto">
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
      {/* Cancellation modal dialog */}
      {cancellingOrderId && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full p-6 relative shadow-xl animate-fadeIn space-y-4 text-xs font-bold uppercase tracking-wider">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2">
              Lý do hủy đơn hàng
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-ink/50 uppercase tracking-wider mb-1">
                  Chọn lý do hủy
                </label>
                <select
                  value={cancelReasonOption}
                  onChange={(e) => setCancelReasonOption(e.target.value)}
                  className="form-input bg-white"
                >
                  <option value="Thay đổi ý định mua sắm">Thay đổi ý định mua sắm</option>
                  <option value="Tìm thấy giá rẻ hơn ở nơi khác">Tìm thấy giá rẻ hơn ở nơi khác</option>
                  <option value="Thời gian giao hàng quá lâu">Thời gian giao hàng quá lâu</option>
                  <option value="Trùng đơn hàng / đặt nhầm cấu hình">Trùng đơn hàng / đặt nhầm cấu hình</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>

              {cancelReasonOption === "Lý do khác" && (
                <div>
                  <label className="block text-[10px] font-bold text-ink/50 uppercase tracking-wider mb-1">
                    Nhập lý do chi tiết
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Vui lòng cho biết lý do của bạn..."
                    value={cancelReasonCustom}
                    onChange={(e) => setCancelReasonCustom(e.target.value)}
                    className="form-input bg-white normal-case font-medium"
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setCancellingOrderId(null);
                  setCancelReasonOption("Thay đổi ý định mua sắm");
                  setCancelReasonCustom("");
                }}
                className="btn btn-secondary btn-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={cancelOrderMutation.isPending}
                onClick={() => {
                  const finalReason = cancelReasonOption === "Lý do khác" ? cancelReasonCustom : cancelReasonOption;
                  if (cancelReasonOption === "Lý do khác" && !cancelReasonCustom.trim()) {
                    alert("Vui lòng nhập lý do cụ thể.");
                    return;
                  }
                  cancelOrderMutation.mutate({ orderId: cancellingOrderId, reason: finalReason });
                }}
                className="btn btn-danger btn-sm"
              >
                {cancelOrderMutation.isPending ? "Đang xử lý..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
