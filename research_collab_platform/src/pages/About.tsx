import { motion } from "motion/react";
import { BookOpen, Globe, Award, Shield, Users } from "lucide-react";

export default function About() {
  return (
    <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen">
      <header className="py-20 bg-[#efefed] border-b border-[#0e4971]/5 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-[#5b86a2]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#5b86a2]">About ENSIA Research Hub</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-serif font-bold text-[#0e4971] tracking-tighter leading-tight mb-8">
            Shaping the future<br />
            <span className="text-[#f37e22]">of AI Research.</span>
          </h1>
          <p className="text-lg md:text-xl text-[#5b86a2] leading-relaxed max-w-2xl">
            Established at the heart of Algiers' technological pole, ENSIA Research Hub 
            is a dedicated space for academic excellence, collaborative innovation, 
            and the practical application of Artificial Intelligence.
          </p>
        </div>
        
        {/* Background Decal */}
        <div className="absolute top-1/2 right-[-10%] -translate-y-1/2 opacity-5 pointer-events-none select-none">
          <span className="font-serif text-[400px] leading-none text-[#0e4971]">ENSIA</span>
        </div>
      </header>

      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="space-y-10">
            <div>
              <h2 className="text-4xl font-serif font-bold text-[#0e4971] mb-6">Our Mission</h2>
              <p className="text-[#5b86a2] leading-relaxed italic">
                "To provide an intelligent ecosystem that simplifies the research lifecycle 
                at ENSIA — from the initial sparks of collaboration to international publication."
              </p>
            </div>
            
            <div className="space-y-6">
              <p className="text-[#0e4971] leading-relaxed">
                As Algiers' premier Artificial Intelligence university, ENSIA recognizes 
                that the best research doesn't happen in silos. It happens when students 
                find the right mentors, and teachers find the most passionate students.
              </p>
              <p className="text-[#0e4971] leading-relaxed">
                The Research Hub was created to automate the administrative overhead 
                of academic networking. By using advanced NLP to analyze CVs and 
                semantic search to match projects, we empower our community to focus 
                entirely on what matters most: discovery.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: Users, title: "Collaborative", desc: "Built for team-based research and peer-to-peer mentorship." },
              { icon: Shield, title: "Verified", desc: "Secure environment restricted to ENSIA faculty and students." },
              { icon: Globe, title: "Impactful", desc: "Publishing tools to showcase ENSIA's research to the world." },
              { icon: Award, title: "Merit-based", desc: "AI ranking ensures the most qualified candidates find the right roles." }
            ].map((stat, i) => (
              <div key={i} className="p-8 bg-white rounded-3xl border border-[#0e4971]/10 shadow-sm hover:shadow-xl transition-all group">
                <stat.icon className="text-[#f37e22] mb-6 group-hover:scale-110 transition-transform" size={28} />
                <h3 className="text-xl font-serif font-bold text-[#0e4971] mb-2">{stat.title}</h3>
                <p className="text-xs text-[#5b86a2] leading-relaxed font-semibold">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0e4971] py-24 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold mb-4">Research Infrastructure</h2>
            <p className="text-white/60">Supporting the entire lifecycle of AI research.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { n: '01', t: "Laboratory Oversight", d: "Connecting 5 specialized research labs under a single unified platform." },
              { n: '02', t: "AMS Dashboard", d: "A dedicated Application Management System for faculty to lead recruitment." },
              { n: '03', t: "Semantic Matching", d: "Custom-built AI models to bridge the gap between interest and opportunity." }
            ].map(f => (
              <div key={f.n} className="space-y-4">
                <span className="text-3xl font-serif italic text-[#f37e22] opacity-50">{f.n}</span>
                <h3 className="text-xl font-bold">{f.t}</h3>
                <p className="text-sm text-white/50 leading-relaxed font-medium">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
