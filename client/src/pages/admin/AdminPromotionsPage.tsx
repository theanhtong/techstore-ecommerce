import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../api/client";
import { useForm } from "react-hook-form";
import { Tag, Trash2, Edit2, Plus, X, RotateCcw } from "lucide-react";

export default function AdminPromotionsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Subform to add promotional targets
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [showScopeForm, setShowScopeForm] = useState(false);

  const { register: regMain, handleSubmit: handleMainSubmit, reset: resetMainForm, setValue: setMainValue } = useForm();
  const { register: regScope, handleSubmit: handleScopeSubmit, reset: resetScopeForm } = useForm();

  // Queries
  const { data: promotionsData, isLoading } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: async () => {
      const res = await client.get("/admin/promotions", { params: { limit: 100 } });
      return res.data;
    },
  });

  const { data: campaigns } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const res = await client.get("/campaigns", { params: { limit: 100 } });
      return res.data.data || res.data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await client.get("/categories", { params: { limit: 100 } });
      return res.data.data || res.data;
    },
  });

  const { data: brands } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const res = await client.get("/brands", { params: { limit: 100 } });
      return res.data.data || res.data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-min"],
    queryFn: async () => {
      const res = await client.get("/products", { params: { limit: 100 } });
      return res.data.data || res.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => client.post("/admin/promotions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      setShowForm(false);
      resetMainForm();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi tạo khuyến mãi."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => client.patch(`/admin/promotions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      setEditingId(null);
      setShowForm(false);
      resetMainForm();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi cập nhật khuyến mãi."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => client.delete(`/admin/promotions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Không thể xóa khuyến mãi."),
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => client.patch(`/admin/promotions/${id}`, { isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Không thể khôi phục khuyến mãi."),
  });

  const addScopeMutation = useMutation({
    mutationFn: async ({ promoId, data }: { promoId: string; data: any }) => {
      return client.post(`/admin/promotions/${promoId}/products`, data);
    },
    onSuccess: () => {
      setShowScopeForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
      resetScopeForm();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi áp dụng khuyến mãi."),
  });

  const deleteScopeMutation = useMutation({
    mutationFn: async ({ promoId, ppId }: { promoId: string; ppId: string }) => {
      return client.delete(`/admin/promotions/${promoId}/products/${ppId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi xóa đối tượng áp dụng."),
  });

  const handleEditClick = (p: any) => {
    setEditingId(p.id);
    setShowForm(true);
    setMainValue("name", p.name);
    setMainValue("description", p.description || "");
    setMainValue("campaignId", p.campaignId || "");
    setMainValue("priority", p.priority || 0);
    setMainValue("startsAt", p.startsAt ? p.startsAt.slice(0, 10) : "");
    setMainValue("endsAt", p.endsAt ? p.endsAt.slice(0, 10) : "");
    setMainValue("isActive", p.isActive);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");

  const promotions = promotionsData?.data || promotionsData || [];
  const campaignList = Array.isArray(campaigns) ? campaigns : [];
  const categoryList = Array.isArray(categories) ? categories : [];
  const brandList = Array.isArray(brands) ? brands : [];
  const productList = Array.isArray(products) ? products : [];

  const filteredPromotions = promotions.filter((p: any) => {
    if (campaignFilter && p.campaignId !== campaignFilter) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !(p.description || "").toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 text-xs font-semibold">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
          <Tag className="w-5 h-5 text-hazard" />
          Các chương trình khuyến mãi
        </h3>
        <button
          onClick={() => {
            setEditingId(null);
            resetMainForm();
            setShowForm(!showForm);
          }}
          className="bg-ink text-white hover:bg-hazard px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Đóng Form" : "Thêm khuyến mãi"}
        </button>
      </div>

      {/* Form Main Creation */}
      {showForm && (
        <form
          onSubmit={handleMainSubmit((data) => {
            const payload = {
              ...data,
              priority: Number(data.priority),
              isActive: data.isActive === "true" || data.isActive === true,
            };
            if (editingId) {
              updateMutation.mutate({ id: editingId, data: payload });
            } else {
              createMutation.mutate(payload);
            }
          })}
          className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 text-xs font-semibold shadow-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Tên khuyến mãi</label>
              <input type="text" required placeholder="Khuyến mãi ASUS" className="w-full bg-white border border-gray-300 rounded px-3 py-2" {...regMain("name", { required: true })} />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Chiến dịch liên kết</label>
              <select className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none" {...regMain("campaignId")}>
                <option value="">-- Không có chiến dịch --</option>
                {campaignList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Độ ưu tiên</label>
              <input type="number" min={0} className="w-full bg-white border border-gray-300 rounded px-3 py-2" {...regMain("priority")} />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Trạng thái</label>
              <select className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none" {...regMain("isActive")}>
                <option value="true">Kích hoạt</option>
                <option value="false">Tạm dừng</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-ink text-white hover:bg-hazard px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors">
              {editingId ? "Lưu thay đổi" : "Xác nhận tạo"}
            </button>
          </div>
        </form>
      )}

      {/* Scope Target Subform */}
      {showScopeForm && selectedPromotionId && (
        <form
          onSubmit={handleScopeSubmit((data) => {
            const payload = {
              productId: data.productId || undefined,
              categoryId: data.categoryId || undefined,
              brandId: data.brandId || undefined,
              discountType: "PERCENTAGE",
              discountValue: data.discountValue,
            };
            addScopeMutation.mutate({ promoId: selectedPromotionId, data: payload });
          })}
          className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 text-xs font-semibold shadow-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Mức giảm phần trăm (%)</label>
              <input type="number" required placeholder="E.g., 10" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5" {...regScope("discountValue", { required: true })} />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Theo sản phẩm cụ thể</label>
              <select className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 outline-none" {...regScope("productId")}>
                <option value="">-- Bỏ qua --</option>
                {productList.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Theo danh mục</label>
              <select className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 outline-none" {...regScope("categoryId")}>
                <option value="">-- Bỏ qua --</option>
                {categoryList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Theo thương hiệu</label>
              <select className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 outline-none" {...regScope("brandId")}>
                <option value="">-- Bỏ qua --</option>
                {brandList.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowScopeForm(false)} className="bg-white border border-gray-255 hover:border-ink px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors">Hủy</button>
            <button type="submit" className="bg-ink text-white hover:bg-hazard px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors">Xác nhận áp dụng</button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-gray-200 rounded-xl p-4 text-xs font-semibold">
        <div className="flex-grow">
          <label className="block text-ink/50 uppercase text-[9px] mb-1">Tìm kiếm khuyến mãi</label>
          <input
            type="text"
            placeholder="Tìm theo tên khuyến mãi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 outline-none font-medium"
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="block text-ink/50 uppercase text-[9px] mb-1">Chiến dịch</label>
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 outline-none"
          >
            <option value="">Tất cả chiến dịch</option>
            {campaignList.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {(searchTerm || campaignFilter) && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setCampaignFilter("");
              }}
              className="bg-gray-100 hover:bg-ink hover:text-white px-3 py-1.5 rounded transition-colors cursor-pointer text-[10px] uppercase font-bold"
            >
              Xóa lọc
            </button>
          </div>
        )}
      </div>

      {/* Main Table view */}
      {isLoading ? (
        <div className="text-center py-8 text-xs text-ink/40 font-medium">Đang tải danh sách...</div>
      ) : filteredPromotions.length === 0 ? (
        <div className="text-center py-8 text-xs text-ink/40 font-medium">Không tìm thấy khuyến mãi nào khớp bộ lọc.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 overflow-x-auto text-xs font-semibold">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-ink/45 uppercase tracking-wider font-bold">
                <th className="pb-3 pr-2">Tên chương trình</th>
                <th className="pb-3 pr-2">Chiến dịch</th>
                <th className="pb-3 pr-2">Ưu tiên</th>
                <th className="pb-3 pr-2">Đối tượng áp dụng</th>
                <th className="pb-3 pr-2 text-center">Trạng thái</th>
                <th className="pb-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink font-medium">
              {filteredPromotions.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50/50 align-top">
                  <td className="py-4 pr-2 font-bold">{p.name}</td>
                  <td className="py-4 pr-2">{p.campaign?.name || "N/A"}</td>
                  <td className="py-4 pr-2 text-ink/60">{p.priority || 0}</td>
                  <td className="py-4 pr-2 max-w-[250px]">
                    {p.promotionProducts && p.promotionProducts.length > 0 ? (
                      <div className="space-y-1 text-[11px] font-mono text-ink/65">
                        {p.promotionProducts.map((pp: any) => (
                          <div key={pp.id} className="flex justify-between items-center bg-gray-50 rounded px-1.5 py-0.5 border border-gray-100 mb-1">
                            <span>
                              Giảm {pp.discountValue}% ({
                                pp.scope === "PRODUCT" ? `SP: ${pp.product?.name || pp.productId?.slice(0,8)}` :
                                pp.scope === "CATEGORY" ? `DM: ${pp.category?.name || pp.categoryId?.slice(0,8)}` :
                                `Hãng: ${pp.brand?.name || pp.brandId?.slice(0,8)}`
                              })
                            </span>
                            <button
                              onClick={() => {
                                if (confirm("Gỡ bỏ đối tượng khuyến mãi này?")) {
                                  deleteScopeMutation.mutate({ promoId: p.id, ppId: pp.id });
                                }
                              }}
                              className="text-gray-400 hover:text-hazard ml-2 cursor-pointer font-bold"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-ink/40 font-medium">Chưa chọn đối tượng</span>
                    )}
                  </td>
                  <td className="py-4 pr-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${p.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                      {p.isActive ? "Hoạt động" : "Dừng"}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedPromotionId(p.id);
                          setShowScopeForm(true);
                        }}
                        className="border border-emerald-250 bg-emerald-50 hover:bg-emerald-100 text-emerald-850 px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        + Đối tượng
                      </button>
                      <button onClick={() => handleEditClick(p)} className="p-1 border border-gray-200 rounded hover:border-ink cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5 text-ink/60" />
                      </button>
                      {p.isActive ? (
                        <button
                          onClick={() => {
                            if (confirm(`Xóa khuyến mãi "${p.name}"?`)) {
                              deleteMutation.mutate(p.id);
                            }
                          }}
                          className="p-1 border border-gray-200 rounded hover:border-hazard cursor-pointer bg-white"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-hazard" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Khôi phục khuyến mãi "${p.name}"?`)) {
                              restoreMutation.mutate(p.id);
                            }
                          }}
                          className="p-1 border border-gray-200 rounded hover:border-emerald-500 cursor-pointer bg-white"
                          title="Khôi phục"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
