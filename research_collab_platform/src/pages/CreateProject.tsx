import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Briefcase, Globe, Lock, Send, Sparkles, Users, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, projects } from "../lib/api";
import { SkillChipsInput } from "../components/SkillChipsInput";

export default function CreateProject() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const canCreateProject = currentUser?.role === "researcher";
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Project State
  const [projectTitle, setProjectTitle] = useState("");
  const [projectCategory, setProjectCategory] = useState("");
  const [projectDuration, setProjectDuration] = useState("");
  const [durationDescription, setDurationDescription] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [backgroundReqs, setBackgroundReqs] = useState("");
  const [requiredSkillChips, setRequiredSkillChips] = useState<string[]>([]);
  const [requiredSkillDraft, setRequiredSkillDraft] = useState("");
  const [interests, setInterests] = useState("");
  const [references, setReferences] = useState("");
  const [masterDegrees, setMasterDegrees] = useState("");
  const [projectDirector, setProjectDirector] = useState("");
  const [internshipSeason, setInternshipSeason] = useState("");
  const [minimumGPA, setMinimumGPA] = useState("");
  const [phdFunding, setPhdFunding] = useState("");
  const [stipend, setStipend] = useState("");
  const [collaborationType, setCollaborationType] = useState<"student" | "teacher" | "both">("both");

  const parseDeadline = (value: string) => {
    if (!value.trim()) return null;
    if (value.includes('T')) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (!match) return value;
    const [, day, month, year, hour, minute] = match;
    return `${year}-${month}-${day} ${hour}:${minute}:00`;
  };

  const mapDurationMonths = (value: string) => {
    switch (value) {
      case "1-3-months": return 3;
      case "3-6-months": return 6;
      case "6-12-months": return 12;
      case "1-2-years": return 24;
      case "ongoing": return null;
      default: return null;
    }
  };

  const addProjectSkill = () => {
    const s = requiredSkillDraft.trim();
    if (!s) return;
    if (requiredSkillChips.some((c) => c.toLowerCase() === s.toLowerCase())) {
      setRequiredSkillDraft("");
      return;
    }
    setRequiredSkillChips((prev) => [...prev, s]);
    setRequiredSkillDraft("");
  };

  const removeProjectSkill = (skill: string) => {
    setRequiredSkillChips((prev) => prev.filter((x) => x !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!canCreateProject) {
      setError("Only researcher accounts can create projects.");
      return;
    }

    if (requiredSkillChips.length === 0) {
      setError("Add at least one required skill.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const statusValue = privacy === 'public' ? 'open' : 'draft';
      const projectNotes = [
        projectDesc.trim(),
        durationDescription.trim() ? `Duration details: ${durationDescription.trim()}` : "",
        projectDirector.trim() ? `Project director: ${projectDirector.trim()}` : "",
      ].filter(Boolean).join("\n\n");

      const payload = {
        title: projectTitle.trim(),
        category: projectCategory || undefined,
        duration_months: mapDurationMonths(projectDuration),
        timeframe: timeframe || undefined,
        application_deadline: parseDeadline(applicationDeadline),
        description: projectNotes || undefined,
        background_requirements: backgroundReqs || undefined,
        required_skills_text: requiredSkillChips.join(", "),
        interests_text: interests || undefined,
        references_text: references || undefined,
        master_degrees_text: masterDegrees || undefined,
        internship_season: internshipSeason || undefined,
        minimum_gpa: minimumGPA ? Number(minimumGPA) : null,
        phd_funding: phdFunding !== '' && phdFunding !== 'no',
        stipend: stipend.trim().length > 0 && stipend.toLowerCase() !== 'no',
        status: statusValue as 'draft' | 'open' | 'closed' | 'archived',
      };

      if (!payload.title) {
        setError('Title is required');
        return;
      }

      const response = await projects.create(payload);
      if (!response.success) {
        setError(response.message || 'Project creation failed');
        return;
      }

      navigate('/projects');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Project creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen">
      <div className="max-w-4xl mx-auto px-4">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-[#5b86a2]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#5b86a2]">Project Management</span>
          </div>
          <h1 className="text-4xl font-serif font-bold text-[#0e4971] mb-2 tracking-tight">Create a New Project</h1>
          <p className="text-[#5b86a2]">Define your project requirements and recruit collaborators.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {/* Section 1: Basic Information */}
          <div className="bg-white rounded-[32px] border border-[#0e4971]/10 p-8 space-y-6 shadow-xl shadow-[#0e4971]/5">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#0e4971]/10">
              <Briefcase className="text-[#f37e22]" size={20} />
              <h3 className="font-bold text-[#0e4971] text-sm">Project Information</h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Title of the Project *</label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. NLP-based Fraud Detection System"
                className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Category *</label>
                <select
                  value={projectCategory}
                  onChange={(e) => setProjectCategory(e.target.value)}
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                  required
                >
                  <option value="">Select a category</option>
                  <option value="research-paper">Research Paper</option>
                  <option value="industry-project">Industry Project</option>
                  <option value="thesis-project">Thesis Project</option>
                  <option value="internship">Internship</option>
                  <option value="phd-research">PhD Research</option>
                  <option value="startup">Startup Initiative</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Duration *</label>
                <select
                  value={projectDuration}
                  onChange={(e) => setProjectDuration(e.target.value)}
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                  required
                >
                  <option value="">Select duration</option>
                  <option value="1-3-months">1-3 Months</option>
                  <option value="3-6-months">3-6 Months</option>
                  <option value="6-12-months">6-12 Months</option>
                  <option value="1-2-years">1-2 Years</option>
                  <option value="ongoing">Ongoing</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Duration of the Project (Details)</label>
                <input
                  type="text"
                  value={durationDescription}
                  onChange={(e) => setDurationDescription(e.target.value)}
                  placeholder="e.g. Full-time from March to August 2025"
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Timeframe *</label>
                <input
                  type="text"
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  placeholder="e.g. Spring 2025"
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Application Deadline * (DD/MM/YYYY HH:MM)</label>
              <input
                type="text"
                value={applicationDeadline}
                onChange={(e) => setApplicationDeadline(e.target.value)}
                placeholder="e.g. 15/02/2025 23:59 or 2025-02-15T23:59"
                className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                required
              />
            </div>
          </div>

          {/* Section 2: Project Details */}
          <div className="bg-white rounded-[32px] border border-[#0e4971]/10 p-8 space-y-6 shadow-xl shadow-[#0e4971]/5">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#0e4971]/10">
              <Briefcase className="text-[#f37e22]" size={20} />
              <h3 className="font-bold text-[#0e4971] text-sm">Project Details</h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Description *</label>
              <textarea
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                rows={4}
                placeholder="Write a brief description or abstract of the project..."
                className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971] resize-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Background Requirements *</label>
              <textarea
                value={backgroundReqs}
                onChange={(e) => setBackgroundReqs(e.target.value)}
                rows={3}
                placeholder="Write the fields/backgrounds eligible for the application of this project..."
                className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971] resize-none"
                required
              />
            </div>

            <SkillChipsInput
              label="Required skills *"
              hint="Add one skill at a time — they are saved as a comma-separated list on the project."
              chips={requiredSkillChips}
              draft={requiredSkillDraft}
              onDraftChange={setRequiredSkillDraft}
              onAdd={addProjectSkill}
              onRemove={removeProjectSkill}
              disabled={loading}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Recommended Interests</label>
                <textarea
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  rows={3}
                  placeholder="Recommended interests of the applicants..."
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">References (if any)</label>
                <textarea
                  value={references}
                  onChange={(e) => setReferences(e.target.value)}
                  rows={3}
                  placeholder="Add the references, if there is any..."
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Eligibility & Requirements */}
          <div className="bg-white rounded-[32px] border border-[#0e4971]/10 p-8 space-y-6 shadow-xl shadow-[#0e4971]/5">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#0e4971]/10">
              <Users className="text-[#f37e22]" size={20} />
              <h3 className="font-bold text-[#0e4971] text-sm">Eligibility & Requirements</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Master Degrees (Eligible)</label>
                <input
                  type="text"
                  value={masterDegrees}
                  onChange={(e) => setMasterDegrees(e.target.value)}
                  placeholder="e.g. AI, Data Science, Computer Science"
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Project Director</label>
                <input
                  type="text"
                  value={projectDirector}
                  onChange={(e) => setProjectDirector(e.target.value)}
                  placeholder="e.g. Dr. Amine Mansouri"
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Minimum GPA</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="4"
                  value={minimumGPA}
                  onChange={(e) => setMinimumGPA(e.target.value)}
                  placeholder="e.g. 3.5"
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Internship Season *</label>
                <select
                  value={internshipSeason}
                  onChange={(e) => setInternshipSeason(e.target.value)}
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                  required
                >
                  <option value="">Select season</option>
                  <option value="summer">Summer</option>
                  <option value="winter">Winter</option>
                  <option value="spring">Spring</option>
                  <option value="fall">Fall</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">PhD Funding *</label>
                <select
                  value={phdFunding}
                  onChange={(e) => setPhdFunding(e.target.value)}
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                  required
                >
                  <option value="">Select funding status</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="partially">Partially Funded</option>
                  <option value="negotiable">Negotiable</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Stipend *</label>
                <input
                  type="text"
                  value={stipend}
                  onChange={(e) => setStipend(e.target.value)}
                  placeholder="e.g. $500/month or free internship"
                  className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Type of Collaboration</label>
              <select
                value={collaborationType}
                onChange={(e) => setCollaborationType(e.target.value as "student" | "teacher" | "both")}
                className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
              >
                <option value="both">Both (Student & Teacher)</option>
                <option value="student">Student Only</option>
                <option value="teacher">Teacher Only</option>
              </select>
            </div>
          </div>

          {/* Privacy & Submit */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex bg-white p-1 rounded-full border border-[#0e4971]/10 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setPrivacy("public")}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold transition-all ${
                  privacy === "public"
                    ? "bg-[#0e4971] text-white shadow-lg shadow-[#0e4971]/20"
                    : "text-[#5b86a2] hover:text-[#0e4971]"
                }`}
              >
                <Globe size={14} /> Public
              </button>
              <button
                type="button"
                onClick={() => setPrivacy("private")}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold transition-all ${
                  privacy === "private"
                    ? "bg-[#0e4971] text-white shadow-lg shadow-[#0e4971]/20"
                    : "text-[#5b86a2] hover:text-[#0e4971]"
                }`}
              >
                <Lock size={14} /> Internal Only
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !canCreateProject}
              className="w-full md:w-auto bg-[#f37e22] text-white px-12 py-4 rounded-full font-bold shadow-lg shadow-[#f37e22]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Create Project"} <Send size={18} />
            </button>
          </div>
        </form>

        <div className="mt-12 p-6 bg-[#0e4971]/5 rounded-2xl border border-[#0e4971]/10 flex items-start gap-4">
          <div className="bg-[#f37e22]/10 p-2 rounded-lg">
            <Sparkles className="text-[#f37e22]" size={20} />
          </div>
          <div>
            <h4 className="font-bold text-[#0e4971] text-sm">Project Visibility</h4>
            <p className="text-xs text-[#5b86a2] mt-1 italic">
              Public projects are discoverable by all researchers. Internal projects are only visible within your lab.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
