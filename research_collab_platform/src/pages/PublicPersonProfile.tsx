import { motion } from "motion/react";
import { ArrowLeft, Briefcase, Building2, FileText, GraduationCap, Microscope, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getCurrentUser,
  researchers,
  students,
  type ResearcherProfile,
  type SkillItem,
  type StudentProfile,
  type ResearchAreaItem,
} from "../lib/api";

type Role = "student" | "researcher";

type ProjectRow = {
  id: number;
  title: string;
  category?: string | null;
  status?: string;
  project_role?: string;
  membership_status?: string;
  joined_at?: string;
};

type ActivityPost = {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at?: string;
  post_kind?: string;
  allow_students?: boolean | number;
  allow_researchers?: boolean | number;
};

function readArray<T>(res: { success?: boolean; data?: unknown }): T[] {
  if (res?.success && Array.isArray(res.data)) {
    return res.data as T[];
  }
  return [];
}

export default function PublicPersonProfile() {
  const { role, id } = useParams<{ role: string; id: string }>();
  const parsedRole = role === "student" || role === "researcher" ? (role as Role) : null;
  const numericId = id ? Number(id) : NaN;
  const current = getCurrentUser();

  const [profile, setProfile] = useState<StudentProfile | ResearcherProfile | null>(null);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [areas, setAreas] = useState<ResearchAreaItem[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [activityPosts, setActivityPosts] = useState<ActivityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSelf = useMemo(() => {
    if (!current || !parsedRole || !Number.isFinite(numericId)) return false;
    return current.role === parsedRole && current.id === numericId;
  }, [current, parsedRole, numericId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!parsedRole || !Number.isFinite(numericId)) {
        setError("Invalid profile link");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (parsedRole === "student") {
          const [pRes, sRes, projRes, postsRes] = await Promise.all([
            students.getById(numericId),
            students.getSkills(numericId),
            students.getProjects(numericId),
            students.getPosts(numericId),
          ]);
          if (cancelled) return;
          if (!pRes.success || !pRes.data) throw new Error(pRes.message || "Profile not found");
          setProfile(pRes.data);
          setSkills(sRes.success && sRes.data ? sRes.data : []);
          setAreas([]);
          setProjects(readArray<ProjectRow>(projRes));
          setActivityPosts(readArray<ActivityPost>(postsRes));
        } else {
          const [pRes, sRes, aRes, projRes, postsRes] = await Promise.all([
            researchers.getById(numericId),
            researchers.getSkills(numericId),
            researchers.getResearchAreas(numericId),
            researchers.getProjects(numericId),
            researchers.getPosts(numericId),
          ]);
          if (cancelled) return;
          if (!pRes.success || !pRes.data) throw new Error(pRes.message || "Profile not found");
          setProfile(pRes.data);
          setSkills(sRes.success && sRes.data ? sRes.data : []);
          setAreas(aRes.success && aRes.data ? aRes.data : []);
          setProjects(readArray<ProjectRow>(projRes));
          setActivityPosts(readArray<ActivityPost>(postsRes));
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const err = e as { response?: { data?: { message?: string } }; message?: string };
          setError(err?.response?.data?.message || err?.message || "Could not load profile");
          setProfile(null);
          setProjects([]);
          setActivityPosts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [parsedRole, numericId]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 bg-[#f8f7f4] min-h-screen text-center text-[#5b86a2]">Loading profile…</div>
    );
  }

  if (error || !profile) {
    return (
      <div className="pt-32 pb-20 bg-[#f8f7f4] min-h-screen text-center px-4">
        <p className="text-red-600 mb-4">{error || "Profile not found"}</p>
        <Link to="/search" className="text-[#f37e22] font-semibold hover:underline">
          Back to search
        </Link>
      </div>
    );
  }

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  const subtitle = parsedRole === "student" ? "Student" : "Researcher";
  const gpa = parsedRole === "student" && "gpa" in profile && profile.gpa != null ? String(profile.gpa) : null;
  const globalRole = parsedRole === "researcher" && "global_role" in profile ? profile.global_role : null;

  return (
    <div className="pt-28 pb-20 bg-[#f8f7f4] min-h-screen">
      <div className="max-w-3xl mx-auto px-4">
        <Link to="/search" className="inline-flex items-center gap-2 text-sm font-semibold text-[#5b86a2] hover:text-[#0e4971] mb-6">
          <ArrowLeft size={18} /> Search
        </Link>
        {isSelf && (
          <p className="text-sm text-[#5b86a2] mb-4">
            This is your public profile.{" "}
            <Link to="/profile" className="text-[#f37e22] font-semibold hover:underline">
              Edit in account settings
            </Link>
          </p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] border border-[#0e4971]/10 p-8 md:p-10 shadow-sm mb-8"
        >
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-[#0e4971]/10 flex items-center justify-center text-2xl font-serif font-bold text-[#0e4971] shrink-0">
              {profile.profile_image_url ? (
                <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase() || <User size={32} />
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#f37e22] mb-1 flex items-center gap-2">
                {parsedRole === "student" ? <GraduationCap size={14} /> : <Microscope size={14} />}
                {subtitle}
              </p>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#0e4971]">{fullName}</h1>
              {profile.institution && (
                <p className="text-[#5b86a2] mt-2 flex items-center gap-2 text-sm">
                  <Building2 size={16} className="text-[#f37e22]" />
                  {profile.institution}
                </p>
              )}
              <p className="text-sm text-[#5b86a2] mt-3">
                <span className="font-semibold text-[#0e4971]">Email:</span> {profile.email}
              </p>
              {gpa && (
                <p className="text-sm text-[#5b86a2] mt-1">
                  <span className="font-semibold text-[#0e4971]">GPA:</span> {gpa}
                </p>
              )}
              {globalRole && (
                <p className="text-sm text-[#5b86a2] mt-1 capitalize">
                  <span className="font-semibold text-[#0e4971]">Platform role:</span> {globalRole.replace(/_/g, " ")}
                </p>
              )}
            </div>
          </div>
          {profile.bio?.trim() && (
            <div className="mt-8 pt-8 border-t border-[#0e4971]/10">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[#5b86a2] mb-2">About</h2>
              <p className="text-[#0e4971] leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}
        </motion.div>

        {areas.length > 0 && (
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 md:p-8 shadow-sm mb-8">
            <h2 className="text-lg font-serif font-bold text-[#0e4971] mb-4">Research areas</h2>
            <ul className="flex flex-wrap gap-2">
              {areas.map((a) => (
                <li key={a.id} className="px-3 py-1.5 rounded-full bg-[#0e4971]/5 text-[#0e4971] text-sm font-medium">
                  {a.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 md:p-8 shadow-sm mb-8">
          <h2 className="text-lg font-serif font-bold text-[#0e4971] mb-4 flex items-center gap-2">
            <Briefcase className="text-[#f37e22]" size={20} /> Projects
          </h2>
          {projects.length === 0 ? (
            <p className="text-[#5b86a2] text-sm">No projects to show yet.</p>
          ) : (
            <ul className="space-y-3">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/projects/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4]/60 px-4 py-3 text-[#0e4971] font-semibold hover:border-[#f37e22]/40 hover:text-[#f37e22] transition-colors"
                  >
                    <span className="truncate">{p.title}</span>
                    <span className="text-[10px] uppercase tracking-widest text-[#5b86a2] shrink-0">
                      {p.status ?? "—"}
                      {p.project_role ? ` · ${p.project_role}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 md:p-8 shadow-sm mb-8">
          <h2 className="text-lg font-serif font-bold text-[#0e4971] mb-4 flex items-center gap-2">
            <FileText className="text-[#f37e22]" size={20} /> Posts & activity
          </h2>
          {activityPosts.length === 0 ? (
            <p className="text-[#5b86a2] text-sm">No posts published on the platform yet.</p>
          ) : (
            <ul className="space-y-4">
              {activityPosts.slice(0, 12).map((post) => (
                <li
                  key={`${post.post_kind ?? "post"}-${post.id}`}
                  className="rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4]/60 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-[#0e4971]">{post.title}</span>
                    <div className="flex flex-wrap gap-2">
                      {post.post_kind && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#f37e22] bg-[#f37e22]/10 px-2 py-0.5 rounded-full">
                          {post.post_kind === "project_post"
                            ? "Project post"
                            : post.post_kind === "recruitment"
                              ? "Recruitment"
                              : "Discussion"}
                        </span>
                      )}
                      <span className="text-[10px] font-bold uppercase text-[#5b86a2]">{post.status}</span>
                    </div>
                  </div>
                  {post.description && (
                    <p className="text-sm text-[#5b86a2] line-clamp-3">{post.description}</p>
                  )}
                  <p className="text-[10px] text-[#5b86a2] mt-2">Project #{post.project_id}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-serif font-bold text-[#0e4971] mb-4">Skills</h2>
          {skills.length === 0 ? (
            <p className="text-[#5b86a2] text-sm">No skills listed.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <li key={s.id} className="px-3 py-1.5 rounded-full border border-[#0e4971]/15 text-sm text-[#0e4971]">
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
