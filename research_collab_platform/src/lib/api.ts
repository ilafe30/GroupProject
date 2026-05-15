import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { AxiosResponse } from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
const AUTH_KEY = 'auth';

type UserRole = 'student' | 'researcher';
type GlobalRole = 'admin' | 'member' | 'team_leader' | 'none';

type TokenUser = {
  id: number;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
};

type AuthState = {
  accessToken: string;
  refreshToken: string;
  user: TokenUser;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
};

type AuthPayload = {
  role: UserRole;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  institution?: string;
};

type LoginPayload = {
  role: UserRole;
  email: string;
  password: string;
};

export type StudentProfile = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  institution: string | null;
  bio: string | null;
  gpa: string | number | null;
  profile_image_url: string | null;
  is_active: boolean | number;
  created_at: string;
  updated_at: string;
};

export type ResearcherProfile = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  institution: string | null;
  bio: string | null;
  global_role: GlobalRole;
  profile_image_url: string | null;
  is_active: boolean | number;
  created_at: string;
  updated_at: string;
};

export type SkillItem = {
  id: number;
  name: string;
  description: string | null;
  source?: 'manual' | 'cv_nlp' | 'inferred';
  confidence?: number | string;
};

export type ResearchAreaItem = {
  id: number;
  name: string;
  description: string | null;
};

type PostItem = {
  id: number;
  project_id: number;
  created_by_researcher_id: number;
  title: string;
  description: string | null;
  status: 'draft' | 'open' | 'closed' | 'archived' | 'filled';
  allow_students: boolean | number;
  allow_researchers: boolean | number;
  application_deadline: string | null;
  created_at: string;
  updated_at: string;
  project_title?: string;
  creator_first_name?: string;
  creator_last_name?: string;
  creator_email?: string;
  post_kind?: 'project_post' | 'recruitment' | 'discussion';
};

type ApplicationApplicantKind = 'student' | 'researcher';

export type PostApplicationApplicantRow = {
  id: number;
  post_id: number;
  project_id: number;
  applicant_id: number;
  applicant_kind: ApplicationApplicantKind;
  status: string;
  cover_letter: string | null;
  applied_at: string;
  reviewed_at: string | null;
  post_title: string;
  post_status: string;
  project_title: string;
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_email: string;
  applicant_institution: string | null;
};

export type ManagedPostSummary = {
  id: number;
  title: string;
  status: string;
  project_id: number;
  created_at: string;
  updated_at: string;
  student_application_count: number;
  researcher_application_count: number;
  application_count: number;
};

// NEW TYPES FOR RECRUITMENT AND DISCUSSION POSTS
type TagItem = {
  id: number;
  name: string;
  description?: string | null;
};

type RequiredSkillItem = {
  id: number;
  skill_id?: number | null;
  manual_skill_name?: string | null;
  source: 'predefined' | 'manual';
  skills?: { id: number; name: string; description: string | null } | null;
};

export type RecruitmentPostItem = {
  id: number;
  project_id: number;
  created_by_researcher_id: number;
  title: string;
  description: string | null;
  collaboration_type: 'student' | 'researcher' | 'both';
  deadline: string | null;
  status: 'draft' | 'open' | 'closed' | 'filled' | 'archived';
  created_at: string;
  updated_at: string;
  projects?: { id: number; title: string } | null;
  researchers?: { id: number; first_name: string; last_name: string; email: string } | null;
  recruitment_post_tags?: Array<{ tags: TagItem }>;
  recruitment_post_required_skills?: RequiredSkillItem[];
};

export type DiscussionPostItem = {
  id: number;
  project_id?: number | null;
  created_by_researcher_id?: number | null;
  created_by_student_id?: number | null;
  title: string;
  description: string | null;
  visibility: 'private' | 'project_members' | 'public';
  created_at: string;
  updated_at: string;
  projects?: { id: number; title: string } | null;
  researcher_author?: { id: number; first_name: string; last_name: string; email: string } | null;
  student_author?: { id: number; first_name: string; last_name: string; email: string } | null;
  discussion_post_tags?: Array<{ tags: TagItem }>;
};

type PaginatedPosts<T> = {
  posts: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type RecruitmentPostPayload = {
  project_id: number;
  title: string;
  description?: string | null;
  collaboration_type?: 'student' | 'researcher' | 'both';
  deadline?: string | null;
  tags?: Array<{ name: string }>;
  required_skills?: Array<{ source: 'predefined' | 'manual'; skillId?: number; manualSkillName?: string }>;
};

type DiscussionPostPayload = {
  project_id?: number | null;
  title: string;
  description?: string | null;
  tags?: Array<{ name: string }>;
};

type ApplicationPayload = {
  post_id: number;
  cover_letter?: string;
};

type ApplicationItem = {
  id: number;
  post_id: number;
  project_id: number | null;
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected';
  cover_letter: string | null;
  applied_at: string;
  reviewed_at: string | null;
  reviewed_by_researcher_id: number | null;
  notes: string | null;
  student_id?: number;
};

type SkillPayload = { name: string; description?: string };
type AreaPayload = { name: string; description?: string };

type ProjectListFilters = {
  page?: number;
  limit?: number;
  category?: string;
  team_id?: number;
  research_area_id?: number;
  created_by_researcher_id?: number;
  status?: string;
  sort?: 'asc' | 'desc';
};

type PeopleListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  institution?: string;
  is_active?: boolean;
  sort?: 'asc' | 'desc';
};

export type ProjectSummary = {
  id: number;
  title: string;
  category: string | null;
  status: 'draft' | 'open' | 'closed' | 'archived';
  created_by_researcher_id: number;
  application_deadline: string | null;
  description: string | null;
  duration_months?: number | null;
  timeframe?: string | null;
  background_requirements?: string | null;
  required_skills_text?: string | null;
  interests_text?: string | null;
  references_text?: string | null;
  master_degrees_text?: string | null;
  internship_season?: string | null;
  minimum_gpa?: string | number | null;
  phd_funding?: boolean | number | null;
  stipend?: boolean | number | null;
  created_at?: string;
  updated_at?: string;
};

export type ProjectResearcherMember = {
  id: number;
  project_id: number;
  researcher_id: number;
  project_role: string;
  joined_at: string;
  first_name: string;
  last_name: string;
  email: string;
  institution: string | null;
  bio: string | null;
  global_role: string;
  profile_image_url: string | null;
};

export type ProjectStudentMember = {
  id: number;
  project_id: number;
  student_id: number;
  participation_role: string;
  joined_at: string;
  status: string;
  first_name: string;
  last_name: string;
  email: string;
  institution: string | null;
  bio: string | null;
  gpa: string | number | null;
  profile_image_url: string | null;
};

export type ProjectTeamRow = {
  project_id: number;
  team_id: number;
  role_description: string | null;
  name: string;
  description: string | null;
  lab_id: number | null;
  is_active: boolean | number;
};

export type ProjectResearchAreaRow = {
  project_id: number;
  research_area_id: number;
  name: string;
  description: string | null;
};

export type ProjectRequirementRow = {
  id: number;
  project_id: number;
  requirement_type: string;
  requirement_text: string;
  is_mandatory: boolean | number;
  created_at: string;
};

export type ProjectDetail = ProjectSummary & {
  researchers: ProjectResearcherMember[];
  students: ProjectStudentMember[];
  teams: ProjectTeamRow[];
  research_areas: ProjectResearchAreaRow[];
  requirements: ProjectRequirementRow[];
};

type ProjectPayload = {
  title: string;
  category?: string;
  duration_months?: number | null;
  timeframe?: string;
  application_deadline?: string | null;
  description?: string;
  background_requirements?: string;
  required_skills_text?: string;
  interests_text?: string;
  references_text?: string;
  master_degrees_text?: string;
  internship_season?: string;
  minimum_gpa?: number | null;
  phd_funding?: boolean;
  stipend?: boolean;
  status?: 'draft' | 'open' | 'closed' | 'archived';
};

type PostPayload = {
  project_id: number;
  title: string;
  description?: string;
  status?: 'draft' | 'open' | 'closed' | 'archived';
  allow_students?: boolean;
  allow_researchers?: boolean;
  application_deadline?: string | null;
};

type ListFilters = {
  page?: number;
  limit?: number;
};

type PostListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  project_id?: number;
  created_by_researcher_id?: number;
  allow_students?: boolean;
  allow_researchers?: boolean;
  status?: string;
  sort?: 'asc' | 'desc';
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readAuthState(): AuthState | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

function writeAuthState(state: AuthState | null): void {
  if (!isBrowser()) {
    return;
  }

  if (!state) {
    localStorage.removeItem(AUTH_KEY);
    window.dispatchEvent(new CustomEvent('auth-changed'));
    return;
  }

  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('auth-changed'));
}

export function getCurrentUser(): TokenUser | null {
  return readAuthState()?.user ?? null;
}

function getAccessToken(): string | null {
  return readAuthState()?.accessToken ?? null;
}

function getRefreshToken(): string | null {
  return readAuthState()?.refreshToken ?? null;
}

function getCurrentUserIdOrThrow(expectedRole?: UserRole): number {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('No authenticated user found');
  }

  if (expectedRole && user.role !== expectedRole) {
    throw new Error(`Current user is not a ${expectedRole}`);
  }

  return user.id;
}

function setAccessToken(accessToken: string): void {
  const currentState = readAuthState();
  if (!currentState) {
    return;
  }

  writeAuthState({ ...currentState, accessToken });
}

function normalizeEnvelope<T>(response: { data: ApiEnvelope<T> }): ApiEnvelope<T> {
  return response.data;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await refreshClient.post<ApiEnvelope<{ accessToken: string }>>('/auth/refresh', { refreshToken });
    const accessToken = response.data.data?.accessToken;
    if (accessToken) {
      setAccessToken(accessToken);
      return accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

let refreshPromise: Promise<string | null> | null = null;

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const refreshClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse<ApiEnvelope<unknown>>) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean } | undefined;
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    refreshPromise = refreshPromise || refreshAccessToken();
    const newAccessToken = await refreshPromise.finally(() => {
      refreshPromise = null;
    });

    if (!newAccessToken) {
      writeAuthState(null);
      return Promise.reject(error);
    }

    originalRequest.headers = {
      ...(originalRequest.headers || {}),
      Authorization: `Bearer ${newAccessToken}`,
    };

    return api(originalRequest);
  },
);

async function request<T>(config: AxiosRequestConfig): Promise<ApiEnvelope<T>> {
  const response = await api.request<ApiEnvelope<T>>(config);
  return normalizeEnvelope(response);
}

function buildParams(params: Record<string, string | number | boolean | null | undefined>): URLSearchParams {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.set(key, String(value));
  });
  return searchParams;
}

function ensureAuthState(data: ApiEnvelope<{ accessToken: string; refreshToken: string; user: TokenUser }>): ApiEnvelope<{ accessToken: string; refreshToken: string; user: TokenUser }> {
  if (data.data) {
    writeAuthState(data.data);
  }
  return data;
}

export const auth = {
  async register(role: UserRole, data: Omit<AuthPayload, 'role'>) {
    const response = await request<{ accessToken: string; refreshToken: string; user: TokenUser }>({
      url: '/auth/register',
      method: 'POST',
      data: { role, ...data },
    });
    return ensureAuthState(response);
  },
  async login(role: UserRole, email: string, password: string) {
    const response = await request<{ accessToken: string; refreshToken: string; user: TokenUser }>({
      url: '/auth/login',
      method: 'POST',
      data: { role, email, password },
    });
    return ensureAuthState(response);
  },
  async logout() {
    const response = await request<null>({ url: '/auth/logout', method: 'POST' });
    writeAuthState(null);
    return response;
  },
  async refresh() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return { success: false, message: 'No refresh token available' } as ApiEnvelope<{ accessToken: string }>;
    }

    const response = await request<{ accessToken: string }>({
      url: '/auth/refresh',
      method: 'POST',
      data: { refreshToken },
    });

    if (response.data?.accessToken) {
      setAccessToken(response.data.accessToken);
    }

    return response;
  },
};

export const students = {
  list: (filters: PeopleListFilters = {}) => request<StudentProfile[]>({
    url: `/students?${buildParams({
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      institution: filters.institution,
      is_active: filters.is_active,
      sort: filters.sort,
    }).toString()}`,
    method: 'GET',
  }),
  getMe: () => request<StudentProfile>({ url: '/students/me', method: 'GET' }),
  updateMe: (data: Partial<Pick<StudentProfile, 'first_name' | 'last_name' | 'institution' | 'bio' | 'gpa'>>) => request<StudentProfile>({ url: '/students/me', method: 'PUT', data }),
  getById: (id: number | string) => request<StudentProfile>({ url: `/students/${id}`, method: 'GET' }),
  getProjects: (id: number | string) =>
    request<
      Array<{
        id: number;
        title: string;
        category: string | null;
        status: string;
        participation_role: string;
        membership_status: string;
        joined_at: string;
      }>
    >({ url: `/students/${id}/projects`, method: 'GET' }),
  /** Discussion threads authored by the student (public activity). */
  getPosts: (id: number | string) =>
    request<
      Array<{
        id: number;
        project_id: number;
        title: string;
        description: string | null;
        status: string;
        created_at: string;
        updated_at: string;
        post_kind: string;
      }>
    >({ url: `/students/${id}/posts`, method: 'GET' }),
  getSkills: (id?: number | string) => request<SkillItem[]>({ url: `/students/${id ?? getCurrentUserIdOrThrow('student')}/skills`, method: 'GET' }),
  addSkill: (data: { skill_id?: number; skill_name?: string; source?: 'manual' | 'cv_nlp' | 'inferred' }) => request<null>({ url: `/students/${getCurrentUserIdOrThrow('student')}/skills`, method: 'POST', data }),
  removeSkill: (skillId: number | string) => request<null>({ url: `/students/${getCurrentUserIdOrThrow('student')}/skills/${skillId}`, method: 'DELETE' }),
  uploadCV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ document_id: number; file_name: string; file_path: string }>({
      url: `/students/${getCurrentUserIdOrThrow('student')}/cv`,
      method: 'POST',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getMyApplications: () => request<unknown[]>({ url: `/students/${getCurrentUserIdOrThrow('student')}/applications`, method: 'GET' }),
};

export const researchers = {
  list: (filters: PeopleListFilters = {}) => request<ResearcherProfile[]>({
    url: `/researchers?${buildParams({
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      institution: filters.institution,
      is_active: filters.is_active,
      sort: filters.sort,
    }).toString()}`,
    method: 'GET',
  }),
  getMe: () => request<ResearcherProfile>({ url: '/researchers/me', method: 'GET' }),
  updateMe: (data: Partial<Pick<ResearcherProfile, 'first_name' | 'last_name' | 'institution' | 'bio' | 'profile_image_url'>>) => request<ResearcherProfile>({ url: '/researchers/me', method: 'PUT', data }),
  getById: (id: number | string) => request<ResearcherProfile>({ url: `/researchers/${id}`, method: 'GET' }),
  getSkills: (id?: number | string) => request<SkillItem[]>({ url: `/researchers/${id ?? getCurrentUserIdOrThrow('researcher')}/skills`, method: 'GET' }),
  getResearchAreas: (id?: number | string) => request<ResearchAreaItem[]>({ url: `/researchers/${id ?? getCurrentUserIdOrThrow('researcher')}/research-areas`, method: 'GET' }),
  addSkill: (data: { skill_id?: number; skill_name?: string; source?: 'manual' | 'cv_nlp' | 'inferred' }) => request<null>({ url: `/researchers/${getCurrentUserIdOrThrow('researcher')}/skills`, method: 'POST', data }),
  removeSkill: (skillId: number | string) => request<null>({ url: `/researchers/${getCurrentUserIdOrThrow('researcher')}/skills/${skillId}`, method: 'DELETE' }),
  addResearchArea: (data: { research_area_id?: number; research_area_name?: string }) => request<null>({ url: `/researchers/${getCurrentUserIdOrThrow('researcher')}/research-areas`, method: 'POST', data }),
  removeResearchArea: (areaId: number | string) => request<null>({ url: `/researchers/${getCurrentUserIdOrThrow('researcher')}/research-areas/${areaId}`, method: 'DELETE' }),
  getProjects: (researcherId: number | string) => request<unknown[]>({ url: `/researchers/${researcherId}/projects`, method: 'GET' }),
  getPosts: (researcherId: number | string) => request<PostItem[]>({ url: `/researchers/${researcherId}/posts`, method: 'GET' }),
  uploadCV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ document_id: number; file_name: string; file_path: string }>({
      url: `/researchers/${getCurrentUserIdOrThrow('researcher')}/cv`,
      method: 'POST',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const projects = {
  list: (filters: ProjectListFilters = {}) => request<ProjectSummary[]>({
    url: `/projects?${buildParams({
      page: filters.page,
      limit: filters.limit,
      category: filters.category,
      team_id: filters.team_id,
      research_area_id: filters.research_area_id,
      created_by_researcher_id: filters.created_by_researcher_id,
      status: filters.status,
      sort: filters.sort,
    }).toString()}`,
    method: 'GET',
  }),
  listMine: (sort: 'asc' | 'desc' = 'desc') =>
    request<ProjectSummary[]>({ url: `/projects/mine?${buildParams({ sort }).toString()}`, method: 'GET' }),
  create: (data: ProjectPayload) => request<{ id: number }>({ url: '/projects', method: 'POST', data }),
  getById: (id: number | string) => request<ProjectDetail>({ url: `/projects/${id}`, method: 'GET' }),
  update: (id: number | string, data: ProjectPayload) => request<null>({ url: `/projects/${id}`, method: 'PUT', data }),
  delete: (id: number | string) => request<null>({ url: `/projects/${id}`, method: 'DELETE' }),
  addResearcher: (id: number | string, data: { researcher_id: number; project_role: string }) => request<null>({ url: `/projects/${id}/researchers`, method: 'POST', data }),
  removeResearcher: (id: number | string, researcherId: number | string) => request<null>({ url: `/projects/${id}/researchers/${researcherId}`, method: 'DELETE' }),
  addTeam: (id: number | string, data: { team_id: number; role_description?: string }) => request<null>({ url: `/projects/${id}/teams`, method: 'POST', data }),
  removeTeam: (id: number | string, teamId: number | string) => request<null>({ url: `/projects/${id}/teams/${teamId}`, method: 'DELETE' }),
  addResearchArea: (id: number | string, data: { research_area_id: number }) => request<null>({ url: `/projects/${id}/research-areas`, method: 'POST', data }),
  removeResearchArea: (id: number | string, areaId: number | string) => request<null>({ url: `/projects/${id}/research-areas/${areaId}`, method: 'DELETE' }),
  addRequirement: (id: number | string, data: Record<string, unknown>) => request<unknown>({ url: `/projects/${id}/requirements`, method: 'POST', data }),
  removeRequirement: (id: number | string, reqId: number | string) => request<null>({ url: `/projects/${id}/requirements/${reqId}`, method: 'DELETE' }),
};

export const posts = {
  list: (filters: PostListFilters = {}) => request<PostItem[]>({
    url: `/posts?${buildParams({
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      project_id: filters.project_id,
      created_by_researcher_id: filters.created_by_researcher_id,
      allow_students: filters.allow_students,
      allow_researchers: filters.allow_researchers,
      status: filters.status,
      sort: filters.sort,
    }).toString()}`,
    method: 'GET',
  }),
  create: (data: PostPayload) => request<{ id: number }>({ url: '/posts', method: 'POST', data }),
  getById: (id: number | string) => request<unknown>({ url: `/posts/${id}`, method: 'GET' }),
  update: (id: number | string, data: PostPayload) => request<null>({ url: `/posts/${id}`, method: 'PUT', data }),
  delete: (id: number | string) => request<null>({ url: `/posts/${id}`, method: 'DELETE' }),
  applyAsStudent: (id: number | string, coverLetter: string) => request<null>({ url: `/posts/${id}/apply/student`, method: 'POST', data: { cover_letter: coverLetter } }),
  applyAsResearcher: (id: number | string, coverLetter: string) => request<null>({ url: `/posts/${id}/apply/researcher`, method: 'POST', data: { cover_letter: coverLetter } }),
  getApplications: (id: number | string) => request<unknown>({ url: `/posts/${id}/applications`, method: 'GET' }),
  updateApplicationStatus: (postId: number | string, type: 'students' | 'researchers', appId: number | string, status: string) => request<null>({ url: `/posts/${postId}/applications/${type}/${appId}`, method: 'PUT', data: { status } }),
};

// TODO: Migrate old posts API calls to recruitment/discussion posts
export const recruitmentPosts = {
  list: (filters: { page?: number; limit?: number; project_id?: number; created_by_researcher_id?: number; status?: string; search?: string } = {}) =>
    request<PaginatedPosts<RecruitmentPostItem>>({
    url: `/recruitment-posts?${buildParams(filters).toString()}`,
    method: 'GET',
  }),
  create: (data: RecruitmentPostPayload) => request<{ id: number }>({ url: '/recruitment-posts', method: 'POST', data }),
  getById: (id: number | string) => request<RecruitmentPostItem>({ url: `/recruitment-posts/${id}`, method: 'GET' }),
  update: (id: number | string, data: Partial<RecruitmentPostPayload>) => request<RecruitmentPostItem>({ url: `/recruitment-posts/${id}`, method: 'PUT', data }),
  delete: (id: number | string) => request<null>({ url: `/recruitment-posts/${id}`, method: 'DELETE' }),
};

export const discussionPosts = {
  list: (filters: { page?: number; limit?: number; project_id?: number; created_by_researcher_id?: number; created_by_student_id?: number; search?: string } = {}) =>
    request<PaginatedPosts<DiscussionPostItem>>({
    url: `/discussion-posts?${buildParams(filters).toString()}`,
    method: 'GET',
  }),
  create: (data: DiscussionPostPayload) => request<{ id: number }>({ url: '/discussion-posts', method: 'POST', data }),
  getById: (id: number | string) => request<DiscussionPostItem>({ url: `/discussion-posts/${id}`, method: 'GET' }),
  update: (id: number | string, data: Partial<DiscussionPostPayload>) => request<DiscussionPostItem>({ url: `/discussion-posts/${id}`, method: 'PUT', data }),
  delete: (id: number | string) => request<null>({ url: `/discussion-posts/${id}`, method: 'DELETE' }),
};

export const postApplications = {
  apply: (data: ApplicationPayload) => request<ApplicationItem>({ url: '/post-applications', method: 'POST', data }),
  getMy: (page?: number, limit?: number) => request<ApplicationItem[]>({ url: `/post-applications/my?${buildParams({ page, limit }).toString()}`, method: 'GET' }),
  getForPost: (post_id: number) => request<ApplicationItem[]>({ url: `/post-applications/received?${buildParams({ post_id }).toString()}`, method: 'GET' }),
};

export const teams = {
  list: (filters: ListFilters = {}) => request<unknown[]>({
    url: `/teams?${buildParams(filters).toString()}`,
    method: 'GET',
  }),
  getById: (id: number | string) => request<unknown>({ url: `/teams/${id}`, method: 'GET' }),
  getMembers: (id: number | string) => request<unknown[]>({ url: `/teams/${id}/members`, method: 'GET' }),
  create: (data: { lab_id: number; name: string; description?: string }) => request<unknown>({ url: '/teams', method: 'POST', data }),
  update: (id: number | string, data: Record<string, unknown>) => request<null>({ url: `/teams/${id}`, method: 'PUT', data }),
};

export const skills = {
  list: (filters: ListFilters = {}) => request<unknown[]>({
    url: `/skills?${buildParams(filters).toString()}`,
    method: 'GET',
  }),
  create: (data: SkillPayload) => request<unknown>({ url: '/skills', method: 'POST', data }),
};

export const researchAreas = {
  list: (filters: ListFilters = {}) => request<unknown[]>({
    url: `/research-areas?${buildParams(filters).toString()}`,
    method: 'GET',
  }),
  create: (data: AreaPayload) => request<unknown>({ url: '/research-areas', method: 'POST', data }),
};

export const applications = {
  getMineAsStudent: (page?: number, limit?: number) => request<unknown[]>({ url: `/applications/mine/student?${buildParams({ page, limit }).toString()}`, method: 'GET' }),
  getMineAsResearcher: (page?: number, limit?: number) => request<unknown[]>({ url: `/applications/mine/researcher?${buildParams({ page, limit }).toString()}`, method: 'GET' }),
  withdrawStudent: (id: number | string) => request<null>({ url: `/applications/student/${id}`, method: 'DELETE' }),
  withdrawResearcher: (id: number | string) => request<null>({ url: `/applications/researcher/${id}`, method: 'DELETE' }),
  /** Researcher: searchable list of project posts they own with application counts */
  listManagedPostSummaries: (params?: { search?: string; page?: number; limit?: number }) =>
    request<ManagedPostSummary[]>({
      url: `/applications/post-summaries?${buildParams({
        search: params?.search,
        page: params?.page,
        limit: params?.limit ?? 100,
      }).toString()}`,
      method: 'GET',
    }),
  /** Researcher: applicants (students + researchers) for a project post they created */
  getForProjectPost: (postId: number | string) =>
    request<PostApplicationApplicantRow[]>({ url: `/applications/posts/${postId}`, method: 'GET' }),
  update: (id: number | string, data: { status?: string; applicant_kind?: ApplicationApplicantKind; cover_letter?: string; notes?: string }) =>
    request<unknown>({ url: `/applications/${id}`, method: 'PATCH', data }),
};

export { api };
