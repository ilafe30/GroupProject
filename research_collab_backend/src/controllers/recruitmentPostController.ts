import { Request, Response } from 'express';
import { RecruitmentPostService } from '../services/recruitmentPostService';
import { validateRecruitmentPost } from '../lib/validators';
import { sendSuccess, sendError } from '../lib/http';

export async function createRecruitmentPost(req: Request, res: Response) {
  try {
    const validation = validateRecruitmentPost(req.body);
    if (!validation.valid) {
      return sendError(res, 400, `Validation failed: ${validation.errors.join(', ')}`);
    }

    if (req.user?.role !== 'researcher') {
      return sendError(res, 403, 'Only researchers can create recruitment posts');
    }

    const post = await RecruitmentPostService.createRecruitmentPost(req.body, req.user.id);
    return sendSuccess(res, 201, post, 'Recruitment post created successfully');
  } catch (error: any) {
    return sendError(res, 400, `Error creating recruitment post: ${error.message}`);
  }
}

export async function listRecruitmentPosts(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const projectId = req.query.project_id ? Number(req.query.project_id) : undefined;
    const createdByResearcherId = req.query.created_by_researcher_id ? Number(req.query.created_by_researcher_id) : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const result = await RecruitmentPostService.listRecruitmentPosts({
      page,
      limit,
      projectId,
      createdByResearcherId,
      status,
      search,
    });

    return sendSuccess(res, 200, result, 'Recruitment posts retrieved successfully');
  } catch (error: any) {
    return sendError(res, 400, `Error listing recruitment posts: ${error.message}`);
  }
}

export async function getRecruitmentPost(req: Request, res: Response) {
  try {
    const postId = Number(req.params.id);
    const post = await RecruitmentPostService.getRecruitmentPostById(postId);

    if (!post) {
      return sendError(res, 404, 'Recruitment post not found');
    }

    return sendSuccess(res, 200, post, 'Recruitment post retrieved successfully');
  } catch (error: any) {
    return sendError(res, 400, `Error retrieving recruitment post: ${error.message}`);
  }
}

export async function updateRecruitmentPost(req: Request, res: Response) {
  try {
    if (req.user?.role !== 'researcher') {
      return sendError(res, 403, 'Only researchers can update recruitment posts');
    }

    const postId = Number(req.params.id);
    const post = await RecruitmentPostService.updateRecruitmentPost(postId, req.user.id, req.body);

    return sendSuccess(res, 200, post, 'Recruitment post updated successfully');
  } catch (error: any) {
    return sendError(res, 400, `Error updating recruitment post: ${error.message}`);
  }
}

export async function deleteRecruitmentPost(req: Request, res: Response) {
  try {
    if (req.user?.role !== 'researcher') {
      return sendError(res, 403, 'Only researchers can delete recruitment posts');
    }

    const postId = Number(req.params.id);
    await RecruitmentPostService.deleteRecruitmentPost(postId, req.user.id);

    return sendSuccess(res, 200, null, 'Recruitment post deleted successfully');
  } catch (error: any) {
    return sendError(res, 400, `Error deleting recruitment post: ${error.message}`);
  }
}
