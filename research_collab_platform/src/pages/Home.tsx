import { motion } from "motion/react";
import { ArrowRight, BookOpen, Users, Brain, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const CHARS = "01→←⟨⟩∇∆∑∏∫⌘⌥⊕⊗|—·∘×≡≠≈∈∉∩∪".split("");
const COUNT = 120;

function buildParticles() {
  return Array.from({ length: COUNT }, (_, i) => ({
    id: i,
    char: CHARS[Math.floor(Math.random() * CHARS.length)],
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 9 + 8,
    op: Math.random() * 0.22 + 0.06,
    dur: Math.random() * 5 + 4,
    del: Math.random() * 6,
  }));
}

const PARTICLES = buildParticles();

const FEATURES = [
  {
    num: "01",
    title: "AI-Powered Matching",
    desc: "Our model analyses your research profile and surfaces collaborators whose work complements yours — across departments and institutions.",
    icon: Users,
  },
  {
    num: "02",
    title: "Semantic Paper Search",
    desc: "Go beyond keywords. Describe what you're looking for in plain language and our search engine finds the most relevant papers instantly.",
    icon: BookOpen,
  },
  {
    num: "03",
    title: "Collaborative Workspaces",
    desc: "Shared project boards, file storage, and discussion threads — everything your team needs to run a research project end-to-end.",
    icon: Brain,
  },
];

export default function Home() {
  const [particles] = useState(PARTICLES);

  return (
    <div className="bg-[#f8f7f4]">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] pt-32 pb-20 overflow-hidden bg-[#efefed]">
        {/* Particles */}
        <div className="absolute inset-0 pointer-events-none select-none">
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ 
                opacity: [0, p.op, 0],
                y: [0, 40],
              }}
              transition={{
                duration: p.dur,
                delay: p.del,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                fontSize: `${p.size}px`,
                fontFamily: "monospace",
                color: "#0e4971",
              }}
            >
              {p.char}
            </motion.span>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center gap-3 mb-10 reveal">
            <div className="h-px w-8 bg-[#5b86a2]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#5b86a2]">
              AI-Enhanced Research Collaboration · ENSIA
            </span>
          </div>

          <h1 className="text-[clamp(54px,8vw,112px)] font-serif font-bold leading-[1.0] text-[#0e4971] tracking-tighter mb-8 max-w-4xl">
            The platform<br />
            <span className="text-[#f37e22]">to research.</span>
          </h1>

          <p className="text-lg md:text-xl text-[#5b86a2] leading-relaxed max-w-lg mb-12">
            Connect with ENSIA researchers, discover cutting-edge papers,
            and publish your work — supercharged by AI.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/signup"
              className="bg-[#0e4971] text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-[#0a3a5c] transition-all transform hover:-translate-y-1"
            >
              Get started free <ArrowRight size={20} />
            </Link>
            <button className="bg-transparent border-2 border-[#0e4971]/20 text-[#0e4971] px-8 py-4 rounded-full font-bold hover:border-[#0e4971] transition-all">
              Explore research
            </button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#0e4971] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { v: "1,200+", l: "Researchers" },
              { v: "340+", l: "Published Papers" },
              { v: "95+", l: "Active Projects" },
              { v: "18", l: "Research Domains" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-serif text-[#f37e22] mb-1">{s.v}</div>
                <div className="text-xs uppercase tracking-widest text-white/50">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-px w-8 bg-[#5b86a2]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#5b86a2]">Capabilities</span>
        </div>

        <h2 className="text-5xl md:text-7xl font-serif font-bold text-[#0e4971] tracking-tight mb-20 leading-[1.1]">
          The Opportunity is available.<br />
          <span className="text-[#0e4971]/30">For everyone.</span>
        </h2>

        <div className="divide-y divide-[#0e4971]/10">
          {FEATURES.map((f, i) => (
            <div key={i} className="py-16 grid grid-cols-1 md:grid-cols-[100px_1fr_1fr] gap-12 group">
              <span className="font-serif text-sm text-[#0e4971]/40 pt-1 tracking-widest">{f.num}</span>
              <div>
                <h3 className="text-3xl font-serif text-[#0e4971] mb-6 tracking-tight group-hover:text-[#f37e22] transition-colors">
                  {f.title}
                </h3>
                <p className="text-[#5b86a2] leading-relaxed max-w-md">
                  {f.desc}
                </p>
              </div>
              <div className="flex justify-start md:justify-end">
                <div className="w-full max-w-sm h-48 bg-white rounded-2xl border border-[#0e4971]/10 p-8 shadow-sm flex items-center justify-center">
                  <f.icon className="w-20 h-20 text-[#0e4971]/20 group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
