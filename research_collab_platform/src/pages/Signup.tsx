import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, Users } from "lucide-react";
import { auth } from "../lib/api";
import type { FormEvent, ReactNode, DragEvent } from "react";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
type Role   = "student" | "teacher";
type StepId = "role" | "upload" | "extracting" | "review" | "done";

const STEPS: StepId[] = ["role", "upload", "extracting", "review", "done"];
const STEP_LABELS      = ["Role", "Upload CV", "Extracting", "Review", "Done"];

const BACKEND_URL = "http://localhost:5000";

/* ─────────────────────────────────────────────────────────────
   Small reusable components
───────────────────────────────────────────────────────────── */
function Field({
  label, required = false, error = "", children,
}: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#5b86a2] uppercase tracking-widest mb-1.5">
        {label}
        {required && <span className="text-[#f37e22] ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-[11px] mt-1">{error}</p>}
    </div>
  );
}

function TagEditor({
  tags, onChange, placeholder,
}: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [val, setVal] = useState("");

  const add = () => {
    const t = val.trim();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setVal("");
  };

  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 bg-[#0e4971]/7 border border-[#0e4971]/15 rounded-full px-3 py-1 text-[12px] text-[#0e4971]">
              {t}
              <button type="button" onClick={() => onChange(tags.filter(x => x !== t))}
                className="text-[#5b86a2] hover:text-[#0e4971] text-base leading-none">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder || "Type and press Enter"}
          className="flex-1 bg-white border border-[#0e4971]/15 rounded-xl py-2.5 px-3.5 text-sm text-[#0e4971] outline-none focus:border-[#f37e22] transition-colors placeholder:text-[#5b86a2]/40"
        />
        <button type="button" onClick={add}
          className="text-sm font-semibold bg-[#0e4971]/7 border border-[#0e4971]/15 text-[#0e4971] rounded-xl px-4 hover:bg-[#0e4971]/12 transition-colors">
          Add
        </button>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: StepId }) {
  const idx = STEPS.indexOf(step);
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-serif transition-all"
                style={{
                  background: done ? "#0e4971" : active ? "rgba(14,73,113,0.1)" : "rgba(14,73,113,0.05)",
                  border:     `2px solid ${done || active ? "#0e4971" : "rgba(14,73,113,0.15)"}`,
                  color:      done ? "#fff" : active ? "#0e4971" : "rgba(14,73,113,0.3)",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span className="text-[10px] font-sans whitespace-nowrap"
                style={{ color: active ? "#0e4971" : done ? "#5b86a2" : "rgba(14,73,113,0.3)", fontWeight: active ? 600 : 400 }}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-10 h-[1.5px] mx-1 mb-[18px] transition-all"
                style={{ background: done ? "#0e4971" : "rgba(14,73,113,0.1)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="bg-white border border-[#0e4971]/10 rounded-2xl p-6 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#0e4971]/8">
        <h3 className="font-serif text-[17px] font-bold text-[#0e4971]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */
export default function Signup() {
  const navigate  = useNavigate();
  const dropRef   = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  type EducationItem = { id: string; degree: string; field: string; school: string; start_year: string; end_year: string };
  type ExperienceItem = { id: string; role: string; company: string; start_date: string; end_date: string; description: string };

  const [step, setStep]       = useState<StepId>("role");
  const [role, setRole]       = useState<Role | null>(null);
  const [dragging, setDrag]   = useState(false);
  const [file, setFile]       = useState<File | null>(null);
  const [apiErr, setApiErr]   = useState("");
  const [log, setLog]         = useState("Initialising…");
  const [errs, setErrs]       = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "", email: "", phone: "", location: "",
    linkedin: "", github: "", summary: "",
    technical_skills: [] as string[],
    soft_skills:       [] as string[],
    languages:         [] as string[],
    education: [] as EducationItem[],
    experience: [] as ExperienceItem[],
    password: "", confirmPassword: "",
  });

  /* drag / drop */
  const onDragOver  = useCallback((e: DragEvent) => { e.preventDefault(); setDrag(true); }, []);
  const onDragLeave = useCallback(() => setDrag(false), []);
  const onDrop      = useCallback((e: DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
  }, []);

  /* role selection */
  function selectRole(r: Role) {
    setRole(r);
    setStep("upload");
  }

  /* AI extraction */
  async function extract() {
    if (!file) return;
    setStep("extracting"); setApiErr("");
    try {
      setLog("Uploading your CV…");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${BACKEND_URL}/extract`, { method: "POST", body: fd });
      setLog("Claude is reading your CV…");
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as any).error || `Server error ${res.status}`);
      }
      const parsed = await res.json();
      setLog("Filling your profile…");
      await new Promise(r => setTimeout(r, 500));
      setForm(f => ({
        ...f,
        name:             parsed.name             || "",
        email:            parsed.email            || "",
        phone:            parsed.phone            || "",
        location:         parsed.location         || "",
        linkedin:         parsed.linkedin         || "",
        github:           parsed.github           || "",
        summary:          parsed.summary          || "",
        technical_skills: parsed.technical_skills || [],
        soft_skills:      parsed.soft_skills      || [],
        languages:        parsed.languages        || [],
        education:  (parsed.education  || []).map((e: any) => ({
          degree:e.degree||"", field:e.field||"", school:e.school||"",
          start_year:e.start_year||"", end_year:e.end_year||"",
        })),
        experience: (parsed.experience || []).map((e: any) => ({
          role:e.role||"", company:e.company||"",
          start_date:e.start_date||"", end_date:e.end_date||"", description:e.description||"",
        })),
      }));
      setStep("review");
    } catch (err: any) {
      setApiErr(err.message || "Extraction failed. You can fill the form manually.");
      setStep("upload");
    }
  }

  /* form helpers */
  const set     = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const updEdu  = (id: string, k: keyof EducationItem, v: string) => setForm(f => ({ ...f, education: f.education.map(item => item.id === id ? { ...item, [k]: v } : item) }));
  const remEdu  = (id: string) => setForm(f => ({ ...f, education: f.education.filter(item => item.id !== id) }));
  const addEdu  = () => setForm(f => ({ ...f, education: [...f.education, { id: makeId(), degree:"",field:"",school:"",start_year:"",end_year:"" }] }));
  const updExp  = (id: string, k: keyof ExperienceItem, v: string) => setForm(f => ({ ...f, experience: f.experience.map(item => item.id === id ? { ...item, [k]: v } : item) }));
  const remExp  = (id: string) => setForm(f => ({ ...f, experience: f.experience.filter(item => item.id !== id) }));
  const addExp  = () => setForm(f => ({ ...f, experience: [...f.experience, { id: makeId(), role:"",company:"",start_date:"",end_date:"",description:"" }] }));

  const [loading, setLoading] = useState(false);

  function validate() {
    const e: Record<string,string> = {};
    if (!form.name.trim())                         e.name     = "Required";
    if (!form.email.trim())                        e.email    = "Required";
    else if (!/\S+@\S+\.\S+/.test(form.email))    e.email    = "Invalid email";
    if (!form.password)                            e.password = "Required";
    else if (form.password.length < 8)             e.password = "Min. 8 characters";
    if (form.password !== form.confirmPassword)    e.confirm  = "Passwords do not match";
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    setApiErr("");
    try {
      const nameParts = form.name.trim().split(/\s+/).filter(Boolean);
      const emailPrefix = form.email.trim().split("@")[0] || "user";
      const first_name = nameParts[0] || emailPrefix;
      const last_name = nameParts.slice(1).join(" ") || emailPrefix || "User";
      const backendRole = role === "teacher" ? "researcher" : "student";
      const result = await auth.register(backendRole, {
        first_name,
        last_name,
        email: form.email,
        password: form.password,
        institution: form.location || undefined,
      });

      if (!result.success) {
        setApiErr(result.message || "Registration failed");
        return;
      }

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("role", backendRole);
      navigate("/explore", { replace: true });
    } catch (err: any) {
      setApiErr(err?.message || "Registration request failed");
    } finally {
      setLoading(false);
    }
  }

  const addBtn = (onClick: () => void) => (
    <button type="button" onClick={onClick}
      className="text-[12px] font-semibold border border-[#0e4971]/20 text-[#0e4971] rounded-full px-3.5 py-1 hover:border-[#0e4971]/40 transition-colors">
      + Add
    </button>
  );

  /* ──────────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#f8f7f4]">

      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-[#f8f7f4]/90 backdrop-blur-md border-b border-[#0e4971]/8 px-6 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 text-[#5b86a2] hover:text-[#0e4971] transition-colors">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 10H5M9 5l-5 5 5 5" strokeLinecap="round"/>
          </svg>
          <span className="text-[13px] font-medium">Back</span>
        </Link>
        <span className="font-serif text-[17px] text-[#0e4971]">
          Research<span className="text-[#f37e22]">AI</span>
        </span>
        <div className="w-14" />
      </header>

      <main className="max-w-[640px] mx-auto px-5 py-12 pb-20">
        <Stepper step={step} />

        <AnimatePresence mode="wait">

          {/* ════ STEP: ROLE ════ */}
          {step === "role" && (
            <motion.div key="role" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }}>
              <div className="text-center mb-10">
                <h1 className="font-serif text-[38px] text-[#0e4971] tracking-tight mb-2.5">Join ResearchAI</h1>
                <p className="text-[15px] text-[#5b86a2]">Select your role to get started</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => selectRole("student")}
                  className="group p-8 bg-white border-2 border-[#0e4971]/12 rounded-2xl hover:border-[#0e4971]/50 hover:shadow-lg transition-all text-left flex flex-col gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#0e4971]/6 flex items-center justify-center group-hover:bg-[#0e4971] transition-all">
                    <GraduationCap size={22} className="text-[#0e4971] group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#0e4971] mb-1">Student</h3>
                    <p className="text-[12px] text-[#5b86a2] leading-relaxed">
                      Browse research labs, apply to projects, and build your academic profile.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => selectRole("teacher")}
                  className="group p-8 bg-white border-2 border-[#0e4971]/12 rounded-2xl hover:border-[#f37e22]/50 hover:shadow-lg transition-all text-left flex flex-col gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#f37e22]/8 flex items-center justify-center group-hover:bg-[#f37e22] transition-all">
                    <Users size={22} className="text-[#f37e22] group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#0e4971] mb-1">Teacher / Researcher</h3>
                    <p className="text-[12px] text-[#5b86a2] leading-relaxed">
                      Lead labs, post recruitment calls, and manage applicant rankings with AI.
                    </p>
                  </div>
                </button>
              </div>

              <p className="text-center mt-8 text-[14px] text-[#5b86a2]">
                Already a member?{" "}
                <Link to="/login" className="text-[#0e4971] font-semibold hover:underline">Log in</Link>
              </p>
            </motion.div>
          )}

          {/* ════ STEP: UPLOAD ════ */}
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-12 }}>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-[#0e4971]/6 px-4 py-1.5 rounded-full text-[11px] font-bold text-[#0e4971] uppercase tracking-widest mb-4">
                  {role === "teacher" ? "Teacher / Researcher" : "Student"} account
                </div>
                <h1 className="font-serif text-[34px] text-[#0e4971] tracking-tight mb-2">Upload your CV</h1>
                <p className="text-[14px] text-[#5b86a2]">
                  Claude AI will read your PDF and fill the form automatically
                </p>
              </div>

              {apiErr && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex gap-2.5">
                  <span className="text-red-400 text-lg leading-none mt-0.5">!</span>
                  <p className="text-[13px] text-red-700">{apiErr}</p>
                </div>
              )}

              {/* Drop zone */}
              <div
                ref={dropRef}
                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className="rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all p-14"
                style={{
                  borderColor: dragging || file ? "#f37e22" : "rgba(14,73,113,0.2)",
                  background:  file ? "rgba(243,126,34,0.03)" : "#fff",
                }}
              >
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />

                {file ? (
                  <>
                    <div className="text-4xl mb-3">📄</div>
                    <p className="font-serif text-[18px] text-[#0e4971] mb-1">{file.name}</p>
                    <p className="text-[13px] text-[#f37e22]">{(file.size / 1024).toFixed(0)} KB · PDF ready</p>
                    <p className="text-[11px] text-[#5b86a2]/50 mt-1.5">Click to change file</p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 bg-[#0e4971]/6 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5b86a2" strokeWidth="1.5">
                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                    </div>
                    <p className="font-serif text-[18px] text-[#0e4971] mb-1.5">Drop your CV here</p>
                    <p className="text-[13px] text-[#5b86a2]">or click to browse &nbsp;·&nbsp; PDF only</p>
                  </>
                )}
              </div>

              {/* How it works */}
              <div className="grid grid-cols-3 gap-3 my-5">
                {[["📄","Upload PDF"],["🤖","Claude reads it"],["✏️","You review"]].map(([ic,t]) => (
                  <div key={t as string} className="bg-white border border-[#0e4971]/8 rounded-xl p-4 text-center">
                    <div className="text-2xl mb-1.5">{ic}</div>
                    <p className="text-[11px] text-[#5b86a2] font-medium">{t as string}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={extract} disabled={!file}
                  className="w-full bg-[#f37e22] text-white font-semibold text-[15px] py-4 rounded-full shadow-lg shadow-[#f37e22]/20 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Extract with Claude AI →
                </button>
                <button
                  onClick={() => setStep("review")}
                  className="w-full border border-[#0e4971]/20 text-[#5b86a2] font-medium text-[14px] py-3.5 rounded-full hover:border-[#0e4971]/40 hover:text-[#0e4971] transition-all"
                >
                  Skip — fill manually
                </button>
              </div>

              <button
                onClick={() => setStep("role")}
                className="mt-4 w-full text-center text-[13px] text-[#5b86a2] hover:text-[#0e4971] transition-colors"
              >
                ← Change role
              </button>
            </motion.div>
          )}

          {/* ════ STEP: EXTRACTING ════ */}
          {step === "extracting" && (
            <motion.div key="extracting" initial={{ opacity:0 }} animate={{ opacity:1 }} className="text-center py-10">
              <div className="relative w-24 h-24 mx-auto mb-7">
                <div className="absolute inset-0 rounded-full bg-[#f37e22]/8" />
                <div className="absolute inset-2 rounded-full border-[3px] border-[#0e4971]/10 border-t-[#f37e22] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
              </div>
              <h2 className="font-serif text-[26px] text-[#0e4971] mb-2">Extracting your information</h2>
              <p className="text-[14px] text-[#f37e22] mb-7">{log}</p>
              <div className="h-[3px] bg-[#0e4971]/8 rounded-full overflow-hidden max-w-[300px] mx-auto mb-8">
                <div className="h-full bg-[#f37e22] rounded-full animate-[bar_10s_linear_forwards]" style={{ animation: "bar 10s linear forwards", width: "0%" }} />
              </div>
              <div className="bg-white border border-[#0e4971]/10 rounded-xl p-5 max-w-[320px] mx-auto text-left space-y-2.5">
                {["Reading CV text","Identifying personal info","Extracting skills","Parsing education","Parsing experience"].map(t => (
                  <div key={t} className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#0e4971]/7 flex items-center justify-center text-[10px] text-[#0e4971]">✓</span>
                    <span className="text-[13px] text-[#5b86a2]">{t}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ════ STEP: REVIEW ════ */}
          {step === "review" && (
            <motion.div key="review" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              {apiErr && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 flex gap-2.5">
                  <span className="text-red-400 text-lg leading-none mt-0.5">!</span>
                  <p className="text-[13px] text-red-700">{apiErr}</p>
                </div>
              )}

              {file && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 flex gap-2 items-center">
                  <span className="text-green-500 text-base">✓</span>
                  <p className="text-[13px] text-green-800">Claude extracted your data — review and edit below, then confirm.</p>
                </div>
              )}

              <div className="flex items-center gap-3 mb-7">
                <h1 className="font-serif text-[32px] text-[#0e4971] tracking-tight">Review your profile</h1>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${role === "teacher" ? "bg-[#f37e22]/10 text-[#f37e22]" : "bg-[#22c55e]/10 text-[#22c55e]"}`}>
                  {role}
                </span>
              </div>

              <form onSubmit={submit} className="flex flex-col gap-0">

                {/* Personal */}
                <Card title="Personal Information">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name" required error={errs.name}>
                      <input value={form.name} onChange={e => set("name", e.target.value)}
                        placeholder="Amira Benali"
                        className="w-full bg-white border border-[#0e4971]/15 rounded-xl py-2.5 px-3.5 text-[14px] text-[#0e4971] outline-none focus:border-[#f37e22] transition-colors" />
                    </Field>
                    <Field label="Email" required error={errs.email}>
                      <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                        placeholder="you@ensia.edu.dz"
                        className="w-full bg-white border border-[#0e4971]/15 rounded-xl py-2.5 px-3.5 text-[14px] text-[#0e4971] outline-none focus:border-[#f37e22] transition-colors" />
                    </Field>
                    <Field label="Phone">
                      <input value={form.phone} onChange={e => set("phone", e.target.value)}
                        placeholder="+213 XXX XXX XXX"
                        className="w-full bg-white border border-[#0e4971]/15 rounded-xl py-2.5 px-3.5 text-[14px] text-[#0e4971] outline-none focus:border-[#f37e22] transition-colors" />
                    </Field>
                    <Field label="Location">
                      <input value={form.location} onChange={e => set("location", e.target.value)}
                        placeholder="Algiers, Algeria"
                        className="w-full bg-white border border-[#0e4971]/15 rounded-xl py-2.5 px-3.5 text-[14px] text-[#0e4971] outline-none focus:border-[#f37e22] transition-colors" />
                    </Field>
                    <Field label="LinkedIn">
                      <input value={form.linkedin} onChange={e => set("linkedin", e.target.value)}
                        placeholder="linkedin.com/in/…"
                        className="w-full bg-white border border-[#0e4971]/15 rounded-xl py-2.5 px-3.5 text-[14px] text-[#0e4971] outline-none focus:border-[#f37e22] transition-colors" />
                    </Field>
                    <Field label="GitHub">
                      <input value={form.github} onChange={e => set("github", e.target.value)}
                        placeholder="github.com/…"
                        className="w-full bg-white border border-[#0e4971]/15 rounded-xl py-2.5 px-3.5 text-[14px] text-[#0e4971] outline-none focus:border-[#f37e22] transition-colors" />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Field label="Professional Summary">
                      <textarea value={form.summary} onChange={e => set("summary", e.target.value)}
                        placeholder={role === "teacher" ? "Research focus and expertise…" : "Brief academic background…"}
                        className="w-full bg-white border border-[#0e4971]/15 rounded-xl py-2.5 px-3.5 text-[14px] text-[#0e4971] outline-none focus:border-[#f37e22] transition-colors resize-y min-h-[76px]" />
                    </Field>
                  </div>
                </Card>

                {/* Skills */}
                <Card title="Skills & Languages">
                  <div className="flex flex-col gap-4">
                    <Field label="Technical Skills">
                      <TagEditor tags={form.technical_skills} onChange={v => set("technical_skills", v)} placeholder="Python, ML, NLP…" />
                    </Field>
                    <Field label="Soft Skills">
                      <TagEditor tags={form.soft_skills} onChange={v => set("soft_skills", v)} placeholder="Leadership, Communication…" />
                    </Field>
                    <Field label="Languages">
                      <TagEditor tags={form.languages} onChange={v => set("languages", v)} placeholder="Arabic, French, English…" />
                    </Field>
                  </div>
                </Card>

                {/* Education */}
                <Card title="Education" action={addBtn(addEdu)}>
                  {form.education.length === 0 && (
                    <p className="text-[13px] text-[#5b86a2]/50 text-center py-3">No entries yet — click Add</p>
                  )}
                  {form.education.map((e, i) => (
                    <div key={e.id} className="relative bg-[#0e4971]/3 border border-[#0e4971]/8 rounded-xl p-4 mb-3">
                      <button type="button" onClick={() => remEdu(e.id)}
                        className="absolute top-2.5 right-3 text-red-300 hover:text-red-500 text-lg transition-colors">×</button>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Degree">
                          <input value={e.degree} onChange={x => updEdu(e.id,"degree",x.target.value)} placeholder="B.Sc. / M.Sc. / PhD"
                            className="w-full bg-white border border-[#0e4971]/12 rounded-xl py-2 px-3 text-[13px] text-[#0e4971] outline-none focus:border-[#f37e22]" />
                        </Field>
                        <Field label="Field">
                          <input value={e.field} onChange={x => updEdu(e.id,"field",x.target.value)} placeholder="Artificial Intelligence"
                            className="w-full bg-white border border-[#0e4971]/12 rounded-xl py-2 px-3 text-[13px] text-[#0e4971] outline-none focus:border-[#f37e22]" />
                        </Field>
                        <Field label="University">
                          <input value={e.school} onChange={x => updEdu(e.id,"school",x.target.value)} placeholder="ENSIA"
                            className="w-full bg-white border border-[#0e4971]/12 rounded-xl py-2 px-3 text-[13px] text-[#0e4971] outline-none focus:border-[#f37e22]" />
                        </Field>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Start">
                            <input value={e.start_year} onChange={x => updEdu(e.id,"start_year",x.target.value)} placeholder="2021"
                              className="w-full bg-white border border-[#0e4971]/12 rounded-xl py-2 px-3 text-[13px] text-[#0e4971] outline-none focus:border-[#f37e22]" />
                          </Field>
                          <Field label="End">
                            <input value={e.end_year} onChange={x => updEdu(e.id,"end_year",x.target.value)} placeholder="2025"
                              className="w-full bg-white border border-[#0e4971]/12 rounded-xl py-2 px-3 text-[13px] text-[#0e4971] outline-none focus:border-[#f37e22]" />
                          </Field>
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>

                {/* Experience */}
                <Card title={role === "teacher" ? "Research & Teaching Experience" : "Experience"} action={addBtn(addExp)}>
                  {form.experience.length === 0 && (
                    <p className="text-[13px] text-[#5b86a2]/50 text-center py-3">No entries yet — click Add</p>
                  )}
                  {form.experience.map((e, i) => (
                    <div key={e.id} className="relative bg-[#0e4971]/3 border border-[#0e4971]/8 rounded-xl p-4 mb-3">
                      <button type="button" onClick={() => remExp(e.id)}
                        className="absolute top-2.5 right-3 text-red-300 hover:text-red-500 text-lg transition-colors">×</button>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label={role === "teacher" ? "Position" : "Role"}>
                          <input value={e.role} onChange={x => updExp(e.id,"role",x.target.value)}
                            placeholder={role === "teacher" ? "Associate Professor" : "Research Intern"}
                            className="w-full bg-white border border-[#0e4971]/12 rounded-xl py-2 px-3 text-[13px] text-[#0e4971] outline-none focus:border-[#f37e22]" />
                        </Field>
                        <Field label={role === "teacher" ? "Institution / Lab" : "Company / Lab"}>
                          <input value={e.company} onChange={x => updExp(e.id,"company",x.target.value)}
                            placeholder={role === "teacher" ? "ENSIA – NLP Lab" : "CERIST"}
                            className="w-full bg-white border border-[#0e4971]/12 rounded-xl py-2 px-3 text-[13px] text-[#0e4971] outline-none focus:border-[#f37e22]" />
                        </Field>
                        <Field label="Start">
                          <input value={e.start_date} onChange={x => updExp(e.id,"start_date",x.target.value)} placeholder="Sep 2020"
                            className="w-full bg-white border border-[#0e4971]/12 rounded-xl py-2 px-3 text-[13px] text-[#0e4971] outline-none focus:border-[#f37e22]" />
                        </Field>
                        <Field label="End">
                          <input value={e.end_date} onChange={x => updExp(e.id,"end_date",x.target.value)} placeholder="Present"
                            className="w-full bg-white border border-[#0e4971]/12 rounded-xl py-2 px-3 text-[13px] text-[#0e4971] outline-none focus:border-[#f37e22]" />
                        </Field>
                      </div>
                      <div className="mt-3">
                        <Field label="Description">
                          <textarea value={e.description} onChange={x => updExp(e.id,"description",x.target.value)}
                            placeholder="Summary of responsibilities…"
                            className="w-full bg-white border border-[#0e4971]/12 rounded-xl py-2 px-3 text-[13px] text-[#0e4971] outline-none focus:border-[#f37e22] resize-y min-h-[60px]" />
                        </Field>
                      </div>
                    </div>
                  ))}
                </Card>

                {/* Password */}
                <Card title="Set Password">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Password" required error={errs.password}>
                      <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full bg-white border border-[#0e4971]/15 rounded-xl py-2.5 px-3.5 text-[14px] text-[#0e4971] outline-none focus:border-[#f37e22] transition-colors" />
                    </Field>
                    <Field label="Confirm Password" error={errs.confirm}>
                      <input type="password" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)}
                        placeholder="Repeat password"
                        className="w-full bg-white border border-[#0e4971]/15 rounded-xl py-2.5 px-3.5 text-[14px] text-[#0e4971] outline-none focus:border-[#f37e22] transition-colors" />
                    </Field>
                  </div>
                </Card>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep("upload")}
                    className="border border-[#0e4971]/20 text-[#5b86a2] font-medium text-[14px] py-3.5 px-6 rounded-full hover:border-[#0e4971]/40 hover:text-[#0e4971] transition-all">
                    ← Back
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-[#f37e22] text-white font-semibold text-[15px] py-3.5 rounded-full shadow-lg shadow-[#f37e22]/20 hover:opacity-90 transition-all">
                    {loading ? "Creating…" : "Create my account →"}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ════ STEP: DONE ════ */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="text-center py-8">
              <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#22c55e" strokeWidth="2.5" />
                  <path d="M17 28l8 8 14-16" fill="none" stroke="#22c55e" strokeWidth="3"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ strokeDasharray:80, strokeDashoffset:80, animation:"checkIn 0.6s 0.4s ease forwards" }} />
                </svg>
              </div>

              <style>{`@keyframes checkIn{from{stroke-dashoffset:80}to{stroke-dashoffset:0}}`}</style>

              <h2 className="font-serif text-[32px] text-[#0e4971] tracking-tight mb-2">
                Welcome, {form.name.split(" ")[0] || "Researcher"}!
              </h2>
              <div className="w-10 h-0.5 bg-[#f37e22] mx-auto mb-4" />
              <p className="text-[15px] text-[#5b86a2] max-w-[340px] mx-auto mb-8 leading-relaxed">
                Your {role} profile is live. You're now part of the ENSIA research community.
              </p>

              {/* Mini profile card */}
              <div className="bg-white border border-[#0e4971]/10 rounded-2xl p-5 max-w-[340px] mx-auto mb-7 text-left">
                <div className="flex gap-3 items-center mb-4">
                  <div className="w-11 h-11 rounded-full bg-[#0e4971] text-white flex items-center justify-center font-serif text-lg font-bold flex-shrink-0">
                    {(form.name?.[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="font-serif text-[16px] text-[#0e4971]">{form.name || "—"}</p>
                    <p className="text-[12px] text-[#f37e22]">{form.email}</p>
                  </div>
                  <span className={`ml-auto text-[9px] font-bold uppercase px-2 py-1 rounded-full ${role === "teacher" ? "bg-[#f37e22]/10 text-[#f37e22]" : "bg-[#22c55e]/10 text-[#22c55e]"}`}>
                    {role}
                  </span>
                </div>
                {form.technical_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.technical_skills.slice(0,5).map(s => (
                      <span key={s} className="text-[11px] bg-[#0e4971]/6 border border-[#0e4971]/12 text-[#0e4971] px-2.5 py-1 rounded-full">{s}</span>
                    ))}
                    {form.technical_skills.length > 5 && (
                      <span className="text-[11px] bg-[#0e4971]/6 border border-[#0e4971]/12 text-[#0e4971] px-2.5 py-1 rounded-full">
                        +{form.technical_skills.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2.5 max-w-[300px] mx-auto">
                <button onClick={() => { window.location.href = "/explore"; }}
                  className="bg-[#f37e22] text-white font-semibold text-[15px] py-4 rounded-full shadow-lg shadow-[#f37e22]/20 hover:opacity-90 transition-all">
                  Go to Explore →
                </button>
                <button onClick={() => { window.location.href = "/"; }}
                  className="border border-[#0e4971]/20 text-[#5b86a2] font-medium text-[14px] py-3.5 rounded-full hover:border-[#0e4971]/40 hover:text-[#0e4971] transition-all">
                  Back to Home
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}