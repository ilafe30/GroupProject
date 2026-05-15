import { motion } from "motion/react";
import { ArrowLeft, Briefcase, Calendar, Clock, ClipboardList, GraduationCap, Layers, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { projects, type ProjectDetail } from "../lib/api";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function TextBlock({ title, body }: { title: string; body: string | null | undefined }) {
  if (!body?.trim()) return null;
  return (
    <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 md:p-8 shadow-sm">
      <h2 className="text-lg font-serif font-bold text-[#0e4971] mb-3">{title}</h2>
      <p className="text-[#5b86a2] text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setError("Missing project id");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await projects.getById(id);
        if (cancelled) return;
        if (!res.success || !res.data) {
          throw new Error(res.message || "Failed to load project");
        }
        setProject(res.data);
      } catch (e: unknown) {
        if (!cancelled) {
          const err = e as { response?: { data?: { message?: string } }; message?: string };
          setError(err?.response?.data?.message || err?.message || "Failed to load project");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 bg-[#f8f7f4] min-h-screen text-center text-[#5b86a2]">Loading project…</div>
    );
  }

  if (error || !project) {
    return (
      <div className="pt-32 pb-20 bg-[#f8f7f4] min-h-screen text-center px-4">
        <p className="text-red-600 mb-4">{error || "Project not found"}</p>
        <Link to="/projects" className="text-[#f37e22] font-semibold hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  const statusStyles =
    project.status === "open"
      ? "bg-[#22c55e]/10 text-[#22c55e]"
      : project.status === "draft"
        ? "bg-[#5b86a2]/10 text-[#5b86a2]"
        : project.status === "closed"
          ? "bg-[#f37e22]/10 text-[#f37e22]"
          : "bg-[#0e4971]/10 text-[#0e4971]";

  return (
    <div className="pt-28 pb-20 bg-[#f8f7f4] min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#5b86a2] hover:text-[#0e4971] mb-6"
        >
          <ArrowLeft size={18} /> My projects
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] border border-[#0e4971]/10 p-8 md:p-10 shadow-sm mb-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <div className="bg-[#f37e22]/10 p-4 rounded-2xl">
                <Briefcase className="text-[#f37e22]" size={28} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#f37e22] mb-1">
                  {project.category || "Project"}
                </p>
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#0e4971] leading-tight">{project.title}</h1>
                <p className="text-sm text-[#5b86a2] mt-2">
                  Lead researcher:{" "}
                  {(() => {
                    const owner = project.researchers?.find((r) => r.project_role === "owner");
                    const rid = owner?.researcher_id ?? project.created_by_researcher_id;
                    const label = owner ? `${owner.first_name} ${owner.last_name}`.trim() : `Researcher #${rid}`;
                    return (
                      <Link to={`/people/researcher/${rid}`} className="text-[#0e4971] font-semibold hover:text-[#f37e22]">
                        {label}
                      </Link>
                    );
                  })()}
                </p>
              </div>
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${statusStyles}`}>
              {project.status}
            </span>
          </div>
          {project.description && (
            <p className="text-[#5b86a2] leading-relaxed border-t border-[#0e4971]/10 pt-6">{project.description}</p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {[
            { label: "Application deadline", value: formatDate(project.application_deadline), icon: Calendar },
            { label: "Duration (months)", value: project.duration_months != null ? String(project.duration_months) : "—", icon: Clock },
            { label: "Timeframe", value: project.timeframe || "—", icon: Layers },
            { label: "Minimum GPA", value: project.minimum_gpa != null ? String(project.minimum_gpa) : "—", icon: GraduationCap },
            { label: "PhD funding", value: project.phd_funding ? "Yes" : "No", icon: Briefcase },
            { label: "Stipend", value: project.stipend ? "Yes" : "No", icon: Briefcase },
            { label: "Internship season", value: project.internship_season || "—", icon: Calendar },
            { label: "Created", value: formatDate(project.created_at), icon: Calendar },
          ].map((row) => (
            <div
              key={row.label}
              className="bg-white rounded-2xl border border-[#0e4971]/10 p-4 flex items-center gap-3 shadow-sm"
            >
              <row.icon size={20} className="text-[#f37e22] shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-[#5b86a2] tracking-wide">{row.label}</p>
                <p className="text-[#0e4971] font-semibold">{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6 mb-8">
          <TextBlock title="Background & prerequisites" body={project.background_requirements} />
          <TextBlock title="Required skills" body={project.required_skills_text} />
          <TextBlock title="Research interests" body={project.interests_text} />
          <TextBlock title="References" body={project.references_text} />
          <TextBlock title="Accepted master degrees" body={project.master_degrees_text} />
        </div>

        {project.research_areas?.length > 0 && (
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 md:p-8 shadow-sm mb-8">
            <h2 className="text-lg font-serif font-bold text-[#0e4971] mb-4 flex items-center gap-2">
              <Layers className="text-[#f37e22]" size={22} /> Research areas
            </h2>
            <ul className="flex flex-wrap gap-2">
              {project.research_areas.map((a) => (
                <li
                  key={a.research_area_id}
                  className="px-3 py-1.5 rounded-full bg-[#0e4971]/5 text-[#0e4971] text-sm font-medium"
                >
                  {a.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {project.requirements?.length > 0 && (
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 md:p-8 shadow-sm mb-8">
            <h2 className="text-lg font-serif font-bold text-[#0e4971] mb-4 flex items-center gap-2">
              <ClipboardList className="text-[#f37e22]" size={22} /> Structured requirements
            </h2>
            <ul className="space-y-3">
              {project.requirements.map((r) => (
                <li key={r.id} className="border border-[#0e4971]/10 rounded-xl p-4 text-sm">
                  <span className="text-xs font-bold uppercase text-[#f37e22]">{r.requirement_type}</span>
                  {Boolean(r.is_mandatory) && (
                    <span className="ml-2 text-xs font-bold text-red-600 uppercase">Required</span>
                  )}
                  <p className="text-[#5b86a2] mt-1 whitespace-pre-wrap">{r.requirement_text}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 shadow-sm">
            <h2 className="text-lg font-serif font-bold text-[#0e4971] mb-4 flex items-center gap-2">
              <Users className="text-[#f37e22]" size={22} /> Researchers
            </h2>
            <ul className="space-y-3">
              {(project.researchers || []).map((r) => (
                <li key={r.id} className="flex flex-col gap-0.5 text-sm">
                  <Link
                    to={`/people/researcher/${r.researcher_id}`}
                    className="font-semibold text-[#0e4971] hover:text-[#f37e22]"
                  >
                    {r.first_name} {r.last_name}
                  </Link>
                  <span className="text-xs text-[#5b86a2] capitalize">{r.project_role.replace(/_/g, " ")}</span>
                </li>
              ))}
              {(!project.researchers || project.researchers.length === 0) && (
                <p className="text-[#5b86a2] text-sm">No researchers listed.</p>
              )}
            </ul>
          </div>
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 shadow-sm">
            <h2 className="text-lg font-serif font-bold text-[#0e4971] mb-4 flex items-center gap-2">
              <GraduationCap className="text-[#f37e22]" size={22} /> Students
            </h2>
            <ul className="space-y-3">
              {(project.students || []).map((s) => (
                <li key={s.id} className="flex flex-col gap-0.5 text-sm">
                  <Link to={`/people/student/${s.student_id}`} className="font-semibold text-[#0e4971] hover:text-[#f37e22]">
                    {s.first_name} {s.last_name}
                  </Link>
                  <span className="text-xs text-[#5b86a2]">
                    {s.participation_role} · {s.status}
                  </span>
                </li>
              ))}
              {(!project.students || project.students.length === 0) && (
                <p className="text-[#5b86a2] text-sm">No students listed yet.</p>
              )}
            </ul>
          </div>
        </div>

        {project.teams?.length > 0 && (
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-serif font-bold text-[#0e4971] mb-4">Linked teams</h2>
            <ul className="space-y-4">
              {project.teams.map((t) => (
                <li key={t.team_id} className="border border-[#0e4971]/10 rounded-xl p-4">
                  <p className="font-semibold text-[#0e4971]">{t.name}</p>
                  {t.role_description && <p className="text-sm text-[#5b86a2] mt-1">{t.role_description}</p>}
                  {t.description && <p className="text-xs text-[#5b86a2] mt-2">{t.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
