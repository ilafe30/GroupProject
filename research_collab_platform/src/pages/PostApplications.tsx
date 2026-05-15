import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Application } from '../types';

const PostApplications = () => {
  const { postId } = useParams<{ postId: string }>();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await api.get(`/applications/posts/${postId}`);
        setApplications(response.data.data);
      } catch (err) {
        setError('Failed to fetch applications.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [postId]);

  if (loading) {
    return <div>Loading applications...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Applications for Post</h1>
      {applications.length === 0 ? (
        <p>No applications found for this post.</p>
      ) : (
        <ul className="space-y-4">
          {applications.map((app) => (
            <li key={app.id} className="p-4 border rounded-lg shadow-sm">
              <p className="font-semibold">{app.applicant_first_name} {app.applicant_last_name}</p>
              <p className="text-sm text-gray-600">Status: {app.status}</p>
              <p className="mt-2">{app.cover_letter}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PostApplications;
