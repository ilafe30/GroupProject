-- CreateTable
CREATE TABLE `tags` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_tags_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recruitment_posts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `created_by_researcher_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `collaboration_type` ENUM('student', 'researcher', 'both') NOT NULL DEFAULT 'student',
    `deadline` DATETIME(0),
    `status` ENUM('draft', 'open', 'closed', 'filled', 'archived') NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_recruitment_posts_project_id`(`project_id`),
    INDEX `idx_recruitment_posts_created_by_researcher_id`(`created_by_researcher_id`),
    INDEX `idx_recruitment_posts_status`(`status`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_recruitment_posts_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_recruitment_posts_created_by_researcher_id` FOREIGN KEY (`created_by_researcher_id`) REFERENCES `researchers` (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recruitment_post_tags` (
    `recruitment_post_id` BIGINT NOT NULL,
    `tag_id` BIGINT NOT NULL,

    INDEX `idx_recruitment_post_tags_tag_id`(`tag_id`),
    PRIMARY KEY (`recruitment_post_id`, `tag_id`),
    CONSTRAINT `fk_recruitment_post_tags_post_id` FOREIGN KEY (`recruitment_post_id`) REFERENCES `recruitment_posts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_recruitment_post_tags_tag_id` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discussion_posts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT,
    `created_by_researcher_id` BIGINT,
    `created_by_student_id` BIGINT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `visibility` ENUM('private', 'project_members', 'public') NOT NULL DEFAULT 'public',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_discussion_posts_project_id`(`project_id`),
    INDEX `idx_discussion_posts_researcher_id`(`created_by_researcher_id`),
    INDEX `idx_discussion_posts_student_id`(`created_by_student_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_discussion_posts_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_discussion_posts_researcher_id` FOREIGN KEY (`created_by_researcher_id`) REFERENCES `researchers` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_discussion_posts_student_id` FOREIGN KEY (`created_by_student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discussion_post_tags` (
    `discussion_post_id` BIGINT NOT NULL,
    `tag_id` BIGINT NOT NULL,

    INDEX `idx_discussion_post_tags_tag_id`(`tag_id`),
    PRIMARY KEY (`discussion_post_id`, `tag_id`),
    CONSTRAINT `fk_discussion_post_tags_post_id` FOREIGN KEY (`discussion_post_id`) REFERENCES `discussion_posts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_discussion_post_tags_tag_id` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_required_skills` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `skill_id` BIGINT,
    `manual_skill_name` VARCHAR(255),
    `source` ENUM('predefined', 'manual') NOT NULL DEFAULT 'predefined',
    `is_mandatory` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_project_required_skills_project_id`(`project_id`),
    INDEX `idx_project_required_skills_skill_id`(`skill_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_project_required_skills_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_project_required_skills_skill_id` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recruitment_post_required_skills` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `recruitment_post_id` BIGINT NOT NULL,
    `skill_id` BIGINT,
    `manual_skill_name` VARCHAR(255),
    `source` ENUM('predefined', 'manual') NOT NULL DEFAULT 'predefined',
    `is_mandatory` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_recruitment_post_required_skills_post_id`(`recruitment_post_id`),
    INDEX `idx_recruitment_post_required_skills_skill_id`(`skill_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_recruitment_post_required_skills_post_id` FOREIGN KEY (`recruitment_post_id`) REFERENCES `recruitment_posts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_recruitment_post_required_skills_skill_id` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `researcher_research_areas_refactored` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `researcher_id` BIGINT NOT NULL,
    `research_area_id` BIGINT,
    `manual_research_area` VARCHAR(255),
    `source` ENUM('predefined', 'manual') NOT NULL DEFAULT 'predefined',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_researcher_research_areas_ref_researcher_id`(`researcher_id`),
    INDEX `idx_researcher_research_areas_ref_area_id`(`research_area_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_researcher_research_areas_ref_researcher_id` FOREIGN KEY (`researcher_id`) REFERENCES `researchers` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_researcher_research_areas_ref_area_id` FOREIGN KEY (`research_area_id`) REFERENCES `research_areas` (`id`) ON DELETE SET NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
