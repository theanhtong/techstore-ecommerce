import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../api/client";
import { useForm } from "react-hook-form";
import { Award, Trash2, Edit2, Plus, X, RotateCcw } from "lucide-react";

export default function AdminBrandsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm();

  const { data: brandsData, isLoading } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const res = await client.get("/brands", { params: { limit: 100 } });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => client.post("/admin/brands", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      setShowForm(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi tạo thương hiệu."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => client.patch(`/admin/brands/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      setEditingId(null);
      setShowForm(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi cập nhật thương hiệu."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => client.delete(`/admin/brands/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Không thể xóa thương hiệu."),
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => client.patch(`/admin/brands/${id}`, { isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Không thể khôi phục thương hiệu."),
  });

  const handleEditClick = (b: any) => {
    setEditingId(b.id);
    setValue("name", b.name);
    setValue("slug", b.slug);
    setValue("description", b.description || "");
    setValue("logoUrl", b.logoUrl || "");
    setShowForm(true);
  };

  const brands = brandsData?.data || brandsData || [];

  return (
    <div className="space-y-6 text-xs font-semibold">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <h2 className="text-lg font-bold text-ink uppercase tracking-wider flex items-center gap-2">
          <Award className="w-5 h-5 text-hazard" /> Quản lý Thương hiệu
        </h2>
        <button
          onClick={() => {
            setEditingId(null);
            reset();
            setShowForm(!showForm);
          }}
          className="bg-ink text-white hover:bg-hazard px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Đóng Form" : "Thêm thương hiệu"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((data) => {
            if (editingId) {
              updateMutation.mutate({ id: editingId, data });
            } else {
              createMutation.mutate(data);
            }
          })}
          className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 max-w-md"
        >
          <h3 className="text-sm font-bold text-ink border-b border-gray-100 pb-2">
            {editingId ? "Cập nhật thương hiệu" : "Thêm mới thương hiệu"}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Tên thương hiệu</label>
              <input
                type="text"
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none focus:border-ink"
                {...register("name", { required: true })}
              />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Đường dẫn (Slug)</label>
              <input
                type="text"
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none focus:border-ink"
                {...register("slug", { required: true })}
              />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Mô tả ngắn</label>
              <textarea
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none focus:border-ink"
                rows={2}
                {...register("description")}
              />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[9px] mb-1">Logo URL (Tùy chọn)</label>
              <input
                type="text"
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none focus:border-ink"
                {...register("logoUrl")}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                reset();
              }}
              className="bg-white border border-gray-250 hover:border-ink px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-ink text-white hover:bg-hazard px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors"
            >
              Lưu
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-ink/55">Đang tải danh sách thương hiệu...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-ink/45 uppercase tracking-wider font-bold">
                <th className="pb-3 pr-2">Mã ID</th>
                <th className="pb-3 pr-2">Tên thương hiệu</th>
                <th className="pb-3 pr-2">Đường dẫn (Slug)</th>
                <th className="pb-3 pr-2">Mô tả</th>
                <th className="pb-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink font-medium">
              {brands.map((b: any) => (
                <tr key={b.id} className={`hover:bg-gray-50/50 ${!b.isActive ? "bg-gray-50/30 text-ink/40" : ""}`}>
                  <td className="py-3.5 pr-2 font-mono text-[10px] text-ink/40" title={b.id}>{b.id.slice(0, 8)}...</td>
                  <td className="py-3.5 pr-2 font-bold flex items-center gap-2">
                    <span>{b.name}</span>
                    {!b.isActive && (
                      <span className="text-[9px] bg-gray-100 border border-gray-200 text-ink/50 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono">Đã xóa</span>
                    )}
                  </td>
                  <td className="py-3.5 pr-2 font-mono text-ink/60">{b.slug}</td>
                  <td className="py-3.5 pr-2 text-ink/65 max-w-[250px] truncate" title={b.description}>{b.description || "N/A"}</td>
                  <td className="py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditClick(b)} className="p-1.5 border border-gray-200 rounded hover:border-ink cursor-pointer bg-white">
                        <Edit2 className="w-3.5 h-3.5 text-ink/60" />
                      </button>
                      {b.isActive ? (
                        <button
                          onClick={() => {
                            if (confirm(`Xóa thương hiệu "${b.name}"?`)) {
                              deleteMutation.mutate(b.id);
                            }
                          }}
                          className="p-1.5 border border-gray-200 rounded hover:border-hazard cursor-pointer bg-white"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-hazard" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Khôi phục thương hiệu "${b.name}"?`)) {
                              restoreMutation.mutate(b.id);
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
