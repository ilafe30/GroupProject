import { Link } from "react-router-dom";
import { Search, User, LogOut, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { auth, getCurrentUser } from "../lib/api";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setAuthEpoch] = useState(0);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const logoutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onAuth = () => setAuthEpoch((n) => n + 1);
    window.addEventListener("auth-changed", onAuth);
    return () => window.removeEventListener("auth-changed", onAuth);
  }, []);

  const currentUser = getCurrentUser();
  const isLoggedIn = Boolean(currentUser);
  const role = currentUser?.role ?? "student";

  const handleLogout = async () => {
    try {
      await auth.logout();
    } catch {
      // Clear local state even if the backend logout request fails.
    }
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  useEffect(() => {
    if (!logoutOpen) return;
    const onDocClick = (ev: MouseEvent) => {
      const target = ev.target as Node | null;
      if (logoutRef.current && target && !logoutRef.current.contains(target)) {
        setLogoutOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [logoutOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f8f7f4]/80 backdrop-blur-md border-b border-[#0e4971]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xl font-serif font-bold text-[#0e4971] tracking-tight">
              Research<span className="text-[#f37e22]">AI</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-[#5b86a2] hover:text-[#0e4971] transition-colors">Home</Link>
            <Link to="/teams" className="text-sm font-medium text-[#5b86a2] hover:text-[#0e4971] transition-colors">Teams</Link>
            {isLoggedIn && (
              <>
                <Link to="/explore" className="text-sm font-medium text-[#5b86a2] hover:text-[#0e4971] transition-colors">Explore</Link>
                <Link to="/my-posts" className="text-sm font-medium text-[#5b86a2] hover:text-[#0e4971] transition-colors">My Posts</Link>
                <Link to="/projects" className="text-sm font-medium text-[#5b86a2] hover:text-[#0e4971] transition-colors">Projects</Link>
              </>
            )}
            <Link to="/about" className="text-sm font-medium text-[#5b86a2] hover:text-[#0e4971] transition-colors">About</Link>
            {isLoggedIn && role === "researcher" && (
              <Link to="/applications" className="text-sm font-medium text-[#5b86a2] hover:text-[#0e4971] transition-colors">
                Applications
              </Link>
            )}
          </div>


          <div className="hidden md:flex items-center gap-4">
            {!isLoggedIn ? (
              <>
                <Link to="/login" className="text-sm font-medium text-[#0e4971] hover:underline">Log in</Link>
                <Link 
                  to="/signup" 
                  className="bg-[#0e4971] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#0a3a5c] transition-colors"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/search" className="p-2 text-[#0e4971] hover:bg-[#0e4971]/5 rounded-full transition-colors">
                  <Search size={20} />
                </Link>
                <Link to="/profile" className="p-2 text-[#0e4971] hover:bg-[#0e4971]/5 rounded-full transition-colors">
                  <User size={20} />
                </Link>
                <div className="relative" ref={logoutRef}>
                  <button 
                    onClick={() => setLogoutOpen((s) => !s)}
                    className="p-2 text-[#0e4971] hover:bg-[#0e4971]/5 rounded-full transition-colors"
                    aria-haspopup="true"
                    aria-expanded={logoutOpen}
                  >
                    <LogOut size={20} />
                  </button>

                  <AnimatePresence>
                    {logoutOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        className="hidden md:block absolute right-0 mt-2 w-56 bg-white rounded-xl p-3 shadow-lg z-50"
                      >
                        <h4 className="text-sm font-semibold text-[#0e4971]">Confirm logout</h4>
                        <p className="text-xs text-[#5b86a2] mt-1">Are you sure you want to sign out?</p>
                        <div className="flex justify-end gap-2 mt-3">
                          <button onClick={() => setLogoutOpen(false)} className="px-3 py-1 rounded-full border border-[#0e4971]/10 text-sm">Cancel</button>
                          <button onClick={() => { setLogoutOpen(false); void handleLogout(); }} className="px-3 py-1 rounded-full bg-[#0e4971] text-white text-sm">Log out</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-[#0e4971] hover:bg-[#0e4971]/5 rounded-lg transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[#f8f7f4] border-b border-[#0e4971]/10 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              <Link to="/" className="block px-3 py-2 rounded-md text-base font-medium text-[#0e4971] hover:bg-[#0e4971]/5">Home</Link>
              <Link to="/teams" className="block px-3 py-2 rounded-md text-base font-medium text-[#0e4971] hover:bg-[#0e4971]/5">Teams</Link>
              {isLoggedIn && (
                <>
                  <Link to="/explore" className="block px-3 py-2 rounded-md text-base font-medium text-[#0e4971] hover:bg-[#0e4971]/5">Explore</Link>
                  <Link to="/my-posts" className="block px-3 py-2 rounded-md text-base font-medium text-[#0e4971] hover:bg-[#0e4971]/5">My Posts</Link>
                  <Link to="/projects" className="block px-3 py-2 rounded-md text-base font-medium text-[#0e4971] hover:bg-[#0e4971]/5">Projects</Link>
                  {role === "researcher" && (
                    <Link to="/applications" className="block px-3 py-2 rounded-md text-base font-medium text-[#0e4971] hover:bg-[#0e4971]/5">Applications</Link>
                  )}
                </>
              )}
              <Link to="/about" className="block px-3 py-2 rounded-md text-base font-medium text-[#0e4971] hover:bg-[#0e4971]/5">About</Link>
              <div className="pt-4 flex flex-col gap-2">
                {!isLoggedIn ? (
                  <>
                    <Link to="/login" className="w-full text-center py-2 text-sm font-medium text-[#0e4971] border border-[#0e4971] rounded-full">Log in</Link>
                    <Link to="/signup" className="w-full text-center py-2 text-sm font-medium text-white bg-[#0e4971] rounded-full">Sign up</Link>
                  </>
                ) : (
                  <button onClick={() => setLogoutOpen(true)} className="w-full text-center py-2 text-sm font-medium text-white bg-[#0e4971] rounded-full">Log out</button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Mobile fullscreen confirm modal (keeps previous UX) */}
      <AnimatePresence>
        {logoutOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center md:hidden"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setLogoutOpen(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl z-10"
            >
              <h3 className="text-lg font-semibold text-[#0e4971] mb-2">Confirm logout</h3>
              <p className="text-sm text-[#5b86a2] mb-6">Are you sure you want to sign out? You will need to log in again to access your account.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setLogoutOpen(false)} className="px-4 py-2 rounded-full border border-[#0e4971]/10 text-sm font-medium">Cancel</button>
                <button onClick={() => { setLogoutOpen(false); void handleLogout(); }} className="px-4 py-2 rounded-full bg-[#0e4971] text-white font-semibold">Log out</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
