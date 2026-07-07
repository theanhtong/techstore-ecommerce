import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../api/client";
import { useForm } from "react-hook-form";
import { Ticket, Trash2, Edit2, Plus, X, RotateCcw } from "lucide-react";

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm();

  // Queries
  const { data: couponsData, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const res = await client.get("/admin/coupons", { params: { limit: 100 } });
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

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => client.post("/admin/coupons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setShowForm(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi tạo Coupon."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => client.patch(`/admin/coupons/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setEditingId(null);
      setShowForm(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi cập nhật Coupon."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => client.delete(`/admin/coupons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Không thể xóa Coupon."),
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => client.patch(`/admin/coupons/${id}`, { isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Không thể khôi phục Coupon."),
  });

  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    setShowForm(true);
    setValue("code", item.code);
    setValue("campaignId", item.campaignId || "");
    setValue("discountType", item.discountType);
    setValue("discountValue", item.discountValue);
    setValue("minOrderValue", item.minOrderValue || "");
    setValue("maxDiscount", item.maxDiscount || "");
    setValue("usageLimit", item.usageLimit || "");
    setValue("perUserLimit", item.perUserLimit || "");
    setValue("startsAt", item.startsAt ? item.startsAt.slice(0, 10) : "");
    setValue("endsAt", item.endsAt ? item.endsAt.slice(0, 10) : "");
    setValue("isActive", item.isActive);
  };

  const coupons = couponsData?.data || couponsData || [];
  const campaignList = Array.isArray(campaigns) ? campaigns : [];

  return (
    <div className="space-y-6 text-xs font-semibold">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
          <Ticket className="w-5 h-5 text-hazard" />
          Mã giảm giá
        </h3>
        <button
          onClick={() => {
            setEditingId(null);
            reset();
            setShowForm(!showForm);
          }}
          className="bg-ink text-white hover:bg-hazard px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Đóng Form" : "Thêm coupon"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((data) => {
            const payload = {
              code: data.code,
              campaignId: data.campaignId || undefined,
              discountType: data.discountType,
              discountValue: data.discountValue,
              minOrderValue: data.minOrderValue || undefined,
              maxDiscount: data.maxDiscount || undefined,
              usageLimit: data.usageLimit ? Number(data.usageLimit) : undefined,
              perUserLimit: data.perUserLimit ? Number(data.perUserLimit) : undefined,
              startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : undefined,
              endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : undefined,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Mã Coupon (Code)</label>
              <input type="text" required placeholder="E.g., SALE20" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 outline-none" {...register("code", { required: true })} />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Loại giảm giá</label>
              <select className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 outline-none" {...register("discountType", { required: true })}>
                <option value="PERCENTAGE">Phần trăm (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Mức giảm</label>
              <input type="text" required placeholder="E.g., 20.00" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 outline-none" {...register("discountValue", { required: true })} />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Chiến dịch</label>
              <select className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 outline-none" {...register("campaignId")}>
                <option value="">-- Chọn chiến dịch --</option>
                {campaignList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Số lượt dùng tối đa</label>
              <input type="number" placeholder="E.g., 100" className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 outline-none" {...register("usageLimit")} />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Trạng thái</label>
              <select className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 outline-none" {...register("isActive")}>
                <option value="true">Hoạt động</option>
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

      {isLoading ? (
        <div className="text-center py-8 text-xs text-ink/40 font-medium">Đang tải danh sách...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-8 text-xs text-ink/40 font-medium">Không có coupon nào.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-ink/45 uppercase tracking-wider font-bold">
                <th className="pb-3 pr-2">Mã Coupon</th>
                <th className="pb-3 pr-2">Mức giảm</th>
                <th className="pb-3 pr-2">Chiến dịch</th>
                <th className="pb-3 pr-2">Lượt dùng</th>
                <th className="pb-3 pr-2 text-center">Trạng thái</th>
                <th className="pb-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink font-medium">
              {coupons.map((cp: any) => (
                <tr key={cp.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 pr-2 font-mono font-bold text-ink">{cp.code}</td>
                  <td className="py-3.5 pr-2 font-bold text-hazard">Giảm {cp.discountValue}%</td>
                  <td className="py-3.5 pr-2">{cp.campaign?.name || "N/A"}</td>
                  <td className="py-3.5 pr-2 font-mono text-ink/65">
                    Giới hạn: {cp.usageLimit || "Không giới hạn"}
                  </td>
                  <td className="py-3.5 pr-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${cp.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                      {cp.isActive ? "Hoạt động" : "Dừng"}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditClick(cp)} className="p-1.5 border border-gray-200 rounded hover:border-ink cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5 text-ink/60" />
                      </button>
                      {cp.isActive ? (
                        <button
                          onClick={() => {
                            if (confirm(`Xóa coupon mã "${cp.code}"?`)) {
                              deleteMutation.mutate(cp.id);
                            }
                          }}
                          className="p-1.5 border border-gray-200 rounded hover:border-hazard cursor-pointer bg-white"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-hazard" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Khôi phục coupon mã "${cp.code}"?`)) {
                              restoreMutation.mutate(cp.id);
                            }
                          }}
                          className="p-1.5 border border-gray-200 rounded hover:border-emerald-500 cursor-pointer bg-white"
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
