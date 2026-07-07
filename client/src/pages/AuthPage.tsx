import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { client } from "../api/client";
import { useAuthStore } from "../store/useAuthStore";
import { useCartStore } from "../store/useCartStore";
import { KeyRound, Mail, User, ShieldAlert } from "lucide-react";

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);
  const fetchCart = useCartStore((state) => state.fetchCart);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle verify-email callback logic automatically if token param is present in URL
  const verificationToken = searchParams.get("token");
  const [verifying, setVerifying] = useState(!!verificationToken);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  useState(() => {
    if (verificationToken) {
      client
        .get(`/auth/verify-email?token=${verificationToken}`)
        .then((res) => {
          setVerifySuccess(res.data.message || "Xác thực địa chỉ Email thành công.");
        })
        .catch((err) => {
          setErrorMsg(err.response?.data?.message || "Xác thực Email thất bại hoặc mã xác thực đã hết hạn.");
        })
        .finally(() => {
          setVerifying(false);
        });
    }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (isRegister) {
        const res = await client.post("/auth/register", {
          email: data.email,
          password: data.password,
          name: data.name,
        });
        setSuccessMsg(res.data.message || "Đăng ký tài khoản thành công. Vui lòng kiểm tra email của bạn để xác thực tài khoản.");
        setIsRegister(false);
        reset();
      } else {
        const res = await client.post("/auth/login", {
          email: data.email,
          password: data.password,
        });
        const { accessToken, refreshToken } = res.data;
        setAuth(accessToken, refreshToken);
        await fetchCart(); // Sync guest cart items with server cart
        navigate("/");
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || "Thông tin tài khoản hoặc mật khẩu không chính xác.");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="p-8 max-w-md mx-auto my-12 border border-gray-200 bg-white rounded-xl text-center font-medium text-ink/65 flex items-center justify-center gap-2">
        <span className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-ink border-t-transparent"></span>
        Đang xác thực địa chỉ Email của bạn...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg mx-auto my-12 border border-gray-200 bg-white rounded-2xl space-y-6">
      {/* Title */}
      <div className="border-b border-gray-200 pb-5">
        <span className="text-xs text-ink/50 uppercase tracking-widest font-mono">Cổng tài khoản</span>
        <h1 className="text-2xl font-black text-ink mt-1">
          {isRegister ? "Đăng ký tài khoản" : "Đăng nhập hệ thống"}
        </h1>
      </div>

      {/* Verify Success Alert */}
      {verifySuccess && (
        <div className="border border-emerald-200 bg-emerald-50 p-4 rounded-md text-xs text-emerald-800 font-semibold">
          {verifySuccess}
        </div>
      )}

      {/* Success Alert */}
      {successMsg && (
        <div className="border border-emerald-200 bg-emerald-50 p-4 rounded-md text-xs text-emerald-800 font-semibold leading-relaxed">
          {successMsg}
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="border border-hazard/20 bg-hazard/5 p-4 rounded-md text-xs text-hazard font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isRegister && (
          <div>
            <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-2">
              Họ và tên
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nhập họ và tên..."
                className="w-full bg-[#050505]/5 border border-gray-300 rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:bg-white focus:border-ink transition-colors"
                {...register("name", { required: "Họ và tên là bắt buộc" })}
              />
              <User className="w-4 h-4 text-ink/30 absolute left-3.5 top-3.5" />
            </div>
            {errors.name && (
              <p className="mt-1.5 text-xs text-hazard font-medium">{errors.name.message as string}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-2">
            Địa chỉ Email
          </label>
          <div className="relative">
            <input
              type="email"
              placeholder="example@gmail.com"
              className="w-full bg-[#050505]/5 border border-gray-300 rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:bg-white focus:border-ink transition-colors"
              {...register("email", { required: "Địa chỉ Email là bắt buộc" })}
            />
            <Mail className="w-4 h-4 text-ink/30 absolute left-3.5 top-3.5" />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-hazard font-medium">{errors.email.message as string}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-2">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-[#050505]/5 border border-gray-300 rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:bg-white focus:border-ink transition-colors"
              {...register("password", { required: "Mật khẩu là bắt buộc" })}
            />
            <KeyRound className="w-4 h-4 text-ink/30 absolute left-3.5 top-3.5" />
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-hazard font-medium">{errors.password.message as string}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-substrate font-bold uppercase py-3.5 rounded-md hover:bg-hazard hover:text-white transition-colors cursor-pointer text-xs"
        >
          {loading ? "Đang xử lý..." : isRegister ? "Đăng ký" : "Đăng nhập"}
        </button>
      </form>

      {/* Switch Form Switcher */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setErrorMsg(null);
            setSuccessMsg(null);
            setVerifySuccess(null);
          }}
          className="text-xs text-ink/60 hover:text-hazard font-semibold cursor-pointer"
        >
          {isRegister
            ? "Đã có tài khoản? Đăng nhập ngay"
            : "Chưa có tài khoản? Đăng ký tài khoản mới"}
        </button>
      </div>
    </div>
  );
}
