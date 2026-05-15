// Validators for recruitment posts and discussion posts
export interface RequiredSkillInput {
  source: 'predefined' | 'manual';
  skillId?: number;
  manualSkillName?: string;
}

export interface TagInput {
  name: string;
}

export interface RecruitmentPostPayload {
  project_id: number;
  title: string;
  description?: string | null;
  collaboration_type?: 'student' | 'researcher' | 'both';
  deadline?: string | null;
  tags?: TagInput[];
  required_skills?: RequiredSkillInput[];
}

export interface DiscussionPostPayload {
  project_id?: number | null;
  title: string;
  description?: string | null;
  tags?: TagInput[];
}

export function validateRecruitmentPost(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.project_id || typeof data.project_id !== 'number') {
    errors.push('project_id is required and must be a number');
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('title is required and must be a non-empty string');
  }

  if (data.description !== undefined && data.description !== null && typeof data.description !== 'string') {
    errors.push('description must be a string or null');
  }

  if (data.collaboration_type && !['student', 'researcher', 'both'].includes(data.collaboration_type)) {
    errors.push('collaboration_type must be one of: student, researcher, both');
  }

  if (data.deadline && typeof data.deadline !== 'string') {
    errors.push('deadline must be a string (ISO date)');
  }

  if (data.required_skills && Array.isArray(data.required_skills)) {
    data.required_skills.forEach((skill: any, index: number) => {
      if (!skill.source || !['predefined', 'manual'].includes(skill.source)) {
        errors.push(`required_skills[${index}].source must be 'predefined' or 'manual'`);
      }

      if (skill.source === 'predefined' && !skill.skillId) {
        errors.push(`required_skills[${index}].skillId is required for predefined skills`);
      }

      if (skill.source === 'manual' && !skill.manualSkillName) {
        errors.push(`required_skills[${index}].manualSkillName is required for manual skills`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateDiscussionPost(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('title is required and must be a non-empty string');
  }

  if (data.description !== undefined && data.description !== null && typeof data.description !== 'string') {
    errors.push('description must be a string or null');
  }

  if (data.project_id !== undefined && data.project_id !== null && typeof data.project_id !== 'number') {
    errors.push('project_id must be a number or null');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
