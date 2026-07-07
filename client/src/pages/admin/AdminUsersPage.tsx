import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../api/client";
import { Users } from "lucide-react";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await client.get("/admin/users", { params: { limit: 100 } });
      return res.data;
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return client.patch(`/admin/users/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi cập nhật trạng thái tài khoản."),
  });

  const users = usersData?.data || [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5 text-xs font-semibold">
      <h3 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
        <Users className="w-5 h-5 text-hazard" />
        Tài khoản & Phân quyền thành viên
      </h3>

      {isLoading ? (
        <div className="text-center py-8 text-xs text-ink/40">Đang tải...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-ink/45 uppercase tracking-wider font-bold">
                <th className="pb-3 pr-2">Họ tên</th>
                <th className="pb-3 pr-2">Email</th>
                <th className="pb-3 pr-2">Vai trò hệ thống</th>
                <th className="pb-3 pr-2">Ngày tham gia</th>
                <th className="pb-3 pr-2 text-center">Tình trạng</th>
                <th className="pb-3">Hành động khóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink font-medium">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 pr-2 font-bold">{u.name}</td>
                  <td className="py-3.5 pr-2 font-mono text-ink/65">{u.email}</td>
                  <td className="py-3.5 pr-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      u.role === "ADMIN" ? "bg-red-100 text-red-800" : u.role === "STAFF" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 pr-2 text-ink/60">{new Date(u.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td className="py-3.5 pr-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {u.isActive ? "Hoạt động" : "Bị khóa"}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <button
                      onClick={() => toggleUserStatusMutation.mutate({ id: u.id, isActive: !u.isActive })}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer uppercase ${
                        u.isActive ? "bg-red-50 text-red-850 hover:bg-red-100" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      }`}
                    >
                      {u.isActive ? "Khóa tài khoản" : "Kích hoạt"}
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
