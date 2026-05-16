import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clock,
  Filter,
  Megaphone,
  MessageSquare,
  Plus,
  Users,
  Sparkles,
  Edit3,
  Trash2,
} from "lucide-react";
import {
  getCurrentUser,
  recruitmentPosts,
  discussionPosts,
  applications,
  type RecruitmentPostItem,
  type DiscussionPostItem,
  type ManagedPostSummary,
} from "../lib/api";

function recruitmentTopicTags(raw: RecruitmentPostItem): string[] {
  return (raw.recruitment_post_tags ?? [])
    .map((t) => (t.tags?.name ? String(t.tags.name) : ""))
    .filter(Boolean);
}

function discussionTopicTags(raw: DiscussionPostItem): string[] {
  return (raw.discussion_post_tags ?? [])
    .map((t) => (t.tags?.name ? String(t.tags.name) : ""))
    .filter(Boolean);
}

type PostItem = {
  id: number;
  project_id: number;
  created_by_researcher_id: number;
  title: string;
  description: string | null;
  status: "draft" | "open" | "closed" | "archived" | "filled";
  allow_students: boolean | number;
  allow_researchers: boolean | number;
  application_deadline: string | null;
  created_at: string;
  updated_at: string;
  project_title?: string;
  creator_first_name?: string;
  creator_last_name?: string;
  creator_email?: string;
  post_type: "recruitment" | "discussion";
  tag_names: string[];
  /** For recruitment posts: total applications on the linked project post (students + researchers). */
  application_count: number;
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getRelativeTime(value?: string | null): string {
  if (!value) {
    return "Just now";
  }

  const time = new Date(value).getTime();
  const delta = Date.now() - time;
  const hours = Math.round(delta / (1000 * 60 * 60));

  if (hours < 1) {
    return "Less than 1h ago";
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function buildAudienceLabel(post: PostItem): string {
  const allowsStudents = Boolean(post.allow_students);
  const allowsResearchers = Boolean(post.allow_researchers);

  if (allowsStudents && allowsResearchers) {
    return "Students + Researchers";
  }

  if (allowsStudents) {
    return "Students only";
  }

  if (allowsResearchers) {
    return "Researchers only";
  }

  return "Restricted";
}

function matchManagedSummary(
  projectId: number,
  title: string,
  summaries: ManagedPostSummary[],
): ManagedPostSummary | undefined {
  const t = title.trim();
  return summaries.find((s) => s.project_id === projectId && s.title.trim() === t);
}

export default function MyPosts() {
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id;
  const currentUserRole = currentUser?.role;
  const [postsList, setPostsList] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "closed" | "draft">("all");

  useEffect(() => {
    let mounted = true;

    const loadMyPosts = async () => {
      if (!currentUser) {
        setLoading(false);
        setError("No authenticated user found.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch posts based on user role
        const postsToFetch: PostItem[] = [];

        if (currentUser.role === "researcher") {
          // Researchers can see their recruitment and discussion posts
          const [recruitmentResponse, discussionResponse, summariesResponse] = await Promise.all([
            recruitmentPosts.list({ created_by_researcher_id: currentUser.id }),
            discussionPosts.list({ created_by_researcher_id: currentUser.id }),
            applications.listManagedPostSummaries({ limit: 200 }),
          ]);

          if (!recruitmentResponse.success || !recruitmentResponse.data) {
            throw new Error(recruitmentResponse.message || "Failed to load recruitment posts");
          }

          if (!discussionResponse.success || !discussionResponse.data) {
            throw new Error(discussionResponse.message || "Failed to load discussion posts");
          }

          const managedSummaries: ManagedPostSummary[] =
            summariesResponse.success && Array.isArray(summariesResponse.data) ? summariesResponse.data : [];

          // Normalize recruitment posts to PostItem format
          const normalizedRecruitmentPosts: PostItem[] = (recruitmentResponse.data?.posts || []).map((post: RecruitmentPostItem) => {
            const summary = matchManagedSummary(post.project_id, post.title, managedSummaries);
            return {
              id: post.id,
              project_id: post.project_id,
              created_by_researcher_id: post.created_by_researcher_id,
              title: post.title,
              description: post.description,
              status: post.status || "open",
              allow_students: post.collaboration_type === "student" || post.collaboration_type === "both",
              allow_researchers: post.collaboration_type === "researcher" || post.collaboration_type === "both",
              application_deadline: post.deadline,
              created_at: post.created_at,
              updated_at: post.updated_at,
              project_title: post.projects?.title,
              post_type: "recruitment" as const,
              tag_names: recruitmentTopicTags(post),
              application_count: summary?.application_count ?? 0,
            };
          });

          // Normalize discussion posts to PostItem format
          const normalizedDiscussionPosts: PostItem[] = (discussionResponse.data?.posts || []).map((post: DiscussionPostItem) => ({
            id: post.id,
            project_id: post.project_id ?? 0,
            created_by_researcher_id: post.created_by_researcher_id ?? 0,
            title: post.title,
            description: post.description,
            status: "open",
            allow_students: true,
            allow_researchers: false,
            application_deadline: null,
            created_at: post.created_at,
            updated_at: post.updated_at,
            project_title: post.projects?.title,
            post_type: "discussion",
            tag_names: discussionTopicTags(post),
            application_count: 0,
          }));

          postsToFetch.push(...normalizedRecruitmentPosts, ...normalizedDiscussionPosts);
        } else if (currentUser.role === "student") {
          // Students can see their discussion posts
          const discussionResponse = await discussionPosts.list({ created_by_student_id: currentUser.id });

          if (!discussionResponse.success || !discussionResponse.data) {
            throw new Error(discussionResponse.message || "Failed to load discussion posts");
          }

          // Normalize discussion posts to PostItem format
          const normalizedDiscussionPosts: PostItem[] = (discussionResponse.data?.posts || []).map((post: DiscussionPostItem) => ({
            id: post.id,
            project_id: post.project_id ?? 0,
            created_by_researcher_id: post.created_by_researcher_id ?? 0,
            title: post.title,
            description: post.description,
            status: "open",
            allow_students: true,
            allow_researchers: false,
            application_deadline: null,
            created_at: post.created_at,
            updated_at: post.updated_at,
            project_title: post.projects?.title,
            post_type: "discussion",
            tag_names: discussionTopicTags(post),
            application_count: 0,
          }));

          postsToFetch.push(...normalizedDiscussionPosts);
        } else {
          setError("Unknown user role.");
          return;
        }

        if (!mounted) {
          return;
        }

        setPostsList(postsToFetch.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (err: any) {
        if (!mounted) {
          return;
        }
        setError(err?.response?.data?.message || err?.message || "Failed to load posts");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMyPosts();

    return () => {
      mounted = false;
    };
  }, [currentUserId, currentUserRole]);

  const visiblePosts = useMemo(() => {
    if (filter === "all") {
      return postsList;
    }

    return postsList.filter((post) => post.status === filter);
  }, [filter, postsList]);

  const handleDeletePost = async (post: PostItem) => {
    const ok = window.confirm(`Delete post "${post.title}"? This cannot be undone.`);
    if (!ok) return;

    try {
      if (post.post_type === 'recruitment') {
        const resp = await recruitmentPosts.delete(post.id);
        if (!resp.success) throw new Error(resp.message || 'Delete failed');
      } else {
        const resp = await discussionPosts.delete(post.id);
        if (!resp.success) throw new Error(resp.message || 'Delete failed');
      }
      setPostsList((prev) => prev.filter((p) => p.id !== post.id));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete post');
    }
  };

  const handleEditPost = (post: PostItem) => {
    // Navigate to the submit page with state for editing
    window.location.href = `/submit` + `?edit=${post.post_type}-${post.id}`;
  };

  const totalApplications = useMemo(() => {
    return postsList.reduce((sum, post) => sum + (post.post_type === "recruitment" ? post.application_count : 0), 0);
  }, [postsList]);

  return (
    <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-[#0e4971] mb-2">My Posts</h1>
            <p className="text-[#5b86a2]">Dynamic feed of posts created from your connected account.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-[#0e4971]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0e4971] shadow-sm">
              {postsList.length} posts
            </div>
            <div className="rounded-full border border-[#0e4971]/10 bg-white px-4 py-2 text-sm font-semibold text-[#0e4971] shadow-sm">
              {totalApplications} applications
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === "all" ? "bg-[#0e4971] text-white" : "bg-white text-[#5b86a2] border border-[#0e4971]/10"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("open")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === "open" ? "bg-[#0e4971] text-white" : "bg-white text-[#5b86a2] border border-[#0e4971]/10"}`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter("draft")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === "draft" ? "bg-[#0e4971] text-white" : "bg-white text-[#5b86a2] border border-[#0e4971]/10"}`}
          >
            Draft
          </button>
          <button
            onClick={() => setFilter("closed")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === "closed" ? "bg-[#0e4971] text-white" : "bg-white text-[#5b86a2] border border-[#0e4971]/10"}`}
          >
            Closed
          </button>
          <div className="ml-auto flex items-center gap-2 text-xs font-bold text-[#5b86a2] uppercase tracking-widest">
            <Filter size={14} /> Filter by status
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-10 text-center text-[#5b86a2] shadow-sm">
            Loading your posts...
          </div>
        )}

        {error && !loading && (
          <div className="bg-white rounded-3xl border border-red-200 p-10 text-center text-red-500 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && visiblePosts.length === 0 && (
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-10 text-center shadow-sm">
            <Sparkles className="mx-auto mb-3 text-[#f37e22]" size={32} />
            <h2 className="text-2xl font-serif font-bold text-[#0e4971] mb-2">No posts yet</h2>
            <p className="text-[#5b86a2] mb-6">Create a post from the platform to start collecting applications.</p>
            <Link to="/submit" className="inline-flex items-center gap-2 bg-[#f37e22] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-[#f37e22]/20">
              <Plus size={18} /> Create a post
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {visiblePosts.map((post) => {
            const totalPostApplications = post.post_type === "recruitment" ? post.application_count : 0;
            const postType = post.post_type;

            return (
              <div key={`${postType}-${post.id}`} className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[32px] border border-[#0e4971]/10 p-8 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-6 gap-4">
                    <div className={`p-3 rounded-2xl ${postType === "recruitment" ? "bg-[#f37e22]/10 text-[#f37e22]" : "bg-[#5b86a2]/10 text-[#5b86a2]"}`}>
                      {postType === "recruitment" ? <Megaphone size={24} /> : <MessageSquare size={24} />}
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs font-bold text-[#5b86a2]">
                      <span className="bg-[#f8f7f4] px-3 py-1 rounded-full uppercase tracking-widest">{post.status}</span>
                      <span className="flex items-center gap-2 bg-[#f8f7f4] px-3 py-1 rounded-full uppercase tracking-widest"><Clock size={12} /> {getRelativeTime(post.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-2xl font-serif font-bold text-[#0e4971] mb-2">{post.title}</h2>
                      <p className="text-sm text-[#5b86a2]">
                        {post.project_title ? `Project: ${post.project_title}` : `Project #${post.project_id}`}
                      </p>
                    </div>
                    <div className="rounded-full bg-[#0e4971]/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#0e4971]">
                      {buildAudienceLabel(post)}
                    </div>
                  </div>

                  <p className="text-[#5b86a2] leading-relaxed mb-4">{post.description || "No description provided."}</p>

                  {post.tag_names.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {post.tag_names.map((name) => (
                        <span
                          key={`${post.id}-${name}`}
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            post.post_type === "discussion" ? "bg-indigo-100 text-indigo-900" : "bg-[#0e4971]/10 text-[#0e4971]"
                          }`}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-8">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0e4971] bg-[#0e4971]/5 px-3 py-1 rounded-full">#{postType}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0e4971] bg-[#0e4971]/5 px-3 py-1 rounded-full">#{post.status}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0e4971] bg-[#0e4971]/5 px-3 py-1 rounded-full">#{buildAudienceLabel(post)}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4] p-4">
                      <div className="text-[10px] uppercase tracking-widest text-[#5b86a2] mb-2">Applications</div>
                      <div className="text-3xl font-serif font-bold text-[#0e4971]">{totalPostApplications}</div>
                    </div>
                    <div className="rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4] p-4">
                      <div className="text-[10px] uppercase tracking-widest text-[#5b86a2] mb-2">Created</div>
                      <div className="font-semibold text-[#0e4971]">{formatDate(post.created_at)}</div>
                    </div>
                    <div className="rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4] p-4">
                      <div className="text-[10px] uppercase tracking-widest text-[#5b86a2] mb-2">Deadline</div>
                      <div className="font-semibold text-[#0e4971]">{formatDate(post.application_deadline)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <button
                      onClick={() => handleEditPost(post)}
                      aria-label="Edit post"
                      title="Edit"
                      className="w-10 h-10 inline-flex items-center justify-center bg-white border border-[#0e4971]/10 rounded-full text-[#0e4971] hover:bg-[#f8f7f4]"
                    >
                      <Edit3 size={16} />
                    </button>

                    <button
                      onClick={() => handleDeletePost(post)}
                      aria-label="Delete post"
                      title="Delete"
                      className="w-10 h-10 inline-flex items-center justify-center bg-white border border-red-200 rounded-full text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>

                <div className="pl-8 space-y-4 border-l-2 border-[#0e4971]/5 ml-4 pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Users size={18} className="text-[#0e4971]" />
                      <h3 className="font-bold text-[#0e4971]">Applications</h3>
                      <span className="bg-[#0e4971]/5 text-[#0e4971] px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {totalPostApplications}
                      </span>
                    </div>
                    {postType === "recruitment" && currentUserRole === "researcher" && (
                      <Link
                        to="/applications"
                        className="text-xs font-bold text-[#f37e22] hover:underline"
                      >
                        Manage applications →
                      </Link>
                    )}
                  </div>

                  {postType !== "recruitment" ? (
                    <div className="bg-white/70 border border-[#0e4971]/10 rounded-2xl p-5 text-sm text-[#5b86a2]">
                      Discussion posts do not collect applications.
                    </div>
                  ) : totalPostApplications === 0 ? (
                    <div className="bg-white/70 border border-[#0e4971]/10 rounded-2xl p-5 text-sm text-[#5b86a2]">
                      No applications have been submitted for this post yet.
                    </div>
                  ) : (
                    <div className="bg-white/70 border border-[#0e4971]/10 rounded-2xl p-5 text-sm text-[#5b86a2]">
                      {totalPostApplications} application{totalPostApplications !== 1 ? "s" : ""} on the linked project post.
                      {" "}
                      <Link to="/applications" className="font-bold text-[#f37e22] hover:underline">
                        Review on Applications page
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 bg-[#0e4971] rounded-[40px] p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mt-32 blur-3xl pointer-events-none" />
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-6 relative z-10">Open Research Management</h2>
          <p className="text-white/70 max-w-xl mx-auto mb-10 relative z-10">
            Your posts, applications, and visibility are now driven by the connected account and backend data.
          </p>
          <Link to="/submit" className="inline-flex items-center gap-3 bg-[#f37e22] text-white px-10 py-4 rounded-full font-bold hover:gap-5 transition-all relative z-10">
            Create a post <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  );
}
