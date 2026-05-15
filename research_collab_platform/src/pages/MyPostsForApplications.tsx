import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';

type PostSummaryRow = {
  id: number;
  title: string;
  status?: string;
};

const MyPostsForApplications = () => {
  const [posts, setPosts] = useState<PostSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get('/posts/my-posts');
        setPosts(response.data.data);
      } catch (err) {
        setError('Failed to fetch posts.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return <div>Loading posts...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Select a Post to View Applications</h1>
      {posts.length === 0 ? (
        <p>You have not created any posts yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="p-4 border rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="text-sm text-gray-600">Status: {post.status}</p>
              <Link to={`/applications/post/${post.id}`} className="text-blue-500 hover:underline mt-4 inline-block">
                View Applications
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPostsForApplications;
