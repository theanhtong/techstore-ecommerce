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
    <div className="space-y-16 animate-fadeIn">
      {/* Hero Banner Section */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-ink via-ink to-neutral-900 text-white p-10 md:p-20 flex flex-col md:flex-row items-center justify-between gap-12 shadow-sm border border-neutral-800">
        <div className="space-y-6 max-w-xl z-10">
          <span className="bg-hazard/10 text-hazard border border-hazard/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
            Sự Kiện Đặc Biệt
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight uppercase">
            Nâng tầm trải nghiệm công nghệ
          </h1>
          <p className="text-sm text-neutral-300 leading-relaxed font-medium">
            Khám phá bộ sưu tập máy tính xách tay, điện thoại thông minh và phụ kiện chính hãng từ các nhà sản xuất hàng đầu thế giới. Cam kết chất lượng cao cấp với mức giá ưu đãi nhất dành riêng cho bạn.
          </p>
          <div className="pt-2">
            <Link
              to="/products"
              className="btn bg-white text-ink border-white hover:bg-hazard hover:border-hazard hover:text-white"
            >
              <span>Mua sắm ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <div className="w-full md:w-1/2 flex justify-center relative">
          {/* Elegant geometric glow graphic */}
          <div className="absolute w-64 h-64 bg-hazard/20 rounded-full blur-3xl -top-10 -left-10 animate-pulse pointer-events-none" />
          <svg viewBox="0 0 400 300" className="w-full max-w-xs text-neutral-700 select-none relative z-10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="40" y="30" width="320" height="220" rx="12" stroke="currentColor" />
            <path d="M40 210 h320" />
            <path d="M200 250 v30 M140 280 h120" strokeLinecap="round" />
            <circle cx="200" cy="120" r="45" className="text-hazard/80" strokeWidth="2.5" />
            <path d="M185 120 h30 M200 105 v30" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-150 p-6 rounded-xl flex items-start gap-4 shadow-2xs">
          <div className="bg-neutral-50 text-ink p-3 rounded-lg border border-gray-100 flex-shrink-0">
            <Truck className="w-5 h-5 text-hazard" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-ink">Giao hàng miễn phí</h4>
            <p className="text-xs text-ink/60 mt-1 leading-relaxed">Tự động áp dụng cho mọi hóa đơn thanh toán từ 500.000đ.</p>
          </div>
        </div>
        <div className="bg-white border border-gray-150 p-6 rounded-xl flex items-start gap-4 shadow-2xs">
          <div className="bg-neutral-50 text-ink p-3 rounded-lg border border-gray-100 flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-hazard" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-ink">Thanh toán an toàn</h4>
            <p className="text-xs text-ink/60 mt-1 leading-relaxed">Mã hóa bảo mật tuyệt đối qua cổng thanh toán VNPAY Online.</p>
          </div>
        </div>
        <div className="bg-white border border-gray-150 p-6 rounded-xl flex items-start gap-4 shadow-2xs">
          <div className="bg-neutral-50 text-ink p-3 rounded-lg border border-gray-100 flex-shrink-0">
            <PhoneCall className="w-5 h-5 text-hazard" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-ink">Hỗ trợ kỹ thuật 24/7</h4>
            <p className="text-xs text-ink/60 mt-1 leading-relaxed">Đội ngũ kỹ thuật viên luôn sẵn sàng giải đáp thắc mắc của bạn.</p>
          </div>
        </div>
      </div>

      {/* Categories Showcase */}
      <div className="space-y-6">
        <h3 className="text-sm font-extrabold text-ink uppercase tracking-widest">Danh mục nổi bật</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div 
            onClick={() => navigate("/products")}
            className="group bg-white border border-gray-200 hover:border-ink p-6 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 shadow-2xs"
          >
            <div className="space-y-3">
              <Laptop className="w-7 h-7 text-ink/60 group-hover:text-hazard transition-colors" />
              <h4 className="font-bold text-sm text-ink">Máy tính xách tay</h4>
            </div>
            <ArrowRight className="w-4 h-4 text-ink/40 group-hover:translate-x-1 transition-transform" />
          </div>
          <div 
            onClick={() => navigate("/products")}
            className="group bg-white border border-gray-200 hover:border-ink p-6 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 shadow-2xs"
          >
            <div className="space-y-3">
              <Smartphone className="w-7 h-7 text-ink/60 group-hover:text-hazard transition-colors" />
              <h4 className="font-bold text-sm text-ink">Điện thoại di động</h4>
            </div>
            <ArrowRight className="w-4 h-4 text-ink/40 group-hover:translate-x-1 transition-transform" />
          </div>
          <div 
            onClick={() => navigate("/products")}
            className="group bg-white border border-gray-200 hover:border-ink p-6 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-200 shadow-2xs"
          >
            <div className="space-y-3">
              <Headphones className="w-7 h-7 text-ink/60 group-hover:text-hazard transition-colors" />
              <h4 className="font-bold text-sm text-ink">Phụ kiện công nghệ</h4>
            </div>
            <ArrowRight className="w-4 h-4 text-ink/40 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-gray-150 pb-4">
          <h3 className="text-sm font-extrabold text-ink uppercase tracking-widest">Sản phẩm nổi bật</h3>
          <Link to="/products" className="text-xs font-bold text-hazard hover:underline uppercase tracking-wider">
            Xem tất cả &rarr;
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 bg-gray-100 border border-gray-200 rounded-xl animate-pulse"></div>
            ))}
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
                    className="group bg-white border border-gray-200 hover:border-ink p-5 rounded-xl flex flex-col justify-between hover:shadow-sm transition-all duration-250 relative"
                  >
                    <div>
                      <div className="aspect-square bg-neutral-50 rounded-lg flex items-center justify-center overflow-hidden mb-4 border border-neutral-100">
                        {imageUrl ? (
                          <img src={imageUrl} alt={displayName} className="object-contain p-4 w-full h-full group-hover:scale-[1.03] transition-transform duration-300" />
                        ) : (
                          <span className="text-xs text-ink/30 font-medium">Không có hình ảnh</span>
                        )}
                      </div>
                      <span className="text-[10px] text-ink/40 font-bold uppercase tracking-wider">
                        {p.brand?.name || "TechStore"}
                      </span>
                      <h4 className="font-bold text-sm text-ink group-hover:text-hazard transition-colors leading-snug mt-1 mb-2">
                        {displayName}
                      </h4>
                      {p.campaign?.description && (
                        <div className="bg-rose-50 border border-rose-100 rounded px-2.5 py-1 text-[10px] text-hazard font-bold uppercase tracking-wider mb-2">
                          Khuyến mãi: {p.campaign.description}
                        </div>
                      )}
                    </div>
                    <div className="border-t border-gray-100 pt-3 mt-4 flex justify-between items-center">
                      <span className="text-xs text-ink/40 font-medium">Giá bán</span>
                      <div>
                        {hasDiscount ? (
                          <div className="text-right">
                            <div className="text-[10px] line-through text-ink/40 font-medium">
                              {formatPrice(v.price)}
                            </div>
                            <div className="text-sm font-black text-hazard">
                              {formatPrice(v.salePrice!)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm font-black text-ink">
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
