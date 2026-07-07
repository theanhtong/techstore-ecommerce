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
    setAddressLoading(true);
    try {
      const res = await client.post("/users/me/addresses", newAddress);
      setAddresses([...addresses, res.data]);
      setShowAddForm(false);
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
      alert(err.response?.data?.message || "Tạo địa chỉ thất bại.");
    } finally {
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
    <div className="space-y-8">
      {/* Title Header */}
      <div className="border-b border-gray-200 pb-6">
        <span className="text-xs text-ink/50 uppercase tracking-widest font-mono">Tài khoản</span>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink mt-1">
          Hồ sơ của bạn
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: General Profile Info & Change Password forms */}
        <div className="lg:col-span-1 space-y-6">
          {/* General Name Info */}
          <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-4">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2.5 flex items-center gap-2">
              <User className="w-4 h-4 text-hazard" />
              Thông tin cá nhân
            </h3>
            <div className="text-xs font-semibold text-ink/55 uppercase font-mono">Email: {profile?.email}</div>
            
            {nameMsg && <div className="p-2 border border-emerald-200 bg-emerald-50 rounded text-xs text-emerald-800 font-semibold">{nameMsg}</div>}
            {nameErr && <div className="p-2 border border-hazard/20 bg-hazard/5 rounded text-xs text-hazard font-semibold">{nameErr}</div>}

            <form onSubmit={handleNameSubmit(onUpdateName)} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-1">Họ tên</label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:bg-white focus:border-ink"
                  {...registerName("name")}
                />
              </div>
              <button
                type="submit"
                disabled={nameLoading}
                className="w-full bg-ink text-substrate text-xs font-bold py-2.5 rounded-md hover:bg-hazard hover:text-white transition-colors cursor-pointer"
              >
                {nameLoading ? "..." : "Cập nhật họ tên"}
              </button>
            </form>
          </div>

          {/* Change Password form */}
          <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-4">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2.5 flex items-center gap-2">
              <Lock className="w-4 h-4 text-hazard" />
              Đổi mật khẩu
            </h3>

            {passMsg && <div className="p-2 border border-emerald-200 bg-emerald-50 rounded text-xs text-emerald-800 font-semibold">{passMsg}</div>}
            {passErr && <div className="p-2 border border-hazard/20 bg-hazard/5 rounded text-xs text-hazard font-semibold">{passErr}</div>}

            <form onSubmit={handlePassSubmit(onChangePassword)} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-1">Mật khẩu cũ</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:bg-white focus:border-ink"
                  {...registerPass("oldPassword")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:bg-white focus:border-ink"
                  {...registerPass("newPassword")}
                />
              </div>
              <button
                type="submit"
                disabled={passLoading}
                className="w-full bg-ink text-substrate text-xs font-bold py-2.5 rounded-md hover:bg-hazard hover:text-white transition-colors cursor-pointer"
              >
                {passLoading ? "..." : "Thay đổi mật khẩu"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Shipping Addresses CRUD panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-6">
            <h3 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-3 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-hazard" />
                Sổ địa chỉ giao hàng
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-[11px] font-semibold text-hazard hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddForm ? "Hủy bỏ" : "Thêm địa chỉ"}
              </button>
            </h3>

            {showAddForm && (
              <form onSubmit={handleCreateAddress} className="space-y-4 border border-gray-100 p-5 rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-1">Người nhận hàng</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
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
                      placeholder="0901234567"
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:border-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-1">Địa chỉ chi tiết (Đường, số nhà...)</label>
                  <input
                    type="text"
                    required
                    placeholder="123 Lê Lợi"
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
                  {addressLoading ? "Đang lưu..." : "Lưu địa chỉ"}
                </button>
              </form>
            )}

            {addresses.length === 0 ? (
              <div className="text-center text-xs text-ink/40 py-10 font-semibold uppercase flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-ink/20" />
                Chưa có địa chỉ nào được thiết lập.
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((a) => (
                  <div
                    key={a.id}
                    className={`border p-4 rounded-lg flex justify-between items-start gap-4 transition-colors ${
                      a.isDefault ? "bg-gray-50 border-ink/80" : "border-gray-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-ink flex items-center gap-2">
                        {a.fullName} &bull; {a.phone}
                        {a.isDefault && (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
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
                          className="text-[10px] font-bold text-ink hover:text-hazard transition-colors border border-gray-300 rounded px-2 py-1 bg-white cursor-pointer"
                        >
                          Mặc định
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(a.id)}
                        className="text-gray-400 hover:text-hazard transition-colors p-1 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
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
    </div>
  );
}
