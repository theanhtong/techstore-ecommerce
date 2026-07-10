import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "../../api/client";
import { Star, Trash2, MessageSquare } from "lucide-react";

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [replyReviewId, setReplyReviewId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "UNREPLIED" | "REPLIED">("ALL");

  // Query
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const res = await client.get("/admin/reviews", { params: { limit: 100 } });
      return res.data;
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => client.delete(`/admin/reviews/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi ẩn nhận xét."),
  });

  const createReplyMutation = useMutation({
    mutationFn: async ({ reviewId, body }: { reviewId: string; body: string }) => {
      return client.post(`/admin/reviews/${reviewId}/replies`, { body });
    },
    onSuccess: () => {
      setReplyReviewId(null);
      setReplyBody("");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Lỗi khi phản hồi nhận xét."),
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");

  const allReviews = reviewsData?.data || [];

  // Filter logic
  const filteredReviews = allReviews.filter((r: any) => {
    const hasReplies = r.replies && r.replies.length > 0;
    if (filterTab === "UNREPLIED") return !hasReplies;
    if (filterTab === "REPLIED") return hasReplies;
    return true;
  }).filter((r: any) => {
    if (ratingFilter && r.rating !== Number(ratingFilter)) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchComment = r.comment?.toLowerCase().includes(searchLower);
      const matchProductName = r.variant?.product?.name?.toLowerCase().includes(searchLower);
      const matchUserName = r.user?.name?.toLowerCase().includes(searchLower);
      if (!matchComment && !matchProductName && !matchUserName) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 text-xs font-semibold">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-200 pb-4 gap-4">
        <h2 className="text-lg font-bold text-ink uppercase tracking-wider flex items-center gap-2">
          <Star className="w-5 h-5 text-hazard" /> Quản lý nhận xét & Đánh giá
        </h2>
        
        {/* Filter Controls */}
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 self-start">
          <button
            onClick={() => setFilterTab("ALL")}
            className={`px-3 py-1.5 rounded-md font-bold cursor-pointer transition-all ${
              filterTab === "ALL"
                ? "bg-white text-ink shadow-xs"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            Tất cả ({allReviews.length})
          </button>
          <button
            onClick={() => setFilterTab("UNREPLIED")}
            className={`px-3 py-1.5 rounded-md font-bold cursor-pointer transition-all ${
              filterTab === "UNREPLIED"
                ? "bg-white text-ink shadow-xs"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            Chưa phản hồi ({allReviews.filter((r: any) => !r.replies || r.replies.length === 0).length})
          </button>
          <button
            onClick={() => setFilterTab("REPLIED")}
            className={`px-3 py-1.5 rounded-md font-bold cursor-pointer transition-all ${
              filterTab === "REPLIED"
                ? "bg-white text-ink shadow-xs"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            Đã phản hồi ({allReviews.filter((r: any) => r.replies && r.replies.length > 0).length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-gray-200 rounded-xl p-4 text-xs font-semibold">
        <div className="flex-grow">
          <label className="block text-ink/50 uppercase text-[9px] mb-1">Tìm kiếm đánh giá</label>
          <input
            type="text"
            placeholder="Tìm theo bình luận, tên sản phẩm, khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 outline-none font-medium"
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="block text-ink/50 uppercase text-[9px] mb-1">Số sao</label>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 outline-none"
          >
            <option value="">Tất cả số sao</option>
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>
        </div>
        {(searchTerm || ratingFilter) && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setRatingFilter("");
              }}
              className="bg-gray-100 hover:bg-ink hover:text-white px-3 py-1.5 rounded transition-colors cursor-pointer text-[10px] uppercase font-bold"
            >
              Xóa lọc
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-ink/55">Đang tải danh sách đánh giá...</div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-ink/40">
          Không tìm thấy nhận xét nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((r: any) => {
            const hasReplies = r.replies && r.replies.length > 0;
            return (
              <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-2xs hover:border-gray-300 transition-all">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-ink/40 uppercase tracking-widest font-mono">Sản phẩm</span>
                    <h4 className="text-sm font-bold text-ink hover:text-hazard transition-colors">
                      {r.product?.name || "N/A"}
                    </h4>
                  </div>
                  {/* Rating Stars */}
                  <div className="flex gap-0.5 self-start sm:self-auto bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Reviewer & Content */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 leading-relaxed">
                  {/* Author detail */}
                  <div className="md:col-span-1 border-r border-gray-100 pr-2">
                    <div className="text-[10px] text-ink/40 uppercase tracking-wider mb-1">Tác giả</div>
                    <div className="font-bold text-ink">{r.user?.name || "Khách hàng"}</div>
                    <div className="text-[9px] text-ink/50 font-mono mt-0.5 break-all">{r.user?.email || "N/A"}</div>
                    <div className="text-[9px] text-ink/40 mt-1.5">
                      {new Date(r.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="md:col-span-3 space-y-2">
                    <div className="text-[10px] text-ink/40 uppercase tracking-wider">Nội dung nhận xét</div>
                    {r.title && <div className="font-bold text-ink text-sm">{r.title}</div>}
                    <div className="text-ink/75 bg-gray-50/50 border border-gray-100 rounded-lg p-3 font-medium">
                      {r.body || <span className="italic text-ink/40 font-normal">Không có nội dung chi tiết.</span>}
                    </div>
                  </div>
                </div>

                {/* Administrative Replies block */}
                {hasReplies && (
                  <div className="ml-0 md:ml-6 space-y-2 border-t border-dashed border-gray-100 pt-3">
                    <div className="text-[10px] text-ink/40 uppercase tracking-widest font-mono">Lịch sử phản hồi</div>
                    {r.replies.map((rep: any) => (
                      <div key={rep.id} className="bg-emerald-50/40 text-emerald-800 p-3 rounded-lg border border-emerald-100 leading-relaxed font-medium">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-[9px] text-emerald-700 uppercase tracking-wider">
                            Phản hồi từ quản trị viên
                          </span>
                          <span className="text-[9px] text-emerald-600 font-mono">
                            {new Date(rep.createdAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div>{rep.body}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Action Buttons */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setReplyReviewId(replyReviewId === r.id ? null : r.id);
                        setReplyBody("");
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-250 hover:border-ink rounded text-xs font-bold cursor-pointer transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-ink/65" />
                      Phản hồi
                    </button>
                    
                    <button
                      onClick={() => {
                        if (confirm("Ẩn nhận xét này trên giao diện người dùng?")) {
                          deleteMutation.mutate(r.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-250 hover:border-hazard text-ink/65 hover:text-hazard rounded text-xs font-bold cursor-pointer transition-colors"
                      title="Ẩn nhận xét"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Ẩn
                    </button>
                  </div>

                  {!hasReplies && (
                    <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      Chưa phản hồi
                    </span>
                  )}
                  {hasReplies && (
                    <span className="text-[9px] bg-emerald-50 border border-emerald-250 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      Đã phản hồi
                    </span>
                  )}
                </div>

                {/* Reply Form panel inline */}
                {replyReviewId === r.id && (
                  <div className="mt-3 ml-0 md:ml-6 space-y-2 border-t border-gray-100 pt-3 max-w-2xl">
                    <textarea
                      rows={2.5}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Nhập nội dung phản hồi của quản trị viên..."
                      className="w-full bg-white border border-gray-300 rounded-lg p-2.5 outline-none text-xs text-ink font-medium focus:border-ink"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setReplyReviewId(null);
                          setReplyBody("");
                        }}
                        className="bg-white border border-gray-250 hover:border-ink px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => createReplyMutation.mutate({ reviewId: r.id, body: replyBody })}
                        disabled={createReplyMutation.isPending || !replyBody.trim()}
                        className="bg-ink text-white hover:bg-hazard px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition-colors"
                      >
                        {createReplyMutation.isPending ? "Đang gửi..." : "Gửi"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
