import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../api/client";
import { formatPrice } from "../../utils/price";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Trash2,
  Edit2,
  Upload,
  Star,
  Settings,
  Image as ImageIcon,
  X,
  Plus
} from "lucide-react";

export default function AdminProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Form toggle states
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // Specifications group toggles (Checkboxes)
  const [showGeneralSpecs, setShowGeneralSpecs] = useState(false);
  const [showComputerSpecs, setShowComputerSpecs] = useState(false);
  const [showInputSpecs, setShowInputSpecs] = useState(false);
  const [showAudioSpecs, setShowAudioSpecs] = useState(false);

  // Variant editing stock and images modals states
  const [activeInventoryModalVariant, setActiveInventoryModalVariant] = useState<any | null>(null);
  const [activeImagesModalVariant, setActiveImagesModalVariant] = useState<any | null>(null);
  const [modalStockQty, setModalStockQty] = useState<number>(0);
  const [priceDisplay, setPriceDisplay] = useState("");
  const [replyReviewId, setReplyReviewId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const { register, handleSubmit, reset, setValue } = useForm();

  useEffect(() => {
    register("price", { required: true });
  }, [register]);

  // Queries
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["admin-product-detail", id],
    queryFn: async () => {
      const res = await client.get(`/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["admin-product-reviews", id],
    queryFn: async () => {
      const res = await client.get(`/reviews/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  // Mutations
  const createVariantMutation = useMutation({
    mutationFn: async (data: any) => client.post(`/admin/products/${id}/variants`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-detail", id] });
      setShowVariantForm(false);
      setPriceDisplay("");
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi tạo phiên bản."),
  });

  const updateVariantMutation = useMutation({
    mutationFn: async ({ vid, data }: { vid: string; data: any }) => {
      return client.patch(`/admin/products/${id}/variants/${vid}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-detail", id] });
      setEditingVariantId(null);
      setShowVariantForm(false);
      setPriceDisplay("");
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi cập nhật phiên bản."),
  });

  const deleteVariantMutation = useMutation({
    mutationFn: async (vid: string) => client.delete(`/admin/products/${id}/variants/${vid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-detail", id] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Không thể xóa phiên bản."),
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ vid, quantity }: { vid: string; quantity: number }) => {
      return client.patch(`/admin/products/${id}/variants/${vid}/inventory`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-detail", id] });
      setActiveInventoryModalVariant(null);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi cập nhật kho."),
  });

  const deleteImageMutation = useMutation({
    mutationFn: async ({ vid, iid }: { vid: string; iid: string }) => {
      return client.delete(`/admin/products/${id}/variants/${vid}/images/${iid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-product-detail", id] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Không thể xóa hình ảnh."),
  });

  const createReplyMutation = useMutation({
    mutationFn: async ({ reviewId, body }: { reviewId: string; body: string }) => {
      return client.post(`/admin/reviews/${reviewId}/replies`, { body });
    },
    onSuccess: () => {
      setReplyReviewId(null);
      setReplyBody("");
      queryClient.invalidateQueries({ queryKey: ["admin-product-reviews", id] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi phản hồi nhận xét."),
  });

  // Action methods
  const handleEditClick = (v: any) => {
    setEditingVariantId(v.id);
    setShowVariantForm(true);

    setValue("sku", v.sku);
    setValue("price", v.price);
    setPriceDisplay(v.price ? new Intl.NumberFormat("vi-VN").format(Number(v.price)) : "");

    // Populate and open checked specs sections automatically based on values
    setValue("color", v.color || "");
    setValue("weight", v.weight || "");
    if (v.color || v.weight) setShowGeneralSpecs(true);

    setValue("cpu", v.cpu || "");
    setValue("ram", v.ram || "");
    setValue("storage", v.storage || "");
    setValue("os", v.os || "");
    setValue("battery", v.battery || "");
    if (v.cpu || v.ram || v.storage || v.os || v.battery) setShowComputerSpecs(true);

    setValue("switchType", v.switchType || "");
    setValue("layout", v.layout || "");
    setValue("formFactor", v.formFactor || "");
    setValue("dpi", v.dpi || "");
    setValue("buttons", v.buttons || "");
    setValue("sensor", v.sensor || "");
    if (v.switchType || v.layout || v.formFactor || v.dpi || v.buttons || v.sensor) setShowInputSpecs(true);

    setValue("driverSize", v.driverSize || "");
    setValue("frequency", v.frequency || "");
    setValue("microphone", v.microphone || false);
    if (v.driverSize || v.frequency || v.microphone) setShowAudioSpecs(true);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setPriceDisplay("");
      setValue("price", "");
      return;
    }
    const numeric = Number(raw);
    setPriceDisplay(new Intl.NumberFormat("vi-VN").format(numeric));
    setValue("price", numeric);
  };

  const handleImageUpload = async (vid: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const formData = new FormData();
    formData.append("file", file);

    try {
      await client.post(`/admin/products/${id}/variants/${vid}/images?altText=VariantImg&order=0`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      queryClient.invalidateQueries({ queryKey: ["admin-product-detail", id] });
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi tải ảnh lên.");
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-xs text-ink/55 font-semibold">Đang tải chi tiết sản phẩm...</div>;
  }

  if (error || !product) {
    return (
      <div className="p-8 text-center my-12 border border-hazard/20 bg-hazard/5 text-hazard font-semibold rounded-lg">
        Lỗi: Không tìm thấy sản phẩm này trên hệ thống.
      </div>
    );
  }

  const variants = product.variants || [];
  const reviews = reviewsData?.data || [];

  return (
    <div className="space-y-8 text-xs font-semibold">
      {/* Back button */}
      <div>
        <Link to="/admin/products" className="text-ink/65 hover:text-hazard transition-colors flex items-center gap-1.5 font-bold">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách sản phẩm
        </Link>
      </div>

      {/* Main info row */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
        <span className="text-[10px] text-ink/40 uppercase tracking-widest font-mono">Quản lý chi tiết</span>
        <h2 className="text-2xl font-black text-ink">{product.name}</h2>
        <div className="text-ink/50 text-[11px]">
          Danh mục: {product.category?.name || "N/A"} &bull; Hãng: {product.brand?.name || "N/A"} &bull; Slug: {product.slug}
        </div>
      </div>

      {/* Variants list */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4.5 h-4.5 text-hazard" />
            Các phiên bản cấu hình ({variants.length})
          </h4>
          <button
            onClick={() => {
              setEditingVariantId(null);
              setShowVariantForm(!showVariantForm);
              setPriceDisplay("");
              reset();
            }}
            className="bg-ink text-white hover:bg-hazard px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
          >
            {showVariantForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showVariantForm ? "Đóng Form" : "Thêm phiên bản"}
          </button>
        </div>

        {/* Variant form with dynamic spec checkbox selectors */}
        {showVariantForm && (
          <form
            onSubmit={handleSubmit((data) => {
              const rawPrice = String(data.price ?? priceDisplay ?? "").replace(/\D/g, "");
              // Clean payload attributes depending on checkbox toggles
              const payload: any = {
                sku: data.sku,
                price: rawPrice || "0",
              };

              if (showGeneralSpecs) {
                if (data.color) payload.color = data.color;
                if (data.weight) payload.weight = data.weight;
              }
              if (showComputerSpecs) {
                if (data.cpu) payload.cpu = data.cpu;
                if (data.ram) payload.ram = data.ram;
                if (data.storage) payload.storage = data.storage;
                if (data.os) payload.os = data.os;
                if (data.battery) payload.battery = data.battery;
              }
              if (showInputSpecs) {
                if (data.switchType) payload.switchType = data.switchType;
                if (data.layout) payload.layout = data.layout;
                if (data.formFactor) payload.formFactor = data.formFactor;
                if (data.dpi) payload.dpi = Number(data.dpi);
                if (data.buttons) payload.buttons = Number(data.buttons);
                if (data.sensor) payload.sensor = data.sensor;
              }
              if (showAudioSpecs) {
                if (data.driverSize) payload.driverSize = data.driverSize;
                if (data.frequency) payload.frequency = data.frequency;
                payload.microphone = !!data.microphone;
              }

              if (editingVariantId) {
                updateVariantMutation.mutate({ vid: editingVariantId, data: payload });
              } else {
                createVariantMutation.mutate(payload);
              }
            })}
            className="border border-gray-200 bg-white rounded-xl p-5 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-ink/50 uppercase text-[10px] mb-1">Mã SKU</label>
                <input type="text" required placeholder="E.g., HP-8GB-256GB" className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none" {...register("sku", { required: true })} />
              </div>
              <div>
                <label className="block text-ink/50 uppercase text-[10px] mb-1">Giá bán cơ bản (VND)</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., 5.000.000"
                  value={priceDisplay}
                  onChange={handlePriceChange}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none"
                />
              </div>
            </div>

            {/* Spec Checkboxes Selector Menu */}
            <div className="border-t border-b border-gray-100 py-3 space-y-2">
              <label className="block text-[10px] text-ink/40 uppercase tracking-wider mb-1.5 font-bold">Chọn các nhóm thông số kỹ thuật</label>
              <div className="flex flex-wrap gap-4 text-[11px] font-bold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showGeneralSpecs} onChange={(e) => setShowGeneralSpecs(e.target.checked)} className="rounded text-ink focus:ring-0" />
                  <span>Thông số chung (Màu, Nặng)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showComputerSpecs} onChange={(e) => setShowComputerSpecs(e.target.checked)} className="rounded text-ink focus:ring-0" />
                  <span>Thông số máy tính (CPU, RAM, Pin, OS)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showInputSpecs} onChange={(e) => setShowInputSpecs(e.target.checked)} className="rounded text-ink focus:ring-0" />
                  <span>Thông số phím chuột (Switch, DPI, Layout)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showAudioSpecs} onChange={(e) => setShowAudioSpecs(e.target.checked)} className="rounded text-ink focus:ring-0" />
                  <span>Thông số âm thanh (Màng loa, Mic)</span>
                </label>
              </div>
            </div>

            {/* Spec Inputs Groups conditionally rendered */}
            {showGeneralSpecs && (
              <div className="bg-gray-50 border border-gray-150 rounded-lg p-4 space-y-3">
                <h5 className="text-[10px] text-ink/50 uppercase tracking-wider font-bold">Thông số chung</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Màu sắc</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("color")} />
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Trọng lượng (kg/g)</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("weight")} />
                  </div>
                </div>
              </div>
            )}

            {showComputerSpecs && (
              <div className="bg-gray-50 border border-gray-150 rounded-lg p-4 space-y-3">
                <h5 className="text-[10px] text-ink/50 uppercase tracking-wider font-bold">Thông số máy tính</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Vi xử lý (CPU)</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("cpu")} />
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">RAM</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("ram")} />
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Bộ nhớ (Storage)</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("storage")} />
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Hệ điều hành</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("os")} />
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Dung lượng Pin</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("battery")} />
                  </div>
                </div>
              </div>
            )}

            {showInputSpecs && (
              <div className="bg-gray-50 border border-gray-150 rounded-lg p-4 space-y-3">
                <h5 className="text-[10px] text-ink/50 uppercase tracking-wider font-bold">Thông số bàn phím / chuột</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Switch Type</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("switchType")} />
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Bố cục phím (Layout)</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("layout")} />
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Form Factor</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("formFactor")} />
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Độ nhạy (DPI)</label>
                    <input type="number" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("dpi")} />
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Số nút bấm</label>
                    <input type="number" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("buttons")} />
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Cảm biến</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("sensor")} />
                  </div>
                </div>
              </div>
            )}

            {showAudioSpecs && (
              <div className="bg-gray-50 border border-gray-150 rounded-lg p-4 space-y-3">
                <h5 className="text-[10px] text-ink/50 uppercase tracking-wider font-bold">Thông số tai nghe & âm thanh</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Màng loa (Driver Size)</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("driverSize")} />
                  </div>
                  <div>
                    <label className="block text-[9px] text-ink/50 mb-1">Tần số phản hồi</label>
                    <input type="text" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...register("frequency")} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2 pt-2">
                    <input type="checkbox" id="mic-check" className="rounded text-ink focus:ring-0 cursor-pointer" {...register("microphone")} />
                    <label htmlFor="mic-check" className="cursor-pointer text-[10px] text-ink/65 uppercase tracking-wide">Có Tích hợp Microphone</label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVariantForm(false)}
                className="bg-white border border-gray-250 hover:border-ink px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button type="submit" className="bg-ink text-white hover:bg-hazard px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors">
                Xác nhận lưu
              </button>
            </div>
          </form>
        )}

        {/* Variants Data Table */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-ink/45 uppercase tracking-wider">
                <th className="pb-3 pr-2">SKU</th>
                <th className="pb-3 pr-2">Giá tiền</th>
                <th className="pb-3 pr-2">Thông số kỹ thuật</th>
                <th className="pb-3 pr-2">Tồn kho</th>
                <th className="pb-3 pr-2">Ảnh đại diện</th>
                <th className="pb-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink font-medium">
              {variants.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-50/50 align-top">
                  <td className="py-4 font-mono font-bold pr-2">{v.sku}</td>
                  <td className="py-4 font-bold text-hazard pr-2">{formatPrice(v.salePrice ?? v.price)}</td>
                  <td className="py-4 text-ink/65 pr-2 max-w-[240px]">
                    <div className="space-y-1">
                      {v.color && <div>Màu: <span className="font-bold text-ink">{v.color}</span></div>}
                      {v.cpu && <div>CPU: <span className="font-bold text-ink">{v.cpu}</span> &bull; RAM: <span className="font-bold text-ink">{v.ram}</span></div>}
                      {v.storage && <div>SSD: <span className="font-bold text-ink">{v.storage}</span></div>}
                      {v.switchType && <div>Switch: <span className="font-bold text-ink">{v.switchType}</span> &bull; Layout: <span className="font-bold text-ink">{v.layout}</span></div>}
                      {v.driverSize && <div>Driver: <span className="font-bold text-ink">{v.driverSize}</span></div>}
                    </div>
                  </td>
                  <td className="py-4 pr-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveInventoryModalVariant(v);
                        setModalStockQty(v.inventory?.quantity || 0);
                      }}
                      className="text-ink hover:text-hazard transition-colors font-bold underline cursor-pointer text-left"
                    >
                      Còn: {v.inventory?.quantity || 0}
                    </button>
                  </td>
                  <td className="py-4 pr-2">
                    <button
                      type="button"
                      onClick={() => setActiveImagesModalVariant(v)}
                      className="text-ink hover:text-hazard transition-colors font-bold underline cursor-pointer text-left flex items-center gap-1.5"
                    >
                      <ImageIcon className="w-4.5 h-4.5 text-ink/40" />
                      <span>{product.images?.filter((img: any) => img.variantId === v.id).length || 0} ảnh</span>
                    </button>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditClick(v)} className="p-1.5 border border-gray-250 bg-white rounded hover:border-ink cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5 text-ink/65" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Bạn chắc chắn muốn xóa phiên bản SKU "${v.sku}"?`)) {
                            deleteVariantMutation.mutate(v.id);
                          }
                        }}
                        className="p-1.5 border border-gray-250 bg-white rounded hover:border-hazard cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-hazard" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product reviews list with images if available */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 text-xs font-semibold">
        <h4 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-100">
          <Star className="w-4.5 h-4.5 text-hazard" />
          Nhận xét & Đánh giá của khách hàng ({reviews.length})
        </h4>

        {reviews.length === 0 ? (
          <div className="text-center py-6 text-ink/40 font-medium">Chưa có đánh giá nào cho sản phẩm này.</div>
        ) : (
          <div className="space-y-6">
            {reviews.map((r: any) => (
              <div key={r.id} className="border-b border-gray-100 pb-5 last:border-b-0 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-ink text-sm">{r.title || "Nhận xét"}</div>
                    <div className="text-[10px] text-ink/45 mt-0.5 font-medium">
                      Tác giả: <span className="font-bold text-ink/75">{r.user?.name}</span> ({r.user?.email}) &bull; Ngày: {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                  {/* Render star counts */}
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                </div>

                {r.body && (
                  <p className="text-ink/75 leading-relaxed bg-gray-50 p-3 border border-gray-100 rounded-lg font-medium">
                    {r.body}
                  </p>
                )}

                {/* Render Admin Replies */}
                {r.replies && r.replies.length > 0 && (
                  <div className="ml-6 space-y-2">
                    {r.replies.map((rep: any) => (
                      <div key={rep.id} className="bg-emerald-50/40 text-emerald-800 p-3 rounded-lg border border-emerald-100 leading-relaxed font-medium">
                        <div className="font-bold text-[9px] text-emerald-700 uppercase tracking-widest mb-1 font-sans">Phản hồi từ quản trị viên</div>
                        <div>{rep.body}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply action trigger and Form panel inline */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pl-1.5">
                    <button
                      onClick={() => {
                        setReplyReviewId(replyReviewId === r.id ? null : r.id);
                        setReplyBody("");
                      }}
                      className="text-[10px] font-bold text-ink/50 hover:text-hazard transition-colors cursor-pointer uppercase flex items-center gap-1"
                    >
                      Phản hồi
                    </button>
                  </div>

                  {replyReviewId === r.id && (
                    <div className="ml-6 space-y-2 max-w-lg">
                      <textarea
                        rows={2}
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        placeholder="Nhập phản hồi từ quản trị viên..."
                        className="w-full bg-white border border-gray-300 rounded-lg p-2 outline-none text-xs text-ink font-medium"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setReplyReviewId(null);
                            setReplyBody("");
                          }}
                          className="bg-white border border-gray-250 hover:border-ink px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => createReplyMutation.mutate({ reviewId: r.id, body: replyBody })}
                          disabled={createReplyMutation.isPending || !replyBody.trim()}
                          className="bg-ink text-white hover:bg-hazard px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          {createReplyMutation.isPending ? "Đang gửi..." : "Gửi"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inventory Edit Modal */}
      {activeInventoryModalVariant && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-xs font-semibold relative">
            <button
              type="button"
              onClick={() => setActiveInventoryModalVariant(null)}
              className="absolute top-4 right-4 text-ink/40 hover:text-ink cursor-pointer text-lg font-bold"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] text-ink/40 uppercase tracking-widest font-mono">Tồn kho biến thể</span>
              <h3 className="text-sm font-bold text-ink mt-0.5">Sửa số lượng kho SKU: {activeInventoryModalVariant.sku}</h3>
            </div>
            <div className="space-y-2">
              <label className="block text-ink/50 uppercase text-[9px]">Số lượng trong kho</label>
              <input
                type="number"
                min={0}
                value={modalStockQty}
                onChange={(e) => setModalStockQty(Number(e.target.value))}
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none text-center font-bold text-sm focus:border-ink"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveInventoryModalVariant(null)}
                className="bg-white border border-gray-250 hover:border-ink px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => updateStockMutation.mutate({ vid: activeInventoryModalVariant.id, quantity: modalStockQty })}
                className="bg-ink text-white hover:bg-hazard px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors"
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Images Manage Modal */}
      {activeImagesModalVariant && (
        <div className="fixed inset-0 z-55 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs font-semibold relative">
            <button
              type="button"
              onClick={() => setActiveImagesModalVariant(null)}
              className="absolute top-4 right-4 text-ink/40 hover:text-ink cursor-pointer text-lg font-bold"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] text-ink/40 uppercase tracking-widest font-mono">Quản lý hình ảnh</span>
              <h3 className="text-sm font-bold text-ink mt-0.5">Danh sách ảnh SKU: {activeImagesModalVariant.sku}</h3>
            </div>

            <div className="grid grid-cols-4 gap-3 max-h-[40vh] overflow-y-auto p-1">
              {product.images?.filter((img: any) => img.variantId === activeImagesModalVariant.id).map((img: any) => (
                <div key={img.id} className="relative group aspect-square border border-gray-200 rounded overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img src={img.url} alt="Variant" className="object-contain w-full h-full" />
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Xóa ảnh này của biến thể?")) {
                        deleteImageMutation.mutate({ vid: activeImagesModalVariant.id, iid: img.id });
                      }
                    }}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Empty state when no images */}
              {product.images?.filter((img: any) => img.variantId === activeImagesModalVariant.id).length === 0 && (
                <div className="col-span-4 text-center py-8 text-ink/45 bg-gray-50 border border-dashed border-gray-200 rounded">
                  Chưa có hình ảnh nào cho biến thể này.
                </div>
              )}
            </div>

            {/* Image upload zone */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <label className="block text-[9px] text-ink/50 uppercase tracking-wider font-bold font-sans">Tải ảnh mới lên</label>
              <label className="cursor-pointer border-2 border-dashed border-gray-300 hover:border-ink rounded-lg bg-gray-50/50 p-4 flex flex-col items-center justify-center text-ink/50 hover:text-ink transition-colors gap-1">
                <Upload className="w-5 h-5 text-ink/40" />
                <span className="text-[10px] font-bold">Chọn tệp hình ảnh để tải lên</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(activeImagesModalVariant.id, e)}
                />
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveImagesModalVariant(null)}
                className="bg-ink text-white hover:bg-hazard px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
