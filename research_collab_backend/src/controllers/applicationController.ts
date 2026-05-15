import { Request, Response } from 'express';
import { ApplicationService } from '../services/applicationService';
import { sendSuccess, sendError } from '../lib/http';

export async function applyToPost(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized');
    }

    if (req.user.role !== 'student' && req.user.role !== 'researcher') {
      return sendError(res, 403, 'Only students or researchers can apply to recruitment posts');
    }

    const { post_id, cover_letter } = req.body;

    if (!post_id) {
      return sendError(res, 400, 'post_id is required');
    }

    const application = await ApplicationService.applyToRecruitmentPost(
      { post_id, cover_letter },
      req.user.id,
      req.user.role,
    );
    return sendSuccess(res, 201, application, 'Application submitted successfully');
  } catch (error: any) {
    return sendError(res, 400, error.message || 'Error submitting application');
  }
}

export async function getMyApplications(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized');
    }

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const result =
      req.user.role === 'student'
        ? await ApplicationService.getStudentApplications(req.user.id, page, limit)
        : req.user.role === 'researcher'
          ? await ApplicationService.getResearcherApplications(req.user.id, page, limit)
          : null;

    if (!result) {
      return sendError(res, 403, 'Applications list is only available for students and researchers');
    }

    return sendSuccess(res, 200, result.applications, 'Applications retrieved successfully', {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  } catch (error: any) {
    return sendError(res, 400, error.message || 'Error retrieving applications');
  }
}

export async function getReceivedApplications(req: Request, res: Response) {
  try {
    if (!req.user || req.user.role !== 'researcher') {
      return sendError(res, 403, 'Only researchers can view received applications');
    }

    const postId = req.query.post_id ? Number(req.query.post_id) : null;

    if (!postId) {
      return sendError(res, 400, 'post_id is required to view applications');
    }

    const result = await ApplicationService.getApplicationsByPost(postId, req.user.id);

    return sendSuccess(res, 200, result, 'Applications retrieved successfully');
  } catch (error: any) {
    return sendError(res, 400, error.message || 'Error retrieving applications');
  }
}
