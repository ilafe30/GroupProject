import prisma from '../lib/prisma';
import { TagService } from './tagService';
import { DiscussionPostPayload } from '../lib/validators';

/**
 * Helper function to convert BigInt to Number for JSON serialization
 */
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeBigInt(obj[key]);
    }
    return result;
  }
  
  return obj;
}

export class DiscussionPostService {
  /**
   * Create a new discussion post
   * Can be created by researchers or students
   */
  static async createDiscussionPost(
    payload: DiscussionPostPayload,
    userId: number,
    userRole: 'researcher' | 'student',
  ) {
    const post = await prisma.discussion_posts.create({
      data: {
        project_id: payload.project_id || null,
        title: payload.title,
        description: payload.description || null,
        created_by_researcher_id: userRole === 'researcher' ? userId : null,
        created_by_student_id: userRole === 'student' ? userId : null,
        visibility: 'public', // TODO: Add visibility to payload
      },
    });

    // Add tags
    if (payload.tags && payload.tags.length > 0) {
      const tagNames = payload.tags.map((t) => t.name);
      const tags = await TagService.getOrCreateTags(tagNames);

      await prisma.discussion_post_tags.createMany({
        data: tags.map((tag) => ({
          discussion_post_id: post.id,
          tag_id: tag.id,
        })),
      });
    }

    return this.getDiscussionPostById(Number(post.id));
  }

  /**
   * Get discussion post by ID with all related data
   */
  static async getDiscussionPostById(postId: number) {
    const post = await prisma.discussion_posts.findUnique({
      where: {
        id: postId,
      },
      include: {
        projects: {
          select: {
            id: true,
            title: true,
          },
        },
        researcher_author: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        student_author: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        discussion_post_tags: {
          include: {
            tags: true,
          },
        },
      },
    });
    return serializeBigInt(post);
  }

  /**
   * List discussion posts with filters
   */
  static async listDiscussionPosts(filters: {
    projectId?: number;
    createdByResearcherId?: number;
    createdByStudentId?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.projectId !== undefined) {
      where.project_id = filters.projectId || null;
    }

    if (filters.createdByResearcherId) {
      where.created_by_researcher_id = filters.createdByResearcherId;
    }

    if (filters.createdByStudentId) {
      where.created_by_student_id = filters.createdByStudentId;
    }

    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { title: { contains: s } },
        { description: { contains: s } },
        {
          discussion_post_tags: {
            some: { tags: { name: { contains: s } } },
          },
        },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.discussion_posts.findMany({
        where,
        include: {
          projects: {
            select: {
              id: true,
              title: true,
            },
          },
          researcher_author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          student_author: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          discussion_post_tags: {
            include: {
              tags: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.discussion_posts.count({ where }),
    ]);

    return {
      posts: serializeBigInt(posts),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update discussion post
   */
  static async updateDiscussionPost(
    postId: number,
    userId: number,
    userRole: 'researcher' | 'student',
    payload: Partial<DiscussionPostPayload>,
  ) {
    const post = await prisma.discussion_posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Discussion post not found');
    }

    // Verify ownership
    const isOwner =
      (userRole === 'researcher' && Number(post.created_by_researcher_id) === userId) ||
      (userRole === 'student' && Number(post.created_by_student_id) === userId);

    if (!isOwner) {
      throw new Error('Not authorized to update this post');
    }

    const updated = await prisma.discussion_posts.update({
      where: { id: postId },
      data: {
        title: payload.title,
        description: payload.description,
        project_id: payload.project_id,
      },
    });

    // Update tags if provided
    if (payload.tags) {
      await prisma.discussion_post_tags.deleteMany({
        where: { discussion_post_id: postId },
      });

      if (payload.tags.length > 0) {
        const tags = await TagService.getOrCreateTags(payload.tags.map((t) => t.name));
        await prisma.discussion_post_tags.createMany({
          data: tags.map((tag) => ({
            discussion_post_id: postId,
            tag_id: tag.id,
          })),
        });
      }
    }

    return this.getDiscussionPostById(postId);
  }

  /**
   * Delete discussion post
   */
  static async deleteDiscussionPost(postId: number, userId: number, userRole: 'researcher' | 'student') {
    const post = await prisma.discussion_posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Discussion post not found');
    }

    // Verify ownership
    const isOwner =
      (userRole === 'researcher' && Number(post.created_by_researcher_id) === userId) ||
      (userRole === 'student' && Number(post.created_by_student_id) === userId);

    if (!isOwner) {
      throw new Error('Not authorized to delete this post');
    }

    await prisma.discussion_posts.delete({
      where: { id: postId },
    });
  }
}
