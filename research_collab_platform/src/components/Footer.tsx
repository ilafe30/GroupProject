import { Link } from "react-router-dom";
import { Github, Linkedin, Twitter, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#f8f7f4] border-t border-[#0e4971]/10 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="text-xl font-serif font-bold text-[#0e4971] tracking-tight">
              Research<span className="text-[#f37e22]">AI</span>™
            </Link>
            <p className="mt-4 text-sm text-[#5b86a2] leading-relaxed max-w-xs">
              The AI-powered research collaboration platform built by ENSIA students. 
              Discover, connect, and publish with the community.
            </p>
            <div className="mt-6 flex gap-4">
              <button type="button" onClick={(e) => e.preventDefault()} className="text-[#0e4971] hover:opacity-70 transition-opacity"><Github size={20} /></button>
              <button type="button" onClick={(e) => e.preventDefault()} className="text-[#0e4971] hover:opacity-70 transition-opacity"><Linkedin size={20} /></button>
              <button type="button" onClick={(e) => e.preventDefault()} className="text-[#0e4971] hover:opacity-70 transition-opacity"><Twitter size={20} /></button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#0e4971] uppercase tracking-widest mb-6">Platform</h4>
            <ul className="space-y-4">
              <li><Link to="/explore" className="text-sm text-[#5b86a2] hover:text-[#0e4971] transition-colors">Explore Research</Link></li>
              <li><Link to="/dashboard" className="text-sm text-[#5b86a2] hover:text-[#0e4971] transition-colors">Dashboard</Link></li>
              <li><Link to="/posts" className="text-sm text-[#5b86a2] hover:text-[#0e4971] transition-colors">My Posts</Link></li>
              <li><Link to="/submit" className="text-sm text-[#5b86a2] hover:text-[#0e4971] transition-colors">Submit Paper</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#0e4971] uppercase tracking-widest mb-6">Resources</h4>
            <ul className="space-y-4">
              <li><Link to="/docs" className="text-sm text-[#5b86a2] hover:text-[#0e4971] transition-colors">Documentation</Link></li>
              <li><Link to="/guidelines" className="text-sm text-[#5b86a2] hover:text-[#0e4971] transition-colors">Research Guidelines</Link></li>
              <li><Link to="/ethics" className="text-sm text-[#5b86a2] hover:text-[#0e4971] transition-colors">Academic Ethics</Link></li>
              <li><Link to="/faq" className="text-sm text-[#5b86a2] hover:text-[#0e4971] transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#0e4971] uppercase tracking-widest mb-6">School</h4>
            <ul className="space-y-4">
              <li><a href="https://ensia.edu.dz" className="text-sm text-[#5b86a2] hover:text-[#0e4971] transition-colors">About ENSIA</a></li>
              <li><Link to="/teams" className="text-sm text-[#5b86a2] hover:text-[#0e4971] transition-colors">Research Labs</Link></li>
              <li><Link to="/faculty" className="text-sm text-[#5b86a2] hover:text-[#0e4971] transition-colors">Faculty</Link></li>
              <li><Link to="/contact" className="text-sm text-[#5b86a2] hover:text-[#0e4971] transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-[#0e4971]/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="p-4 bg-white/50 border border-[#0e4971]/5 rounded-lg text-[10px] text-[#5b86a2] uppercase tracking-wider">
            École Nationale Supérieure d'Intelligence Artificielle
            <span className="mx-2">·</span>
            Sidi Abdellah, Algiers, Algeria
            <span className="mx-2">·</span>
            <a href="https://www.ensia.edu.dz" className="text-[#f37e22]">www.ensia.edu.dz</a>
          </div>
          <p className="text-xs text-[#5b86a2]/60">© 2026 ResearchAI - ENSIA. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
