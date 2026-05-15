import { motion } from "motion/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Edit3,
  GraduationCap,
  Mail,
  MapPin,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { getCurrentUser, posts, researchers, researchAreas, skills, students, projects, type ProjectSummary } from "../lib/api";

type UserRole = "student" | "researcher";

type ProfileRecord = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  institution: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  gpa?: string | number | null;
  global_role?: "admin" | "member" | "team_leader" | "none";
};

type SkillItem = {
  id: number;
  name: string;
  description: string | null;
  source?: "manual" | "cv_nlp" | "inferred";
  confidence?: number | string;
};

type ResearchAreaItem = {
  id: number;
  name: string;
  description: string | null;
};

type PostItem = {
  id: number;
  project_id: number;
  created_by_researcher_id?: number;
  title: string;
  description: string | null;
  status: "draft" | "open" | "closed" | "archived" | "filled" | string;
  allow_students?: boolean | number;
  allow_researchers?: boolean | number;
  application_deadline: string | null;
  created_at: string;
  updated_at: string;
  post_kind?: "project_post" | "recruitment" | "discussion";
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

function buildInitials(firstName: string, lastName: string): string {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function readListResponse<T>(response: any): T[] {
  if (response?.success && Array.isArray(response.data)) {
    return response.data as T[];
  }

  return [];
}

function readGpa(profile: { gpa?: string | number | null } | null | undefined): string | number | null | undefined {
  return profile?.gpa;
}

function parseSelectedId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function Profile() {
  const navigate = useNavigate();
  const [authEpoch, setAuthEpoch] = useState(0);

  useEffect(() => {
    const onAuth = () => setAuthEpoch((n) => n + 1);
    window.addEventListener("auth-changed", onAuth);
    return () => window.removeEventListener("auth-changed", onAuth);
  }, []);

  const currentUser = useMemo(() => getCurrentUser(), [authEpoch]);
  const currentUserRole = (currentUser?.role ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("role") : null) ||
    "student") as UserRole;
  const role = currentUserRole;

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [linkedSkills, setLinkedSkills] = useState<SkillItem[]>([]);
  const [skillCatalog, setSkillCatalog] = useState<SkillItem[]>([]);
  const [linkedResearchAreas, setLinkedResearchAreas] = useState<ResearchAreaItem[]>([]);
  const [researchAreaCatalog, setResearchAreaCatalog] = useState<ResearchAreaItem[]>([]);
  const [recentPosts, setRecentPosts] = useState<PostItem[]>([]);
  const [myProjects, setMyProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillDraft, setSkillDraft] = useState("");
  const [skillSelection, setSkillSelection] = useState("");
  const [skillBusy, setSkillBusy] = useState(false);
  const [skillNote, setSkillNote] = useState<string | null>(null);
  const [areaDraft, setAreaDraft] = useState("");
  const [areaSelection, setAreaSelection] = useState("");
  const [areaBusy, setAreaBusy] = useState(false);
  const [areaNote, setAreaNote] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    institution: "",
    bio: "",
    gpa: "",
  });

  const fullName = useMemo(() => {
    if (!profile) {
      return "Your profile";
    }

    return `${profile.first_name} ${profile.last_name}`.trim();
  }, [profile]);

  const joinedLabel = useMemo(() => formatDate(profile?.created_at), [profile?.created_at]);
  const updatedLabel = useMemo(() => formatDate(profile?.updated_at), [profile?.updated_at]);

  async function loadProfileData() {
    if (!currentUser) {
      setLoading(false);
      setError("No authenticated user found.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profileRequest = role === "researcher" ? researchers.getMe() : students.getMe();
      const skillsRequest = role === "researcher" ? researchers.getSkills() : students.getSkills();
      const skillCatalogRequest = skills.list({ limit: 500 });
      const researchAreaCatalogRequest = researchAreas.list({ limit: 500 });
      const researchAreasRequest = role === "researcher" ? researchers.getResearchAreas() : Promise.resolve({ success: true, data: [] });
      const postsRequest = role === "researcher" && currentUser ? researchers.getPosts(currentUser.id) : Promise.resolve({ success: true, data: [] });
      const projectsRequest = projects.listMine("desc");

      const [profileResponse, linkedSkillsResponse, skillCatalogResponse, researchAreaCatalogResponse, linkedResearchAreasResponse, postsResponse, projectsResponse] = await Promise.all([
        profileRequest,
        skillsRequest,
        skillCatalogRequest,
        researchAreaCatalogRequest,
        researchAreasRequest,
        postsRequest,
        projectsRequest,
      ]);

      if (!profileResponse.success || !profileResponse.data) {
        throw new Error(profileResponse.message || "Failed to load profile");
      }

      const loadedProfile = profileResponse.data as ProfileRecord;
      setProfile(loadedProfile);
      setLinkedSkills(readListResponse<SkillItem>(linkedSkillsResponse));
      setSkillCatalog(readListResponse<SkillItem>(skillCatalogResponse));
      setResearchAreaCatalog(readListResponse<ResearchAreaItem>(researchAreaCatalogResponse));
      setLinkedResearchAreas(readListResponse<ResearchAreaItem>(linkedResearchAreasResponse));
      setRecentPosts(readListResponse<PostItem>(postsResponse));
      setMyProjects(projectsResponse.success && Array.isArray(projectsResponse.data) ? (projectsResponse.data as ProjectSummary[]) : []);
      setForm({
        firstName: loadedProfile.first_name || "",
        lastName: loadedProfile.last_name || "",
        institution: loadedProfile.institution || "",
        bio: loadedProfile.bio || "",
        gpa: readGpa(loadedProfile) === null || readGpa(loadedProfile) === undefined ? "" : String(readGpa(loadedProfile)),
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfileData();
  }, [currentUser?.id, currentUserRole, authEpoch]);

  async function refreshAfterChange() {
    const profileResponse = role === "researcher" ? await researchers.getMe() : await students.getMe();
    const linkedSkillsResponse = role === "researcher" ? await researchers.getSkills() : await students.getSkills();
    const skillCatalogResponse = await skills.list({ limit: 500 });
    const researchAreaCatalogResponse = await researchAreas.list({ limit: 500 });
    const linkedResearchAreasResponse = role === "researcher" ? await researchers.getResearchAreas() : { success: true, data: [] };
    const postsResponse = role === "researcher" && currentUser ? await researchers.getPosts(currentUser.id) : { success: true, data: [] };
    const projectsResponse = await projects.listMine("desc");

    if (profileResponse.success && profileResponse.data) {
      const refreshedProfile = profileResponse.data as ProfileRecord;
      setProfile(refreshedProfile);
      setForm({
        firstName: refreshedProfile.first_name || "",
        lastName: refreshedProfile.last_name || "",
        institution: refreshedProfile.institution || "",
        bio: refreshedProfile.bio || "",
        gpa: readGpa(refreshedProfile) === null || readGpa(refreshedProfile) === undefined ? "" : String(readGpa(refreshedProfile)),
      });
    }

    setLinkedSkills(readListResponse<SkillItem>(linkedSkillsResponse));
    setSkillCatalog(readListResponse<SkillItem>(skillCatalogResponse));
    setResearchAreaCatalog(readListResponse<ResearchAreaItem>(researchAreaCatalogResponse));
    setLinkedResearchAreas(readListResponse<ResearchAreaItem>(linkedResearchAreasResponse));
    setRecentPosts(readListResponse<PostItem>(postsResponse));
    setMyProjects(projectsResponse.success && Array.isArray(projectsResponse.data) ? (projectsResponse.data as ProjectSummary[]) : []);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (savingProfile || !profile) {
      return;
    }

    setSavingProfile(true);
    setError(null);

    try {
      const updatePayload = {
        first_name: normalizeName(form.firstName) || profile.first_name,
        last_name: normalizeName(form.lastName) || profile.last_name,
        institution: normalizeName(form.institution) || null,
        bio: normalizeName(form.bio) || null,
        ...(role === "student"
          ? { gpa: form.gpa.trim() ? Number(form.gpa) : null }
          : {}),
      };

      const response = role === "researcher"
        ? await researchers.updateMe(updatePayload)
        : await students.updateMe(updatePayload);

      if (!response.success || !response.data) {
        throw new Error(response.message || "Update failed");
      }

      setEditOpen(false);
      await refreshAfterChange();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function addSkill(skillId: number | null, skillName: string) {
    if (!skillId && !skillName) {
      return;
    }

    setSkillBusy(true);
    setSkillNote(null);
    setError(null);

    try {
      const payload = skillName ? { skill_name: skillName, source: "manual" as const } : { skill_id: skillId ?? undefined, source: "manual" as const };
      const response = role === "researcher"
        ? await researchers.addSkill(payload)
        : await students.addSkill(payload);

      if (!response.success) {
        throw new Error(response.message || "Failed to add skill");
      }

      setSkillDraft("");
      setSkillSelection("");
      setSkillNote("Skill added.");
      await refreshAfterChange();
    } catch (err: any) {
      setSkillNote(null);
      setError(err?.response?.data?.message || err?.message || "Failed to add skill");
    } finally {
      setSkillBusy(false);
    }
  }

  async function handleSubmitSkill() {
    const skillName = normalizeName(skillDraft);
    const skillId = parseSelectedId(skillSelection);

    if (!skillName && !skillId) {
      setSkillNote("Type a skill or choose one first.");
      return;
    }

    await addSkill(skillId, skillName);
  }

  async function handleRemoveSkill(skillId: number) {
    if (!skillId) {
      return;
    }

    setSkillBusy(true);
    setSkillNote(null);
    setError(null);

    try {
      const response = role === "researcher"
        ? await researchers.removeSkill(skillId)
        : await students.removeSkill(skillId);

      if (!response.success) {
        throw new Error(response.message || "Failed to remove skill");
      }

      setSkillNote("Skill removed.");
      await refreshAfterChange();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to remove skill");
    } finally {
      setSkillBusy(false);
    }
  }

  async function addResearchArea(areaId: number | null, areaName: string) {
    if (!areaId && !areaName) {
      return;
    }

    setAreaBusy(true);
    setAreaNote(null);
    setError(null);

    try {
      const response = await researchers.addResearchArea(areaName ? { research_area_name: areaName } : { research_area_id: areaId ?? undefined });
      if (!response.success) {
        throw new Error(response.message || "Failed to add research area");
      }

      setAreaDraft("");
      setAreaSelection("");
      setAreaNote("Research area added.");
      await refreshAfterChange();
    } catch (err: any) {
      setAreaNote(null);
      setError(err?.response?.data?.message || err?.message || "Failed to add research area");
    } finally {
      setAreaBusy(false);
    }
  }

  async function handleSubmitResearchArea() {
    const areaName = normalizeName(areaDraft);
    const areaId = parseSelectedId(areaSelection);

    if (!areaName && !areaId) {
      setAreaNote("Type a research area or choose one first.");
      return;
    }

    await addResearchArea(areaId, areaName);
  }

  async function handleRemoveResearchArea(areaId: number) {
    if (!areaId) {
      return;
    }

    setAreaBusy(true);
    setAreaNote(null);
    setError(null);

    try {
      const response = await researchers.removeResearchArea(areaId);
      if (!response.success) {
        throw new Error(response.message || "Failed to remove research area");
      }

      setAreaNote("Research area removed.");
      await refreshAfterChange();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to remove research area");
    } finally {
      setAreaBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen flex items-center justify-center">
        <div className="text-[#0e4971] font-semibold">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="bg-white rounded-[40px] border border-[#0e4971]/10 p-8 md:p-12 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#f37e22]/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#0e4971]/5 rounded-full -ml-28 -mb-28 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col md:flex-row gap-6 md:items-start">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[32px] bg-[#0e4971] text-white flex items-center justify-center font-serif text-5xl md:text-6xl font-bold shadow-2xl shadow-[#0e4971]/20 border-4 border-white shrink-0">
                {profile ? buildInitials(profile.first_name, profile.last_name) : "U"}
              </div>

              <div className="space-y-4 max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#0e4971] tracking-tight">{fullName}</h1>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${role === "student" ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-[#0e4971]/10 text-[#0e4971]"}`}>
                    {role}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#5b86a2]">
                  {role === "student"
                    ? "Student profile — skills and academic record visible to mentors and project leads."
                    : "Researcher profile — skills, research areas, and posts you publish on the platform."}
                </p>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-[#5b86a2]">
                  <div className="flex items-center gap-2"><Mail size={16} /> {profile?.email || "Loading..."}</div>
                  <div className="flex items-center gap-2"><MapPin size={16} /> {profile?.institution || "No institution set"}</div>
                  <div className="flex items-center gap-2"><Sparkles size={16} /> Joined {joinedLabel}</div>
                </div>

                <p className="text-lg text-[#0e4971] font-medium leading-relaxed max-w-2xl">
                  {profile?.bio || "No biography has been added yet."}
                </p>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="bg-[#f37e22] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-[#f37e22]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <Edit3 size={18} /> Edit Profile
                  </button>
                  {role === "researcher" && (
                    <button
                      type="button"
                      onClick={() => navigate("/ranking")}
                      className="bg-[#0e4971] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-[#0e4971]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                    >
                      <BarChart3 size={18} /> Ranking System
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-8 items-start">
          <aside className="space-y-8 xl:sticky xl:top-28">
            <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-8 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-serif font-bold text-[#0e4971] flex items-center gap-3">
                  <BookOpen className="text-[#f37e22]" /> Skills
                </h2>
              </div>

              <div className="space-y-5">
                <div className="space-y-3">
                  {linkedSkills.length === 0 ? (
                    <p className="text-[#5b86a2]">No skills linked to this account yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {linkedSkills.map((skill) => (
                        <span key={skill.id} className="inline-flex items-center gap-2 rounded-full border border-[#0e4971]/10 bg-[#0e4971]/5 px-4 py-2 text-sm font-semibold text-[#0e4971]">
                          {skill.name}
                          <button
                            type="button"
                            onClick={() => void handleRemoveSkill(skill.id)}
                            disabled={skillBusy}
                            className="text-[#5b86a2] hover:text-[#0e4971] disabled:opacity-50"
                            aria-label={`Remove ${skill.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4] p-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0e4971] uppercase tracking-wider mb-2">Type a skill or choose one</label>
                    <input
                      type="text"
                      value={skillDraft}
                      onChange={(e) => setSkillDraft(e.target.value)}
                      className="w-full bg-white border border-[#0e4971]/10 rounded-xl px-4 py-3 text-[#0e4971] outline-none focus:border-[#0e4971]"
                      placeholder="Machine learning"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0e4971] uppercase tracking-wider mb-2">Predefined skills</label>
                    <select
                      value={skillSelection}
                      onChange={(e) => setSkillSelection(e.target.value)}
                      className="w-full bg-white border border-[#0e4971]/10 rounded-xl px-4 py-3 text-[#0e4971] outline-none focus:border-[#0e4971]"
                    >
                      <option value="">Select an existing skill</option>
                      {skillCatalog.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleSubmitSkill()}
                      disabled={skillBusy}
                      className="inline-flex items-center gap-2 rounded-full border border-[#0e4971]/15 bg-white px-5 py-3 text-sm font-bold text-[#0e4971] transition-colors hover:bg-[#f8f7f4] disabled:opacity-60"
                    >
                      <Plus size={16} /> Add skill
                    </button>
                  </div>
                  {skillNote && <p className="text-sm text-[#5b86a2]">{skillNote}</p>}
                </div>
              </div>
            </div>

            {role === "researcher" && (
              <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-8 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-2xl font-serif font-bold text-[#0e4971] flex items-center gap-3">
                    <Award className="text-[#f37e22]" /> Research Areas
                  </h2>
                </div>

                <div className="space-y-5">
                  <div className="space-y-3">
                    {linkedResearchAreas.length === 0 ? (
                      <p className="text-[#5b86a2]">No research areas linked to this account yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {linkedResearchAreas.map((area) => (
                          <span key={area.id} className="inline-flex items-center gap-2 rounded-full border border-[#0e4971]/10 bg-[#0e4971]/5 px-4 py-2 text-sm font-semibold text-[#0e4971]">
                            {area.name}
                            <button
                              type="button"
                              onClick={() => void handleRemoveResearchArea(area.id)}
                              disabled={areaBusy}
                              className="text-[#5b86a2] hover:text-[#0e4971] disabled:opacity-50"
                              aria-label={`Remove ${area.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4] p-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0e4971] uppercase tracking-wider mb-2">Type a research area or choose one</label>
                      <input
                        type="text"
                        value={areaDraft}
                        onChange={(e) => setAreaDraft(e.target.value)}
                        className="w-full bg-white border border-[#0e4971]/10 rounded-xl px-4 py-3 text-[#0e4971] outline-none focus:border-[#0e4971]"
                        placeholder="Natural language processing"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#0e4971] uppercase tracking-wider mb-2">Predefined research areas</label>
                      <select
                        value={areaSelection}
                        onChange={(e) => setAreaSelection(e.target.value)}
                        className="w-full bg-white border border-[#0e4971]/10 rounded-xl px-4 py-3 text-[#0e4971] outline-none focus:border-[#0e4971]"
                      >
                        <option value="">Select an existing area</option>
                        {researchAreaCatalog.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleSubmitResearchArea()}
                        disabled={areaBusy}
                        className="inline-flex items-center gap-2 rounded-full border border-[#0e4971]/15 bg-white px-5 py-3 text-sm font-bold text-[#0e4971] transition-colors hover:bg-[#f8f7f4] disabled:opacity-60"
                      >
                        <Plus size={16} /> Add research area
                      </button>
                    </div>
                    {areaNote && <p className="text-sm text-[#5b86a2]">{areaNote}</p>}
                  </div>
                </div>
              </div>
            )}
          </aside>

          <div className="space-y-8">
            <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-8 md:p-10 shadow-sm">
              <h2 className="text-2xl font-serif font-bold text-[#0e4971] mb-8 flex items-center gap-3">
                <GraduationCap className="text-[#f37e22]" />
                {role === "student" ? "Academic record" : "Professional summary"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4] p-5">
                  <div className="text-[10px] uppercase tracking-widest text-[#5b86a2] mb-2">Institution</div>
                  <div className="text-[#0e4971] font-semibold">{profile?.institution || "Not set"}</div>
                </div>
                <div className="rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4] p-5">
                  <div className="text-[10px] uppercase tracking-widest text-[#5b86a2] mb-2">Role</div>
                  <div className="text-[#0e4971] font-semibold capitalize">{role}</div>
                </div>
                {role === "student" ? (
                  <div className="rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4] p-5 md:col-span-2">
                    <div className="text-[10px] uppercase tracking-widest text-[#5b86a2] mb-2">GPA</div>
                    <div className="text-3xl font-serif font-bold text-[#0e4971]">
                      {readGpa(profile) !== null && readGpa(profile) !== undefined && readGpa(profile) !== "" ? readGpa(profile) : "Not set"}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4] p-5 md:col-span-2">
                    <div className="text-[10px] uppercase tracking-widest text-[#5b86a2] mb-2">Global Role</div>
                    <div className="text-[#0e4971] font-semibold capitalize">{profile?.global_role || "none"}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-8 md:p-10 shadow-sm">
              <h2 className="text-2xl font-serif font-bold text-[#0e4971] mb-6 flex items-center gap-3">
                <Briefcase className="text-[#f37e22]" /> My projects
              </h2>
              {myProjects.length === 0 ? (
                <p className="text-[#5b86a2] text-sm">
                  {role === "student"
                    ? "When a researcher accepts your application, the project will appear here."
                    : "Projects you own or collaborate on appear here; accepted applicants also see the project on their profile."}
                </p>
              ) : (
                <ul className="space-y-3">
                  {myProjects.slice(0, 8).map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/projects/${p.id}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4]/60 px-4 py-3 text-[#0e4971] font-semibold hover:border-[#f37e22]/40 hover:text-[#f37e22] transition-colors"
                      >
                        <span className="truncate">{p.title}</span>
                        <span className="text-[10px] uppercase tracking-widest text-[#5b86a2] shrink-0">{p.status}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <Link to="/projects" className="text-sm font-bold text-[#f37e22] hover:underline">
                  Open projects page →
                </Link>
              </div>
            </div>

            {role === "researcher" && (
              <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-8 md:p-10 shadow-sm">
                <h2 className="text-2xl font-serif font-bold text-[#0e4971] mb-8 flex items-center gap-3">
                  <Plus className="text-[#f37e22]" /> Recent Posts
                </h2>

                {recentPosts.length === 0 ? (
                  <p className="text-[#5b86a2]">This account has not published any posts yet.</p>
                ) : (
                  <div className="space-y-4">
                    {recentPosts.slice(0, 5).map((post) => (
                      <div key={`${post.post_kind ?? "post"}-${post.id}`} className="rounded-2xl border border-[#0e4971]/10 bg-[#f8f7f4]/60 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="font-semibold text-[#0e4971]">{post.title}</div>
                          <div className="flex flex-wrap gap-2">
                            {post.post_kind && (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#f37e22] bg-[#f37e22]/10 px-2 py-1 rounded-full border border-[#f37e22]/20">
                                {post.post_kind === "project_post" ? "Project post" : post.post_kind === "recruitment" ? "Recruitment" : "Discussion"}
                              </span>
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#5b86a2] bg-white px-2 py-1 rounded-full border border-[#0e4971]/10">
                              {post.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-[#5b86a2] leading-relaxed mb-3">{post.description || "No description provided."}</p>
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-[#0e4971]">
                          <span className="bg-[#0e4971]/5 px-3 py-1 rounded-full">Project {post.project_id}</span>
                          {post.post_kind !== "discussion" && (
                            <>
                              <span className="bg-[#0e4971]/5 px-3 py-1 rounded-full">{post.allow_students ? "Students" : "No students"}</span>
                              <span className="bg-[#0e4971]/5 px-3 py-1 rounded-full">{post.allow_researchers ? "Researchers" : "No researchers"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {editOpen && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-[#0e4971]">Edit Profile</h2>
              <button onClick={() => setEditOpen(false)} aria-label="Close edit dialog">
                <X size={24} className="text-[#5b86a2]" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSave}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0e4971] uppercase tracking-wider mb-2">First Name</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 rounded-xl px-4 py-3 text-[#0e4971] outline-none focus:border-[#0e4971]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0e4971] uppercase tracking-wider mb-2">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 rounded-xl px-4 py-3 text-[#0e4971] outline-none focus:border-[#0e4971]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0e4971] uppercase tracking-wider mb-2">Institution</label>
                <input
                  type="text"
                  value={form.institution}
                  onChange={(e) => setForm((prev) => ({ ...prev, institution: e.target.value }))}
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 rounded-xl px-4 py-3 text-[#0e4971] outline-none focus:border-[#0e4971]"
                />
              </div>

              {role === "student" && (
                <div>
                  <label className="block text-xs font-bold text-[#0e4971] uppercase tracking-wider mb-2">GPA</label>
                  <input
                    type="text"
                    value={form.gpa}
                    onChange={(e) => setForm((prev) => ({ ...prev, gpa: e.target.value }))}
                    className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 rounded-xl px-4 py-3 text-[#0e4971] outline-none focus:border-[#0e4971]"
                    placeholder="3.80"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#0e4971] uppercase tracking-wider mb-2">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 rounded-xl px-4 py-3 text-[#0e4971] min-h-[120px] outline-none focus:border-[#0e4971]"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="flex-1 px-6 py-3 rounded-full text-sm font-bold text-[#5b86a2] hover:bg-[#f8f7f4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className={`flex-1 px-6 py-3 rounded-full text-sm font-bold text-white bg-[#0e4971] hover:bg-[#0a3a5c] transition-colors flex items-center justify-center gap-2 ${savingProfile ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  <Save size={16} /> {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
