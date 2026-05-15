import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Filter,
  Megaphone,
  MessageSquare,
  Plus,
  Search as SearchIcon,
  Sparkles,
  X,
} from "lucide-react";
import { getCurrentUser, recruitmentPosts, discussionPosts, type RecruitmentPostItem, type DiscussionPostItem } from "../lib/api";
import { ApplicationForm } from "../components/ApplicationForm";


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
  collaboration_type?: 'student' | 'researcher' | 'both';
  raw_post?: RecruitmentPostItem | DiscussionPostItem;
  post_type: 'recruitment' | 'discussion';
  /** Topic tags from the correct post-type relation (for search / display) */
  tag_names: string[];
  /** Recruitment required skills — empty for discussions */
  required_skill_names: string[];
};

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

function recruitmentRequiredSkillLabels(raw: RecruitmentPostItem): string[] {
  return (raw.recruitment_post_required_skills ?? [])
    .map((r) => {
      const manual = r.manual_skill_name ? String(r.manual_skill_name) : "";
      const fromSkill = r.skills && typeof r.skills === "object" && "name" in r.skills ? String((r.skills as { name: string }).name) : "";
      return manual || fromSkill;
    })
    .filter(Boolean);
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

export default function Explore() {
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "recruitment" | "discussion">("all");
  const [postsList, setPostsList] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<number[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [applicationPostId, setApplicationPostId] = useState<number | null>(null);
  const [applicationSuccessMessage, setApplicationSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPosts = async () => {
      setLoading(true);
      setError(null);

      try {
        // TODO: Migrate from old posts.list() to new recruitment/discussion posts
        // Fetch both recruitment and discussion posts
        const searchFilter = query.trim() ? { search: query.trim() } : {};
        const [recruitmentResponse, discussionResponse] = await Promise.all([
          recruitmentPosts.list({ ...searchFilter, limit: 100 }),
          discussionPosts.list({ ...searchFilter, limit: 100 }),
        ]);

        if (!mounted) {
          return;
        }

        if (!recruitmentResponse.success || !recruitmentResponse.data) {
          throw new Error(recruitmentResponse.message || "Failed to load recruitment posts");
        }

        if (!discussionResponse.success || !discussionResponse.data) {
          throw new Error(discussionResponse.message || "Failed to load discussion posts");
        }

        // Normalize recruitment posts to PostItem format
        const normalizedRecruitmentPosts: PostItem[] = (recruitmentResponse.data?.posts || []).map((post: RecruitmentPostItem) => ({
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
          creator_first_name: post.researchers?.first_name,
          creator_last_name: post.researchers?.last_name,
          creator_email: post.researchers?.email,
          collaboration_type: post.collaboration_type,
          raw_post: post,
          post_type: "recruitment",
          tag_names: recruitmentTopicTags(post),
          required_skill_names: recruitmentRequiredSkillLabels(post),
        }));

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
          creator_first_name: post.researcher_author?.first_name ?? post.student_author?.first_name,
          creator_last_name: post.researcher_author?.last_name ?? post.student_author?.last_name,
          creator_email: post.researcher_author?.email ?? post.student_author?.email,
          collaboration_type: "both",
          raw_post: post,
          post_type: "discussion",
          tag_names: discussionTopicTags(post),
          required_skill_names: [],
        }));

        const allPosts = [...normalizedRecruitmentPosts, ...normalizedDiscussionPosts]
          .filter((post) => {
            if (!currentUser) return true;
            if (currentUser.role === "researcher" && post.created_by_researcher_id === currentUser.id) return false;
            if (currentUser.role === "student" && post.post_type === "discussion") {
              const d = post.raw_post as DiscussionPostItem;
              if (d.created_by_student_id === currentUser.id) return false;
            }
            return true;
          })
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setPostsList(allPosts);
      } catch (err: any) {
        if (!mounted) {
          return;
        }
        setError(err?.response?.data?.message || err?.message || "Failed to load explore feed");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPosts();

    return () => {
      mounted = false;
    };
  }, [currentUserId, query]);

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase();
    return postsList.filter((post) => {
      const kind = post.post_type;
      const haystack = [
        post.title,
        post.description,
        post.project_title,
        post.creator_first_name,
        post.creator_last_name,
        post.creator_email,
        post.status,
        buildAudienceLabel(post),
        ...post.tag_names,
        ...post.required_skill_names,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (filter === "all" || filter === kind) && haystack.includes(q);
    });
  }, [filter, postsList, query]);

  const handleApply = (id: number) => {
    setApplicationPostId(id);
  };

  const getApplicationPost = () => {
    if (!applicationPostId) return null;
    return postsList.find(p => p.id === applicationPostId);
  };

  const handleApplicationSuccess = () => {
    const post = getApplicationPost();
    setApplicationPostId(null);
    setAppliedIds((prev) => [...prev, applicationPostId!]);
    setApplicationSuccessMessage(`Application to "${post?.title}" submitted successfully!`);
    setTimeout(() => setApplicationSuccessMessage(null), 4000);
  };

  return (
    <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen relative">
      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <div>
              <h1 className="text-4xl font-serif font-bold text-[#0e4971]">Explore Feed</h1>
              <p className="text-[#5b86a2] mt-2">Live research posts from other users in the platform.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/submit"
                className="flex items-center gap-2 bg-[#f37e22] text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg shadow-[#f37e22]/20 hover:scale-105 transition-all"
              >
                <Plus size={18} /> New Post
              </Link>
              <button className="flex items-center gap-2 text-sm font-bold text-[#f37e22] bg-[#f37e22]/10 px-4 py-2 rounded-full">
                <Sparkles size={16} /> Live Data
              </button>
            </div>
          </div>
        </header>

        <div className="bg-white rounded-[40px] border border-[#0e4971]/10 p-6 md:p-8 mb-10 shadow-xl shadow-[#0e4971]/5">
          <div className="relative max-w-3xl mx-auto mb-6">
            <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-[#5b86a2]" size={22} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, creators, projects, or keywords..."
              className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 text-lg text-[#0e4971] rounded-[24px] py-4 pl-14 pr-5 outline-none focus:border-[#f37e22] transition-colors shadow-inner"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === "all" ? "bg-[#0e4971] text-white" : "bg-[#f8f7f4] text-[#5b86a2] border border-[#0e4971]/10"}`}
            >
              All Updates
            </button>
            <button
              onClick={() => setFilter("recruitment")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === "recruitment" ? "bg-[#0e4971] text-white" : "bg-[#f8f7f4] text-[#5b86a2] border border-[#0e4971]/10"}`}
            >
              Recruitment
            </button>
            <button
              onClick={() => setFilter("discussion")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter === "discussion" ? "bg-[#0e4971] text-white" : "bg-[#f8f7f4] text-[#5b86a2] border border-[#0e4971]/10"}`}
            >
              Discussions
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-[#5b86a2] bg-[#f8f7f4] border border-[#0e4971]/10 px-4 py-2 rounded-full uppercase tracking-widest">
              <Filter size={14} /> Filters
            </div>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-10 text-center text-[#5b86a2] shadow-sm">
            Loading posts...
          </div>
        )}

        {error && !loading && (
          <div className="bg-white rounded-3xl border border-red-200 p-10 text-center text-red-500 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-10 text-center shadow-sm">
            <SearchIcon size={40} className="mx-auto text-[#5b86a2] mb-3" />
            <h2 className="text-2xl font-serif font-bold text-[#0e4971] mb-2">No posts found</h2>
            <p className="text-[#5b86a2]">Try another search term or switch the filter.</p>
          </div>
        )}

        <div className="space-y-6">
          {filteredItems.map((item, index) => {
            const kind = item.post_type;
            const isDiscussion = item.post_type === "discussion";
            const cardClass = isDiscussion
              ? "rounded-2xl border border-indigo-200/80 border-l-[5px] border-l-indigo-500 bg-gradient-to-br from-[#eef2ff] via-white to-[#f8f7f4] p-6 md:p-8 shadow-md shadow-indigo-500/5 transition-all group"
              : "bg-white rounded-3xl border border-[#0e4971]/10 p-6 md:p-8 shadow-sm hover:border-[#f37e22]/30 transition-all group";
            return (
              <motion.div
                key={`${item.post_type ?? "post"}-${item.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={cardClass}
              >
                <div className="flex justify-between items-start mb-6 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#0e4971]/5 flex items-center justify-center font-bold text-[#0e4971]">
                      {`${item.creator_first_name?.[0] || ""}${item.creator_last_name?.[0] || ""}`.toUpperCase() || "U"}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#0e4971]">{item.creator_first_name ? `${item.creator_first_name} ${item.creator_last_name || ""}`.trim() : item.creator_email || "Unknown creator"}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5b86a2]">
                        <span>{item.project_title || `Project #${item.project_id}`}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {getRelativeTime(item.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`p-2 rounded-xl ${kind === "recruitment" ? "bg-[#f37e22]/10 text-[#f37e22]" : "bg-[#5b86a2]/10 text-[#5b86a2]"}`}>
                    {kind === "recruitment" ? <Megaphone size={20} /> : <MessageSquare size={20} />}
                  </div>
                </div>

                <h3 className="text-xl font-serif font-bold text-[#0e4971] mb-3 group-hover:text-[#f37e22] transition-colors">{item.title}</h3>
                <p className="text-[#5b86a2] text-sm leading-relaxed mb-4">{item.description || "No description provided."}</p>

                {item.tag_names.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#5b86a2] mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {item.tag_names.map((name) => (
                        <span
                          key={name}
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            isDiscussion ? "bg-indigo-100 text-indigo-900" : "bg-[#0e4971]/10 text-[#0e4971]"
                          }`}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {kind === "recruitment" && item.required_skill_names.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#5b86a2] mb-2">Required skills</p>
                    <div className="flex flex-wrap gap-2">
                      {item.required_skill_names.map((name) => (
                        <span
                          key={name}
                          className="text-xs font-semibold px-3 py-1 rounded-full bg-[#f37e22]/15 text-[#b45309] border border-[#f37e22]/25"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                      isDiscussion
                        ? "text-indigo-800 bg-indigo-100/80"
                        : "text-[#0e4971] bg-[#0e4971]/5"
                    }`}
                  >
                    #{kind}
                  </span>
                  {!isDiscussion && (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0e4971] bg-[#0e4971]/5 px-3 py-1 rounded-full">#{item.status}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0e4971] bg-[#0e4971]/5 px-3 py-1 rounded-full">#{buildAudienceLabel(item)}</span>
                    </>
                  )}
                </div>

                <div
                  className={`flex items-center justify-between pt-6 ${
                    isDiscussion ? "border-t border-indigo-200/60" : "border-t border-[#0e4971]/5"
                  }`}
                >
                  {isDiscussion ? (
                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700/80">Discussion thread</p>
                  ) : (
                    <div className="flex items-center gap-4">
                      {(() => {
                        const isCreator = currentUser?.id === item.created_by_researcher_id;
                        const hasApplied = appliedIds.includes(item.id);
                        const isRecruitment = item.post_type === "recruitment";
                        const allowsStudents = Boolean(item.allow_students);
                        const allowsResearchers = Boolean(item.allow_researchers);
                        const role = currentUser?.role;
                        const roleAllowed =
                          (role === "student" && allowsStudents) || (role === "researcher" && allowsResearchers);
                        const canApply =
                          isRecruitment &&
                          !!currentUser &&
                          roleAllowed &&
                          !isCreator &&
                          !hasApplied;

                        return (
                          <button
                            onClick={() => handleApply(item.id)}
                            disabled={!canApply}
                            title={
                              isCreator
                                ? "You cannot apply to your own post"
                                : hasApplied
                                  ? "Already applied"
                                  : !isRecruitment
                                    ? ""
                                    : role === "student" && !allowsStudents
                                      ? "This post does not accept student applications"
                                      : role === "researcher" && !allowsResearchers
                                        ? "This post does not accept researcher applications"
                                        : !currentUser
                                          ? "Sign in to apply"
                                          : !roleAllowed
                                            ? "Your account type is not accepted for this post"
                                            : ""
                            }
                            className={`text-sm font-bold px-6 py-2 rounded-full transition-colors ${
                              hasApplied
                                ? "bg-green-100 text-green-700 cursor-default"
                                : !canApply
                                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                  : "bg-[#0e4971] text-white hover:bg-[#0a3a5c]"
                            }`}
                          >
                            {hasApplied ? "✓ Applied" : !canApply ? "Not Eligible" : "Apply Now"}
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Link
        to="/submit"
        className="fixed bottom-32 right-8 w-16 h-16 bg-[#f37e22] text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all md:hidden"
      >
        <Plus size={28} />
      </Link>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] bg-[#0e4971] text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl"
          >
            <CheckCircle2 size={20} className="text-green-400" />
            <span className="font-bold text-sm tracking-tight">Interest saved locally.</span>
            <button onClick={() => setShowToast(false)} className="ml-2 hover:bg-white/10 p-1 rounded-full">
              <X size={14} />
            </button>
          </motion.div>
        )}
        {applicationSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] bg-green-600 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl"
          >
            <CheckCircle2 size={20} />
            <span className="font-bold text-sm tracking-tight">{applicationSuccessMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {applicationPostId && getApplicationPost() && getApplicationPost()?.post_type === 'recruitment' && (
        <ApplicationForm
          post={getApplicationPost()!.raw_post as RecruitmentPostItem}
          onSuccess={handleApplicationSuccess}
          onCancel={() => setApplicationPostId(null)}
        />
      )}
    </div>
  );
}
