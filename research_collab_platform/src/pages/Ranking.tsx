import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Play, Target, Sparkles, ChevronRight } from "lucide-react";
import { getCurrentUser, projects, type ProjectDetail, type ProjectSummary } from "../lib/api";

type SkillRow = { id: string; label: string; weight: number };

let skillRowSeq = 0;
function newSkillRowId(): string {
  skillRowSeq += 1;
  return `sk-${Date.now()}-${skillRowSeq}`;
}

function buildInitialRows(labels: string[]): SkillRow[] {
  if (labels.length === 0) {
    return [{ id: newSkillRowId(), label: "", weight: 0.5 }];
  }
  const w = 1 / labels.length;
  return labels.map((label) => ({ id: newSkillRowId(), label, weight: Number(w.toFixed(3)) }));
}

export default function Ranking() {
  const currentUser = getCurrentUser();
  const isResearcher = currentUser?.role === "researcher";
  const [projectOptions, setProjectOptions] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [skills, setSkills] = useState<SkillRow[]>([{ id: newSkillRowId(), label: "", weight: 0.5 }]);
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!isResearcher) {
      setProjectOptions([]);
      setSelectedProjectId("");
      return;
    }
    let cancelled = false;
    void projects.listMine("desc").then((res) => {
      if (cancelled || !res.success || !Array.isArray(res.data)) return;
      const list = res.data as ProjectSummary[];
      setProjectOptions(list);
      setSelectedProjectId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        return list[0]?.id ?? "";
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isResearcher, currentUser?.id]);

  const projectSkillLabels = useMemo(() => {
    const reqs = projectDetail?.requirements ?? [];
    const out: string[] = [];
    for (const r of reqs) {
      if (r.requirement_type !== "skill") continue;
      const t = String(r.requirement_text || "").trim();
      if (t && !out.includes(t)) out.push(t);
    }
    return out;
  }, [projectDetail]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void projects.getById(selectedProjectId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setProjectDetail(res.data);
      } else {
        setProjectDetail(null);
      }
      setDetailLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const projectSkillsSignature = useMemo(() => projectSkillLabels.join("\u0001"), [projectSkillLabels]);

  useEffect(() => {
    setSkills(buildInitialRows(projectSkillLabels));
    setShowResults(false);
  }, [selectedProjectId, projectSkillsSignature]);

  const selectedProject = projectOptions.find((p) => p.id === selectedProjectId) ?? null;
  const projectTitle = selectedProject?.title ?? "";

  const addSkill = () => setSkills([...skills, { id: newSkillRowId(), label: "", weight: 0.5 }]);
  const removeSkill = (id: string) => setSkills(skills.filter((s) => s.id !== id));
  const updateSkill = (id: string, field: "label" | "weight", value: string | number) => {
    setSkills(
      skills.map((s) => (s.id === id ? { ...s, [field]: field === "weight" ? Number(value) : String(value) } : s)),
    );
  };

  const totalWeight = skills.reduce((sum, s) => sum + Number(s.weight), 0);
  const [rankingResults, setRankingResults] = useState<any[]>([]);

  const runModel = async () => {
  try {
    setIsRunning(true);
    setShowResults(false);

    const projectSkills: Record<string, number> = {};

    skills.forEach((s) => {
      if (s.label.trim()) {
        projectSkills[s.label.trim()] = Number(s.weight);
      }
    });

    const payload = {
      project: {
        title: projectTitle,
        skills: projectSkills,
      },

      students: [
        {
          name: "Nada BELMILOUD",
          skills: ["Python", "Machine Learning"],
          experience: 1,
          motivation: 0.9,
        },
        {
          name: "Yacine",
          skills: ["Java", "SQL"],
          experience: 0,
          motivation: 0.7,
        },
        {
          name: "Sara",
          skills: ["Python", "Data Analysis"],
          experience: 1,
          motivation: 0.8,
        },
      ],
    };

    const response = await fetch("http://127.0.0.1:8000/rank", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    setRankingResults(data);

    setShowResults(true);
  } catch (error) {
    console.error("Ranking error:", error);
  } finally {
    setIsRunning(false);
  }
};

  const canRun =
    skills.some((s) => s.label.trim()) &&
    (!isResearcher || (projectOptions.length > 0 && Boolean(selectedProjectId)));

  return (
    <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-[#5b86a2]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#5b86a2]">AI Matching Engine</span>
          </div>
          <h1 className="text-4xl font-serif font-bold text-[#0e4971] mb-2 tracking-tight">Student Ranking Configuration</h1>
          <p className="text-[#5b86a2]">
            Pick one of your projects, then choose weighted skills from that project&apos;s saved skill requirements (or add a
            custom line if none are configured yet).
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-8 shadow-sm">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Project</label>
                  {isResearcher && projectOptions.length > 0 ? (
                    <select
                      value={selectedProjectId === "" ? "" : String(selectedProjectId)}
                      onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : "")}
                      className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 rounded-xl py-3 px-4 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                    >
                      {projectOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                          {p.category ? ` — ${p.category}` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-[#5b86a2] rounded-xl border border-[#0e4971]/10 bg-[#f8f7f4] px-4 py-3">
                      {isResearcher
                        ? "You have no projects yet. Create a project under Projects, then return here to select it."
                        : "Project selection is available to researcher accounts with at least one project."}
                    </p>
                  )}
                  {detailLoading && selectedProjectId !== "" && (
                    <p className="text-xs text-[#5b86a2]">Loading project requirements…</p>
                  )}
                  {!detailLoading && isResearcher && selectedProjectId !== "" && projectSkillLabels.length === 0 && (
                    <p className="text-xs text-[#5b86a2]">
                      This project has no skill-type requirements yet. Add them on the project page, or type a custom skill
                      label in a row below.
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest">Required skills & weight</label>
                    <span className={`text-[10px] font-bold ${Math.abs(totalWeight - 1) < 0.01 ? "text-[#22c55e]" : "text-[#f37e22]"}`}>
                      Total weight: {totalWeight.toFixed(1)} / 1.0
                    </span>
                  </div>

                  <div className="space-y-3">
                    {skills.map((skill) => (
                      <div key={skill.id} className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="flex-grow min-w-0">
                          <label className="sr-only" htmlFor={`skill-${skill.id}`}>
                            Skill
                          </label>
                          {projectSkillLabels.length > 0 ? (
                            <select
                              id={`skill-${skill.id}`}
                              value={projectSkillLabels.includes(skill.label) ? skill.label : ""}
                              onChange={(e) => updateSkill(skill.id, "label", e.target.value)}
                              className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 rounded-xl py-3 px-4 outline-none focus:border-[#0e4971] transition-colors text-sm text-[#0e4971]"
                            >
                              <option value="">Select a project skill…</option>
                              {projectSkillLabels.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              id={`skill-${skill.id}`}
                              type="text"
                              value={skill.label}
                              onChange={(e) => updateSkill(skill.id, "label", e.target.value)}
                              placeholder="Skill name…"
                              className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 rounded-xl py-3 px-4 outline-none focus:border-[#0e4971] transition-colors text-sm"
                            />
                          )}
                        </div>
                        <div className="w-full sm:w-24 shrink-0">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={skill.weight}
                            onChange={(e) => updateSkill(skill.id, "weight", e.target.value)}
                            className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 rounded-xl py-3 px-4 outline-none focus:border-[#0e4971] transition-colors text-sm text-center font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSkill(skill.id)}
                          className="p-3 text-[#f37e22] hover:bg-[#f37e22]/5 rounded-xl transition-colors shrink-0 self-end sm:self-center"
                          aria-label="Remove skill row"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addSkill}
                    className="w-full border-2 border-dashed border-[#0e4971]/10 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-bold text-[#5b86a2] hover:border-[#0e4971]/30 hover:text-[#0e4971] transition-all"
                  >
                    <Plus size={16} /> Add skill row
                  </button>
                </div>
              </div>

              <div className="mt-12">
                <button
                  type="button"
                  disabled={isRunning || !canRun}
                  onClick={runModel}
                  className="w-full bg-[#0e4971] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#0e4971]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                      />
                      Running matching model…
                    </>
                  ) : (
                    <>
                      <Play size={18} /> Run matching model
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#0e4971] rounded-3xl p-8 text-white">
              <Target className="text-[#f37e22] mb-6" size={32} />
              <h3 className="text-xl font-serif font-bold mb-4">How it works</h3>
              <ul className="space-y-4 text-sm text-white/70 leading-relaxed">
                <li className="flex gap-3">
                  <span className="text-[#f37e22] font-bold">01</span>
                  <span>Choose a project; skill rows prefer requirements of type &quot;skill&quot; stored on that project.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#f37e22] font-bold">02</span>
                  <span>Weights determine the influence of each skill on the final score.</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#f37e22] font-bold">03</span>
                  <span>Platform history adds a contribution bonus to regular contributors.</span>
                </li>
              </ul>
            </div>

            <AnimatePresence>
              {showResults && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl border-2 border-[#f37e22] p-8 shadow-xl shadow-[#f37e22]/10"
                >
                  <div className="flex items-center gap-2 text-[#f37e22] font-bold text-sm uppercase tracking-widest mb-4">
                    <Sparkles size={18} /> Match results
                  </div>
                  {projectTitle && <p className="text-sm text-[#5b86a2] mb-4 font-semibold">Project: {projectTitle}</p>}
                  <div className="space-y-6">
  {rankingResults.map((student, index) => (
    <div key={index} className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[#0e4971] text-white flex items-center justify-center font-bold">
        {student.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)}
      </div>

      <div className="flex-grow">
        <div className="flex justify-between text-xs font-bold text-[#0e4971] mb-1">
          <span>{student.name}</span>
          <span>{Math.round(student.final_score * 100)}% match</span>
        </div>

        <div className="h-1.5 w-full bg-[#0e4971]/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#f37e22]"
            style={{
              width: `${Math.round(student.final_score * 100)}%`,
            }}
          />
        </div>

        <div className="text-[11px] text-[#5b86a2] mt-1">
          Matched skills: {student.matched_skills.join(", ")}
        </div>
      </div>
    </div>
  ))}
</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
