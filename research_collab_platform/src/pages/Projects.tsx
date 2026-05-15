import { motion } from "motion/react";
import { Plus, Briefcase, Clock, ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCurrentUser, projects } from "../lib/api";
import type { ProjectSummary } from "../lib/api";

export default function Projects() {
  const currentUser = getCurrentUser();
  const [projectsList, setProjectsList] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "draft" | "open" | "closed" | "archived">("all");

  const isResearcher = currentUser?.role === "researcher";
  const canCreateProject = isResearcher;

  async function loadProjects() {
    if (!currentUser) {
      setProjectsList([]);
      setLoading(false);
      setError("Sign in to see your projects.");
      return;
    }

    if (currentUser.role !== "researcher" && currentUser.role !== "student") {
      setProjectsList([]);
      setLoading(false);
      setError("Projects are available for student and researcher accounts.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await projects.listMine("desc");
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to load projects");
      }

      setProjectsList(response.data as ProjectSummary[]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || e?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, [currentUser?.id, currentUser?.role]);

  const filteredProjects = useMemo(() => {
    return projectsList.filter((project) => filter === "all" || project.status === filter);
  }, [filter, projectsList]);

  function formatDate(value?: string | null): string {
    if (!value) {
      return "Not set";
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

  function getStatusStyles(status: ProjectSummary["status"]): string {
    if (status === "open") {
      return "bg-[#22c55e]/10 text-[#22c55e]";
    }

    if (status === "draft") {
      return "bg-[#5b86a2]/10 text-[#5b86a2]";
    }

    if (status === "closed") {
      return "bg-[#f37e22]/10 text-[#f37e22]";
    }

    return "bg-[#0e4971]/10 text-[#0e4971]";
  }

  const pageSubtitle = isResearcher
    ? "Projects you lead or collaborate on."
    : "Projects you have joined as a member.";

  return (
    <div className="pt-32 pb-20 bg-[#f8f7f4] min-h-screen">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-serif font-bold text-[#0e4971] mb-2">My Projects</h1>
            <p className="text-[#5b86a2]">{pageSubtitle}</p>
          </div>
          {canCreateProject && (
            <Link
              to="/create-project"
              className="bg-[#f37e22] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-[#f37e22]/20"
            >
              <Plus size={20} /> New Project
            </Link>
          )}
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {(["all", "draft", "open", "closed", "archived"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                filter === status
                  ? "bg-[#0e4971] text-white"
                  : "bg-white text-[#5b86a2] border border-[#0e4971]/10 hover:border-[#0e4971]/30"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {loading && (
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-10 text-center text-[#5b86a2] shadow-sm">
            Loading your projects...
          </div>
        )}

        {error && !loading && (
          <div className="bg-white rounded-3xl border border-red-200 p-10 text-center text-red-500 shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && filteredProjects.length === 0 && (
          <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-10 text-center shadow-sm">
            <Sparkles className="mx-auto mb-3 text-[#f37e22]" size={32} />
            <h3 className="text-2xl font-serif font-bold text-[#0e4971] mb-2">No projects yet</h3>
            <p className="text-[#5b86a2] mb-6">
              {canCreateProject
                ? "Create your first project to see it here immediately."
                : "When a researcher accepts your application, the project will appear here."}
            </p>
            {canCreateProject && (
              <Link
                to="/create-project"
                className="inline-block bg-[#f37e22] text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-all"
              >
                Create Project
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {filteredProjects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-[32px] border border-[#0e4971]/10 p-8 shadow-sm hover:shadow-lg transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-[#f37e22]/10 p-3 rounded-2xl group-hover:bg-[#f37e22]/20 transition-colors">
                    <Briefcase className="text-[#f37e22]" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-[#0e4971] mb-1">
                      {project.title}
                    </h2>
                    <p className="text-xs font-bold text-[#f37e22] uppercase tracking-widest">
                      {project.category || "Project"}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${getStatusStyles(project.status)}`}
                >
                  {project.status}
                </span>
              </div>

              <p className="text-[#5b86a2] mb-6 line-clamp-2">
                {project.description || "No description provided."}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pb-6 border-b border-[#0e4971]/10">
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-[#f37e22]" />
                  <div>
                    <p className="text-[10px] text-[#5b86a2] uppercase font-bold">Deadline</p>
                    <p className="text-[#0e4971] font-semibold">{formatDate(project.application_deadline)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase size={16} className="text-[#f37e22]" />
                  <div>
                    <p className="text-[10px] text-[#5b86a2] uppercase font-bold">Project ID</p>
                    <p className="text-[#0e4971] font-semibold">#{project.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={16} className="text-[#5b86a2]" />
                  <div>
                    <p className="text-[10px] text-[#5b86a2] uppercase font-bold">Owner</p>
                    <p className="text-[#0e4971] font-semibold">Researcher #{project.created_by_researcher_id}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Link
                  to={`/projects/${project.id}`}
                  className="ml-auto flex items-center gap-2 text-[#f37e22] font-bold hover:gap-3 transition-all"
                >
                  View Details <ArrowRight size={18} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
