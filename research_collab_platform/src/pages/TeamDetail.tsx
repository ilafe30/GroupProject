
import { useParams, Link } from "react-router-dom";
import { LABS } from "../constants";
import { motion } from "motion/react";
import { Users, GraduationCap, Briefcase, Plus, Megaphone, MessageSquare, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { Post } from "../types";

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const lab = LABS.find(l => l.id === id);
  const [isLeader, setIsLeader] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  
  // Mock posts for this team
  const [teamPosts] = useState<Post[]>([
    {
      id: "tp1",
      type: "recruitment",
      author: lab?.lead || "Lead",
      authorId: "lead1",
      title: `Recruiting for ${lab?.name} summer projects`,
      desc: "We have several openings for motivated students to join our ongoing research initiatives.",
      tags: ["Summer", "Research", "Internship"],
      time: "1d ago",
      lab: lab?.name,
      labId: lab?.id,
      isPublic: true
    }
  ]);

  useEffect(() => {
    // Check if current user is the leader
    const userName = localStorage.getItem("userName") || "Dr. Amine Mansouri"; // Mocking for now
    if (lab && lab.lead === userName) {
      setIsLeader(true);
    }
  }, [lab]);

  if (!lab) {
    return (
      <div className="pt-32 pb-20 bg-[#f8f7f4] min-h-screen text-center">
        <h1 className="text-2xl font-serif font-bold text-[#0e4971]">Lab not found</h1>
        <Link to="/teams" className="text-[#f37e22] hover:underline mt-4 inline-block">Back to Teams</Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 bg-[#f8f7f4] min-h-screen">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] border border-[#0e4971]/10 p-8 md:p-12 mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#5b86a2]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#5b86a2]">Research Lab</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#0e4971] mb-6 leading-tight">
            {lab.name}
          </h1>
          <p className="text-lg text-[#5b86a2] max-w-3xl leading-relaxed">
            {lab.description}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Members List */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl border border-[#0e4971]/10 p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-serif font-bold text-[#0e4971] flex items-center gap-3">
                  <Users className="text-[#f37e22]" /> Team Members
                </h2>
                {isLeader && (
                  <button 
                    onClick={() => setShowAddMember(true)}
                    className="flex items-center gap-2 bg-[#0e4971] text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-[#0a3a5c] transition-colors"
                  >
                    <Plus size={16} /> Add Member
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Leader First */}
                <Link 
                  to="/profile" 
                  className="flex items-center justify-between p-6 rounded-2xl border border-[#f37e22]/20 bg-[#f37e22]/5 hover:border-[#f37e22]/40 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#f37e22] text-white flex items-center justify-center font-bold">
                      {lab.lead.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#0e4971] group-hover:text-[#f37e22] transition-colors">{lab.lead}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#f37e22]">Team Leader</span>
                    </div>
                  </div>
                  <Briefcase size={18} className="text-[#f37e22]/40" />
                </Link>

                {/* Faculty */}
                {lab.faculty.map(name => (
                  <Link 
                    key={name}
                    to="/profile" 
                    className="flex items-center justify-between p-6 rounded-2xl border border-[#0e4971]/5 bg-[#f8f7f4] hover:bg-white hover:border-[#0e4971]/20 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#0e4971]/10 text-[#0e4971] flex items-center justify-center font-bold">
                        {name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0e4971] group-hover:text-[#f37e22] transition-colors">{name}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#5b86a2]">Faculty Researcher</span>
                      </div>
                    </div>
                    <GraduationCap size={18} className="text-[#0e4971]/20" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Team Posts */}
            <div className="space-y-6">
              <h2 className="text-2xl font-serif font-bold text-[#0e4971] px-2">Recent Lab Updates</h2>
              {teamPosts.map((post) => (
                <div key={post.id} className="bg-white rounded-3xl border border-[#0e4971]/10 p-6 md:p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#0e4971]/5 flex items-center justify-center font-bold text-[#0e4971]">
                        {post.author.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0e4971] text-sm">{post.author}</h4>
                        <div className="flex items-center gap-2 text-xs text-[#5b86a2]">
                          <span>{post.lab}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {post.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`p-2 rounded-xl bg-[#f37e22]/10 text-[#f37e22]`}>
                       <Megaphone size={18} />
                    </div>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-[#0e4971] mb-2">{post.title}</h3>
                  <p className="text-[#5b86a2] text-sm leading-relaxed mb-6">{post.desc}</p>
                  <button className="bg-[#0e4971] text-white text-xs font-bold px-5 py-2 rounded-full hover:bg-[#0a3a5c] transition-colors">
                    Apply Now
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-[#0e4971] rounded-3xl p-8 text-white">
              <h3 className="text-lg font-serif font-bold mb-4">Specialization</h3>
              <p className="text-sm text-white/70 leading-relaxed mb-6">
                {lab.specialization}
              </p>
              <div className="h-px bg-white/10 mb-6" />
              <h3 className="text-lg font-serif font-bold mb-4 text-[#f37e22]">Alumni Legacy</h3>
              <div className="flex flex-wrap gap-2">
                {lab.legacy.map(s => (
                  <span key={s} className="text-[10px] font-bold bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 uppercase tracking-widest text-white/80">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <h2 className="text-2xl font-serif font-bold text-[#0e4971] mb-6">Add New Teacher</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0e4971] uppercase tracking-wider mb-2">Teacher Name</label>
                <input type="text" className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 rounded-xl px-4 py-3 text-[#0e4971] focus:ring-2 focus:ring-[#f37e22] focus:border-transparent outline-none transition-all" placeholder="Enter teacher name" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0e4971] uppercase tracking-wider mb-2">Professional Email</label>
                <input type="email" className="w-full bg-[#f8f7f4] border border-[#0e4971]/10 rounded-xl px-4 py-3 text-[#0e4971] focus:ring-2 focus:ring-[#f37e22] focus:border-transparent outline-none transition-all" placeholder="name@ensia.edu.dz" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddMember(false)} className="flex-1 px-6 py-3 rounded-full text-sm font-bold text-[#5b86a2] hover:bg-[#f8f7f4] transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-6 py-3 rounded-full text-sm font-bold text-white bg-[#0e4971] hover:bg-[#0a3a5c] transition-colors">Add Teacher</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
