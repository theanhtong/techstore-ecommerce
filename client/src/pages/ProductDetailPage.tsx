import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../api/client";
import { useCartStore } from "../store/useCartStore";
import { useAuthStore } from "../store/useAuthStore";
import { useForm } from "react-hook-form";
import { formatPrice } from "../utils/price";
import {
  ShoppingCart,
  ArrowLeft,
  Star,
  ShieldAlert,
  Check
} from "lucide-react";

interface Variant {
  id: string;
  sku: string;
  price: number;
  salePrice: number | null;
  weight: number | null;
  color: string | null;
  connectivity: string | null;
  cpu: string | null;
  ram: string | null;
  storage: string | null;
  display: string | null;
  gpu: string | null;
  os: string | null;
  battery: string | null;
  switchType: string | null;
  layout: string | null;
  formFactor: string | null;
  dpi: number | null;
  buttons: number | null;
  sensor: string | null;
  driverSize: string | null;
  frequency: string | null;
  microphone: boolean | null;
  inventory?: { quantity: number; reservedQuantity: number } | null;
  images?: { id: string; url: string; order: number }[];
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const addItem = useCartStore((state) => state.addItem);

  // Fetch product data
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const res = await client.get(`/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Fetch reviews data
  const { data: reviewsData } = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const res = await client.get(`/reviews/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { register, handleSubmit, reset, setValue } = useForm();

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [ratingValue, setRatingValue] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);

  const [searchParams] = useSearchParams();
  const variantParam = searchParams.get("variant");

  useEffect(() => {
    if (product?.variants?.length > 0) {
      const match = product.variants.find((v: any) => v.id === variantParam);
      if (match) {
        setSelectedVariantId(match.id);
      } else {
        setSelectedVariantId(product.variants[0].id);
      }
      setSelectedImageIndex(0);
      setQuantity(1);
    }
  }, [product, variantParam]);

  // Create review mutation
  const createReviewMutation = useMutation({
    mutationFn: async (data: any) => {
      return client.post("/reviews", {
        productId: id,
        rating: Number(data.rating),
        title: data.title || undefined,
        body: data.body || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", id] });
      reset({ rating: 5, title: "", body: "" });
      setRatingValue(5);
      setReviewError(null);
    },
    onError: (err: any) => {
      setReviewError(err.response?.data?.message || "Không thể đăng đánh giá.");
    },
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center font-medium text-ink/60 bg-white border border-gray-200 rounded-lg flex items-center justify-center gap-2">
        <span className="animate-spin rounded-full h-4 w-4 border-2 border-ink border-t-transparent"></span>
        Đang tải thông tin sản phẩm...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 border border-hazard/20 bg-hazard/5 rounded-lg text-sm text-hazard flex items-center gap-2">
        <ShieldAlert className="w-5 h-5" />
        Lỗi: Không tìm thấy sản phẩm này trên hệ thống.
        <div className="mt-4">
          <Link to="/products" className="underline font-bold">Quay lại danh mục</Link>
        </div>
      </div>
    );
  }

  const variants: Variant[] = product.variants || [];
  const activeVariant =
    variants.find((v) => v.id === selectedVariantId) || variants[0];

  const activeImages = activeVariant?.images || [];

  const handleAddToCart = async () => {
    if (!activeVariant) return;
    try {
      setCartSuccess(false);
      const details = {
        id: activeVariant.id,
        sku: activeVariant.sku,
        price: Number(activeVariant.price),
        salePrice: activeVariant.salePrice ? Number(activeVariant.salePrice) : null,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: product.status,
        },
        images: activeImages,
        inventory: activeVariant.inventory || { quantity: 99, reservedQuantity: 0 },
      };

      await addItem(activeVariant.id, quantity, details);
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const getVariantLabel = (v: Variant, index: number) => {
    const parts = [];
    if (v.color) parts.push(v.color);
    if (v.storage) parts.push(v.storage);
    if (v.ram) parts.push(`RAM ${v.ram}`);
    if (v.connectivity) parts.push(v.connectivity);
    if (v.layout) parts.push(v.layout);
    return parts.join(" / ") || `Cấu hình #${index + 1} (${v.sku})`;
  };

  // Compile variant specs details list
  const specList = activeVariant
    ? Object.entries(activeVariant)
      .filter(([key, val]) => {
        const excludedKeys = [
          "id",
          "sku",
          "price",
          "salePrice",
          "weight",
          "productId",
          "inventory",
          "createdAt",
          "updatedAt",
          "extras",
          "images",
        ];
        return !excludedKeys.includes(key) && val !== null && val !== undefined && val !== "";
      })
      .map(([key, val]) => ({
        name: key.replace(/([A-Z])/g, " $1"),
        value: String(val),
      }))
    : [];

  const reviews = reviewsData?.data || [];
  const filteredReviews = selectedStarFilter
    ? reviews.filter((r: any) => r.rating === selectedStarFilter)
    : reviews;

  const qtyAvailable = activeVariant?.inventory
    ? activeVariant.inventory.quantity - activeVariant.inventory.reservedQuantity
    : 0;

  // Star renderer helper
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
              }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-12">
      {/* Back link with arrow decoration */}
      <div className="text-sm font-semibold">
        <Link to="/products" className="text-ink/65 hover:text-hazard transition-colors flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Quay lại trang sản phẩm
        </Link>
      </div>

      {/* Hero Layout Configs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-gray-200 pb-12">
        {/* Left Image frame & Gallery */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {activeImages[selectedImageIndex]?.url ? (
              <img
                src={activeImages[selectedImageIndex].url}
                alt={product.name}
                className="object-contain w-full h-full p-8 transition-transform duration-300 hover:scale-105"
              />
            ) : (
              <span className="text-xs text-ink/30 font-medium">Không có hình ảnh</span>
            )}
          </div>
          {/* Thumbnails */}
          {activeImages.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {activeImages.map((img: any, idx: number) => (
                <button
                  key={img.id || idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-16 h-16 bg-gray-50 border rounded-md overflow-hidden flex items-center justify-center p-1.5 flex-shrink-0 cursor-pointer transition-all duration-200 ${selectedImageIndex === idx
                      ? "border-hazard ring-1 ring-hazard"
                      : "border-gray-200 hover:border-ink"
                    }`}
                >
                  <img
                    src={img.url}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    className="object-contain w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Details */}
        <div className="space-y-6">
          <div>
            <div className="text-xs font-bold text-ink/40 uppercase tracking-wider mb-2">
              {product.brand?.name || "Hãng sản xuất"} &bull; {product.category?.name || "Danh mục"}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink leading-tight">
              {product.name}
            </h1>
          </div>

          <div className="space-y-4 py-5 border-t border-b border-gray-100">
            <p className="text-sm text-ink/70 leading-relaxed">
              {product.description || "Không có thông tin mô tả chi tiết cho sản phẩm này."}
            </p>
            {product.campaign?.description && (
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3.5 text-xs text-hazard font-semibold leading-relaxed">
                Chương trình khuyến mãi: {product.campaign.description}
              </div>
            )}
          </div>

          {/* Pricing */}
          {activeVariant && (
            <div className="flex items-baseline gap-4">
              <span className="text-xs font-semibold text-ink/40 uppercase tracking-wider">Giá bán</span>
              {activeVariant.salePrice ? (
                <>
                  <span className="text-2xl font-bold text-hazard">
                    {formatPrice(activeVariant.salePrice)}
                  </span>
                  <span className="text-sm line-through text-ink/45">
                    {formatPrice(activeVariant.price)}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-ink">
                  {formatPrice(activeVariant.price)}
                </span>
              )}
            </div>
          )}

          {/* Variant checklist buttons */}
          {variants.length > 1 && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider">
                Chọn phiên bản cấu hình
              </label>
              <div className="flex flex-wrap gap-2.5">
                {variants.map((v, idx) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVariantId(v.id);
                      setSelectedImageIndex(0);
                      setQuantity(1);
                    }}
                    className={`border px-4 py-2.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${activeVariant.id === v.id
                        ? "bg-ink text-white border-ink"
                        : "border-gray-300 hover:border-ink"
                      }`}
                  >
                    {getVariantLabel(v, idx)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Availability tracker */}
          {activeVariant && (
            <div className="text-xs font-medium flex items-center gap-2">
              <span className="text-ink/40 uppercase tracking-wider">Trạng thái kho:</span>
              {qtyAvailable > 0 ? (
                <span className="text-emerald-600 font-bold">
                  Còn hàng ({qtyAvailable} sản phẩm có sẵn)
                </span>
              ) : (
                <span className="text-hazard font-bold">
                  Hết hàng tạm thời
                </span>
              )}
            </div>
          )}

          {/* Quantity selector control buttons */}
          {qtyAvailable > 0 && (
            <div className="flex items-center gap-4 py-2">
              <span className="text-xs font-semibold text-ink/50 uppercase tracking-wider">Số lượng:</span>
              <div className="flex items-center border border-gray-300 rounded-md bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3.5 py-1.5 hover:bg-gray-100 text-sm font-bold text-ink transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="px-4 text-xs font-extrabold text-ink min-w-[32px] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(qtyAvailable, quantity + 1))}
                  className="px-3.5 py-1.5 hover:bg-gray-100 text-sm font-bold text-ink transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Cart add CTA */}
          <div className="space-y-4 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={qtyAvailable <= 0}
              className={`w-full text-xs font-bold uppercase py-4 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-2 ${qtyAvailable > 0
                  ? "bg-ink text-substrate hover:bg-hazard"
                  : "bg-gray-100 text-ink/30 cursor-not-allowed"
                }`}
            >
              <ShoppingCart className="w-4 h-4" />
              {qtyAvailable > 0 ? "Thêm vào giỏ hàng" : "Hết hàng"}
            </button>

            {cartSuccess && (
              <div className="border border-emerald-200 bg-emerald-50 text-emerald-800 p-3 rounded-md text-xs text-center font-semibold flex items-center justify-center gap-1.5 animate-fadeIn">
                <Check className="w-4 h-4" />
                Đã thêm sản phẩm vào giỏ hàng thành công.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Specifications list table */}
      {specList.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-ink border-b border-gray-200 pb-2">
            Thông số kỹ thuật chi tiết
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 grid-blueprints border border-gray-200 rounded-lg overflow-hidden">
            {specList.map((spec, idx) => (
              <div key={idx} className="p-4 flex justify-between text-xs">
                <span className="text-ink/40 uppercase font-bold tracking-wider">{spec.name}</span>
                <span className="font-semibold text-ink uppercase">{spec.value}</span>
              </div>
            ))}
            {activeVariant?.weight && (
              <div className="p-4 flex justify-between text-xs">
                <span className="text-ink/40 uppercase font-bold tracking-wider">Trọng lượng</span>
                <span className="font-semibold text-ink uppercase">{activeVariant.weight}g</span>
              </div>
            )}
            <div className="p-4 flex justify-between text-xs">
              <span className="text-ink/40 uppercase font-bold tracking-wider">Mã sản phẩm (SKU)</span>
              <span className="font-mono font-semibold text-ink uppercase">{activeVariant.sku}</span>
            </div>
          </div>
        </div>
      )}

      {/* Customer Reviews block */}
      <div className="space-y-8 pt-6">
        <h3 className="text-lg font-bold text-ink border-b border-gray-200 pb-2">
          Đánh giá từ khách hàng
        </h3>

        {/* Submit Review Form on top */}
        {user ? (
          <div className="border border-gray-200 rounded-lg p-6 bg-substrate-dark space-y-4">
            <h4 className="text-sm font-bold text-ink border-b border-gray-100 pb-2">
              Viết đánh giá của bạn
            </h4>

            {reviewError && (
              <div className="border border-hazard/20 bg-hazard/5 p-3 rounded-md text-xs text-hazard">
                Lỗi: {reviewError}
              </div>
            )}

            <form onSubmit={handleSubmit((data) => createReviewMutation.mutate(data))} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-2">Đánh giá sao</label>
                <div className="flex items-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isHighlighted = hoverRating !== null ? star <= hoverRating : star <= ratingValue;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setRatingValue(star);
                          setValue("rating", star);
                        }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="cursor-pointer transition-colors p-0.5"
                      >
                        <Star
                          className={`w-6 h-6 ${isHighlighted
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300 hover:text-amber-350 transition-colors"
                            }`}
                        />
                      </button>
                    );
                  })}
                  <span className="text-xs text-ink/60 font-semibold ml-2">
                    {ratingValue === 5 && "(Rất tốt)"}
                    {ratingValue === 4 && "(Tốt)"}
                    {ratingValue === 3 && "(Bình thường)"}
                    {ratingValue === 2 && "(Kém)"}
                    {ratingValue === 1 && "(Rất kém)"}
                  </span>
                </div>
                {/* Hidden input for react-hook-form validation */}
                <input type="hidden" {...register("rating", { required: true, value: 5 })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wider mb-2">Ý kiến đóng góp chi tiết</label>
                <textarea
                  rows={3}
                  placeholder="Chia sẻ thêm trải nghiệm thực tế của bạn về sản phẩm này..."
                  className="w-full bg-white border border-gray-300 rounded-md p-3 text-xs outline-none focus:border-ink"
                  {...register("body")}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={createReviewMutation.isPending}
                className="bg-ink text-substrate text-xs font-bold uppercase px-6 py-3 rounded-md hover:bg-hazard hover:text-substrate transition-colors cursor-pointer"
              >
                {createReviewMutation.isPending ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </form>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-5 text-center text-xs text-ink/50 bg-gray-50/50">
            Vui lòng <Link to="/auth" className="text-hazard font-bold underline">đăng nhập</Link> để viết nhận xét cho sản phẩm này.
          </div>
        )}

        {/* Customer Reviews listing below */}
        {reviews.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4">
            <span className="text-xs text-ink/50 font-bold uppercase tracking-wider mr-2">Lọc theo đánh giá:</span>
            <button
              type="button"
              onClick={() => setSelectedStarFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${selectedStarFilter === null
                  ? "bg-ink text-white"
                  : "bg-gray-100 text-ink/70 hover:bg-gray-200"
                }`}
            >
              Tất cả ({reviews.length})
            </button>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r: any) => r.rating === star).length;
              return (
                <button
                  type="button"
                  key={star}
                  onClick={() => setSelectedStarFilter(star)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${selectedStarFilter === star
                      ? "bg-ink text-white"
                      : "bg-gray-100 text-ink/70 hover:bg-gray-200"
                    }`}
                >
                  <span>{star}</span>
                  <Star className={`w-3.5 h-3.5 ${selectedStarFilter === star ? "fill-white text-white" : "fill-amber-400 text-amber-400"}`} />
                  <span>({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="border border-gray-200 rounded-lg p-10 text-center text-xs text-ink/40 font-medium">
            Chưa có đánh giá nào cho sản phẩm này.
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="border border-gray-200 rounded-lg p-10 text-center text-xs text-ink/40 font-medium bg-gray-50/50">
            Không có đánh giá {selectedStarFilter} sao nào cho sản phẩm này.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((r: any) => (
              <div key={r.id} className="border border-gray-200 rounded-lg p-5 bg-white space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-ink">{r.user?.name || "Ẩn danh"}</span>
                    <span className="text-gray-300">|</span>
                    {renderStars(r.rating)}
                  </div>
                  <div className="text-[11px] text-ink/40">
                    {new Date(r.createdAt).toISOString().slice(0, 10)}
                  </div>
                </div>
                {r.title && <h5 className="font-bold text-sm text-ink">{r.title}</h5>}
                {r.body && <p className="text-xs text-ink/75 leading-relaxed">{r.body}</p>}

                {/* Admin replies */}
                {r.replies && r.replies.length > 0 && (
                  <div className="mt-3 ml-4 md:ml-6 space-y-2 border-t border-dashed border-gray-150 pt-3">
                    {r.replies.map((rep: any) => (
                      <div key={rep.id} className="bg-emerald-50/40 text-emerald-800 p-3 rounded-lg border border-emerald-100 leading-relaxed text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-[10px] text-emerald-700 uppercase tracking-wider">
                            Phản hồi từ cửa hàng
                          </span>
                          <span className="text-[10px] text-emerald-600 font-mono">
                            {new Date(rep.createdAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="font-medium text-ink/80">{rep.body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
