import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createRecruitmentPost,
  listRecruitmentPosts,
  getRecruitmentPost,
  updateRecruitmentPost,
  deleteRecruitmentPost,
} from '../controllers/recruitmentPostController';

const router = Router();

/**
 * @GET /api/recruitment-posts
 * List all recruitment posts
 * Query params: page, limit, project_id, created_by_researcher_id, status, search
 */
router.get('/', listRecruitmentPosts);

/**
 * @POST /api/recruitment-posts
 * Create a new recruitment post (researchers only)
 */
router.post('/', requireAuth, createRecruitmentPost);

/**
 * @GET /api/recruitment-posts/:id
 * Get a specific recruitment post
 */
router.get('/:id', getRecruitmentPost);

/**
 * @PUT /api/recruitment-posts/:id
 * Update a recruitment post (must be creator)
 */
router.put('/:id', requireAuth, updateRecruitmentPost);

/**
 * @DELETE /api/recruitment-posts/:id
 * Delete a recruitment post (must be creator)
 */
router.delete('/:id', requireAuth, deleteRecruitmentPost);

export default router;
