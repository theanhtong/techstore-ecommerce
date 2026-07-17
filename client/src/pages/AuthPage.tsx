import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (verificationToken) {
      client
        .get(`/auth/verify-email?token=${verificationToken}`)
        .then((res) => {
          setVerifySuccess(res.data.message || "Xác thực địa chỉ Email thành công. Vui lòng đăng nhập.");
          setIsRegister(false);
          navigate("/auth", { replace: true });
        })
        .catch((err) => {
          setErrorMsg(err.response?.data?.message || "Xác thực Email thất bại hoặc mã xác thực đã hết hạn.");
        })
        .finally(() => {
          setVerifying(false);
        });
    }
  }, [verificationToken, navigate]);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const password = watch("password");

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
    <div className="p-8 max-w-lg mx-auto my-12 border border-gray-200 bg-white rounded-2xl space-y-6 shadow-2xs animate-fadeIn">
      {/* Title */}
      <div className="border-b border-gray-150 pb-5">
        <span className="text-xs text-ink/50 uppercase tracking-widest font-bold font-mono">Cổng tài khoản</span>
        <h1 className="text-2xl font-black text-ink mt-1 uppercase">
          {isRegister ? "Đăng ký tài khoản" : "Đăng nhập hệ thống"}
        </h1>
      </div>

      {/* Verify Success Alert */}
      {verifySuccess && (
        <div className="border border-emerald-200 bg-emerald-50 p-4 rounded-lg text-xs text-emerald-800 font-bold uppercase tracking-wider">
          {verifySuccess}
        </div>
      )}

      {/* Success Alert */}
      {successMsg && (
        <div className="border border-emerald-200 bg-emerald-50 p-4 rounded-lg text-xs text-emerald-800 font-bold uppercase tracking-wider leading-relaxed">
          {successMsg}
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="border border-hazard/20 bg-hazard/5 p-4 rounded-lg text-xs text-hazard font-bold uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isRegister && (
          <div>
            <label className="form-label">
              Họ và tên
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nhập họ và tên..."
                className="form-input bg-[#050505]/3"
                style={{ paddingLeft: "2.5rem" }}
                {...register("name", { required: "Họ và tên là bắt buộc" })}
              />
              <User className="w-4 h-4 text-ink/30 absolute left-3.5 top-3.5 z-10" />
            </div>
            {errors.name && (
              <p className="mt-1.5 text-xs text-hazard font-bold uppercase tracking-wider">{errors.name.message as string}</p>
            )}
          </div>
        )}

        <div>
          <label className="form-label">
            Địa chỉ Email
          </label>
          <div className="relative">
            <input
              type="email"
              placeholder="example@gmail.com"
              className="form-input bg-[#050505]/3"
              style={{ paddingLeft: "2.5rem" }}
              {...register("email", { required: "Địa chỉ Email là bắt buộc" })}
            />
            <Mail className="w-4 h-4 text-ink/30 absolute left-3.5 top-3.5 z-10" />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-hazard font-bold uppercase tracking-wider">{errors.email.message as string}</p>
          )}
        </div>

        <div>
          <label className="form-label">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              type="password"
              placeholder="••••••••"
              className="form-input bg-[#050505]/3"
              style={{ paddingLeft: "2.5rem" }}
              {...register("password", { required: "Mật khẩu là bắt buộc" })}
            />
            <KeyRound className="w-4 h-4 text-ink/30 absolute left-3.5 top-3.5 z-10" />
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-hazard font-bold uppercase tracking-wider">{errors.password.message as string}</p>
          )}
        </div>

        {isRegister && (
          <div>
            <label className="form-label">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                className="form-input bg-[#050505]/3"
                style={{ paddingLeft: "2.5rem" }}
                {...register("confirmPassword", {
                  required: "Xác nhận mật khẩu là bắt buộc",
                  validate: (value) =>
                    value === password || "Mật khẩu xác nhận không khớp",
                })}
              />
              <KeyRound className="w-4 h-4 text-ink/30 absolute left-3.5 top-3.5 z-10" />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-hazard font-bold uppercase tracking-wider">{errors.confirmPassword.message as string}</p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full btn-lg"
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
          className="text-xs text-ink/60 hover:text-hazard font-bold uppercase tracking-wider cursor-pointer"
        >
          {isRegister
            ? "Đã có tài khoản? Đăng nhập ngay"
            : "Chưa có tài khoản? Đăng ký tài khoản mới"}
        </button>
      </div>
    </div>
  );
}
