import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Filter,
  Megaphone,
  MessageSquare,
  Search as SearchIcon,
  Sparkles,
  Star,
} from "lucide-react";
import {
  getCurrentUser,
  recruitmentPosts,
  discussionPosts,
  researchers,
  students,
  type RecruitmentPostItem,
  type DiscussionPostItem,
} from "../lib/api";

type SearchMode = "all" | "posts" | "researchers" | "students";

type UnifiedPostRow = {
  key: string;
  id: number;
  post_type: "recruitment" | "discussion";
  title: string;
  description: string | null;
  project_title?: string;
  tag_names: string[];
  required_skill_names: string[];
  status: string;
};

type PersonRecord = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  institution: string | null;
  bio: string | null;
  is_active: boolean | number;
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

function getFullName(item: PersonRecord): string {
  return `${item.first_name} ${item.last_name}`.trim();
}

function buildPeopleSummary(item: PersonRecord): string {
  return item.institution || item.bio || item.email;
}

export default function Search() {
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id;
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("all");
  const [unifiedPosts, setUnifiedPosts] = useState<UnifiedPostRow[]>([]);
  const [researcherList, setResearcherList] = useState<PersonRecord[]>([]);
  const [studentList, setStudentList] = useState<PersonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const searchTerm = query.trim() || undefined;
        const [recruitmentResponse, discussionResponse, researchersResponse, studentsResponse] = await Promise.all([
          recruitmentPosts.list({ search: searchTerm, limit: 100 }),
          discussionPosts.list({ search: searchTerm, limit: 100 }),
          researchers.list({ search: searchTerm, is_active: true, limit: 100, sort: "desc" }),
          students.list({ search: searchTerm, is_active: true, limit: 100, sort: "desc" }),
        ]);

        if (!mounted) {
          return;
        }

        const recRows: UnifiedPostRow[] = (recruitmentResponse.success && recruitmentResponse.data?.posts
          ? recruitmentResponse.data.posts
          : []
        ).map((post: RecruitmentPostItem) => ({
          key: `recruitment-${post.id}`,
          id: post.id,
          post_type: "recruitment" as const,
          title: post.title,
          description: post.description,
          project_title: post.projects?.title,
          tag_names: recruitmentTopicTags(post),
          required_skill_names: recruitmentRequiredSkillLabels(post),
          status: post.status || "open",
        }));

        const discRows: UnifiedPostRow[] = (discussionResponse.success && discussionResponse.data?.posts
          ? discussionResponse.data.posts
          : []
        ).map((post: DiscussionPostItem) => ({
          key: `discussion-${post.id}`,
          id: post.id,
          post_type: "discussion" as const,
          title: post.title,
          description: post.description,
          project_title: post.projects?.title,
          tag_names: discussionTopicTags(post),
          required_skill_names: [],
          status: "open",
        }));

        const merged = [...recRows, ...discRows].filter((row) => {
          if (!currentUser) return true;
          if (row.post_type === "recruitment") {
            const p = recruitmentResponse.data?.posts?.find((x: RecruitmentPostItem) => x.id === row.id);
            if (p && p.created_by_researcher_id === currentUser.id) return false;
          }
          if (row.post_type === "discussion") {
            const p = discussionResponse.data?.posts?.find((x: DiscussionPostItem) => x.id === row.id);
            if (currentUser.role === "researcher" && p?.created_by_researcher_id === currentUser.id) return false;
            if (currentUser.role === "student" && p?.created_by_student_id === currentUser.id) return false;
          }
          return true;
        });

        setUnifiedPosts(merged);

        setResearcherList(researchersResponse.success && researchersResponse.data ? researchersResponse.data : []);
        setStudentList(studentsResponse.success && studentsResponse.data ? studentsResponse.data : []);
      } catch (err: unknown) {
        if (!mounted) {
          return;
        }
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        setError(e?.response?.data?.message || e?.message || "Failed to load search results");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadResults();

    return () => {
      mounted = false;
    };
  }, [currentUserId, query]);

  const qLower = query.trim().toLowerCase();

  const filteredPosts = useMemo(() => {
    if (mode !== "all" && mode !== "posts") return [];
    if (!qLower) return unifiedPosts;
    return unifiedPosts.filter((post) => {
      const blob = [
        post.title,
        post.description,
        post.project_title,
        post.status,
        post.post_type,
        ...post.tag_names,
        ...post.required_skill_names,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(qLower);
    });
  }, [mode, unifiedPosts, qLower]);

  const filteredResearchers = useMemo(() => {
    return researcherList.filter((item) => mode === "all" || mode === "researchers");
  }, [mode, researcherList]);

  const filteredStudents = useMemo(() => {
    return studentList.filter((item) => mode === "all" || mode === "students");
  }, [mode, studentList]);

  const hasResults = filteredPosts.length > 0 || filteredResearchers.length > 0 || filteredStudents.length > 0;

  return (
    <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-[40px] border border-[#0e4971]/10 p-8 md:p-12 mb-12 shadow-xl shadow-[#0e4971]/5">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h1 className="text-4xl font-serif font-bold text-[#0e4971] mb-4">Discover the Community</h1>
            <p className="text-[#5b86a2]">Search recruitment & discussion posts (including tags), researchers, and students.</p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-[#5b86a2]" size={24} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, post title, tags, required skills, project, institution, or email..."
              className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 text-xl text-[#0e4971] rounded-[24px] py-6 pl-16 pr-8 outline-none focus:border-[#f37e22] transition-colors shadow-inner"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <div className="flex bg-[#f8f7f4] p-1 rounded-2xl border border-[#0e4971]/5">
              {(["all", "posts", "researchers", "students"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mode === item ? "bg-white text-[#0e4971] shadow-sm" : "text-[#5b86a2] hover:text-[#0e4971]"}`}
                >
                  {item}
                </button>
              ))}
            </div>

            <button className="flex items-center gap-2 text-xs font-bold text-[#5b86a2] bg-white border border-[#0e4971]/10 px-6 py-2.5 rounded-2xl">
              <Filter size={14} /> Advanced Filters
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-[#f37e22] bg-[#f37e22]/10 px-6 py-2.5 rounded-2xl uppercase tracking-widest">
              <Sparkles size={14} /> Live Search
            </div>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-10 text-center text-[#5b86a2] shadow-sm">
            Searching the platform...
          </div>
        )}

        {error && !loading && (
          <div className="bg-white rounded-3xl border border-red-200 p-10 text-center text-red-500 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && !hasResults && (
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-10 text-center shadow-sm">
            <SearchIcon size={40} className="mx-auto text-[#5b86a2] mb-3" />
            <h3 className="text-2xl font-serif font-bold text-[#0e4971] mb-2">No results found</h3>
            <p className="text-[#5b86a2]">Try another keyword or switch the filter.</p>
          </div>
        )}

        {!loading && !error && filteredPosts.length > 0 && (mode === "all" || mode === "posts") && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-[#5b86a2]" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#5b86a2]">Posts</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {filteredPosts.map((post, index) => (
                <motion.div
                  key={post.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-3xl border p-6 shadow-sm hover:border-[#f37e22]/30 transition-all ${
                    post.post_type === "discussion"
                      ? "border-indigo-200/80 bg-gradient-to-br from-[#eef2ff] via-white to-[#f8f7f4]"
                      : "bg-white border-[#0e4971]/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-[#0e4971] mb-1">{post.title}</h3>
                      <p className="text-sm text-[#5b86a2]">{post.project_title || "No project linked"}</p>
                    </div>
                    <div
                      className={`p-2 rounded-xl ${
                        post.post_type === "recruitment" ? "bg-[#f37e22]/10 text-[#f37e22]" : "bg-[#5b86a2]/10 text-[#5b86a2]"
                      }`}
                    >
                      {post.post_type === "recruitment" ? <Megaphone size={18} /> : <MessageSquare size={18} />}
                    </div>
                  </div>
                  <p className="text-[#5b86a2] text-sm leading-relaxed mb-3">{post.description || "No description provided."}</p>

                  {post.tag_names.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {post.tag_names.map((name) => (
                        <span
                          key={`${post.key}-tag-${name}`}
                          className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                            post.post_type === "discussion" ? "bg-indigo-100 text-indigo-900" : "bg-[#0e4971]/5 text-[#0e4971]"
                          }`}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}

                  {post.post_type === "recruitment" && post.required_skill_names.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.required_skill_names.map((name) => (
                        <span
                          key={`${post.key}-skill-${name}`}
                          className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#f37e22]/15 text-[#b45309] border border-[#f37e22]/25"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-[#0e4971]">
                    <span className="bg-[#0e4971]/5 px-3 py-1 rounded-full">{post.status}</span>
                    <span className="bg-[#0e4971]/5 px-3 py-1 rounded-full">{post.post_type}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {!loading && !error && filteredResearchers.length > 0 && (mode === "all" || mode === "researchers") && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-[#5b86a2]" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#5b86a2]">Researchers</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredResearchers.map((item, index) => (
                <Link key={item.id} to={`/people/researcher/${item.id}`} className="block">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 shadow-sm hover:border-[#f37e22]/30 transition-all group h-full"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-[20px] bg-[#0e4971]/5 text-[#0e4971] flex items-center justify-center font-serif text-xl font-bold group-hover:bg-[#f37e22] group-hover:text-white transition-all">
                        {`${item.first_name?.[0] || ""}${item.last_name?.[0] || ""}`.toUpperCase() || "R"}
                      </div>
                      <div>
                        <h3 className="text-xl font-serif font-bold text-[#0e4971] group-hover:text-[#f37e22] transition-colors">{getFullName(item)}</h3>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#5b86a2]">Researcher</p>
                      </div>
                      <div className="ml-auto text-[#f37e22]">
                        <Star size={16} className="fill-[#f37e22]" />
                      </div>
                    </div>
                    <p className="text-[#5b86a2] text-sm leading-relaxed mb-4">{buildPeopleSummary(item)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-[#0e4971]/5 text-[#0e4971] px-3 py-1 rounded-full truncate max-w-[70%]">{item.email}</span>
                      <span className="p-3 text-[#0e4971] group-hover:bg-[#0e4971]/5 rounded-2xl transition-all" aria-hidden>
                        <ChevronRight size={20} />
                      </span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && !error && filteredStudents.length > 0 && (mode === "all" || mode === "students") && (
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-[#5b86a2]" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#5b86a2]">Students</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredStudents.map((item, index) => (
                <Link key={item.id} to={`/people/student/${item.id}`} className="block">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 shadow-sm hover:border-[#f37e22]/30 transition-all group h-full"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-[20px] bg-[#0e4971]/5 text-[#0e4971] flex items-center justify-center font-serif text-xl font-bold group-hover:bg-[#f37e22] group-hover:text-white transition-all">
                        {`${item.first_name?.[0] || ""}${item.last_name?.[0] || ""}`.toUpperCase() || "S"}
                      </div>
                      <div>
                        <h3 className="text-xl font-serif font-bold text-[#0e4971] group-hover:text-[#f37e22] transition-colors">{getFullName(item)}</h3>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#5b86a2]">Student</p>
                      </div>
                    </div>
                    <p className="text-[#5b86a2] text-sm leading-relaxed mb-4">{buildPeopleSummary(item)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-[#0e4971]/5 text-[#0e4971] px-3 py-1 rounded-full truncate max-w-[70%]">{item.email}</span>
                      <span className="p-3 text-[#0e4971] group-hover:bg-[#0e4971]/5 rounded-2xl transition-all" aria-hidden>
                        <ChevronRight size={20} />
                      </span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
