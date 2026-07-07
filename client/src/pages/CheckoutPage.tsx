import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useCartStore } from "../store/useCartStore";
import { useAuthStore } from "../store/useAuthStore";
import { client } from "../api/client";
import { formatPrice } from "../utils/price";
import { 
  MapPin, 
  CreditCard, 
  ArrowLeft, 
  Truck, 
  Plus, 
  CheckCircle2 
} from "lucide-react";

interface Address {
  id: string;
  fullName: string;
  phone: string;
  addressLine: string;
  provinceName: string;
  districtName: string;
  wardName: string;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { items, clearCart } = useCartStore();
  const [checkoutItemIds, setCheckoutItemIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("checkout_item_ids");
    if (saved) {
      try {
        setCheckoutItemIds(JSON.parse(saved));
      } catch (err) {
        console.error("Error parsing checkout items", err);
      }
    }
  }, []);

  const checkoutItems = checkoutItemIds.length > 0
    ? items.filter((i) => checkoutItemIds.includes(i.id))
    : items;

  const checkoutSubtotal = checkoutItems.reduce(
    (sum, item) => sum + (item.effectivePrice || item.variant.price) * item.quantity,
    0
  );

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  // Pre-populated default shipping address details matching Vietnamese GHN system coordinates
  const [newAddress, setNewAddress] = useState({
    fullName: "Nguyễn Văn A",
    phone: "0901234567",
    addressLine: "123 Đường Lê Lợi",
    provinceName: "Thành phố Hồ Chí Minh",
    provinceId: 202,
    districtName: "Quận 1",
    districtId: 1442,
    wardName: "Phường Bến Nghé",
    wardCode: "20109",
  });

  const [provinces, setProvinces] = useState<{ id: number; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: number; name: string; provinceId: number }[]>([]);
  const [wards, setWards] = useState<{ code: string; name: string; districtId: number }[]>([]);

  useEffect(() => {
    client.get("/address/provinces")
      .then(res => setProvinces(res.data))
      .catch(err => console.error("Error fetching provinces", err));

    if (newAddress.provinceId) {
      client.get(`/address/districts?provinceId=${newAddress.provinceId}`)
        .then(res => setDistricts(res.data))
        .catch(err => console.error("Error fetching districts", err));
    }
    if (newAddress.districtId) {
      client.get(`/address/wards?districtId=${newAddress.districtId}`)
        .then(res => setWards(res.data))
        .catch(err => console.error("Error fetching wards", err));
    }
  }, []);

  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponResult, setCouponResult] = useState<any>(null);

  const [paymentMethod, setPaymentMethod] = useState<"COD" | "VNPAY">("COD");
  const [notes, setNotes] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAddresses();
    
    // Check for applied coupon from cart page
    const savedCoupon = localStorage.getItem("applied_coupon");
    if (savedCoupon) {
      try {
        const parsed = JSON.parse(savedCoupon);
        setCouponCode(parsed.code);
        setCouponResult(parsed.result);
      } catch (err) {
        console.error("Lỗi đọc mã giảm giá đã lưu", err);
      }
    }
  }, [user, navigate]);

  const fetchAddresses = async () => {
    try {
      const res = await client.get("/users/me/addresses");
      setAddresses(res.data);
      if (res.data.length > 0) {
        // Find default or select first
        const def = res.data.find((a: any) => a.isDefault);
        setSelectedAddressId(def ? def.id : res.data[0].id);
      }
    } catch (err) {
      console.error("Lỗi tải danh mục địa chỉ", err);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressLoading(true);
    try {
      const res = await client.post("/users/me/addresses", newAddress);
      setAddresses([...addresses, res.data]);
      setSelectedAddressId(res.data.id);
      setShowAddressForm(false);
    } catch (err: any) {
      console.error("Lỗi thêm địa chỉ mới", err);
      alert(err.response?.data?.message || "Không thể tạo địa chỉ mới.");
    } finally {
      setAddressLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedAddressId) {
      setCheckoutError("Vui lòng lựa chọn hoặc bổ sung địa chỉ nhận hàng.");
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      // 1. Create order on backend
      const orderRes = await client.post("/orders", {
        cartItemIds: checkoutItems.map((i) => i.id),
        addressId: selectedAddressId,
        couponCode: couponCode || undefined,
        notes: notes || undefined,
      });
      const order = orderRes.data;

      // 2. Initialize Payment on backend
      const paymentRes = await client.post(`/payments/orders/${order.id}`, {
        method: paymentMethod,
        returnUrl: window.location.origin + "/orders",
      });

      // 3. Clear local Zustand cart and local coupon
      await clearCart();
      localStorage.removeItem("applied_coupon");

      if (paymentMethod === "VNPAY" && paymentRes.data.paymentUrl) {
        // Redirect to VNPAY sandbox
        window.location.href = paymentRes.data.paymentUrl;
      } else {
        navigate("/orders");
      }
    } catch (err: any) {
      setCheckoutError(err.response?.data?.message || "Đặt hàng thất bại. Vui lòng kiểm tra và thử lại.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const discountAmount = couponResult ? couponResult.discountAmount : 0;
  const finalAmount = couponResult ? Math.max(checkoutSubtotal - discountAmount, 0) : checkoutSubtotal;

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div className="text-sm font-semibold">
        <Link to="/cart" className="text-ink/65 hover:text-hazard transition-colors flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại Giỏ hàng
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <span className="text-xs text-ink/50 uppercase tracking-widest font-mono">Thanh toán</span>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink mt-1">
          Hoàn tất đặt hàng
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Columns - Info address & payments */}
        <div className="lg:col-span-2 space-y-8">
          {/* Shipping Address Panel */}
          <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-6">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2.5 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-hazard" />
                Địa chỉ nhận hàng
              </span>
              <button
                type="button"
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-[11px] font-semibold text-hazard hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddressForm ? "Hủy bỏ" : "Thêm địa chỉ mới"}
              </button>
            </h3>

            {showAddressForm ? (
              <form onSubmit={handleCreateAddress} className="space-y-4 border border-gray-100 p-5 rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-1">Họ tên người nhận</label>
                    <input
                      type="text"
                      required
                      value={newAddress.fullName}
                      onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:border-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      required
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:border-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-1">Địa chỉ chi tiết (Số nhà, tên đường...)</label>
                  <input
                    type="text"
                    required
                    value={newAddress.addressLine}
                    onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:border-ink"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-1">Tỉnh / Thành phố</label>
                    <select
                      required
                      value={newAddress.provinceId || ""}
                      onChange={(e) => {
                        const pid = Number(e.target.value);
                        const name = provinces.find(p => p.id === pid)?.name || "";
                        setNewAddress({
                          ...newAddress,
                          provinceId: pid,
                          provinceName: name,
                          districtId: 0,
                          districtName: "",
                          wardCode: "",
                          wardName: "",
                        });
                        setDistricts([]);
                        setWards([]);
                        if (pid) {
                          client.get(`/address/districts?provinceId=${pid}`).then(res => setDistricts(res.data));
                        }
                      }}
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:border-ink"
                    >
                      <option value="">-- Chọn Tỉnh / Thành phố --</option>
                      {provinces.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-1">Quận / Huyện</label>
                    <select
                      required
                      disabled={!newAddress.provinceId}
                      value={newAddress.districtId || ""}
                      onChange={(e) => {
                        const did = Number(e.target.value);
                        const name = districts.find(d => d.id === did)?.name || "";
                        setNewAddress({
                          ...newAddress,
                          districtId: did,
                          districtName: name,
                          wardCode: "",
                          wardName: "",
                        });
                        setWards([]);
                        if (did) {
                          client.get(`/address/wards?districtId=${did}`).then(res => setWards(res.data));
                        }
                      }}
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:border-ink disabled:bg-gray-100"
                    >
                      <option value="">-- Chọn Quận / Huyện --</option>
                      {districts.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-1">Phường / Xã</label>
                    <select
                      required
                      disabled={!newAddress.districtId}
                      value={newAddress.wardCode || ""}
                      onChange={(e) => {
                        const code = e.target.value;
                        const name = wards.find(w => w.code === code)?.name || "";
                        setNewAddress({
                          ...newAddress,
                          wardCode: code,
                          wardName: name,
                        });
                      }}
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:border-ink disabled:bg-gray-100"
                    >
                      <option value="">-- Chọn Phường / Xã --</option>
                      {wards.map(w => (
                        <option key={w.code} value={w.code}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addressLoading}
                  className="bg-ink text-substrate text-xs font-bold uppercase px-4 py-2.5 rounded-md hover:bg-hazard hover:text-white transition-colors cursor-pointer"
                >
                  {addressLoading ? "Đang lưu..." : "Lưu địa chỉ nhận hàng"}
                </button>
              </form>
            ) : addresses.length === 0 ? (
              <div className="text-center text-xs text-ink/40 py-8 font-medium">
                Bạn chưa lưu địa chỉ nhận hàng nào. Vui lòng bấm vào nút thêm mới địa chỉ ở góc phải.
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={`block border p-4 rounded-lg cursor-pointer relative transition-colors ${
                      selectedAddressId === a.id ? "bg-gray-50/50 border-ink shadow-sm" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addressSelect"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                      className="absolute right-4 top-4 accent-ink"
                    />
                    <div className="text-xs font-bold text-ink">{a.fullName} &bull; {a.phone}</div>
                    <div className="text-xs text-ink/60 mt-1">
                      {a.addressLine}, {a.wardName}, {a.districtName}, {a.provinceName}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method Panel */}
          <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-6">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2.5 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-hazard" />
              Phương thức thanh toán
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod("COD")}
                className={`border p-4 rounded-lg text-xs font-semibold cursor-pointer text-left transition-colors flex justify-between items-center ${
                  paymentMethod === "COD"
                    ? "border-ink bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div>
                  <div className="font-bold text-ink">Thanh toán khi nhận hàng (COD)</div>
                  <div className="text-[11px] text-ink/50 mt-0.5 font-normal">Trả tiền mặt khi sản phẩm được giao đến.</div>
                </div>
                {paymentMethod === "COD" && <CheckCircle2 className="w-4 h-4 text-ink" />}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("VNPAY")}
                className={`border p-4 rounded-lg text-xs font-semibold cursor-pointer text-left transition-colors flex justify-between items-center ${
                  paymentMethod === "VNPAY"
                    ? "border-ink bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div>
                  <div className="font-bold text-ink">Thanh toán qua VNPAY Online</div>
                  <div className="text-[11px] text-ink/50 mt-0.5 font-normal">Cổng ATM, thẻ quốc tế hoặc quét mã QR.</div>
                </div>
                {paymentMethod === "VNPAY" && <CheckCircle2 className="w-4 h-4 text-ink" />}
              </button>
            </div>
          </div>

          {/* Ghi chú nhận hàng */}
          <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-4">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2.5 flex items-center gap-2">
              <Truck className="w-4 h-4 text-hazard" />
              Ghi chú nhận hàng
            </h3>
            <textarea
              rows={2}
              placeholder="Ví dụ: Giao hàng vào giờ hành chính, gọi điện trước khi đến..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md p-3 text-xs outline-none focus:border-ink"
            ></textarea>
          </div>
        </div>

        {/* Right Column: Invoice overview */}
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-6">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-3">
              Thông tin đơn hàng
            </h3>

            {/* List mini items */}
            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {checkoutItems.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="w-10 h-10 bg-gray-50 rounded border border-gray-100 flex items-center justify-center flex-shrink-0">
                    {item.variant?.images?.[0]?.url ? (
                      <img src={item.variant.images[0].url} alt={item.variant.product?.name} className="object-contain p-1" />
                    ) : (
                      <span className="text-[7px] text-ink/30">N/A</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-ink truncate uppercase leading-none">{item.variant?.product?.name}</h5>
                    <span className="text-[10px] text-ink/40 font-mono">SL: {item.quantity}</span>
                  </div>
                  <div className="text-xs font-semibold text-ink/80 text-right flex-shrink-0">
                    {formatPrice(item.effectivePrice * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations summaries */}
            <div className="space-y-4 text-xs font-medium text-ink uppercase pt-6 border-t border-gray-100">
              <div className="flex justify-between">
                <span className="text-ink/50">Cộng tiền hàng</span>
                <span className="font-semibold">{formatPrice(checkoutSubtotal)}</span>
              </div>

              {couponResult && (
                <div className="flex justify-between text-emerald-600 font-semibold normal-case">
                  <span>Mã giảm giá ({couponCode})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-gray-100 text-sm font-bold">
                <span>Tổng số tiền</span>
                <span className="text-hazard text-base font-black">{formatPrice(finalAmount)}</span>
              </div>
            </div>

            {checkoutError && (
              <div className="border border-hazard/20 bg-hazard/5 p-3 rounded-md text-xs text-hazard font-semibold">
                Lỗi: {checkoutError}
              </div>
            )}

            {/* Submit checkout buttons */}
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || checkoutItems.length === 0}
              className="w-full bg-ink text-substrate hover:bg-hazard text-xs font-bold uppercase py-4 rounded-md transition-colors cursor-pointer text-center"
            >
              {checkoutLoading ? "Đang xử lý đặt hàng..." : "Xác nhận đặt hàng"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
