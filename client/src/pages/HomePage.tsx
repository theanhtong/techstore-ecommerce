import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { client } from "../api/client";
import { formatPrice } from "../utils/price";
import { 
  ArrowRight, 
  Laptop, 
  Smartphone, 
  Headphones, 
  ShieldCheck, 
  Truck, 
  PhoneCall 
} from "lucide-react";

interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  salePrice: number | null;
  color?: string | null;
  storage?: string | null;
  ram?: string | null;
  connectivity?: string | null;
  layout?: string | null;
}

interface Product {
  id: string;
  name: string;
  images: { id: string; url: string; variantId?: string | null }[];
  variants: ProductVariant[];
  brand?: { id: string; name: string } | null;
  campaign?: { id: string; name: string; description: string | null } | null;
}

export default function HomePage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const res = await client.get("/products", { params: { limit: 4 } });
      return res.data;
    },
  });

  const products: Product[] = data?.data || [];



  return (
    <div className="space-y-16">
      {/* Hero Banner Section */}
      <div className="relative rounded-2xl overflow-hidden bg-ink text-white p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-6 max-w-xl">
          <span className="bg-hazard/10 text-hazard border border-hazard/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            Sự Kiện Đặc Biệt
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Nâng tầm trải nghiệm công nghệ cao cấp
          </h1>
          <p className="text-sm text-gray-300 leading-relaxed">
            Khám phá bộ sưu tập máy tính xách tay, điện thoại thông minh và phụ kiện chính hãng với cấu hình telemetry chuẩn xác nhất. Ưu đãi độc quyền chỉ dành riêng cho bạn.
          </p>
          <div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 bg-white text-ink px-6 py-3.5 rounded-lg text-sm font-bold hover:bg-hazard hover:text-white transition-colors cursor-pointer"
            >
              Mua sắm ngay
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex justify-center">
          {/* Decorative Minimal SVG Mockup */}
          <svg viewBox="0 0 400 300" className="w-full max-w-xs text-gray-700" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="50" y="40" width="300" height="200" rx="10" />
            <path d="M50 210 h300 M200 240 v30 M150 270 h100" />
            <circle cx="200" cy="120" r="40" className="text-hazard animate-pulse" strokeWidth="3" />
            <path d="M180 120 h40 M200 100 v40" />
          </svg>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 p-6 rounded-xl flex items-start gap-4">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-ink">Giao hàng miễn phí</h4>
            <p className="text-xs text-ink/60 mt-1">Áp dụng tự động cho mọi hóa đơn thanh toán trên 500.000đ.</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-xl flex items-start gap-4">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-ink">Thanh toán an toàn</h4>
            <p className="text-xs text-ink/60 mt-1">Mã hóa bảo mật tuyệt đối qua cổng thanh toán VNPAY Online.</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-xl flex items-start gap-4">
          <div className="bg-rose-50 text-hazard p-3 rounded-lg">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-ink">Hỗ trợ kỹ thuật 24/7</h4>
            <p className="text-xs text-ink/60 mt-1">Đội ngũ kỹ thuật viên luôn sẵn sàng giải đáp thắc mắc của bạn.</p>
          </div>
        </div>
      </div>

      {/* Categories Showcase */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-ink">Khám phá danh mục nổi bật</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div 
            onClick={() => navigate("/products")}
            className="group bg-white border border-gray-200 hover:border-ink p-6 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="space-y-2">
              <Laptop className="w-8 h-8 text-ink/60 group-hover:text-hazard transition-colors" />
              <h4 className="font-bold text-sm text-ink">Máy tính xách tay</h4>
            </div>
            <ArrowRight className="w-4 h-4 text-ink/40 group-hover:translate-x-1 transition-transform" />
          </div>
          <div 
            onClick={() => navigate("/products")}
            className="group bg-white border border-gray-200 hover:border-ink p-6 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="space-y-2">
              <Smartphone className="w-8 h-8 text-ink/60 group-hover:text-hazard transition-colors" />
              <h4 className="font-bold text-sm text-ink">Điện thoại di động</h4>
            </div>
            <ArrowRight className="w-4 h-4 text-ink/40 group-hover:translate-x-1 transition-transform" />
          </div>
          <div 
            onClick={() => navigate("/products")}
            className="group bg-white border border-gray-200 hover:border-ink p-6 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="space-y-2">
              <Headphones className="w-8 h-8 text-ink/60 group-hover:text-hazard transition-colors" />
              <h4 className="font-bold text-sm text-ink">Phụ kiện công nghệ</h4>
            </div>
            <ArrowRight className="w-4 h-4 text-ink/40 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-gray-100 pb-4">
          <h3 className="text-xl font-bold text-ink">Sản phẩm nổi bật</h3>
          <Link to="/products" className="text-xs font-semibold text-hazard hover:underline">
            Xem tất cả &rarr;
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>
            <div className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>
            <div className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>
            <div className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.flatMap((p) =>
              (p.variants || []).map((v) => {
                const variantImage = p.images?.find((img) => img.variantId === v.id);
                const imageUrl = variantImage?.url;

                const displayName = `${p.name} - ${v.sku}`;

                const hasDiscount = v.salePrice !== null && v.salePrice < v.price;

                return (
                  <Link
                    key={v.id}
                    to={`/product/${p.id}?variant=${v.id}`}
                    className="group bg-white border border-gray-200 hover:border-gray-400 p-5 rounded-xl flex flex-col justify-between transition-colors relative"
                  >
                    <div>
                      <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden mb-4">
                        {imageUrl ? (
                          <img src={imageUrl} alt={displayName} className="object-contain p-4 w-full h-full group-hover:scale-105 transition-transform" />
                        ) : (
                          <span className="text-xs text-ink/30">Không có hình ảnh</span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-ink group-hover:text-hazard transition-colors leading-snug mb-2">
                        {displayName}
                      </h4>
                      {p.campaign?.description && (
                        <div className="bg-rose-50 border border-rose-100 rounded px-2.5 py-1 text-[11px] text-hazard font-semibold leading-normal mb-2">
                          Khuyến mãi: {p.campaign.description}
                        </div>
                      )}
                    </div>
                    <div className="border-t border-gray-100 pt-3 mt-4 flex justify-between items-center">
                      <span className="text-xs text-ink/40">Giá bán</span>
                      <div>
                        {hasDiscount ? (
                          <div className="text-right">
                            <div className="text-[11px] line-through text-ink/40 font-medium">
                              {formatPrice(v.price)}
                            </div>
                            <div className="text-sm font-bold text-hazard">
                              {formatPrice(v.salePrice!)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-ink">
                            {formatPrice(v.price)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
