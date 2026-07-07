import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../api/client";
import { useForm } from "react-hook-form";
import { Calendar, Trash2, Edit2, Plus, X, Eye, RotateCcw } from "lucide-react";

export default function AdminCampaignsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm();

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const res = await client.get("/campaigns", { params: { limit: 100 } });
      return res.data;
    },
  });

  const { data: campaignDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ["admin-campaign-detail", selectedCampaignId],
    queryFn: async () => {
      const res = await client.get(`/campaigns/${selectedCampaignId}`);
      return res.data;
    },
    enabled: !!selectedCampaignId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => client.post("/campaigns", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setShowForm(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi tạo chiến dịch."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => client.patch(`/campaigns/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setEditingId(null);
      setShowForm(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi cập nhật chiến dịch."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => client.delete(`/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Không thể xóa chiến dịch."),
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => client.patch(`/campaigns/${id}`, { isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Không thể khôi phục chiến dịch."),
  });

  const handleEditClick = (c: any) => {
    setEditingId(c.id);
    setShowForm(true);
    setValue("name", c.name);
    setValue("description", c.description || "");
    setValue("startsAt", c.startsAt ? c.startsAt.slice(0, 10) : "");
    setValue("endsAt", c.endsAt ? c.endsAt.slice(0, 10) : "");
    setValue("isActive", c.isActive);
  };

  const campaigns = campaignsData?.data || campaignsData || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-5 h-5 text-hazard" />
          Các chiến dịch khuyến mãi
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
          {showForm ? "Đóng Form" : "Thêm chiến dịch"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((data) => {
            const payload = {
              name: data.name,
              description: data.description || undefined,
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Tên chiến dịch</label>
              <input type="text" required placeholder="Sale hè rực rỡ" className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none" {...register("name", { required: true })} />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Hoạt động</label>
              <select className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none" {...register("isActive")}>
                <option value="true">Kích hoạt</option>
                <option value="false">Tạm dừng</option>
              </select>
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Ngày bắt đầu</label>
              <input type="date" className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none" {...register("startsAt")} />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Ngày kết thúc</label>
              <input type="date" className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none" {...register("endsAt")} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Mô tả chiến dịch</label>
              <textarea rows={2} placeholder="Nhập mô tả..." className="w-full bg-white border border-gray-300 rounded p-3 outline-none" {...register("description")}></textarea>
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
      ) : campaigns.length === 0 ? (
        <div className="text-center py-8 text-xs text-ink/40 font-medium">Không có chiến dịch nào.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 overflow-x-auto text-xs font-semibold">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-ink/45 uppercase tracking-wider font-bold">
                <th className="pb-3 pr-2">Mã ID</th>
                <th className="pb-3 pr-2">Tên chiến dịch</th>
                <th className="pb-3 pr-2">Ngày bắt đầu</th>
                <th className="pb-3 pr-2">Ngày kết thúc</th>
                <th className="pb-3 pr-2">Mô tả hiển thị</th>
                <th className="pb-3 pr-2">Trạng thái</th>
                <th className="pb-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink font-medium">
              {campaigns.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 pr-2 font-mono text-[10px] text-ink/40" title={c.id}>{c.id.slice(0, 8)}...</td>
                  <td className="py-3.5 pr-2">
                    <button
                      onClick={() => setSelectedCampaignId(c.id)}
                      className="font-bold text-ink hover:text-hazard transition-colors text-left underline cursor-pointer"
                    >
                      {c.name}
                    </button>
                  </td>
                  <td className="py-3.5 pr-2">{c.startsAt ? new Date(c.startsAt).toLocaleDateString() : "Chưa đặt"}</td>
                  <td className="py-3.5 pr-2">{c.endsAt ? new Date(c.endsAt).toLocaleDateString() : "Chưa đặt"}</td>
                  <td className="py-3.5 pr-2 text-ink/65 max-w-[200px] truncate" title={c.description}>{c.description || "N/A"}</td>
                  <td className="py-3.5 pr-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${c.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                      {c.isActive ? "Hoạt động" : "Dừng"}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedCampaignId(c.id)}
                        className="p-1.5 border border-gray-200 rounded hover:border-ink cursor-pointer"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-3.5 h-3.5 text-ink/60" />
                      </button>
                      <button onClick={() => handleEditClick(c)} className="p-1.5 border border-gray-200 rounded hover:border-ink cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5 text-ink/60" />
                      </button>
                      {c.isActive ? (
                        <button
                          onClick={() => {
                            if (confirm(`Xóa chiến dịch "${c.name}"?`)) {
                              deleteMutation.mutate(c.id);
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
                            if (confirm(`Khôi phục chiến dịch "${c.name}"?`)) {
                              restoreMutation.mutate(c.id);
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

      {/* Campaign Detail Modal overlay */}
      {selectedCampaignId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 text-xs font-semibold relative">
            <button
              onClick={() => setSelectedCampaignId(null)}
              className="absolute top-4 right-4 text-ink/40 hover:text-ink cursor-pointer text-xl font-bold"
            >
              &times;
            </button>

            {isDetailsLoading ? (
              <div className="text-center py-12 text-ink/50">Đang tải chi tiết chiến dịch...</div>
            ) : !campaignDetails ? (
              <div className="text-center py-12 text-hazard">Không tìm thấy thông tin chiến dịch.</div>
            ) : (
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] text-ink/40 uppercase tracking-widest font-mono">Thông tin chi tiết</span>
                  <h3 className="text-xl font-black text-ink mt-0.5">{campaignDetails.name}</h3>
                  {campaignDetails.description && (
                    <p className="text-ink/65 bg-gray-50 border border-gray-100 rounded p-2.5 mt-2 leading-relaxed font-medium">
                      {campaignDetails.description}
                    </p>
                  )}
                  <div className="mt-3 flex gap-4 text-ink/50 text-[11px]">
                    <span>Bắt đầu: <strong className="text-ink">{campaignDetails.startsAt ? new Date(campaignDetails.startsAt).toLocaleDateString() : "Chưa đặt"}</strong></span>
                    <span>Kết thúc: <strong className="text-ink">{campaignDetails.endsAt ? new Date(campaignDetails.endsAt).toLocaleDateString() : "Chưa đặt"}</strong></span>
                    <span>Trạng thái:
                      <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${campaignDetails.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                        }`}>
                        {campaignDetails.isActive ? "Hoạt động" : "Tạm dừng"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Promotions section */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-ink border-b border-gray-100 pb-1.5">
                    Chương trình khuyến mãi trực thuộc ({campaignDetails.promotions?.length || 0})
                  </h4>
                  {(!campaignDetails.promotions || campaignDetails.promotions.length === 0) ? (
                    <div className="text-center py-4 text-ink/40 bg-gray-50 rounded border border-dashed border-gray-200">
                      Không có chương trình khuyến mãi nào trực thuộc chiến dịch này.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-ink/50 uppercase text-[10px]">
                            <th className="p-2.5">Tên khuyến mãi</th>
                            <th className="p-2.5 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium text-ink">
                          {campaignDetails.promotions.map((p: any) => (
                            <tr key={p.id}>
                              <td className="p-2.5 font-bold">{p.name}</td>
                              <td className="p-2.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${p.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                                  }`}>
                                  {p.isActive ? "Hoạt động" : "Dừng"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Coupons section */}
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wider text-ink border-b border-gray-100 pb-1.5">
                    Mã giảm giá trực thuộc ({campaignDetails.coupons?.length || 0})
                  </h4>
                  {(!campaignDetails.coupons || campaignDetails.coupons.length === 0) ? (
                    <div className="text-center py-4 text-ink/40 bg-gray-50 rounded border border-dashed border-gray-200">
                      Không có mã giảm giá (coupon) nào trực thuộc chiến dịch này.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-ink/50 uppercase text-[10px]">
                            <th className="p-2.5">Mã Coupon</th>
                            <th className="p-2.5">Giá trị</th>
                            <th className="p-2.5">Lượt sử dụng</th>
                            <th className="p-2.5 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium text-ink">
                          {campaignDetails.coupons.map((c: any) => (
                            <tr key={c.id}>
                              <td className="p-2.5 font-mono font-bold">{c.code}</td>
                              <td className="p-2.5 text-hazard font-bold">Giảm {c.discountValue}%</td>
                              <td className="p-2.5 font-mono">
                                {c.usedCount} / {c.usageLimit || "Không giới hạn"}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${c.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"
                                  }`}>
                                  {c.isActive ? "Hoạt động" : "Dừng"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
