-- CreateTable
CREATE TABLE `documents` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` TEXT NOT NULL,
    `mime_type` VARCHAR(255) NOT NULL,
    `file_size` BIGINT NOT NULL,
    `uploaded_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `labs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `short_name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `institution_name` VARCHAR(255) NULL,
    `address` VARCHAR(255) NULL,
    `general_email` VARCHAR(255) NULL,
    `student_projects_email` VARCHAR(255) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_labs_name`(`name`),
    UNIQUE INDEX `uq_labs_short_name`(`short_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_requirements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT NOT NULL,
    `target_type` ENUM('student', 'researcher', 'both') NOT NULL,
    `requirement_type` ENUM('skill', 'background', 'interest', 'degree', 'experience', 'other') NOT NULL,
    `requirement_text` TEXT NOT NULL,
    `is_mandatory` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_post_requirements_post_id`(`post_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_researcher_applications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT NOT NULL,
    `project_id` BIGINT NOT NULL,
    `researcher_id` BIGINT NOT NULL,
    `status` ENUM('submitted', 'under_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'submitted',
    `cover_letter` TEXT NULL,
    `applied_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reviewed_at` DATETIME(0) NULL,
    `reviewed_by_researcher_id` BIGINT NULL,
    `notes` TEXT NULL,

    INDEX `idx_post_researcher_applications_project_id`(`project_id`),
    INDEX `idx_post_researcher_applications_researcher_id`(`researcher_id`),
    INDEX `idx_post_researcher_applications_reviewed_by_researcher_id`(`reviewed_by_researcher_id`),
    UNIQUE INDEX `uq_post_researcher_applications_post_researcher`(`post_id`, `researcher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_student_applications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `post_id` BIGINT NOT NULL,
    `project_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `status` ENUM('submitted', 'under_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'submitted',
    `cover_letter` TEXT NULL,
    `applied_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reviewed_at` DATETIME(0) NULL,
    `reviewed_by_researcher_id` BIGINT NULL,
    `notes` TEXT NULL,

    INDEX `idx_post_student_applications_project_id`(`project_id`),
    INDEX `idx_post_student_applications_reviewed_by_researcher_id`(`reviewed_by_researcher_id`),
    INDEX `idx_post_student_applications_student_id`(`student_id`),
    UNIQUE INDEX `uq_post_student_applications_post_student`(`post_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_posts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `created_by_researcher_id` BIGINT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('draft', 'open', 'closed', 'archived') NOT NULL DEFAULT 'draft',
    `allow_students` BOOLEAN NOT NULL DEFAULT true,
    `allow_researchers` BOOLEAN NOT NULL DEFAULT false,
    `application_deadline` DATETIME(0) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_project_posts_created_by_researcher_id`(`created_by_researcher_id`),
    INDEX `idx_project_posts_project_id`(`project_id`),
    INDEX `idx_project_posts_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_requirements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `requirement_type` ENUM('skill', 'background', 'interest', 'degree', 'other') NOT NULL,
    `requirement_text` TEXT NOT NULL,
    `is_mandatory` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_project_requirements_project_id`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_research_areas` (
    `project_id` BIGINT NOT NULL,
    `research_area_id` BIGINT NOT NULL,

    INDEX `idx_project_research_areas_research_area_id`(`research_area_id`),
    PRIMARY KEY (`project_id`, `research_area_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_researchers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `researcher_id` BIGINT NOT NULL,
    `project_role` ENUM('owner', 'principal_investigator', 'collaborator', 'mentor', 'director') NOT NULL,
    `joined_at` DATETIME(0) NULL,

    INDEX `idx_project_researchers_project_id`(`project_id`),
    INDEX `idx_project_researchers_researcher_id`(`researcher_id`),
    UNIQUE INDEX `uq_project_researchers_project_researcher`(`project_id`, `researcher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_students` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `student_id` BIGINT NOT NULL,
    `participation_role` ENUM('candidate', 'intern', 'assistant', 'student_researcher') NOT NULL,
    `joined_at` DATETIME(0) NULL,
    `left_at` DATETIME(0) NULL,
    `status` ENUM('candidate', 'active', 'completed', 'withdrawn') NOT NULL DEFAULT 'candidate',

    INDEX `idx_project_students_project_id`(`project_id`),
    INDEX `idx_project_students_student_id`(`student_id`),
    UNIQUE INDEX `uq_project_students_project_student`(`project_id`, `student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_teams` (
    `project_id` BIGINT NOT NULL,
    `team_id` BIGINT NOT NULL,
    `role_description` VARCHAR(255) NULL,

    INDEX `idx_project_teams_team_id`(`team_id`),
    PRIMARY KEY (`project_id`, `team_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `category` VARCHAR(255) NULL,
    `duration_months` INTEGER NULL,
    `timeframe` VARCHAR(100) NULL,
    `application_deadline` DATETIME(0) NULL,
    `description` TEXT NULL,
    `background_requirements` TEXT NULL,
    `required_skills_text` TEXT NULL,
    `interests_text` TEXT NULL,
    `references_text` TEXT NULL,
    `master_degrees_text` TEXT NULL,
    `internship_season` VARCHAR(100) NULL,
    `minimum_gpa` DECIMAL(4, 2) NULL,
    `phd_funding` BOOLEAN NOT NULL DEFAULT false,
    `stipend` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('draft', 'open', 'closed', 'archived') NOT NULL DEFAULT 'draft',
    `created_by_researcher_id` BIGINT NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_projects_category`(`category`),
    INDEX `idx_projects_created_by_researcher_id`(`created_by_researcher_id`),
    INDEX `idx_projects_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `research_areas` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `uq_research_areas_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `researcher_cvs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `researcher_id` BIGINT NOT NULL,
    `document_id` BIGINT NOT NULL,
    `extracted_text` TEXT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `uploaded_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_researcher_cvs_document_id`(`document_id`),
    INDEX `idx_researcher_cvs_researcher_id`(`researcher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `researcher_research_areas` (
    `researcher_id` BIGINT NOT NULL,
    `research_area_id` BIGINT NOT NULL,

    INDEX `idx_rra_research_area_id`(`research_area_id`),
    PRIMARY KEY (`researcher_id`, `research_area_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `researcher_skills` (
    `researcher_id` BIGINT NOT NULL,
    `skill_id` BIGINT NOT NULL,
    `source` ENUM('manual', 'cv_nlp', 'inferred') NOT NULL DEFAULT 'manual',
    `confidence` DECIMAL(5, 4) NOT NULL DEFAULT 1.0000,

    INDEX `idx_researcher_skills_skill_id`(`skill_id`),
    PRIMARY KEY (`researcher_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `researchers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `institution` VARCHAR(255) NULL,
    `bio` TEXT NULL,
    `global_role` ENUM('admin', 'member', 'team_leader', 'none') NOT NULL DEFAULT 'none',
    `profile_image_url` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_researchers_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `skills` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,

    UNIQUE INDEX `uq_skills_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_cvs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `student_id` BIGINT NOT NULL,
    `document_id` BIGINT NOT NULL,
    `extracted_text` TEXT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `uploaded_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_student_cvs_document_id`(`document_id`),
    INDEX `idx_student_cvs_student_id`(`student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_post_recommendations` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `student_id` BIGINT NOT NULL,
    `post_id` BIGINT NOT NULL,
    `score` DECIMAL(5, 4) NOT NULL,
    `reason` TEXT NULL,
    `model_version` VARCHAR(100) NULL,
    `generated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_student_post_recommendations_post_id`(`post_id`),
    INDEX `idx_student_post_recommendations_student_id`(`student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_skills` (
    `student_id` BIGINT NOT NULL,
    `skill_id` BIGINT NOT NULL,
    `source` ENUM('manual', 'cv_nlp', 'inferred') NOT NULL DEFAULT 'manual',
    `confidence` DECIMAL(5, 4) NOT NULL DEFAULT 1.0000,

    INDEX `idx_student_skills_skill_id`(`skill_id`),
    PRIMARY KEY (`student_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `students` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `institution` VARCHAR(255) NULL,
    `bio` TEXT NULL,
    `gpa` DECIMAL(4, 2) NULL,
    `profile_image_url` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_students_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `team_memberships` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `team_id` BIGINT NOT NULL,
    `researcher_id` BIGINT NOT NULL,
    `membership_role` ENUM('member', 'leader', 'co_leader') NOT NULL,
    `joined_at` DATE NULL,
    `left_at` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,

    INDEX `idx_team_memberships_researcher_id`(`researcher_id`),
    INDEX `idx_team_memberships_team_id`(`team_id`),
    UNIQUE INDEX `uq_team_memberships_team_researcher`(`team_id`, `researcher_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teams` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `lab_id` BIGINT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_teams_name`(`name`),
    INDEX `idx_teams_lab_id`(`lab_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
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
    `description` TEXT NULL,
    `collaboration_type` ENUM('student', 'researcher', 'both') NOT NULL DEFAULT 'student',
    `deadline` DATETIME(0) NULL,
    `status` ENUM('draft', 'open', 'closed', 'filled', 'archived') NOT NULL DEFAULT 'draft',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_recruitment_posts_project_id`(`project_id`),
    INDEX `idx_recruitment_posts_created_by_researcher_id`(`created_by_researcher_id`),
    INDEX `idx_recruitment_posts_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recruitment_post_tags` (
    `recruitment_post_id` BIGINT NOT NULL,
    `tag_id` BIGINT NOT NULL,

    INDEX `idx_recruitment_post_tags_tag_id`(`tag_id`),
    PRIMARY KEY (`recruitment_post_id`, `tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discussion_posts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NULL,
    `created_by_researcher_id` BIGINT NULL,
    `created_by_student_id` BIGINT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `visibility` ENUM('private', 'project_members', 'public') NOT NULL DEFAULT 'public',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_discussion_posts_project_id`(`project_id`),
    INDEX `idx_discussion_posts_researcher_id`(`created_by_researcher_id`),
    INDEX `idx_discussion_posts_student_id`(`created_by_student_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discussion_post_tags` (
    `discussion_post_id` BIGINT NOT NULL,
    `tag_id` BIGINT NOT NULL,

    INDEX `idx_discussion_post_tags_tag_id`(`tag_id`),
    PRIMARY KEY (`discussion_post_id`, `tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_required_skills` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `skill_id` BIGINT NULL,
    `manual_skill_name` VARCHAR(255) NULL,
    `source` ENUM('predefined', 'manual') NOT NULL DEFAULT 'predefined',
    `is_mandatory` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_project_required_skills_project_id`(`project_id`),
    INDEX `idx_project_required_skills_skill_id`(`skill_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recruitment_post_required_skills` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `recruitment_post_id` BIGINT NOT NULL,
    `skill_id` BIGINT NULL,
    `manual_skill_name` VARCHAR(255) NULL,
    `source` ENUM('predefined', 'manual') NOT NULL DEFAULT 'predefined',
    `is_mandatory` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_recruitment_post_required_skills_post_id`(`recruitment_post_id`),
    INDEX `idx_recruitment_post_required_skills_skill_id`(`skill_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `researcher_research_areas_refactored` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `researcher_id` BIGINT NOT NULL,
    `research_area_id` BIGINT NULL,
    `manual_research_area` VARCHAR(255) NULL,
    `source` ENUM('predefined', 'manual') NOT NULL DEFAULT 'predefined',
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_researcher_research_areas_ref_researcher_id`(`researcher_id`),
    INDEX `idx_researcher_research_areas_ref_area_id`(`research_area_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `post_requirements` ADD CONSTRAINT `fk_post_requirements_post_id` FOREIGN KEY (`post_id`) REFERENCES `project_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_researcher_applications` ADD CONSTRAINT `fk_post_researcher_applications_post_id` FOREIGN KEY (`post_id`) REFERENCES `project_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_researcher_applications` ADD CONSTRAINT `fk_post_researcher_applications_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_researcher_applications` ADD CONSTRAINT `fk_post_researcher_applications_researcher_id` FOREIGN KEY (`researcher_id`) REFERENCES `researchers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_researcher_applications` ADD CONSTRAINT `fk_post_researcher_applications_reviewed_by_researcher_id` FOREIGN KEY (`reviewed_by_researcher_id`) REFERENCES `researchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_student_applications` ADD CONSTRAINT `fk_post_student_applications_post_id` FOREIGN KEY (`post_id`) REFERENCES `project_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_student_applications` ADD CONSTRAINT `fk_post_student_applications_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_student_applications` ADD CONSTRAINT `fk_post_student_applications_reviewed_by_researcher_id` FOREIGN KEY (`reviewed_by_researcher_id`) REFERENCES `researchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_student_applications` ADD CONSTRAINT `fk_post_student_applications_student_id` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_posts` ADD CONSTRAINT `fk_project_posts_created_by_researcher_id` FOREIGN KEY (`created_by_researcher_id`) REFERENCES `researchers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_posts` ADD CONSTRAINT `fk_project_posts_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_requirements` ADD CONSTRAINT `fk_project_requirements_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_research_areas` ADD CONSTRAINT `fk_project_research_areas_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_research_areas` ADD CONSTRAINT `fk_project_research_areas_research_area_id` FOREIGN KEY (`research_area_id`) REFERENCES `research_areas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_researchers` ADD CONSTRAINT `fk_project_researchers_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_researchers` ADD CONSTRAINT `fk_project_researchers_researcher_id` FOREIGN KEY (`researcher_id`) REFERENCES `researchers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_students` ADD CONSTRAINT `fk_project_students_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_students` ADD CONSTRAINT `fk_project_students_student_id` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_teams` ADD CONSTRAINT `fk_project_teams_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_teams` ADD CONSTRAINT `fk_project_teams_team_id` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `fk_projects_created_by_researcher_id` FOREIGN KEY (`created_by_researcher_id`) REFERENCES `researchers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `researcher_cvs` ADD CONSTRAINT `fk_researcher_cvs_document_id` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `researcher_cvs` ADD CONSTRAINT `fk_researcher_cvs_researcher_id` FOREIGN KEY (`researcher_id`) REFERENCES `researchers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `researcher_research_areas` ADD CONSTRAINT `fk_rra_research_area_id` FOREIGN KEY (`research_area_id`) REFERENCES `research_areas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `researcher_research_areas` ADD CONSTRAINT `fk_rra_researcher_id` FOREIGN KEY (`researcher_id`) REFERENCES `researchers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `researcher_skills` ADD CONSTRAINT `fk_researcher_skills_researcher_id` FOREIGN KEY (`researcher_id`) REFERENCES `researchers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `researcher_skills` ADD CONSTRAINT `fk_researcher_skills_skill_id` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_cvs` ADD CONSTRAINT `fk_student_cvs_document_id` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_cvs` ADD CONSTRAINT `fk_student_cvs_student_id` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_post_recommendations` ADD CONSTRAINT `fk_student_post_recommendations_post_id` FOREIGN KEY (`post_id`) REFERENCES `project_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_post_recommendations` ADD CONSTRAINT `fk_student_post_recommendations_student_id` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_skills` ADD CONSTRAINT `fk_student_skills_skill_id` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_skills` ADD CONSTRAINT `fk_student_skills_student_id` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_memberships` ADD CONSTRAINT `fk_team_memberships_researcher_id` FOREIGN KEY (`researcher_id`) REFERENCES `researchers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `team_memberships` ADD CONSTRAINT `fk_team_memberships_team_id` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teams` ADD CONSTRAINT `fk_teams_lab_id` FOREIGN KEY (`lab_id`) REFERENCES `labs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recruitment_posts` ADD CONSTRAINT `fk_recruitment_posts_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recruitment_posts` ADD CONSTRAINT `fk_recruitment_posts_created_by_researcher_id` FOREIGN KEY (`created_by_researcher_id`) REFERENCES `researchers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recruitment_post_tags` ADD CONSTRAINT `fk_recruitment_post_tags_post_id` FOREIGN KEY (`recruitment_post_id`) REFERENCES `recruitment_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recruitment_post_tags` ADD CONSTRAINT `fk_recruitment_post_tags_tag_id` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discussion_posts` ADD CONSTRAINT `fk_discussion_posts_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discussion_posts` ADD CONSTRAINT `fk_discussion_posts_researcher_id` FOREIGN KEY (`created_by_researcher_id`) REFERENCES `researchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discussion_posts` ADD CONSTRAINT `fk_discussion_posts_student_id` FOREIGN KEY (`created_by_student_id`) REFERENCES `students`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discussion_post_tags` ADD CONSTRAINT `fk_discussion_post_tags_post_id` FOREIGN KEY (`discussion_post_id`) REFERENCES `discussion_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discussion_post_tags` ADD CONSTRAINT `fk_discussion_post_tags_tag_id` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_required_skills` ADD CONSTRAINT `fk_project_required_skills_project_id` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_required_skills` ADD CONSTRAINT `fk_project_required_skills_skill_id` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recruitment_post_required_skills` ADD CONSTRAINT `fk_recruitment_post_required_skills_post_id` FOREIGN KEY (`recruitment_post_id`) REFERENCES `recruitment_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recruitment_post_required_skills` ADD CONSTRAINT `fk_recruitment_post_required_skills_skill_id` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `researcher_research_areas_refactored` ADD CONSTRAINT `fk_researcher_research_areas_ref_researcher_id` FOREIGN KEY (`researcher_id`) REFERENCES `researchers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `researcher_research_areas_refactored` ADD CONSTRAINT `fk_researcher_research_areas_ref_area_id` FOREIGN KEY (`research_area_id`) REFERENCES `research_areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
