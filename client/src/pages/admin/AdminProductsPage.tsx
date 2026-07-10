import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../api/client";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { Package, Trash2, Edit2, Plus, X } from "lucide-react";

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm();

  // Queries
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await client.get("/products", { params: { limit: 100 } });
      return res.data;
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

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => client.post("/admin/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setShowForm(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi tạo sản phẩm."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => client.patch(`/admin/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setEditingId(null);
      setShowForm(false);
      reset();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi cập nhật sản phẩm."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => client.delete(`/admin/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Không thể xóa sản phẩm."),
  });

  const handleEditClick = (product: any) => {
    setEditingId(product.id);
    setShowForm(true);
    setValue("name", product.name);
    setValue("slug", product.slug);
    setValue("description", product.description || "");
    setValue("categoryId", product.categoryId);
    setValue("brandId", product.brandId);
  };

  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterBrand, setFilterBrand] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const rawProducts = productsData?.data || [];
  const categoryList = Array.isArray(categories) ? categories : [];
  const brandList = Array.isArray(brands) ? brands : [];

  const filteredProducts = rawProducts.filter((p: any) => {
    if (filterCategory && p.categoryId !== filterCategory) return false;
    if (filterBrand && p.brandId !== filterBrand) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.slug.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
          <Package className="w-5 h-5 text-hazard" />
          Quản lý sản phẩm
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
          {showForm ? "Đóng Form" : "Thêm sản phẩm"}
        </button>
      </div>

      {/* Form inline */}
      {showForm && (
        <form
          onSubmit={handleSubmit((data) => {
            if (editingId) {
              updateMutation.mutate({ id: editingId, data });
            } else {
              createMutation.mutate({ ...data, status: "ACTIVE" });
            }
          })}
          className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 text-xs font-semibold shadow-xs"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Tên sản phẩm</label>
              <input type="text" required placeholder="E.g., Laptop ASUS Zenbook" className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none" {...register("name", { required: true })} />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Slug</label>
              <input type="text" required placeholder="laptop-asus-zenbook" className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none" {...register("slug", { required: true })} />
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Danh mục</label>
              <select required className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none" {...register("categoryId", { required: true })}>
                <option value="">-- Chọn danh mục --</option>
                {categoryList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Thương hiệu</label>
              <select required className="w-full bg-white border border-gray-300 rounded px-3 py-2 outline-none" {...register("brandId", { required: true })}>
                <option value="">-- Chọn thương hiệu --</option>
                {brandList.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-ink/50 uppercase text-[10px] mb-1">Mô tả sản phẩm</label>
              <textarea rows={3} placeholder="Nhập mô tả sản phẩm..." className="w-full bg-white border border-gray-300 rounded p-3 outline-none" {...register("description")}></textarea>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-ink text-white hover:bg-hazard px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors">
              {editingId ? "Lưu thay đổi" : "Xác nhận tạo"}
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-gray-200 rounded-xl p-4 text-xs font-semibold">
        <div className="flex-grow">
          <label className="block text-ink/50 uppercase text-[9px] mb-1">Tìm kiếm sản phẩm</label>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 outline-none font-medium"
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="block text-ink/50 uppercase text-[9px] mb-1">Danh mục</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 outline-none"
          >
            <option value="">Tất cả danh mục</option>
            {categoryList.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-48">
          <label className="block text-ink/50 uppercase text-[9px] mb-1">Thương hiệu</label>
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 outline-none"
          >
            <option value="">Tất cả thương hiệu</option>
            {brandList.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        {(searchTerm || filterCategory || filterBrand) && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setFilterCategory("");
                setFilterBrand("");
              }}
              className="bg-gray-100 hover:bg-ink hover:text-white px-3 py-1.5 rounded transition-colors cursor-pointer text-[10px] uppercase font-bold"
            >
              Xóa lọc
            </button>
          </div>
        )}
      </div>

      {/* Main HTML Table */}
      {isLoading ? (
        <div className="text-center py-8 text-xs text-ink/40 font-medium">Đang tải danh sách sản phẩm...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8 text-xs text-ink/40 font-medium">Không tìm thấy sản phẩm nào khớp bộ lọc.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 overflow-x-auto text-xs font-semibold">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-ink/45 uppercase tracking-wider font-bold">
                <th className="pb-3 pr-2">Mã sản phẩm</th>
                <th className="pb-3 pr-2">Tên sản phẩm (Quản lý chi tiết)</th>
                <th className="pb-3 pr-2">Đường dẫn (Slug)</th>
                <th className="pb-3 pr-2">Danh mục</th>
                <th className="pb-3 pr-2">Thương hiệu</th>
                <th className="pb-3 pr-2 text-center">Phiên bản</th>
                <th className="pb-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink font-medium">
              {filteredProducts.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 pr-2 font-mono text-[10px] text-ink/40" title={p.id}>
                    {p.id.slice(0, 8)}...
                  </td>
                  <td className="py-3.5 pr-2">
                    <Link to={`/admin/products/${p.id}`} className="font-bold text-ink hover:text-hazard transition-colors underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-3.5 pr-2 font-mono text-ink/60">{p.slug}</td>
                  <td className="py-3.5 pr-2">{p.category?.name || "N/A"}</td>
                  <td className="py-3.5 pr-2">{p.brand?.name || "N/A"}</td>
                  <td className="py-3.5 pr-2 text-center font-bold text-ink/50">
                    {p.variants?.length || 0}
                  </td>
                  <td className="py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditClick(p)} className="p-1 border border-gray-200 rounded hover:border-ink cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5 text-ink/60" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Xóa sản phẩm "${p.name}"?`)) {
                            deleteMutation.mutate(p.id);
                          }
                        }}
                        className="p-1 border border-gray-200 rounded hover:border-hazard cursor-pointer"
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
      )}
    </div>
  );
}
