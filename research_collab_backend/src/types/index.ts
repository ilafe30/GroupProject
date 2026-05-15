import type { Request } from 'express';

export type UserRole = 'student' | 'researcher';
export type AccessRole = UserRole | 'admin' | 'member' | 'team_leader' | 'none';
export type GlobalRole = 'admin' | 'member' | 'team_leader' | 'none';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}

export interface JwtPayloadShape extends AuthUser {
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

export interface ListQuery {
  page?: string;
  limit?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface StudentProfileRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  institution: string | null;
  bio: string | null;
  gpa: string | number | null;
  profile_image_url: string | null;
  is_active: number | boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ResearcherProfileRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  institution: string | null;
  bio: string | null;
  global_role: GlobalRole;
  profile_image_url: string | null;
  is_active: number | boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SkillRow {
  id: number;
  name: string;
  description: string | null;
}

export interface ResearchAreaRow {
  id: number;
  name: string;
  description: string | null;
}

export interface TeamRow {
  id: number;
  lab_id: number | null;
  name: string;
  description: string | null;
  is_active: number | boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ProjectRow {
  id: number;
  title: string;
  category: string | null;
  duration_months: number | null;
  timeframe: string | null;
  application_deadline: Date | string | null;
  description: string | null;
  background_requirements: string | null;
  required_skills_text: string | null;
  interests_text: string | null;
  references_text: string | null;
  master_degrees_text: string | null;
  internship_season: string | null;
  minimum_gpa: string | number | null;
  phd_funding: number | boolean | null;
  stipend: number | boolean | null;
  status: 'draft' | 'open' | 'closed' | 'archived';
  created_by_researcher_id: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ProjectPostRow {
  id: number;
  project_id: number;
  created_by_researcher_id: number;
  title: string;
  description: string | null;
  status: 'draft' | 'open' | 'closed' | 'archived';
  allow_students: number | boolean;
  allow_researchers: number | boolean;
  application_deadline: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export {};
