import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { client } from "../api/client";
import { 
  User, 
  Lock, 
  MapPin, 
  Trash2, 
  Plus, 
  AlertCircle 
} from "lucide-react";

interface Address {
  id: string;
  fullName: string;
  phone: string;
  addressLine: string;
  provinceName: string;
  districtName: string;
  wardName: string;
  isDefault: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Name states
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<string | null>(null);
  const [nameLoading, setNameLoading] = useState(false);

  // Change Password states
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const [passErr, setPassErr] = useState<string | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  // Phone number OTP verification states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const [newAddress, setNewAddress] = useState({
    fullName: "",
    phone: "",
    addressLine: "",
    provinceName: "",
    provinceId: 0,
    districtName: "",
    districtId: 0,
    wardName: "",
    wardCode: "",
  });

  const [provinces, setProvinces] = useState<{ id: number; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: number; name: string; provinceId: number }[]>([]);
  const [wards, setWards] = useState<{ code: string; name: string; districtId: number }[]>([]);

  useEffect(() => {
    client.get("/address/provinces")
      .then(res => setProvinces(res.data))
      .catch(err => console.error("Error fetching provinces", err));
  }, []);

  const { register: registerName, handleSubmit: handleNameSubmit, setValue: setNameValue } = useForm();
  const { register: registerPass, handleSubmit: handlePassSubmit, reset: resetPassForm } = useForm();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [profileRes, addressesRes] = await Promise.all([
        client.get("/users/me"),
        client.get("/users/me/addresses"),
      ]);
      setProfile(profileRes.data);
      setAddresses(addressesRes.data);
      setNameValue("name", profileRes.data.name);
    } catch (err) {
      console.error("Lỗi đồng bộ dữ liệu tài khoản", err);
    } finally {
      setLoading(false);
    }
  };

  const onUpdateName = async (data: any) => {
    setNameLoading(true);
    setNameMsg(null);
    setNameErr(null);
    try {
      const res = await client.patch("/users/me", { name: data.name });
      setProfile(res.data);
      setNameMsg("Cập nhật họ tên thành công.");
    } catch (err: any) {
      setNameErr(err.response?.data?.message || "Không thể cập nhật họ tên.");
    } finally {
      setNameLoading(false);
    }
  };

  const onChangePassword = async (data: any) => {
    setPassLoading(true);
    setPassMsg(null);
    setPassErr(null);
    try {
      await client.patch("/users/me/password", {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword,
      });
      setPassMsg("Thay đổi mật khẩu thành công.");
      resetPassForm();
    } catch (err: any) {
      setPassErr(err.response?.data?.message || "Mật khẩu cũ không chính xác.");
    } finally {
      setPassLoading(false);
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
      // Send OTP to phone
      await client.post("/address/otp/send", { phone: newAddress.phone });
      setOtpError(null);
      setShowOtpModal(true);
    } catch (err: any) {
      console.error("Lỗi gửi OTP", err);
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
      setShowAddForm(false);
      setShowOtpModal(false);
      setOtpCode("");
      // Reset form
      setNewAddress({
        fullName: "",
        phone: "",
        addressLine: "",
        provinceName: "",
        provinceId: 202,
        districtName: "",
        districtId: 1442,
        wardName: "",
        wardCode: "20109",
      });
    } catch (err: any) {
      console.error("Lỗi xác thực OTP hoặc lưu địa chỉ", err);
      setOtpError(err.response?.data?.message || "Mã OTP không chính xác hoặc đã hết hạn.");
    } finally {
      setOtpLoading(false);
      setAddressLoading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa địa chỉ này không?")) return;
    try {
      await client.delete(`/users/me/addresses/${id}`);
      setAddresses(addresses.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert("Xóa địa chỉ thất bại.");
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await client.patch(`/users/me/addresses/${id}/default`);
      setAddresses(
        addresses.map((a) => ({
          ...a,
          isDefault: a.id === id,
        }))
      );
    } catch (err) {
      console.error(err);
      alert("Đặt địa chỉ mặc định thất bại.");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center font-medium text-ink/60 bg-white border border-gray-200 rounded-lg flex items-center justify-center gap-2">
        <span className="animate-spin rounded-full h-4 w-4 border-2 border-ink border-t-transparent"></span>
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title Header */}
      <div className="border-b border-gray-150 pb-6">
        <span className="text-xs text-ink/50 uppercase tracking-widest font-bold font-mono">Tài khoản</span>
        <h1 className="text-3xl font-black tracking-tight text-ink mt-1 uppercase">
          Hồ sơ của bạn
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: General Profile Info & Change Password forms */}
        <div className="lg:col-span-1 space-y-6">
          {/* General Name Info */}
          <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2.5 flex items-center gap-2">
              <User className="w-4 h-4 text-hazard" />
              Thông tin cá nhân
            </h3>
            <div className="text-xs font-bold text-ink/55 uppercase font-mono tracking-wider">Email: {profile?.email}</div>
            
            {nameMsg && <div className="p-2 border border-emerald-250 bg-emerald-50 rounded-lg text-xs text-emerald-800 font-bold uppercase tracking-wider">{nameMsg}</div>}
            {nameErr && <div className="p-2 border border-hazard/20 bg-hazard/5 rounded-lg text-xs text-hazard font-bold uppercase tracking-wider">{nameErr}</div>}

            <form onSubmit={handleNameSubmit(onUpdateName)} className="space-y-3.5">
              <div>
                <label className="form-label">Họ và tên</label>
                <input
                  type="text"
                  required
                  className="form-input bg-[#050505]/3"
                  {...registerName("name")}
                />
              </div>
              <button
                type="submit"
                disabled={nameLoading}
                className="btn btn-primary w-full"
              >
                {nameLoading ? "..." : "Cập nhật họ tên"}
              </button>
            </form>
          </div>

          {/* Change Password form */}
          <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2.5 flex items-center gap-2">
              <Lock className="w-4 h-4 text-hazard" />
              Đổi mật khẩu
            </h3>

            {passMsg && <div className="p-2 border border-emerald-250 bg-emerald-50 rounded-lg text-xs text-emerald-800 font-bold uppercase tracking-wider">{passMsg}</div>}
            {passErr && <div className="p-2 border border-hazard/20 bg-hazard/5 rounded-lg text-xs text-hazard font-bold uppercase tracking-wider">{passErr}</div>}

            <form onSubmit={handlePassSubmit(onChangePassword)} className="space-y-3">
              <div>
                <label className="form-label">Mật khẩu cũ</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="form-input bg-[#050505]/3"
                  {...registerPass("oldPassword")}
                />
              </div>
              <div>
                <label className="form-label">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="form-input bg-[#050505]/3"
                  {...registerPass("newPassword")}
                />
              </div>
              <button
                type="submit"
                disabled={passLoading}
                className="btn btn-primary w-full"
              >
                {passLoading ? "..." : "Thay đổi mật khẩu"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Shipping Addresses CRUD panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-6 shadow-2xs">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-3 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-hazard" />
                Sổ địa chỉ giao hàng
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-[10px] font-bold text-hazard hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-wider"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddForm ? "Hủy bỏ" : "Thêm địa chỉ"}
              </button>
            </h3>

            {showAddForm && (
              <form onSubmit={handleCreateAddress} className="space-y-4 border border-gray-100 p-5 rounded-xl bg-neutral-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Người nhận hàng</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
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
                      placeholder="0901234567"
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="form-input bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Địa chỉ chi tiết (Đường, số nhà...)</label>
                  <input
                    type="text"
                    required
                    placeholder="123 Lê Lợi"
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
            )}

            {addresses.length === 0 ? (
              <div className="text-center text-xs font-bold uppercase tracking-wider text-ink/40 py-10 flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-ink/20" />
                Chưa có địa chỉ nào được thiết lập.
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((a) => (
                  <div
                    key={a.id}
                    className={`border p-4 rounded-xl flex justify-between items-start gap-4 transition-all duration-200 ${
                      a.isDefault ? "bg-neutral-50/50 border-ink" : "border-gray-200 hover:border-gray-350"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-ink flex items-center gap-2">
                        {a.fullName} &bull; {a.phone}
                        {a.isDefault && (
                          <span className="badge-premium badge-success">
                            Mặc định
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink/65">
                        {a.addressLine}, {a.wardName}, {a.districtName}, {a.provinceName}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!a.isDefault && (
                        <button
                          onClick={() => handleSetDefaultAddress(a.id)}
                          className="btn btn-secondary btn-sm !py-1.5 !px-3 text-[10px]"
                        >
                          Mặc định
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(a.id)}
                        className="text-gray-450 hover:text-hazard transition-all p-2 border border-gray-200 rounded-lg hover:bg-neutral-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
