import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Megaphone, MessageSquare, Globe, Lock, Send, Sparkles, Calendar, Users, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, posts, projects, recruitmentPosts, discussionPosts } from "../lib/api";
import { SkillChipsInput } from "../components/SkillChipsInput";

export default function CreatePost() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [userRole] = useState(localStorage.getItem("role") || "student");
  const [type, setType] = useState<"recruitment" | "discussion">(userRole === "researcher" ? "recruitment" : "discussion");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: number; title: string; category: string | null }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");

  // Discussion Post State
  const [discussionTitle, setDiscussionTitle] = useState("");
  const [discussionDesc, setDiscussionDesc] = useState("");
  // Tag inputs are cross-bound: recruitment form edits `discussionTags` (submitted with recruitment create);
  // discussion form edits `recruitmentTags` (submitted with discussion create).
  const [discussionTags, setDiscussionTags] = useState("");

  // Recruitment Post State
  const [recruitmentTitle, setRecruitmentTitle] = useState("");
  const [requiredSkillChips, setRequiredSkillChips] = useState<string[]>([]);
  const [requiredSkillDraft, setRequiredSkillDraft] = useState("");
  const [recruitmentDesc, setRecruitmentDesc] = useState("");
  const [recruitmentTags, setRecruitmentTags] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [collaborationType, setCollaborationType] = useState<"student" | "researcher" | "both">("both");

  useEffect(() => {
    let mounted = true;

    projects.list({ status: 'open', created_by_researcher_id: currentUser?.id })
      .then((response) => {
        if (!mounted || !response.success) return;
        const ownedProjects = (response.data || []).filter((project) => project.created_by_researcher_id === currentUser?.id);
        setAvailableProjects(ownedProjects);
        if (!selectedProjectId && ownedProjects[0]?.id) {
          setSelectedProjectId(ownedProjects[0].id);
        }
      })
      .catch(() => {
        if (mounted) {
          setAvailableProjects([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [currentUser?.id]);

  const parseDeadline = (value: string) => {
    if (!value.trim()) return null;
    if (value.includes('T')) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (!match) return value;
    const [, day, month, year, hour, minute] = match;
    return `${year}-${month}-${day} ${hour}:${minute}:00`;
  };

  const parseTagsFromString = (tagString: string) => {
    return tagString
      .split(/[\s,]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(name => ({ name }));
  };

  const addRecruitmentSkill = () => {
    const s = requiredSkillDraft.trim();
    if (!s) return;
    if (requiredSkillChips.some((c) => c.toLowerCase() === s.toLowerCase())) {
      setRequiredSkillDraft("");
      return;
    }
    setRequiredSkillChips((prev) => [...prev, s]);
    setRequiredSkillDraft("");
  };

  const removeRecruitmentSkill = (skill: string) => {
    setRequiredSkillChips((prev) => prev.filter((x) => x !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    if (type === 'recruitment' && !selectedProjectId) {
      setError('Please select a project for recruitment posts.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (type === 'recruitment') {
        if (requiredSkillChips.length === 0) {
          setError('Add at least one required skill using the field below.');
          setLoading(false);
          return;
        }
        // NEW RECRUITMENT POST ENDPOINT
        const response = await recruitmentPosts.create({
          project_id: Number(selectedProjectId),
          title: recruitmentTitle,
          description: recruitmentDesc || null,
          collaboration_type: collaborationType as 'student' | 'researcher' | 'both',
          deadline: applicationDeadline ? parseDeadline(applicationDeadline) : null,
          // Tags field on the recruitment form is bound to `discussionTags` so topic tags stay aligned with recruitment_posts.
          tags: parseTagsFromString(discussionTags),
          required_skills: requiredSkillChips.map((manualSkillName) => ({ source: 'manual' as const, manualSkillName })),
        });

        if (!response.success) {
          setError(response.message || 'Recruitment post creation failed');
          return;
        }
      } else {
        // NEW DISCUSSION POST ENDPOINT
        const response = await discussionPosts.create({
          project_id: selectedProjectId ? Number(selectedProjectId) : null,
          title: discussionTitle,
          description: discussionDesc || null,
          // Tags field on the discussion form is bound to `recruitmentTags` so topic tags stay aligned with discussion_posts.
          tags: parseTagsFromString(recruitmentTags),
        });

        if (!response.success) {
          setError(response.message || 'Discussion post creation failed');
          return;
        }
      }

      navigate('/my-posts');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Post creation failed');
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
            <span className="text-xs font-semibold uppercase tracking-widest text-[#5b86a2]">Collaboration Hub</span>
          </div>
          <h1 className="text-4xl font-serif font-bold text-[#0e4971] mb-2 tracking-tight">Create a Post</h1>
          <p className="text-[#5b86a2]">Share your research insights or recruit students for new university projects.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Project Selection - Required for Recruitment, Optional for Discussion */}
          <div className="bg-white rounded-[32px] border border-[#0e4971]/10 p-8 shadow-xl shadow-[#0e4971]/5 space-y-2">
            <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">
              Project {type === 'recruitment' ? '*' : '(optional)'}
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : "")}
              className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
              required={type === 'recruitment'}
            >
              <option value="">Select a project {type === 'discussion' ? '(or leave empty)' : ''}</option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title} {project.category ? `(${project.category})` : ''}
                </option>
              ))}
            </select>
            {availableProjects.length === 0 && (
              <p className="text-xs text-[#5b86a2]">No open projects found. {type === 'recruitment' ? 'Create a project first.' : 'You can post without a project.'}</p>
            )}
          </div>

          {/* Post Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              disabled={userRole === "student"}
              onClick={() => setType("recruitment")}
              className={`p-6 border-2 rounded-3xl transition-all text-left flex flex-col gap-3 ${
                type === "recruitment"
                  ? "border-[#f37e22] bg-[#f37e22]/5"
                  : "border-[#0e4971]/10 bg-white hover:border-[#0e4971]/30 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  type === "recruitment" ? "bg-[#f37e22] text-white" : "bg-[#0e4971]/5 text-[#0e4971]"
                }`}
              >
                <Megaphone size={20} />
              </div>
              <div>
                <h3 className="font-bold text-[#0e4971]">Recruitment</h3>
                <p className="text-xs text-[#5b86a2]">Find collaborators for a project.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType("discussion")}
              className={`p-6 border-2 rounded-3xl transition-all text-left flex flex-col gap-3 ${
                type === "discussion"
                  ? "border-[#0e4971] bg-[#0e4971]/5"
                  : "border-[#0e4971]/10 bg-white hover:border-[#0e4971]/30"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  type === "discussion" ? "bg-[#0e4971] text-white" : "bg-[#0e4971]/5 text-[#5b86a2]"
                }`}
              >
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-bold text-[#0e4971]">Discussion</h3>
                <p className="text-xs text-[#5b86a2]">Share insights or research updates.</p>
              </div>
            </button>
          </div>

          {/* Form Fields - rendered outside the type-selection buttons */}
          <AnimatePresence mode="wait">
             
            {/* DISCUSSION POST FORM */}
            {type === "discussion" && (
              <motion.div
                key="discussion"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-[32px] border border-[#0e4971]/10 p-8 space-y-6 shadow-xl shadow-[#0e4971]/5"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Title *</label>
                  <input
                    type="text"
                    value={discussionTitle}
                    onChange={(e) => setDiscussionTitle(e.target.value)}
                    placeholder="e.g. Recent breakthrough in Transformers..."
                    className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-2xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Description *</label>
                  <textarea
                    value={discussionDesc}
                    onChange={(e) => setDiscussionDesc(e.target.value)}
                    rows={6}
                    placeholder="Share your insights, research updates, or findings..."
                    className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-2xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971] resize-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Tags (separated by spaces)</label>
                  <input
                    type="text"
                    value={recruitmentTags}
                    onChange={(e) => setRecruitmentTags(e.target.value)}
                    placeholder="e.g. Robotics Machine-Learning CV"
                    className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-2xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                  />
                </div>
              </motion.div>
            )}

            {/* RECRUITMENT POST FORM */}
            {type === "recruitment" && (
              <motion.div
                key="recruitment"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-[32px] border border-[#0e4971]/10 p-8 space-y-6 shadow-xl shadow-[#0e4971]/5"
              >
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#0e4971]/10">
                  <Briefcase className="text-[#f37e22]" size={20} />
                  <h3 className="font-bold text-[#0e4971] text-sm">Recruitment Post</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Title of the Post *</label>
                  <input
                    type="text"
                    value={recruitmentTitle}
                    onChange={(e) => setRecruitmentTitle(e.target.value)}
                    placeholder="e.g. Looking for NLP researchers..."
                    className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Description *</label>
                  <textarea
                    value={recruitmentDesc}
                    onChange={(e) => setRecruitmentDesc(e.target.value)}
                    rows={5}
                    placeholder="Describe your project and the requirements for applicants..."
                    className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971] resize-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Tags (separated by spaces)</label>
                  <input
                    type="text"
                    value={discussionTags}
                    onChange={(e) => setDiscussionTags(e.target.value)}
                    placeholder="e.g. NLP Python PyTorch"
                    className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-2xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                  />
                </div>

                <SkillChipsInput
                  label="Required skills *"
                  hint="Add one skill at a time — they are stored in order."
                  chips={requiredSkillChips}
                  draft={requiredSkillDraft}
                  onDraftChange={setRequiredSkillDraft}
                  onAdd={addRecruitmentSkill}
                  onRemove={removeRecruitmentSkill}
                  disabled={loading}
                />

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Application Deadline * (DD/MM/YYYY HH:MM)</label>
                  <input
                    type="text"
                    value={applicationDeadline}
                    onChange={(e) => setApplicationDeadline(e.target.value)}
                    placeholder="e.g. 15/02/2025 23:59"
                    className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest pl-1">Type of Collaboration</label>
                  <select
                    value={collaborationType}
                    onChange={(e) => setCollaborationType(e.target.value as "student" | "researcher" | "both")}
                    className="w-full bg-[#f8f7f4] border border-[#0e4971]/5 rounded-3xl py-4 px-6 outline-none focus:border-[#0e4971] transition-colors font-medium text-[#0e4971]"
                  >
                    <option value="both">Both (Students & Researchers)</option>
                    <option value="student">Students Only</option>
                    <option value="researcher">Researchers Only</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Privacy & Submit - Shared Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex bg-white p-1 rounded-2xl border border-[#0e4971]/10 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setPrivacy("public")}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all ${
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
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all ${
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
              disabled={loading || (type === 'recruitment' && availableProjects.length === 0)}
              className="w-full md:w-auto bg-[#f37e22] text-white px-12 py-4 rounded-full font-bold shadow-lg shadow-[#f37e22]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Posting…' : 'Post to Explore'} <Send size={18} />
            </button>
          </div>
        </form>

        <div className="mt-12 p-6 bg-[#0e4971]/5 rounded-2xl border border-[#0e4971]/10 flex items-start gap-4">
          <div className="bg-[#f37e22]/10 p-2 rounded-lg">
            <Sparkles className="text-[#f37e22]" size={20} />
          </div>
          <div>
            <h4 className="font-bold text-[#0e4971] text-sm">AI Recommendation Boost</h4>
            <p className="text-xs text-[#5b86a2] mt-1 italic">
              Public posts are automatically analyzed and suggested to researchers with matching skillsets in their Explore feed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
