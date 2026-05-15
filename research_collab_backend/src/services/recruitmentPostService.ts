import prisma from '../lib/prisma';
import { TagService } from './tagService';
import { RecruitmentPostPayload, RequiredSkillInput } from '../lib/validators';

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

export class RecruitmentPostService {
  /**
   * Create a new recruitment post
   * Only researchers can create, and must belong to the project
   */
  static async createRecruitmentPost(
    payload: RecruitmentPostPayload,
    researcherId: number,
  ) {
    // Verify researcher belongs to the project
    const projectMember = await prisma.project_researchers.findFirst({
      where: {
        project_id: payload.project_id,
        researcher_id: researcherId,
      },
    });

    if (!projectMember) {
      throw new Error('Researcher does not belong to this project');
    }

    // Create the recruitment post
    const post = await prisma.recruitment_posts.create({
      data: {
        project_id: payload.project_id,
        created_by_researcher_id: researcherId,
        title: payload.title,
        description: payload.description || null,
        collaboration_type: (payload.collaboration_type as any) || 'student',
        deadline: payload.deadline ? this.parseDeadline(payload.deadline) : null,
      },
    });

    // Add tags
    if (payload.tags && payload.tags.length > 0) {
      const tagNames = payload.tags.map((t) => t.name);
      const tags = await TagService.getOrCreateTags(tagNames);

      await prisma.recruitment_post_tags.createMany({
        data: tags.map((tag) => ({
          recruitment_post_id: post.id,
          tag_id: tag.id,
        })),
      });
    }

    // Add required skills
    if (payload.required_skills && payload.required_skills.length > 0) {
      await this.addRequiredSkills(Number(post.id), payload.required_skills);
    }

    return this.getRecruitmentPostById(Number(post.id));
  }

  /**
   * Add required skills to a recruitment post
   */
  static async addRequiredSkills(postId: number, skills: RequiredSkillInput[]) {
    const skillsToCreate = skills.map((skill) => ({
      recruitment_post_id: postId,
      skill_id: skill.source === 'predefined' ? skill.skillId! : null,
      manual_skill_name: skill.source === 'manual' ? skill.manualSkillName! : null,
      source: skill.source as 'predefined' | 'manual',
      is_mandatory: false, // TODO: Add is_mandatory to payload
    }));

    await prisma.recruitment_post_required_skills.createMany({
      data: skillsToCreate,
    });
  }

  /**
   * Get recruitment post by ID with all related data
   */
  static async getRecruitmentPostById(postId: number) {
    const post = await prisma.recruitment_posts.findUnique({
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
        researchers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        recruitment_post_tags: {
          include: {
            tags: true,
          },
        },
        recruitment_post_required_skills: {
          include: {
            skills: true,
          },
        },
      },
    });
    return serializeBigInt(post);
  }

  /**
   * List recruitment posts with filters
   */
  static async listRecruitmentPosts(filters: {
    projectId?: number;
    createdByResearcherId?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.projectId) {
      where.project_id = filters.projectId;
    }

    if (filters.createdByResearcherId) {
      where.created_by_researcher_id = filters.createdByResearcherId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { title: { contains: s } },
        { description: { contains: s } },
        {
          recruitment_post_tags: {
            some: { tags: { name: { contains: s } } },
          },
        },
        {
          recruitment_post_required_skills: {
            some: {
              OR: [{ manual_skill_name: { contains: s } }, { skills: { name: { contains: s } } }],
            },
          },
        },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.recruitment_posts.findMany({
        where,
        include: {
          projects: {
            select: {
              id: true,
              title: true,
            },
          },
          researchers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          recruitment_post_tags: {
            include: {
              tags: true,
            },
          },
          recruitment_post_required_skills: {
            include: {
              skills: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.recruitment_posts.count({ where }),
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
   * Update recruitment post
   */
  static async updateRecruitmentPost(
    postId: number,
    researcherId: number,
    payload: Partial<RecruitmentPostPayload>,
  ) {
    // Verify ownership
    const post = await prisma.recruitment_posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Recruitment post not found');
    }

    if (Number(post.created_by_researcher_id) !== researcherId) {
      throw new Error('Not authorized to update this post');
    }

    const updated = await prisma.recruitment_posts.update({
      where: { id: postId },
      data: {
        title: payload.title,
        description: payload.description,
        collaboration_type: payload.collaboration_type as any,
        deadline: payload.deadline ? new Date(payload.deadline) : undefined,
      },
    });

    // Update tags if provided
    if (payload.tags) {
      await prisma.recruitment_post_tags.deleteMany({
        where: { recruitment_post_id: postId },
      });

      if (payload.tags.length > 0) {
        const tags = await TagService.getOrCreateTags(payload.tags.map((t) => t.name));
        await prisma.recruitment_post_tags.createMany({
          data: tags.map((tag) => ({
            recruitment_post_id: postId,
            tag_id: tag.id,
          })),
        });
      }
    }

    return this.getRecruitmentPostById(postId);
  }

  /**
   * Delete recruitment post
   */
  static async deleteRecruitmentPost(postId: number, researcherId: number) {
    const post = await prisma.recruitment_posts.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new Error('Recruitment post not found');
    }

    if (Number(post.created_by_researcher_id) !== researcherId) {
      throw new Error('Not authorized to delete this post');
    }

    await prisma.recruitment_posts.delete({
      where: { id: postId },
    });
  }

  /**
   * Parse deadline string to Date object
   * Handles format: "YYYY-MM-DD HH:MM:SS" or ISO format
   */
  private static parseDeadline(deadlineStr: string): Date | null {
    if (!deadlineStr || typeof deadlineStr !== 'string') {
      return null;
    }

    try {
      // Replace space with T for ISO format compatibility
      let isoStr = deadlineStr;
      if (deadlineStr.includes(' ') && !deadlineStr.includes('T')) {
        isoStr = deadlineStr.replace(' ', 'T');
      }

      const date = new Date(isoStr);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null;
      }

      return date;
    } catch (error) {
      return null;
    }
  }
}
