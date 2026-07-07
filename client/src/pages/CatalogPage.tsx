import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { client } from "../api/client";
import { formatPrice } from "../utils/price";
import { Search, SlidersHorizontal, Tag, AlertCircle } from "lucide-react";

interface ProductImage {
  id: string;
  url: string;
  variantId?: string | null;
}

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
  slug: string;
  description: string;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  images: ProductImage[];
  variants: ProductVariant[];
  campaign?: { id: string; name: string; description: string | null } | null;
}

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      const res = await client.get("/products", {
        params: { search: search || undefined, limit: 100 },
      });
      return res.data;
    },
  });

  const products: Product[] = data?.data || [];
  console.log(products);

  // Extract unique categories and brands dynamically from loaded products
  const categoriesMap = new Map<string, { id: string; name: string }>();
  const brandsMap = new Map<string, { id: string; name: string }>();

  products.forEach((p) => {
    if (p.category) categoriesMap.set(p.category.id, p.category);
    if (p.brand) brandsMap.set(p.brand.id, p.brand);
  });

  const categories = Array.from(categoriesMap.values());
  const brands = Array.from(brandsMap.values());

  // Apply filters locally on the client side
  const filteredProducts = products.filter((p) => {
    if (selectedCategory && p.category?.id !== selectedCategory) return false;
    if (selectedBrand && p.brand?.id !== selectedBrand) return false;
    return true;
  });


  return (
    <div className="space-y-8">
      {/* Title Header and Search Bar */}
      <div className="border-b border-gray-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-xs text-ink/50 uppercase tracking-widest font-mono">Danh mục</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink mt-1">
            Tất cả sản phẩm
          </h1>
        </div>

        {/* Search input with search icon decoration */}
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedCategory(null);
              setSelectedBrand(null);
            }}
            className="w-full bg-[#050505]/5 border border-gray-300 rounded-md pl-10 pr-4 py-2.5 text-sm outline-none focus:bg-white focus:border-ink transition-colors"
          />
          <Search className="w-4 h-4 text-ink/40 absolute left-3 top-3.5" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Filter Side Panel */}
        <div className="space-y-6">
          {/* Categories select checklist */}
          <div className="border border-gray-200 rounded-lg p-5 bg-white">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-hazard" />
              Danh mục sản phẩm
            </h3>
            <div className="space-y-2.5 text-sm">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`block w-full text-left cursor-pointer transition-colors ${selectedCategory === null ? "text-hazard font-semibold" : "text-ink/60 hover:text-ink"
                  }`}
              >
                Tất cả danh mục
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`block w-full text-left cursor-pointer transition-colors ${selectedCategory === c.id ? "text-hazard font-semibold" : "text-ink/60 hover:text-ink"
                    }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Brands list checklist */}
          <div className="border border-gray-200 rounded-lg p-5 bg-white">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-hazard" />
              Thương hiệu
            </h3>
            <div className="space-y-2.5 text-sm">
              <button
                onClick={() => setSelectedBrand(null)}
                className={`block w-full text-left cursor-pointer transition-colors ${selectedBrand === null ? "text-hazard font-semibold" : "text-ink/60 hover:text-ink"
                  }`}
              >
                Tất cả thương hiệu
              </button>
              {brands.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBrand(b.id)}
                  className={`block w-full text-left cursor-pointer transition-colors ${selectedBrand === b.id ? "text-hazard font-semibold" : "text-ink/60 hover:text-ink"
                    }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Filters button */}
          {(selectedCategory || selectedBrand) && (
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedBrand(null);
              }}
              className="w-full bg-gray-100 hover:bg-ink hover:text-substrate text-center text-xs font-bold py-3 rounded-md transition-colors uppercase cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Product Cards Grid Column */}
        <div className="md:col-span-3">
          {isLoading ? (
            <div className="border border-gray-200 rounded-lg p-12 text-center bg-white font-medium text-ink/60 flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-ink border-t-transparent"></span>
              Đang tải danh sách sản phẩm...
            </div>
          ) : error ? (
            <div className="border border-hazard/20 bg-hazard/5 p-6 rounded-lg text-sm text-hazard flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Không thể tải danh sách sản phẩm. Vui lòng thử lại.
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="border border-gray-200 rounded-lg p-12 text-center text-sm text-ink/40">
              Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.flatMap((p) =>
                (p.variants || []).map((v) => {
                  const variantImage = p.images?.find((img) => img.variantId === v.id);
                  const imageUrl = variantImage?.url;

                  const displayName = `${p.name} - ${v.sku}`;

                  const hasDiscount = v.salePrice !== null && v.salePrice < v.price;

                  return (
                    <Link
                      key={v.id}
                      to={`/product/${p.id}?variant=${v.id}`}
                      className="group bg-white border border-gray-200 hover:border-gray-400 rounded-lg p-5 flex flex-col justify-between hover:shadow-sm transition-all duration-200 relative"
                    >
                      <div>
                        {/* Image Frame */}
                        <div className="aspect-square bg-gray-50 rounded-md border border-gray-100 mb-4 flex items-center justify-center overflow-hidden">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={displayName}
                              className="object-contain w-full h-full p-4 group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <span className="text-xs text-ink/30 font-medium">Không có hình ảnh</span>
                          )}
                        </div>

                        {/* Info tags */}
                        <div className="flex justify-between items-center gap-2 mb-2 text-[10px] text-ink/40 font-bold uppercase tracking-wider">
                          <div>{p.brand?.name || "GENERIC"}</div>
                          <div>{p.category?.name || "UNCLASSIFIED"}</div>
                        </div>

                        {/* Name */}
                        <h4 className="font-bold text-sm text-ink group-hover:text-hazard transition-colors leading-snug mb-2">
                          {displayName}
                        </h4>

                        {/* Active Campaign banner */}
                        {p.campaign?.description && (
                          <div className="mb-4 bg-rose-50 border border-rose-100 rounded px-2.5 py-1 text-[11px] text-hazard font-semibold leading-normal">
                            Khuyến mãi: {p.campaign.description}
                          </div>
                        )}
                      </div>

                      {/* Pricing */}
                      <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                        <div className="text-xs text-ink/40 font-medium">Giá bán</div>
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
    </div>
  );
}
