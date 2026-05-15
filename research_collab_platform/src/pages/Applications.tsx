import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentUser, applications } from "../lib/api";
import type { ManagedPostSummary, PostApplicationApplicantRow } from "../lib/api";
import { ArrowLeft, Calendar, ExternalLink, FileText, Mail, Search, User, Users } from "lucide-react";
import { Link } from "react-router-dom";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "accepted":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "withdrawn":
      return "bg-slate-200 text-slate-700";
    case "under_review":
    case "shortlisted":
      return "bg-sky-100 text-sky-800";
    default:
      return "bg-amber-50 text-amber-800";
  }
}

export default function Applications() {
  const currentUser = getCurrentUser();
  const [posts, setPosts] = useState<ManagedPostSummary[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [applicants, setApplicants] = useState<PostApplicationApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const firstSummaryLoad = useRef(true);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const refreshSummaries = useCallback(async () => {
    if (!currentUser || currentUser.role !== "researcher") return;
    const resp = await applications.listManagedPostSummaries({
      search: debouncedSearch || undefined,
      limit: 100,
    });
    if (!resp.success || !Array.isArray(resp.data)) {
      throw new Error(resp.message || "Failed to load posts");
    }
    setPosts(resp.data);
  }, [currentUser, debouncedSearch]);

  useEffect(() => {
    const loadPosts = async () => {
      if (!currentUser || currentUser.role !== "researcher") {
        setError("Only researchers can view applications");
        setLoading(false);
        firstSummaryLoad.current = true;
        return;
      }

      if (firstSummaryLoad.current) {
        setLoading(true);
      }
      setError(null);
      try {
        await refreshSummaries();
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        setError(e?.response?.data?.message || e?.message || "Failed to load posts");
      } finally {
        setLoading(false);
        firstSummaryLoad.current = false;
      }
    };

    void loadPosts();
  }, [currentUser?.id, currentUser?.role, debouncedSearch, refreshSummaries]);

  useEffect(() => {
    if (!selectedPostId) {
      setApplicants([]);
      return;
    }

    let cancelled = false;
    const loadApplicants = async () => {
      setApplicantsLoading(true);
      try {
        const response = await applications.getForProjectPost(selectedPostId);
        if (cancelled) return;
        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || "Failed to load applications");
        }
        setApplicants(response.data);
      } catch (err: unknown) {
        if (!cancelled) {
          const e = err as { response?: { data?: { message?: string } }; message?: string };
          setError(e?.response?.data?.message || e?.message || "Failed to load applications");
          setApplicants([]);
        }
      } finally {
        if (!cancelled) setApplicantsLoading(false);
      }
    };

    void loadApplicants();
    return () => {
      cancelled = true;
    };
  }, [selectedPostId]);

  useEffect(() => {
    if (posts.length === 0) {
      setSelectedPostId(null);
      return;
    }
    setSelectedPostId((sel) => {
      if (sel != null && posts.some((p) => p.id === sel)) return sel;
      return posts[0]?.id ?? null;
    });
  }, [posts]);

  const selectedPost = useMemo(
    () => posts.find((p) => p.id === selectedPostId) ?? null,
    [posts, selectedPostId],
  );

  const updateStatus = async (app: PostApplicationApplicantRow, status: "accepted" | "rejected") => {
    if (actionId != null) return;
    setActionId(app.id);
    setError(null);
    try {
      const resp = await applications.update(app.id, {
        status,
        applicant_kind: app.applicant_kind,
      });
      if (!resp.success) {
        throw new Error(resp.message || "Update failed");
      }
      const [appsResp] = await Promise.all([
        applications.getForProjectPost(selectedPostId!),
        refreshSummaries(),
      ]);
      if (appsResp.success && Array.isArray(appsResp.data)) {
        setApplicants(appsResp.data);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e?.message || "Could not update application");
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center text-[#5b86a2]">Loading…</div>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== "researcher") {
    return (
      <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
            Only researchers can view and manage applications for their posts.
          </div>
        </div>
      </div>
    );
  }

  const terminal = (s: string) => ["accepted", "rejected", "withdrawn"].includes(s);

  return (
    <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <Link
            to="/my-posts"
            className="inline-flex items-center gap-2 text-[#0e4971] hover:text-[#f37e22] font-bold"
          >
            <ArrowLeft size={20} /> Back to Posts
          </Link>
        </div>

        <h1 className="text-4xl font-serif font-bold text-[#0e4971] mb-2">Applications</h1>
        <p className="text-[#5b86a2] mb-8">
          Search your project posts, then review applicants—students and researchers—who applied. You can accept or
          reject each application.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 mb-6">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-[#0e4971]/10 p-6 sticky top-24 space-y-4">
              <h2 className="text-lg font-bold text-[#0e4971]">Your posts</h2>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5b86a2]" size={18} />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by title…"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[#0e4971]/15 bg-[#f8f7f4] text-sm text-[#0e4971] outline-none focus:border-[#0e4971]/40"
                  aria-label="Search posts"
                />
              </div>

              {posts.length === 0 ? (
                <p className="text-sm text-[#5b86a2]">
                  No matching posts. Try another search, or create a project post to collect applications.
                </p>
              ) : (
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {posts.map((post) => (
                    <li key={post.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPostId(post.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all border ${
                          selectedPostId === post.id
                            ? "bg-[#0e4971] text-white border-[#0e4971]"
                            : "bg-[#f8f7f4] text-[#0e4971] border-transparent hover:border-[#0e4971]/20"
                        }`}
                      >
                        <p className="font-bold text-sm line-clamp-2">{post.title}</p>
                        <p
                          className={`text-xs mt-1 flex flex-wrap gap-x-2 gap-y-0.5 ${
                            selectedPostId === post.id ? "text-blue-100" : "text-[#5b86a2]"
                          }`}
                        >
                          <span>
                            {post.application_count} total
                          </span>
                          <span>·</span>
                          <span>{post.student_application_count} students</span>
                          <span>·</span>
                          <span>{post.researcher_application_count} researchers</span>
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {selectedPost && (
              <div className="bg-white rounded-xl border border-[#0e4971]/10 p-5">
                <h3 className="text-xl font-serif font-bold text-[#0e4971]">{selectedPost.title}</h3>
                <p className="text-sm text-[#5b86a2] mt-1">
                  Post status: <span className="font-semibold text-[#0e4971]">{selectedPost.status}</span>
                  {" · "}
                  {selectedPost.application_count} application{selectedPost.application_count !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            {!selectedPostId ? (
              <div className="bg-white rounded-xl border border-[#0e4971]/10 p-10 text-center text-[#5b86a2]">
                Select a post to view applicants.
              </div>
            ) : applicantsLoading ? (
              <div className="bg-white rounded-xl border border-[#0e4971]/10 p-10 text-center text-[#5b86a2]">
                Loading applicants…
              </div>
            ) : applicants.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#0e4971]/10 p-10 text-center">
                <Mail size={40} className="mx-auto text-[#5b86a2] mb-3" />
                <p className="text-[#5b86a2]">No applications yet for this post.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applicants.map((app) => (
                  <div
                    key={`${app.applicant_kind}-${app.id}`}
                    className="bg-white rounded-xl border border-[#0e4971]/10 p-6 hover:border-[#f37e22]/30 transition-all"
                  >
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-[#0e4971]/10 flex items-center justify-center shrink-0">
                          <User size={24} className="text-[#0e4971]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-[#0e4971]">
                              {app.applicant_first_name} {app.applicant_last_name}
                            </h3>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                app.applicant_kind === "student"
                                  ? "bg-[#0e4971]/10 text-[#0e4971]"
                                  : "bg-[#f37e22]/15 text-[#c45d12]"
                              }`}
                            >
                              {app.applicant_kind === "student" ? "Student" : "Researcher"}
                            </span>
                            <Link
                              to={`/people/${app.applicant_kind}/${app.applicant_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#f37e22] hover:underline"
                            >
                              View profile <ExternalLink size={12} className="shrink-0" />
                            </Link>
                          </div>
                          <div className="flex flex-col gap-1 mt-2 text-sm text-[#5b86a2]">
                            <a
                              href={`mailto:${app.applicant_email}`}
                              className="flex items-center gap-2 hover:text-[#f37e22] truncate"
                            >
                              <Mail size={14} className="shrink-0" />
                              <span className="truncate">{app.applicant_email}</span>
                            </a>
                            {app.applicant_institution && (
                              <p className="text-xs truncate">{app.applicant_institution}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs">
                              <Calendar size={14} />
                              Applied {new Date(app.applied_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${statusBadgeClass(app.status)}`}>
                        {app.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {app.cover_letter && (
                      <div className="bg-[#f8f7f4] rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={16} className="text-[#0e4971]" />
                          <p className="font-bold text-sm text-[#0e4971]">Cover letter</p>
                        </div>
                        <p className="text-sm text-[#5b86a2] whitespace-pre-wrap">{app.cover_letter}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-4 border-t border-[#0e4971]/5">
                      <button
                        type="button"
                        disabled={terminal(app.status) || actionId === app.id}
                        onClick={() => void updateStatus(app, "accepted")}
                        className="flex-1 min-w-[120px] px-4 py-2 bg-[#0e4971] text-white rounded-lg hover:bg-[#0a3a5c] font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionId === app.id ? "Saving…" : "Accept"}
                      </button>
                      <button
                        type="button"
                        disabled={terminal(app.status) || actionId === app.id}
                        onClick={() => void updateStatus(app, "rejected")}
                        className="flex-1 min-w-[120px] px-4 py-2 border border-[#0e4971]/20 text-[#0e4971] rounded-lg hover:bg-[#f8f7f4] font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reject
                      </button>
                      <a
                        href={`mailto:${app.applicant_email}?subject=${encodeURIComponent(`Regarding your application: ${selectedPost?.title ?? "post"}`)}`}
                        className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 px-4 py-2 border border-[#0e4971]/20 text-[#0e4971] rounded-lg hover:bg-[#f8f7f4] font-bold text-sm transition-all"
                      >
                        <Users size={16} />
                        Message
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
