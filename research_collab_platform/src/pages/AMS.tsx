import { motion } from "motion/react";
import { Search, Check, X, Sparkles, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "../lib/api";

interface Application {
  id: number;
  post_id: number;
  applicant_id: number;
  status: string;
  cover_letter: string;
  applied_at: string;
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_email?: string;
  applicant_institution?: string;
  applicant_bio?: string;
  applicant_gpa?: string | number;
  applicant_profile_image_url?: string;
  post_title?: string;
  project_title?: string;
}

interface Post {
  id: number;
  title: string;
  project_id: number;
  created_by_researcher_id: number;
}

export default function AMS() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const response = await api.request({
          url: '/posts/my-posts',
          method: 'GET',
        });
        
        const postsData = (response.data as Post[]) || [];
        setPosts(postsData);
        if (postsData.length > 0) {
          setSelectedPostId(postsData[0].id);
        }
      } catch (err) {
        setError('Failed to fetch posts');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Fetch applications for selected post
  useEffect(() => {
    const fetchApplications = async () => {
      if (!selectedPostId) return;

      try {
        setLoading(true);
        const response = await api.request({
          url: `/applications/posts/${selectedPostId}`,
          method: 'GET',
        });

        const appData = (response.data as Application[]) || [];
        // Only show pending applications
        setApplications(appData.filter(a => !['accepted', 'rejected', 'withdrawn'].includes(a.status)));
      } catch (err) {
        setError('Failed to fetch applications');
        console.error(err);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [selectedPostId]);

  // Filter and search applications
  useEffect(() => {
    let filtered = [...applications];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(app =>
        app.applicant_first_name.toLowerCase().includes(query) ||
        app.applicant_last_name.toLowerCase().includes(query) ||
        app.applicant_email?.toLowerCase().includes(query) ||
        app.cover_letter?.toLowerCase().includes(query)
      );
    }

    setFilteredApplications(filtered);
  }, [applications, searchQuery, statusFilter]);

  const handleAccept = async (id: number) => {
    try {
      await api.request({
        url: `/applications/${id}`,
        method: 'PATCH',
        data: { status: 'accepted' }
      });
      // Remove accepted applicant from list
      setApplications(prev => prev.filter(app => app.id !== id));
    } catch (err) {
      console.error('Failed to accept application', err);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.request({
        url: `/applications/${id}`,
        method: 'PATCH',
        data: { status: 'rejected' }
      });
      // Remove rejected applicant from list
      setApplications(prev => prev.filter(app => app.id !== id));
    } catch (err) {
      console.error('Failed to reject application', err);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen flex items-center justify-center">
        <p className="text-[#5b86a2]">Loading...</p>
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-lg">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen">
        <div className="max-w-6xl mx-auto px-4">
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#5b86a2]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#5b86a2]">Applicant Dashboard</span>
            </div>
            <h1 className="text-4xl font-serif font-bold text-[#0e4971] mb-2 tracking-tight">Applications</h1>
            <p className="text-[#5b86a2]">You haven't created any posts yet.</p>
          </header>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 bg-[#f8f7f4] min-h-screen">
      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-[#5b86a2]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#5b86a2]">Applicant Dashboard</span>
          </div>
          <h1 className="text-4xl font-serif font-bold text-[#0e4971] mb-2 tracking-tight">Applications</h1>
          <p className="text-[#5b86a2]">Manage applications for your posts.</p>
        </header>

        {/* Post Selection */}
        <div className="mb-10 pb-8 border-b border-[#0e4971]/10">
          <h2 className="text-sm font-bold text-[#0e4971] uppercase tracking-widest mb-4">Select a Post</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map(post => (
              <button
                key={post.id}
                onClick={() => setSelectedPostId(post.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedPostId === post.id
                    ? 'border-[#0e4971] bg-[#0e4971]/5'
                    : 'border-[#0e4971]/10 bg-white hover:border-[#0e4971]/30'
                }`}
              >
                <h3 className="font-semibold text-[#0e4971]">{post.title}</h3>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-10 pb-8 border-b border-[#0e4971]/10">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5b86a2]" />
              <input
                type="text"
                placeholder="Search by name, email, or motivation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#0e4971]/10 rounded-lg py-3 pl-10 pr-4 outline-none focus:border-[#0e4971] transition-colors"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-[#0e4971]/10 rounded-lg py-3 px-4 outline-none focus:border-[#0e4971] transition-colors"
            >
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[#5b86a2]">Loading applications...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[#5b86a2]">No applications found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#f37e22] uppercase tracking-widest mb-4">
              <Sparkles size={14} /> {filteredApplications.length} Application{filteredApplications.length !== 1 ? 's' : ''}
            </div>

            <div className="space-y-4">
              {filteredApplications.map((app, i) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-[#0e4971]/10 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-[#0e4971]">
                          {app.applicant_first_name} {app.applicant_last_name}
                        </h3>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          app.status === 'shortlisted' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      <p className="text-sm text-[#5b86a2] mb-3">{app.applicant_email}</p>
                      <p className="text-sm text-[#0e4971] mb-4">{app.cover_letter}</p>
                      {app.applicant_bio && (
                        <p className="text-sm text-[#5b86a2]">{app.applicant_bio}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {app.status === 'submitted' && (
                        <>
                          <button
                            onClick={() => handleAccept(app.id)}
                            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            <Check size={16} /> Accept
                          </button>
                          <button
                            onClick={() => handleReject(app.id)}
                            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            <X size={16} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
