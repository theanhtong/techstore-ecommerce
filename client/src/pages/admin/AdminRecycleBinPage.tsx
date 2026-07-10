import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../api/client";
import { Trash2, RotateCcw, RefreshCw, Archive } from "lucide-react";

interface RecycleBinItem {
  id: string;
  name: string;
  type: 'product' | 'coupon' | 'brand' | 'category' | 'campaign';
  deletedAt: string;
  canDeletePermanently: boolean;
  daysRemaining: number;
}

export default function AdminRecycleBinPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: items = [], isLoading, refetch } = useQuery<RecycleBinItem[]>({
    queryKey: ["admin-recycle-bin"],
    queryFn: async () => {
      const res = await client.get("/admin/recycle-bin");
      return res.data;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      return client.post(`/admin/recycle-bin/${type}/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recycle-bin"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      alert("Khôi phục dữ liệu thành công!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Lỗi khi khôi phục dữ liệu.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      return client.delete(`/admin/recycle-bin/${type}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recycle-bin"] });
      alert("Đã xóa vĩnh viễn dữ liệu khỏi hệ thống!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || "Lỗi khi xóa vĩnh viễn.");
    },
  });

  const handleRestore = (item: RecycleBinItem) => {
    if (window.confirm(`Bạn có chắc chắn muốn khôi phục ${item.type} "${item.name}"?`)) {
      restoreMutation.mutate({ type: item.type, id: item.id });
    }
  };

  const handleDeletePermanently = (item: RecycleBinItem) => {
    if (!item.canDeletePermanently) {
      alert(`Không thể xóa vĩnh viễn! Mục này cần lưu giữ thêm ${item.daysRemaining} ngày để phục vụ kiểm toán.`);
      return;
    }
    if (window.confirm(`CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn XÓA VĨNH VIỄN ${item.type} "${item.name}"? Thao tác này không thể hoàn tác và dữ liệu sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.`)) {
      deleteMutation.mutate({ type: item.type, id: item.id });
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "product": return "Sản phẩm";
      case "coupon": return "Mã giảm giá";
      case "brand": return "Thương hiệu";
      case "category": return "Danh mục";
      case "campaign": return "Chiến dịch";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "product": return "bg-blue-100 text-blue-800";
      case "coupon": return "bg-purple-100 text-purple-800";
      case "brand": return "bg-amber-100 text-amber-800";
      case "category": return "bg-emerald-100 text-emerald-800";
      case "campaign": return "bg-rose-100 text-rose-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === "all") return true;
    return item.type === activeTab;
  });

  const tabs = [
    { id: "all", label: "Tất cả" },
    { id: "product", label: "Sản phẩm" },
    { id: "coupon", label: "Mã giảm giá" },
    { id: "brand", label: "Thương hiệu" },
    { id: "category", label: "Danh mục" },
    { id: "campaign", label: "Chiến dịch" },
  ];

  return (
    <div className="space-y-6 text-xs font-semibold">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <h2 className="text-lg font-bold text-ink uppercase tracking-wider flex items-center gap-2">
          <Archive className="w-5 h-5 text-hazard" /> Thùng rác hệ thống
        </h2>
        <button
          onClick={() => refetch()}
          className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Làm mới
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 border-b-2 font-bold cursor-pointer transition-colors ${activeTab === tab.id
              ? "border-hazard text-hazard"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-gray-500">Đang tải danh sách lưu trữ...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl text-gray-400 font-bold">
          Thùng rác trống. Không có dữ liệu ẩn/xóa mềm.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-3">Tên / Code</th>
                <th className="px-6 py-3">Phân loại</th>
                <th className="px-6 py-3">Ngày ẩn/Xóa mềm</th>
                <th className="px-6 py-3">Trạng thái kiểm toán (Chờ 30 ngày)</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredItems.map((item) => (
                <tr key={item.id + item.type} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-ink font-bold">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getTypeColor(item.type)}`}>
                      {getTypeName(item.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(item.deletedAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.canDeletePermanently ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-bold">
                        ● Có thể xóa vĩnh viễn (Đã lưu &gt; 30 ngày)
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1 font-bold">
                        ● Chờ đối soát (Còn lại {item.daysRemaining} ngày)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                    <button
                      onClick={() => handleRestore(item)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                      title="Khôi phục trạng thái hoạt động"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Khôi phục
                    </button>
                    <button
                      onClick={() => handleDeletePermanently(item)}
                      disabled={!item.canDeletePermanently}
                      className={`inline-flex items-center gap-1 text-xs font-bold transition-colors ${item.canDeletePermanently
                        ? "text-red-600 hover:text-red-800 cursor-pointer"
                        : "text-gray-300 cursor-not-allowed"
                        }`}
                      title={
                        item.canDeletePermanently
                          ? "Xóa hoàn toàn khỏi cơ sở dữ liệu"
                          : `Không thể xóa vĩnh viễn. Cần đợi thêm ${item.daysRemaining} ngày.`
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa vĩnh viễn
                    </button>
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
