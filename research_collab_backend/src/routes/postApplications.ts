import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  applyToPost,
  getMyApplications,
  getReceivedApplications,
} from '../controllers/applicationController';

const router = Router();

/**
 * @POST /api/post-applications
 * Submit an application to a recruitment or discussion post
 */
router.post('/', requireAuth, applyToPost);

/**
 * @GET /api/post-applications/my
 * Get applications sent by current user
 */
router.get('/my', requireAuth, getMyApplications);

/**
 * @GET /api/post-applications/received
 * Get applications received on posts created by researcher
 */
router.get('/received', requireAuth, getReceivedApplications);

export default router;
