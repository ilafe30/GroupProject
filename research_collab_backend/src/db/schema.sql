CREATE TABLE IF NOT EXISTS labs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  institution_name VARCHAR(255) NULL,
  address VARCHAR(255) NULL,
  general_email VARCHAR(255) NULL,
  student_projects_email VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_labs_name (name),
  UNIQUE KEY uq_labs_short_name (short_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS research_areas (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_research_areas_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skills (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skills_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS researchers (
  id BIGINT NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  institution VARCHAR(255) NULL,
  bio TEXT NULL,
  global_role ENUM('admin','member','team_leader','none') NOT NULL DEFAULT 'none',
  profile_image_url TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_researchers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
  id BIGINT NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  institution VARCHAR(255) NULL,
  bio TEXT NULL,
  gpa DECIMAL(4,2) NULL,
  profile_image_url TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teams (
  id BIGINT NOT NULL AUTO_INCREMENT,
  lab_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_teams_name (name),
  KEY idx_teams_lab_id (lab_id),
  CONSTRAINT fk_teams_lab_id FOREIGN KEY (lab_id) REFERENCES labs (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS team_memberships (
  id BIGINT NOT NULL AUTO_INCREMENT,
  team_id BIGINT NOT NULL,
  researcher_id BIGINT NOT NULL,
  membership_role ENUM('member','leader','co_leader') NOT NULL,
  joined_at DATE NULL,
  left_at DATE NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_team_memberships_team_researcher (team_id, researcher_id),
  KEY idx_team_memberships_team_id (team_id),
  KEY idx_team_memberships_researcher_id (researcher_id),
  CONSTRAINT fk_team_memberships_team_id FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_team_memberships_researcher_id FOREIGN KEY (researcher_id) REFERENCES researchers (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS researcher_research_areas (
  researcher_id BIGINT NOT NULL,
  research_area_id BIGINT NOT NULL,
  PRIMARY KEY (researcher_id, research_area_id),
  KEY idx_rra_research_area_id (research_area_id),
  CONSTRAINT fk_rra_researcher_id FOREIGN KEY (researcher_id) REFERENCES researchers (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_rra_research_area_id FOREIGN KEY (research_area_id) REFERENCES research_areas (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS researcher_skills (
  researcher_id BIGINT NOT NULL,
  skill_id BIGINT NOT NULL,
  source ENUM('manual','cv_nlp','inferred') NOT NULL DEFAULT 'manual',
  confidence DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
  PRIMARY KEY (researcher_id, skill_id),
  KEY idx_researcher_skills_skill_id (skill_id),
  CONSTRAINT fk_researcher_skills_researcher_id FOREIGN KEY (researcher_id) REFERENCES researchers (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_researcher_skills_skill_id FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_skills (
  student_id BIGINT NOT NULL,
  skill_id BIGINT NOT NULL,
  source ENUM('manual','cv_nlp','inferred') NOT NULL DEFAULT 'manual',
  confidence DECIMAL(5,4) NOT NULL DEFAULT 1.0000,
  PRIMARY KEY (student_id, skill_id),
  KEY idx_student_skills_skill_id (skill_id),
  CONSTRAINT fk_student_skills_student_id FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_student_skills_skill_id FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id BIGINT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(255) NULL,
  duration_months INT NULL,
  timeframe VARCHAR(100) NULL,
  application_deadline DATETIME NULL,
  description TEXT NULL,
  background_requirements TEXT NULL,
  required_skills_text TEXT NULL,
  interests_text TEXT NULL,
  references_text TEXT NULL,
  master_degrees_text TEXT NULL,
  internship_season VARCHAR(100) NULL,
  minimum_gpa DECIMAL(4,2) NULL,
  phd_funding BOOLEAN NOT NULL DEFAULT FALSE,
  stipend BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('draft','open','closed','archived') NOT NULL DEFAULT 'draft',
  created_by_researcher_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projects_category (category),
  KEY idx_projects_status (status),
  KEY idx_projects_created_by_researcher_id (created_by_researcher_id),
  CONSTRAINT fk_projects_created_by_researcher_id FOREIGN KEY (created_by_researcher_id) REFERENCES researchers (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_researchers (
  id BIGINT NOT NULL AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  researcher_id BIGINT NOT NULL,
  project_role ENUM('owner','principal_investigator','collaborator','mentor','director') NOT NULL,
  joined_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_researchers_project_researcher (project_id, researcher_id),
  KEY idx_project_researchers_project_id (project_id),
  KEY idx_project_researchers_researcher_id (researcher_id),
  CONSTRAINT fk_project_researchers_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_project_researchers_researcher_id FOREIGN KEY (researcher_id) REFERENCES researchers (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_students (
  id BIGINT NOT NULL AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  participation_role ENUM('candidate','intern','assistant','student_researcher') NOT NULL,
  joined_at DATETIME NULL,
  left_at DATETIME NULL,
  status ENUM('candidate','active','completed','withdrawn') NOT NULL DEFAULT 'candidate',
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_students_project_student (project_id, student_id),
  KEY idx_project_students_project_id (project_id),
  KEY idx_project_students_student_id (student_id),
  CONSTRAINT fk_project_students_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_project_students_student_id FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_teams (
  project_id BIGINT NOT NULL,
  team_id BIGINT NOT NULL,
  role_description VARCHAR(255) NULL,
  PRIMARY KEY (project_id, team_id),
  KEY idx_project_teams_team_id (team_id),
  CONSTRAINT fk_project_teams_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_project_teams_team_id FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_research_areas (
  project_id BIGINT NOT NULL,
  research_area_id BIGINT NOT NULL,
  PRIMARY KEY (project_id, research_area_id),
  KEY idx_project_research_areas_research_area_id (research_area_id),
  CONSTRAINT fk_project_research_areas_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_project_research_areas_research_area_id FOREIGN KEY (research_area_id) REFERENCES research_areas (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_requirements (
  id BIGINT NOT NULL AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  requirement_type ENUM('skill','background','interest','degree','other') NOT NULL,
  requirement_text TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_requirements_project_id (project_id),
  CONSTRAINT fk_project_requirements_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_posts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  project_id BIGINT NOT NULL,
  created_by_researcher_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status ENUM('draft','open','closed','archived') NOT NULL DEFAULT 'draft',
  allow_students BOOLEAN NOT NULL DEFAULT TRUE,
  allow_researchers BOOLEAN NOT NULL DEFAULT FALSE,
  application_deadline DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_project_posts_project_id (project_id),
  KEY idx_project_posts_created_by_researcher_id (created_by_researcher_id),
  KEY idx_project_posts_status (status),
  CONSTRAINT fk_project_posts_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_project_posts_created_by_researcher_id FOREIGN KEY (created_by_researcher_id) REFERENCES researchers (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_requirements (
  id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  target_type ENUM('student','researcher','both') NOT NULL,
  requirement_type ENUM('skill','background','interest','degree','experience','other') NOT NULL,
  requirement_text TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_post_requirements_post_id (post_id),
  CONSTRAINT fk_post_requirements_post_id FOREIGN KEY (post_id) REFERENCES project_posts (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_student_applications (
  id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  status ENUM('submitted','under_review','shortlisted','accepted','rejected','withdrawn') NOT NULL DEFAULT 'submitted',
  cover_letter TEXT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  reviewed_by_researcher_id BIGINT NULL,
  notes TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_post_student_applications_post_student (post_id, student_id),
  KEY idx_post_student_applications_project_id (project_id),
  KEY idx_post_student_applications_student_id (student_id),
  KEY idx_post_student_applications_reviewed_by_researcher_id (reviewed_by_researcher_id),
  CONSTRAINT fk_post_student_applications_post_id FOREIGN KEY (post_id) REFERENCES project_posts (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_post_student_applications_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_post_student_applications_student_id FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_post_student_applications_reviewed_by_researcher_id FOREIGN KEY (reviewed_by_researcher_id) REFERENCES researchers (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS post_researcher_applications (
  id BIGINT NOT NULL AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  researcher_id BIGINT NOT NULL,
  status ENUM('submitted','under_review','shortlisted','accepted','rejected','withdrawn') NOT NULL DEFAULT 'submitted',
  cover_letter TEXT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  reviewed_by_researcher_id BIGINT NULL,
  notes TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_post_researcher_applications_post_researcher (post_id, researcher_id),
  KEY idx_post_researcher_applications_project_id (project_id),
  KEY idx_post_researcher_applications_researcher_id (researcher_id),
  KEY idx_post_researcher_applications_reviewed_by_researcher_id (reviewed_by_researcher_id),
  CONSTRAINT fk_post_researcher_applications_post_id FOREIGN KEY (post_id) REFERENCES project_posts (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_post_researcher_applications_project_id FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_post_researcher_applications_researcher_id FOREIGN KEY (researcher_id) REFERENCES researchers (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_post_researcher_applications_reviewed_by_researcher_id FOREIGN KEY (reviewed_by_researcher_id) REFERENCES researchers (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS documents (
  id BIGINT NOT NULL AUTO_INCREMENT,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_cvs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  extracted_text TEXT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_student_cvs_student_id (student_id),
  KEY idx_student_cvs_document_id (document_id),
  CONSTRAINT fk_student_cvs_student_id FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_student_cvs_document_id FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS researcher_cvs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  researcher_id BIGINT NOT NULL,
  document_id BIGINT NOT NULL,
  extracted_text TEXT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_researcher_cvs_researcher_id (researcher_id),
  KEY idx_researcher_cvs_document_id (document_id),
  CONSTRAINT fk_researcher_cvs_researcher_id FOREIGN KEY (researcher_id) REFERENCES researchers (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_researcher_cvs_document_id FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_post_recommendations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  student_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  score DECIMAL(5,4) NOT NULL,
  reason TEXT NULL,
  model_version VARCHAR(100) NULL,
  generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_student_post_recommendations_student_id (student_id),
  KEY idx_student_post_recommendations_post_id (post_id),
  CONSTRAINT fk_student_post_recommendations_student_id FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_student_post_recommendations_post_id FOREIGN KEY (post_id) REFERENCES project_posts (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
