import { motion } from "motion/react";
import { Users, BookOpen, GraduationCap, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { LABS } from "../constants";

export default function Teams() {
  return (
    <div className="pt-32 pb-20 bg-[#f8f7f4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-px w-8 bg-[#5b86a2]" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#5b86a2]">ENSIA Research Teams</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-serif font-bold text-[#0e4971] tracking-tight mb-8 leading-[1.1]">
          The 5 Research Labs of <span className="text-[#f37e22]">ENSIA</span>
        </h1>
        
        <p className="text-lg text-[#5b86a2] max-w-2xl mb-20 leading-relaxed">
          Our university structure is built around five core research centers, 
          each driving innovation in a specific domain of Artificial Intelligence.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {LABS.map((lab, i) => (
            <motion.div
              key={lab.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-3xl border border-[#0e4971]/10 overflow-hidden group hover:border-[#f37e22]/30 hover:shadow-xl transition-all duration-500"
            >
              <Link to={`/teams/${lab.id}`} className="block h-full">
                <div className="p-8 md:p-12">
                  <div className="flex justify-between items-start mb-8">
                    <div className="bg-[#0e4971]/5 p-4 rounded-2xl">
                      <Users className="text-[#0e4971]" size={32} />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#5b86a2] bg-[#5b86a2]/5 px-3 py-1 rounded-full">
                      {lab.id}
                    </span>
                  </div>

                  <h2 className="text-3xl font-serif font-bold text-[#0e4971] mb-4 group-hover:text-[#f37e22] transition-colors">
                    {lab.name}
                  </h2>
                  <p className="text-[#5b86a2] mb-8 leading-relaxed">
                    {lab.specialization}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[#0e4971]/5">
                    <div className="space-y-4">
                      <div>
                        <h4 className="flex items-center gap-2 text-xs font-bold text-[#0e4971] uppercase tracking-tight mb-2">
                          <GraduationCap size={14} className="text-[#f37e22]" />
                          Leadership
                        </h4>
                        <p className="text-sm font-medium text-[#0e4971]">{lab.lead}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0e4971] uppercase tracking-tight mb-2">Faculty</h4>
                        <div className="flex flex-wrap gap-2">
                          {lab.faculty.map(f => (
                            <span key={f} className="text-[11px] bg-[#0e4971]/5 text-[#0e4971] px-2 py-1 rounded-md">{f}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="flex items-center gap-2 text-xs font-bold text-[#0e4971] uppercase tracking-tight mb-2">
                          <BookOpen size={14} className="text-[#f37e22]" />
                          Recent Publications
                        </h4>
                        <ul className="space-y-2">
                          {lab.projects.map((p, pi) => (
                            <li key={pi} className="text-[11px] text-[#5b86a2] leading-tight">
                              <span className="font-semibold text-[#0e4971] block mb-0.5">{p.title}</span>
                              Contributors: {p.authors}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-[#0e4971]/5 flex justify-between items-end">
                    <div>
                      <h4 className="text-xs font-bold text-[#0e4971] uppercase tracking-tight mb-3">Legacy Contributors</h4>
                      <div className="flex gap-2">
                        {lab.legacy.map(s => (
                          <div key={s} className="w-8 h-8 rounded-full bg-[#f37e22]/10 border border-[#f37e22]/20 flex items-center justify-center text-[10px] font-bold text-[#f37e22]">
                            {s.split(' ').map(n => n[0]).join('')}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-[#f37e22] group-hover:mr-2 transition-all flex items-center gap-2">
                      View Lab Details <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <Link to="/signup" className="inline-flex items-center gap-3 text-[#0e4971] font-bold hover:gap-5 transition-all">
            Join one of these teams <ArrowRight size={20} className="text-[#f37e22]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
