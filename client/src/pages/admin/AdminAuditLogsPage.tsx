import { useQuery } from "@tanstack/react-query";
import { client } from "../../api/client";
import { ShieldCheck } from "lucide-react";

export default function AdminAuditLogsPage() {
  const { data: auditlogs, isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const res = await client.get("/admin/audit-logs", { params: { limit: 100 } });
      return res.data;
    },
  });

  const logsList = Array.isArray(auditlogs) ? auditlogs : auditlogs?.data || [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5 text-xs font-semibold">
      <h3 className="text-sm font-bold text-ink uppercase tracking-wider border-b border-gray-100 pb-2 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-hazard" />
        Nhật ký hệ thống
      </h3>

      {isLoading ? (
        <div className="text-center py-8 text-xs text-ink/40">Đang tải...</div>
      ) : logsList.length === 0 ? (
        <div className="text-center py-8 text-xs text-ink/40">Chưa ghi nhận hoạt động hệ thống nào.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-ink/45 uppercase tracking-wider font-bold">
                <th className="pb-3 pr-2">Thời gian</th>
                <th className="pb-3 pr-2">Hành động</th>
                <th className="pb-3 pr-2">Đối tượng</th>
                <th className="pb-3 pr-2">Mã đối tượng ID</th>
                <th className="pb-3">Người thực hiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-ink font-medium font-mono text-[11px]">
              {logsList.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50/50">
                  <td className="py-3 pr-2 whitespace-nowrap text-ink/45">
                    {new Date(log.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="py-3 pr-2 font-bold text-hazard">
                    [{log.action}]
                  </td>
                  <td className="py-3 pr-2 text-ink/60">
                    {log.entityType}
                  </td>
                  <td className="py-3 pr-2 text-ink/45 text-[10px]" title={log.entityId}>
                    {log.entityId}
                  </td>
                  <td className="py-3 text-ink font-sans">
                    {log.user?.email || "Chưa xác định"}
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
