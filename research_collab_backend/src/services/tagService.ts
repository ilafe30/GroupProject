import prisma from '../lib/prisma';

export class TagService {
  /**
   * Get or create tags by name
   */
  static async getOrCreateTags(tagNames: string[]) {
    const tags = [];

    for (const name of tagNames) {
      const normalizedName = name.trim().toLowerCase();

      // Check if tag already exists
      let tag = await prisma.tags.findFirst({
        where: {
          name: normalizedName,
        },
      });

      // Create if doesn't exist
      if (!tag) {
        tag = await prisma.tags.create({
          data: {
            name: normalizedName,
          },
        });
      }

      tags.push(tag);
    }

    return tags;
  }

  /**
   * Get all tags
   */
  static async getAllTags() {
    return prisma.tags.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Search tags by name
   */
  static async searchTags(query: string) {
    return prisma.tags.findMany({
      where: {
        name: {
          contains: query.toLowerCase(),
        },
      },
      take: 20,
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Delete tag if not used
   */
  static async deleteTagIfUnused(tagId: number) {
    const postCount = await prisma.recruitment_post_tags.count({
      where: {
        tag_id: tagId,
      },
    });

    const discussionCount = await prisma.discussion_post_tags.count({
      where: {
        tag_id: tagId,
      },
    });

    if (postCount === 0 && discussionCount === 0) {
      await prisma.tags.delete({
        where: {
          id: tagId,
        },
      });
    }
  }
}
