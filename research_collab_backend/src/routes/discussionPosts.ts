import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createDiscussionPost,
  listDiscussionPosts,
  getDiscussionPost,
  updateDiscussionPost,
  deleteDiscussionPost,
} from '../controllers/discussionPostController';

const router = Router();

/**
 * @GET /api/discussion-posts
 * List all discussion posts
 * Query params: page, limit, project_id, created_by_researcher_id, created_by_student_id, search
 */
router.get('/', listDiscussionPosts);

/**
 * @POST /api/discussion-posts
 * Create a new discussion post (researchers or students)
 */
router.post('/', requireAuth, createDiscussionPost);

/**
 * @GET /api/discussion-posts/:id
 * Get a specific discussion post
 */
router.get('/:id', getDiscussionPost);

/**
 * @PUT /api/discussion-posts/:id
 * Update a discussion post (must be creator)
 */
router.put('/:id', requireAuth, updateDiscussionPost);

/**
 * @DELETE /api/discussion-posts/:id
 * Delete a discussion post (must be creator)
 */
router.delete('/:id', requireAuth, deleteDiscussionPost);

export default router;
