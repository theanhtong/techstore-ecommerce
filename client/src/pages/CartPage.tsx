import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useCartStore } from "../store/useCartStore";
import { useAuthStore } from "../store/useAuthStore";
import { client } from "../api/client";
import { formatPrice } from "../utils/price";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ChevronRight
} from "lucide-react";

export default function CartPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { items, updateItemQuantity, removeItem } = useCartStore();

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Chọn toàn bộ sản phẩm mặc định khi mở trang giỏ hàng
  useEffect(() => {
    if (items.length > 0 && selectedItemIds.length === 0) {
      setSelectedItemIds(items.map((i) => i.id));
    }
  }, [items]);

  const selectedItems = items.filter((item) => selectedItemIds.includes(item.id));
  const selectedSubtotal = selectedItems.reduce(
    (sum, item) => sum + item.effectivePrice * item.quantity,
    0
  );

  // Xóa mã giảm giá khi danh sách sản phẩm chọn thay đổi để bắt buộc kiểm tra lại điều kiện áp dụng
  useEffect(() => {
    clearCoupon();
  }, [selectedItemIds]);

  const handleValidateCoupon = async () => {
    if (!couponCode) return;
    setCouponLoading(true);
    setCouponError(null);
    setCouponResult(null);
    try {
      const res = await client.post("/coupons/validate", {
        code: couponCode,
        orderSubtotal: selectedSubtotal,
      });
      if (res.data.isValid) {
        setCouponResult(res.data);
        // Lưu lại thông tin coupon đã chọn để dùng cho bước thanh toán
        localStorage.setItem("applied_coupon", JSON.stringify({
          code: couponCode,
          result: res.data
        }));
      } else {
        setCouponError(res.data.message || "Mã giảm giá không khả dụng.");
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.message || "Xác thực mã giảm giá thất bại.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleProceedToCheckout = () => {
    // Lưu danh sách id các sản phẩm được tích chọn mua vào localStorage
    localStorage.setItem("checkout_item_ids", JSON.stringify(selectedItemIds));
    if (!user) {
      navigate("/auth");
    } else {
      navigate("/checkout");
    }
  };

  const clearCoupon = () => {
    setCouponCode("");
    setCouponResult(null);
    setCouponError(null);
    localStorage.removeItem("applied_coupon");
  };

  if (items.length === 0) {
    return (
      <div className="p-8 text-center my-16 max-w-md mx-auto space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center gap-4">
          <div className="bg-gray-50 text-ink/40 p-4 rounded-full">
            <ShoppingCart className="w-12 h-12" />
          </div>
          <p className="text-sm text-ink/50 font-medium">Giỏ hàng của bạn đang trống.</p>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 bg-ink text-white text-xs font-bold uppercase px-8 py-4 rounded-lg hover:bg-hazard transition-colors"
        >
          Tiếp tục mua sắm
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const discountAmount = couponResult ? couponResult.discountAmount : 0;
  const finalAmount = Math.max(selectedSubtotal - discountAmount, 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header breadcrumbs */}
      <div className="border-b border-gray-150 pb-6 flex items-center justify-between">
        <div>
          <span className="text-xs text-ink/50 uppercase tracking-widest font-bold font-mono">Giỏ hàng</span>
          <h1 className="text-3xl font-black tracking-tight text-ink mt-1 uppercase">
            Chi tiết giỏ hàng
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Cart Items List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-6 shadow-2xs">
            {/* Select All Checkbox */}
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <input
                type="checkbox"
                checked={items.length > 0 && selectedItemIds.length === items.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedItemIds(items.map((i) => i.id));
                  } else {
                    setSelectedItemIds([]);
                  }
                }}
                className="w-4 h-4 rounded text-hazard focus:ring-hazard border-gray-350 cursor-pointer"
              />
              <span 
                className="text-xs font-bold text-ink/60 uppercase tracking-wider select-none cursor-pointer hover:text-ink transition-colors"
                onClick={() => {
                  if (selectedItemIds.length === items.length) {
                    setSelectedItemIds([]);
                  } else {
                    setSelectedItemIds(items.map((i) => i.id));
                  }
                }}
              >
                Chọn tất cả ({items.length} sản phẩm)
              </span>
            </div>

            {items.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-6 border-b border-gray-100 pb-6 last:border-0 last:pb-0 items-start sm:items-center">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedItemIds.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItemIds([...selectedItemIds, item.id]);
                      } else {
                        setSelectedItemIds(selectedItemIds.filter((id) => id !== item.id));
                      }
                    }}
                    className="w-4 h-4 rounded text-hazard focus:ring-hazard border-gray-350 cursor-pointer"
                  />
                  {/* Image */}
                  <div className="w-20 h-20 bg-neutral-50 border border-neutral-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {item.variant?.images?.[0]?.url ? (
                      <img src={item.variant.images[0].url} alt={item.variant.product?.name} className="object-contain p-2 w-full h-full" />
                    ) : (
                      <span className="text-[10px] text-ink/30 font-medium">N/A</span>
                    )}
                  </div>
                </div>

                {/* Details info */}
                <div className="flex-1 space-y-1">
                  <div className="text-[10px] text-ink/40 font-mono uppercase font-bold">{item.variant?.sku}</div>
                  <h4 className="font-bold text-sm text-ink leading-tight">{item.variant?.product?.name}</h4>
                  <div>
                    <span className="text-xs text-hazard font-black">
                      {formatPrice(item.effectivePrice)}
                    </span>
                  </div>
                </div>

                {/* Quantity select */}
                <div className="flex items-center gap-4 flex-shrink-0 justify-between sm:justify-start">
                  <div className="flex items-center border border-gray-300 rounded-md bg-white overflow-hidden">
                    <button
                      onClick={() => updateItemQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="px-2.5 py-1.5 hover:bg-neutral-50 transition-colors cursor-pointer text-xs font-bold text-ink"
                    >
                      <Minus className="w-3 h-3 text-ink/75" />
                    </button>
                    <span className="px-3 text-xs font-black text-ink select-none">{item.quantity}</span>
                    <button
                      onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                      className="px-2.5 py-1.5 hover:bg-neutral-50 transition-colors cursor-pointer text-xs font-bold text-ink"
                    >
                      <Plus className="w-3 h-3 text-ink/75" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-400 hover:text-hazard transition-all cursor-pointer p-2 hover:bg-neutral-50 rounded-lg border border-transparent hover:border-gray-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Checkout Invoice */}
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-6 shadow-2xs">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-3">
              Tóm tắt đơn hàng
            </h3>

            {/* Calculations VND details */}
            <div className="space-y-4 text-xs font-bold uppercase tracking-wider text-ink pb-6 border-b border-gray-100">
              <div className="flex justify-between">
                <span className="text-ink/45">Tạm tính</span>
                <span className="font-bold text-ink">{formatPrice(selectedSubtotal)}</span>
              </div>

              {couponResult && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Giảm giá ({couponCode})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-ink pt-2 border-t border-gray-100">
                <span>Tổng thanh toán</span>
                <span className="text-hazard text-base font-black">{formatPrice(finalAmount)}</span>
              </div>
            </div>

            {/* Promo Code check box */}
            {user && (
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-widest">
                  Mã giảm giá
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="MÃ GIẢM GIÁ..."
                    value={couponCode}
                    disabled={!!couponResult}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="form-input flex-1 bg-white"
                  />
                  {couponResult ? (
                    <button
                      onClick={clearCoupon}
                      className="btn btn-secondary btn-sm"
                    >
                      Hủy
                    </button>
                  ) : (
                    <button
                      onClick={handleValidateCoupon}
                      disabled={couponLoading || !couponCode}
                      className="btn btn-primary btn-sm"
                    >
                      {couponLoading ? "..." : "Áp dụng"}
                    </button>
                  )}
                </div>
                {couponError && (
                  <p className="text-xs text-hazard font-bold uppercase tracking-wider">{couponError}</p>
                )}
                {couponResult && (
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
                    Áp dụng thành công
                  </p>
                )}
              </div>
            )}

            {/* Checkout Action links */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleProceedToCheckout}
                disabled={selectedItemIds.length === 0}
                className="btn btn-primary w-full btn-lg"
              >
                <span>Thanh toán ngay</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              {!user && (
                <p className="text-[10px] text-ink/40 text-center font-bold uppercase tracking-wider">
                  * Yêu cầu đăng nhập để thanh toán.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
