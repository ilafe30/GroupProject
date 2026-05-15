import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../lib/api";

export default function Register() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<'student' | 'researcher'>('student');
  const [institution, setInstitution] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (!email || !password || !firstName || !lastName) {
      setError('Please fill required fields');
      return;
    }

    setLoading(true);
    try {
      const resp = await auth.register(role, { first_name: firstName, last_name: lastName, email, password, institution });
      if (!resp.success) {
        setError(resp.message || 'Registration failed');
        setLoading(false);
        return;
      }
      navigate('/explore');
    } catch (err: any) {
      setError(err?.message || 'Registration request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex items-center justify-center bg-[#f8f7f4]">
      <div className="max-w-md w-full px-4">
        <div className="flex justify-center mb-12">
          <h1 className="text-3xl font-serif font-bold text-[#0e4971] tracking-tight">Create account</h1>
        </div>

        <form onSubmit={submit} className="bg-white rounded-3xl border border-[#0e4971]/10 p-8 md:p-12 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest">Role</label>
            <div className="flex gap-2 mt-2">
              <label className="flex items-center gap-2"><input type="radio" name="role" value="student" checked={role==='student'} onChange={() => setRole('student')} /> Student</label>
              <label className="flex items-center gap-2"><input type="radio" name="role" value="researcher" checked={role==='researcher'} onChange={() => setRole('researcher')} /> Researcher</label>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest">First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full mt-2 p-3 rounded-xl border" required />
          </div>

          <div>
            <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest">Last name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full mt-2 p-3 rounded-xl border" required />
          </div>

          <div>
            <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-2 p-3 rounded-xl border" placeholder="name@ensia.edu.dz" required />
          </div>

          <div>
            <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-2 p-3 rounded-xl border" required />
          </div>

          <div>
            <label className="text-xs font-bold text-[#0e4971] uppercase tracking-widest">Institution (optional)</label>
            <input value={institution} onChange={(e) => setInstitution(e.target.value)} className="w-full mt-2 p-3 rounded-xl border" />
          </div>

          <button type="submit" disabled={loading} className={`w-full bg-[#0e4971] text-white py-3 rounded-xl font-bold ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>

        <p className="text-center mt-4 text-sm text-[#5b86a2]">Already have an account? <a href="/login" className="text-[#0e4971] font-bold">Log in</a></p>
      </div>
    </div>
  );
}
