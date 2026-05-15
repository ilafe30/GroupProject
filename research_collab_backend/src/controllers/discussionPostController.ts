import { Request, Response } from 'express';
import { DiscussionPostService } from '../services/discussionPostService';
import { validateDiscussionPost } from '../lib/validators';
import { sendSuccess, sendError } from '../lib/http';

export async function createDiscussionPost(req: Request, res: Response) {
  try {
    const validation = validateDiscussionPost(req.body);
    if (!validation.valid) {
      return sendError(res, 400, `Validation failed: ${validation.errors.join(', ')}`);
    }

    if (!req.user) {
      return sendError(res, 401, 'Unauthorized');
    }

    const post = await DiscussionPostService.createDiscussionPost(req.body, req.user.id, req.user.role as any);
    return sendSuccess(res, 201, post, 'Discussion post created successfully');
  } catch (error: any) {
    return sendError(res, 400, `Error creating discussion post: ${error.message}`);
  }
}

export async function listDiscussionPosts(req: Request, res: Response) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const projectId = req.query.project_id !== undefined ? (req.query.project_id ? Number(req.query.project_id) : null) : undefined;
    const createdByResearcherId = req.query.created_by_researcher_id ? Number(req.query.created_by_researcher_id) : undefined;
    const createdByStudentId = req.query.created_by_student_id ? Number(req.query.created_by_student_id) : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const result = await DiscussionPostService.listDiscussionPosts({
      page,
      limit,
      projectId: projectId as any,
      createdByResearcherId,
      createdByStudentId,
      search,
    });

    return sendSuccess(res, 200, result, 'Discussion posts retrieved successfully');
  } catch (error: any) {
    return sendError(res, 400, `Error listing discussion posts: ${error.message}`);
  }
}

export async function getDiscussionPost(req: Request, res: Response) {
  try {
    const postId = Number(req.params.id);
    const post = await DiscussionPostService.getDiscussionPostById(postId);

    if (!post) {
      return sendError(res, 404, 'Discussion post not found');
    }

    return sendSuccess(res, 200, post, 'Discussion post retrieved successfully');
  } catch (error: any) {
    return sendError(res, 400, `Error retrieving discussion post: ${error.message}`);
  }
}

export async function updateDiscussionPost(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized');
    }

    const postId = Number(req.params.id);
    const post = await DiscussionPostService.updateDiscussionPost(postId, req.user.id, req.user.role as any, req.body);

    return sendSuccess(res, 200, post, 'Discussion post updated successfully');
  } catch (error: any) {
    return sendError(res, 400, `Error updating discussion post: ${error.message}`);
  }
}

export async function deleteDiscussionPost(req: Request, res: Response) {
  try {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized');
    }

    const postId = Number(req.params.id);
    await DiscussionPostService.deleteDiscussionPost(postId, req.user.id, req.user.role as any);

    return sendSuccess(res, 200, null, 'Discussion post deleted successfully');
  } catch (error: any) {
    return sendError(res, 400, `Error deleting discussion post: ${error.message}`);
  }
}
