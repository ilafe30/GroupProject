import prisma from '../lib/prisma';
import type { recruitment_posts } from '@prisma/client';

export interface CreateApplicationPayload {
  post_id: number;
  cover_letter?: string;
}

function mapRecruitmentStatusToProjectStatus(
  status: recruitment_posts['status'],
): 'draft' | 'open' | 'closed' | 'archived' {
  switch (status) {
    case 'open':
      return 'open';
    case 'closed':
    case 'filled':
      return 'closed';
    case 'archived':
      return 'archived';
    default:
      return 'draft';
  }
}

async function findLinkedProjectPost(recruitment: recruitment_posts) {
  return prisma.project_posts.findFirst({
    where: {
      project_id: recruitment.project_id,
      created_by_researcher_id: recruitment.created_by_researcher_id,
      title: recruitment.title,
    },
  });
}

/**
 * Applications are stored against `project_posts.id` (FK). Recruitment posts
 * live in `recruitment_posts` with their own ids — find an existing matching
 * project post or create one so applies and the applications UI stay consistent.
 */
async function ensureProjectPostForRecruitment(recruitment: recruitment_posts) {
  const existing = await findLinkedProjectPost(recruitment);
  if (existing) {
    return existing;
  }

  const allowStudents =
    recruitment.collaboration_type === 'student' || recruitment.collaboration_type === 'both';
  const allowResearchers =
    recruitment.collaboration_type === 'researcher' || recruitment.collaboration_type === 'both';

  return prisma.project_posts.create({
    data: {
      project_id: recruitment.project_id,
      created_by_researcher_id: recruitment.created_by_researcher_id,
      title: recruitment.title,
      description: recruitment.description,
      status: mapRecruitmentStatusToProjectStatus(recruitment.status),
      allow_students: allowStudents,
      allow_researchers: allowResearchers,
      application_deadline: recruitment.deadline,
    },
  });
}

export class ApplicationService {
  /**
   * Apply to a recruitment post (students and/or researchers per `collaboration_type`).
   * `post_id` is the recruitment_posts.id from the client; we persist against project_posts.id.
   */
  static async applyToRecruitmentPost(
    payload: CreateApplicationPayload,
    userId: number,
    applicantRole: 'student' | 'researcher',
  ) {
    const post = await prisma.recruitment_posts.findUnique({
      where: { id: payload.post_id },
    });

    if (!post) {
      throw new Error('Recruitment post not found');
    }

    const allowsStudents =
      post.collaboration_type === 'student' || post.collaboration_type === 'both';
    const allowsResearchers =
      post.collaboration_type === 'researcher' || post.collaboration_type === 'both';

    if (applicantRole === 'student' && !allowsStudents) {
      throw new Error('This post does not accept student applications');
    }
    if (applicantRole === 'researcher' && !allowsResearchers) {
      throw new Error('This post does not accept researcher applications');
    }
    if (applicantRole === 'researcher' && Number(post.created_by_researcher_id) === userId) {
      throw new Error('You cannot apply to your own recruitment post');
    }

    const projectPost = await ensureProjectPostForRecruitment(post);
    const projectPostId = Number(projectPost.id);

    if (applicantRole === 'student') {
      const existing = await prisma.post_student_applications.findFirst({
        where: {
          post_id: projectPostId,
          student_id: userId,
        },
      });

      if (existing) {
        throw new Error('You have already applied to this post');
      }

      return prisma.post_student_applications.create({
        data: {
          post_id: projectPostId,
          project_id: post.project_id,
          student_id: userId,
          status: 'submitted',
          cover_letter: payload.cover_letter || null,
          applied_at: new Date(),
        },
      });
    }

    const existing = await prisma.post_researcher_applications.findFirst({
      where: {
        post_id: projectPostId,
        researcher_id: userId,
      },
    });

    if (existing) {
      throw new Error('You have already applied to this post');
    }

    if (!Boolean(projectPost.allow_researchers)) {
      throw new Error('Applications are not open for researchers on this post');
    }

    return prisma.post_researcher_applications.create({
      data: {
        post_id: projectPostId,
        project_id: post.project_id,
        researcher_id: userId,
        status: 'submitted',
        cover_letter: payload.cover_letter || null,
        applied_at: new Date(),
      },
    });
  }

  /**
   * Get applications sent by a student
   */
  static async getStudentApplications(studentId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      prisma.post_student_applications.findMany({
        where: { student_id: studentId },
        include: {
          students: true,
        },
        skip,
        take: limit,
        orderBy: { applied_at: 'desc' },
      }),
      prisma.post_student_applications.count({
        where: { student_id: studentId },
      }),
    ]);

    return {
      applications,
      total,
      page,
      limit,
    };
  }

  /**
   * Get applications sent by a researcher
   */
  static async getResearcherApplications(researcherId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      prisma.post_researcher_applications.findMany({
        where: { researcher_id: researcherId },
        include: {
          researchers_post_researcher_applications_researcher_idToresearchers: true,
        },
        skip,
        take: limit,
        orderBy: { applied_at: 'desc' },
      }),
      prisma.post_researcher_applications.count({
        where: { researcher_id: researcherId },
      }),
    ]);

    return {
      applications,
      total,
      page,
      limit,
    };
  }

  /**
   * Get applications for a recruitment post (researcher). `postId` is recruitment_posts.id.
   */
  static async getApplicationsByPost(postId: number, researcherId: number) {
    const recruitment = await prisma.recruitment_posts.findUnique({
      where: { id: postId },
    });

    if (!recruitment) {
      throw new Error('Post not found');
    }

    if (Number(recruitment.created_by_researcher_id) !== researcherId) {
      throw new Error('You do not have permission to view applications for this post');
    }

    const projectPost = await findLinkedProjectPost(recruitment);
    if (!projectPost) {
      return [];
    }

    const [studentApps, researcherApps] = await Promise.all([
      prisma.post_student_applications.findMany({
        where: { post_id: projectPost.id },
        include: { students: true },
        orderBy: { applied_at: 'desc' },
      }),
      prisma.post_researcher_applications.findMany({
        where: { post_id: projectPost.id },
        include: { researchers_post_researcher_applications_researcher_idToresearchers: true },
        orderBy: { applied_at: 'desc' },
      }),
    ]);

    return [...studentApps, ...researcherApps].sort(
      (a, b) => new Date(String(b.applied_at)).getTime() - new Date(String(a.applied_at)).getTime(),
    );
  }
}
