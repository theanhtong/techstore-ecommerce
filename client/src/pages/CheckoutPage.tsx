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
  const { items, clearCart, fetchCart, loading } = useCartStore();
  const [checkoutItemIds, setCheckoutItemIds] = useState<string[]>([]);
  const [hasValidated, setHasValidated] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    fetchCart();
    const saved = localStorage.getItem("checkout_item_ids");
    if (saved) {
      try {
        setCheckoutItemIds(JSON.parse(saved));
      } catch (err) {
        console.error("Error parsing checkout items", err);
      }
    }
  }, [fetchCart]);

  useEffect(() => {
    if (loading || isSubmitted) return;

    if (checkoutItemIds.length > 0) {
      const validCheckoutItems = items.filter((i) => checkoutItemIds.includes(i.id));
      if (validCheckoutItems.length !== checkoutItemIds.length) {
        alert("Sản phẩm trong giỏ hàng đã thay đổi. Vui lòng kiểm tra lại đơn hàng.");
        navigate("/cart");
      } else {
        setHasValidated(true);
      }
    } else if (items.length > 0) {
      setHasValidated(true);
    } else {
      // If cart is empty, redirect to /cart
      navigate("/cart");
    }
  }, [items, checkoutItemIds, loading, isSubmitted, navigate]);

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

  // Phone number OTP verification states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

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
    if (!newAddress.phone) {
      alert("Vui lòng điền số điện thoại.");
      return;
    }
    setAddressLoading(true);
    try {
      // Send OTP to user's phone number via API
      await client.post("/address/otp/send", { phone: newAddress.phone });
      setOtpError(null);
      setShowOtpModal(true);
    } catch (err: any) {
      console.error("Lỗi gửi mã OTP", err);
      alert(err.response?.data?.message || "Không thể gửi mã OTP xác thực.");
    } finally {
      setAddressLoading(false);
    }
  };

  const handleVerifyOtpAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError(null);
    try {
      // 1. Verify OTP
      await client.post("/address/otp/verify", {
        phone: newAddress.phone,
        code: otpCode,
      });

      // 2. Proceed with address creation since verification was successful
      setAddressLoading(true);
      const res = await client.post("/users/me/addresses", newAddress);
      setAddresses([...addresses, res.data]);
      setSelectedAddressId(res.data.id);
      setShowAddressForm(false);
      setShowOtpModal(false);
      setOtpCode("");
    } catch (err: any) {
      console.error("Lỗi xác thực OTP hoặc lưu địa chỉ", err);
      setOtpError(err.response?.data?.message || "Mã OTP không chính xác hoặc đã hết hạn.");
    } finally {
      setOtpLoading(false);
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
      setIsSubmitted(true);
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
      setIsSubmitted(false);
      setCheckoutError(err.response?.data?.message || "Đặt hàng thất bại. Vui lòng kiểm tra và thử lại.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const discountAmount = couponResult ? couponResult.discountAmount : 0;
  const finalAmount = couponResult ? Math.max(checkoutSubtotal - discountAmount, 0) : checkoutSubtotal;

  if (loading || !hasValidated) {
    return (
      <div className="py-24 text-center font-medium text-ink/60 flex flex-col items-center justify-center gap-3">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-ink border-t-transparent"></span>
        <span className="text-xs uppercase tracking-wider font-bold">Đang tải và xác thực đơn hàng...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Back button */}
      <div className="text-xs font-bold uppercase tracking-wider">
        <Link to="/cart" className="text-ink/60 hover:text-hazard transition-colors flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại Giỏ hàng
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-gray-150 pb-6">
        <span className="text-xs text-ink/50 uppercase tracking-widest font-bold font-mono">Thanh toán</span>
        <h1 className="text-3xl font-black tracking-tight text-ink mt-1 uppercase">
          Hoàn tất đặt hàng
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Columns - Info address & payments */}
        <div className="lg:col-span-2 space-y-8">
          {/* Shipping Address Panel */}
          <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-6 shadow-2xs">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2.5 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-hazard" />
                Địa chỉ nhận hàng
              </span>
              <button
                type="button"
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-[10px] font-bold text-hazard hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddressForm ? "Hủy bỏ" : "Thêm địa chỉ mới"}
              </button>
            </h3>

            {showAddressForm ? (
              <form onSubmit={handleCreateAddress} className="space-y-4 border border-gray-100 p-5 rounded-xl bg-neutral-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Họ và tên người nhận</label>
                    <input
                      type="text"
                      required
                      value={newAddress.fullName}
                      onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                      className="form-input bg-white"
                    />
                  </div>
                  <div>
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="text"
                      required
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="form-input bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Địa chỉ chi tiết (Số nhà, tên đường...)</label>
                  <input
                    type="text"
                    required
                    value={newAddress.addressLine}
                    onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
                    className="form-input bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Tỉnh / Thành phố</label>
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
                      className="form-input bg-white"
                    >
                      <option value="">-- Chọn Tỉnh/TP --</option>
                      {provinces.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Quận / Huyện</label>
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
                      className="form-input bg-white disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Chọn Quận/Huyện --</option>
                      {districts.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Phường / Xã</label>
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
                      className="form-input bg-white disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Chọn Phường/Xã --</option>
                      {wards.map(w => (
                        <option key={w.code} value={w.code}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addressLoading}
                  className="btn btn-primary btn-sm"
                >
                  {addressLoading ? "Đang gửi OTP..." : "Xác minh số điện thoại"}
                </button>
              </form>
            ) : addresses.length === 0 ? (
              <div className="text-center text-xs font-bold uppercase tracking-wider text-ink/40 py-8">
                Bạn chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ nhận hàng ở trên.
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={`block border p-4 rounded-xl cursor-pointer relative transition-all duration-200 ${selectedAddressId === a.id ? "bg-neutral-50/50 border-ink shadow-sm" : "border-gray-200 hover:border-gray-350"
                      }`}
                  >
                    <input
                      type="radio"
                      name="addressSelect"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                      className="absolute right-4 top-4 accent-ink cursor-pointer"
                    />
                    <div className="text-xs font-black text-ink flex items-center gap-2">
                      <span>{a.fullName}</span>
                      <span>&bull;</span>
                      <span className="font-mono">{a.phone}</span>
                    </div>
                    <div className="text-xs text-ink/65 mt-1">
                      {a.addressLine}, {a.wardName}, {a.districtName}, {a.provinceName}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method Panel */}
          <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-6 shadow-2xs">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2.5 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-hazard" />
              Phương thức thanh toán
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod("COD")}
                className={`border p-4 rounded-xl cursor-pointer text-left transition-all duration-250 flex justify-between items-center ${paymentMethod === "COD"
                    ? "border-ink bg-neutral-50/80 shadow-2xs"
                    : "border-gray-200 hover:border-gray-350"
                  }`}
              >
                <div>
                  <div className="font-black text-xs uppercase tracking-wider text-ink">Thanh toán khi nhận hàng (COD)</div>
                  <div className="text-[11px] text-ink/50 mt-1">Trả tiền mặt khi sản phẩm được giao đến tận nơi.</div>
                </div>
                {paymentMethod === "COD" && <CheckCircle2 className="w-4 h-4 text-ink flex-shrink-0 ml-2" />}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("VNPAY")}
                className={`border p-4 rounded-xl cursor-pointer text-left transition-all duration-250 flex justify-between items-center ${paymentMethod === "VNPAY"
                    ? "border-ink bg-neutral-50/80 shadow-2xs"
                    : "border-gray-200 hover:border-gray-350"
                  }`}
              >
                <div>
                  <div className="font-black text-xs uppercase tracking-wider text-ink">Thanh toán online qua VNPAY</div>
                  <div className="text-[11px] text-ink/50 mt-1">Thanh toán bằng thẻ ATM, thẻ quốc tế hoặc quét mã QR.</div>
                </div>
                {paymentMethod === "VNPAY" && <CheckCircle2 className="w-4 h-4 text-ink flex-shrink-0 ml-2" />}
              </button>
            </div>
          </div>

          {/* Ghi chú nhận hàng */}
          <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2.5 flex items-center gap-2">
              <Truck className="w-4 h-4 text-hazard" />
              Ghi chú đơn hàng
            </h3>
            <textarea
              rows={2}
              placeholder="Ví dụ: Giao hàng vào giờ hành chính, gọi điện trước khi giao..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input bg-white"
            ></textarea>
          </div>
        </div>

        {/* Right Column: Invoice overview */}
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-6 shadow-2xs">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-3">
              Thông tin đơn hàng
            </h3>

            {/* List mini items */}
            <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
              {checkoutItems.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="w-10 h-10 bg-neutral-50 rounded-lg border border-neutral-100 flex items-center justify-center flex-shrink-0">
                    {item.variant?.images?.[0]?.url ? (
                      <img src={item.variant.images[0].url} alt={item.variant.product?.name} className="object-contain p-1 w-full h-full" />
                    ) : (
                      <span className="text-[8px] text-ink/30 font-bold">N/A</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-ink truncate uppercase leading-none">{item.variant?.product?.name}</h5>
                    <span className="text-[10px] text-ink/40 font-mono font-bold">SL: {item.quantity}</span>
                  </div>
                  <div className="text-xs font-bold text-ink/80 text-right flex-shrink-0">
                    {formatPrice(item.effectivePrice * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations summaries */}
            <div className="space-y-4 text-xs font-bold uppercase tracking-wider text-ink pt-6 border-t border-gray-100">
              <div className="flex justify-between">
                <span className="text-ink/45">Cộng tiền hàng</span>
                <span className="font-bold text-ink">{formatPrice(checkoutSubtotal)}</span>
              </div>

              {couponResult && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Mã giảm giá ({couponCode})</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-gray-100 text-sm font-black">
                <span>Tổng thanh toán</span>
                <span className="text-hazard text-base font-black">{formatPrice(finalAmount)}</span>
              </div>
            </div>

            {checkoutError && (
              <div className="border border-hazard/20 bg-hazard/5 p-3 rounded-lg text-xs font-bold uppercase tracking-wider text-hazard">
                Lỗi: {checkoutError}
              </div>
            )}

            {/* Submit checkout buttons */}
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading || checkoutItems.length === 0}
              className="btn btn-primary w-full btn-lg"
            >
              {checkoutLoading ? "Đang xử lý đặt hàng..." : "Xác nhận đặt hàng"}
            </button>
          </div>
        </div>
      </div>

      {showOtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-xl animate-fadeIn">
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-black text-ink uppercase tracking-wider">Xác thực số điện thoại</h3>
              <p className="text-xs text-ink/50 font-bold uppercase tracking-wider">
                TechStore đã gửi một mã OTP để xác minh số điện thoại <strong className="text-ink font-mono">{newAddress.phone}</strong>.
              </p>
            </div>

            <form onSubmit={handleVerifyOtpAndSave} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-ink/40 uppercase tracking-widest text-center">Mã OTP (6 chữ số)</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="MÃ OTP..."
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-[12px] font-mono text-xl font-black bg-neutral-50 border border-gray-300 rounded-md py-3 outline-none focus:bg-white focus:border-ink"
                />
                
                {/* Visual tip for local execution */}
                <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-hazard leading-normal font-bold uppercase text-center tracking-wide">
                  💡 Vì đang chạy local, hãy kiểm tra mã OTP trong cửa sổ Terminal chạy Server.
                </div>
              </div>

              {otpError && (
                <p className="text-xs text-hazard font-bold uppercase tracking-wider text-center">{otpError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpModal(false);
                    setOtpCode("");
                    setOtpError(null);
                  }}
                  className="btn btn-secondary flex-1 btn-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length < 6}
                  className="btn btn-primary flex-1 btn-sm"
                >
                  {otpLoading ? "..." : "Xác nhận"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
