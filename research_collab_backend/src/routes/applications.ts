import { Router } from 'express';
import { ResultSetHeader } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { escapeLike, getSearchTerm, normalizeText, parsePagination, parseSortOrder, sendError, sendSuccess } from '../lib/http';

const router = Router();

type ApplicationStatus = 'submitted' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';

interface ApplicationListRow {
  id: number;
  post_id: number;
  project_id: number;
  applicant_id: number;
  status: ApplicationStatus;
  cover_letter: string | null;
  applied_at: Date | string;
  reviewed_at: Date | string | null;
  reviewed_by_researcher_id: number | null;
  notes: string | null;
  post_title: string;
  post_status: string;
  project_title: string;
}

interface ApplicationDetailsRow extends ApplicationListRow {
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_email: string;
  applicant_institution: string | null;
  applicant_bio: string | null;
  applicant_gpa: string | number | null;
  applicant_profile_image_url: string | null;
  creator_id: number;
  creator_first_name: string;
  creator_last_name: string;
  creator_email: string;
}

function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return value === 'submitted' || value === 'under_review' || value === 'shortlisted' || value === 'accepted' || value === 'rejected' || value === 'withdrawn';
}

async function getPostDetails(postId: number) {
  const [rows] = await pool.query<Array<{
    id: number;
    project_id: number;
    created_by_researcher_id: number;
    title: string;
    description: string | null;
    status: 'draft' | 'open' | 'closed' | 'archived';
    allow_students: number | boolean;
    allow_researchers: number | boolean;
    application_deadline: Date | string | null;
  }>>(
    'SELECT id, project_id, created_by_researcher_id, title, description, status, allow_students, allow_researchers, application_deadline FROM project_posts WHERE id = ? LIMIT 1',
    [postId],
  );

  return rows[0] || null;
}

async function listStudentApplications(
  studentId: number,
  page: number,
  limit: number,
  search: string,
  sort: 'asc' | 'desc',
): Promise<{ rows: ApplicationListRow[]; total: number }> {
  const offset = (page - 1) * limit;
  const order = sort === 'asc' ? 'ASC' : 'DESC';
  const searchTerm = search.trim();

  if (searchTerm) {
    const like = `%${escapeLike(searchTerm)}%`;
    const [countRows] = await pool.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total
       FROM post_student_applications psa
       INNER JOIN project_posts pp ON pp.id = psa.post_id
       INNER JOIN projects p ON p.id = psa.project_id
       WHERE psa.student_id = ? AND (pp.title LIKE ? OR p.title LIKE ?)`,
      [studentId, like, like],
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query<ApplicationListRow[]>(
      `SELECT psa.id, psa.post_id, psa.project_id, psa.student_id AS applicant_id, psa.status, psa.cover_letter, psa.applied_at, psa.reviewed_at, psa.reviewed_by_researcher_id, psa.notes,
              pp.title AS post_title, pp.status AS post_status, p.title AS project_title
       FROM post_student_applications psa
       INNER JOIN project_posts pp ON pp.id = psa.post_id
       INNER JOIN projects p ON p.id = psa.project_id
       WHERE psa.student_id = ? AND (pp.title LIKE ? OR p.title LIKE ?)
       ORDER BY psa.applied_at ${order}
       LIMIT ? OFFSET ?`,
      [studentId, like, like, limit, offset],
    );
    return { rows, total };
  }

  const [countRows] = await pool.query<Array<{ total: number }>>(
    'SELECT COUNT(*) AS total FROM post_student_applications WHERE student_id = ?',
    [studentId],
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<ApplicationListRow[]>(
    `SELECT psa.id, psa.post_id, psa.project_id, psa.student_id AS applicant_id, psa.status, psa.cover_letter, psa.applied_at, psa.reviewed_at, psa.reviewed_by_researcher_id, psa.notes,
            pp.title AS post_title, pp.status AS post_status, p.title AS project_title
     FROM post_student_applications psa
     INNER JOIN project_posts pp ON pp.id = psa.post_id
     INNER JOIN projects p ON p.id = psa.project_id
     WHERE psa.student_id = ?
     ORDER BY psa.applied_at ${order}
     LIMIT ? OFFSET ?`,
    [studentId, limit, offset],
  );
  return { rows, total };
}

async function listResearcherApplications(
  researcherId: number,
  page: number,
  limit: number,
  search: string,
  sort: 'asc' | 'desc',
): Promise<{ rows: ApplicationListRow[]; total: number }> {
  const offset = (page - 1) * limit;
  const order = sort === 'asc' ? 'ASC' : 'DESC';
  const searchTerm = search.trim();

  if (searchTerm) {
    const like = `%${escapeLike(searchTerm)}%`;
    const [countRows] = await pool.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total
       FROM post_researcher_applications pra
       INNER JOIN project_posts pp ON pp.id = pra.post_id
       INNER JOIN projects p ON p.id = pra.project_id
       WHERE pra.researcher_id = ? AND (pp.title LIKE ? OR p.title LIKE ?)`,
      [researcherId, like, like],
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query<ApplicationListRow[]>(
      `SELECT pra.id, pra.post_id, pra.project_id, pra.researcher_id AS applicant_id, pra.status, pra.cover_letter, pra.applied_at, pra.reviewed_at, pra.reviewed_by_researcher_id, pra.notes,
              pp.title AS post_title, pp.status AS post_status, p.title AS project_title
       FROM post_researcher_applications pra
       INNER JOIN project_posts pp ON pp.id = pra.post_id
       INNER JOIN projects p ON p.id = pra.project_id
       WHERE pra.researcher_id = ? AND (pp.title LIKE ? OR p.title LIKE ?)
       ORDER BY pra.applied_at ${order}
       LIMIT ? OFFSET ?`,
      [researcherId, like, like, limit, offset],
    );
    return { rows, total };
  }

  const [countRows] = await pool.query<Array<{ total: number }>>(
    'SELECT COUNT(*) AS total FROM post_researcher_applications WHERE researcher_id = ?',
    [researcherId],
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<ApplicationListRow[]>(
    `SELECT pra.id, pra.post_id, pra.project_id, pra.researcher_id AS applicant_id, pra.status, pra.cover_letter, pra.applied_at, pra.reviewed_at, pra.reviewed_by_researcher_id, pra.notes,
            pp.title AS post_title, pp.status AS post_status, p.title AS project_title
     FROM post_researcher_applications pra
     INNER JOIN project_posts pp ON pp.id = pra.post_id
     INNER JOIN projects p ON p.id = pra.project_id
     WHERE pra.researcher_id = ?
     ORDER BY pra.applied_at ${order}
     LIMIT ? OFFSET ?`,
    [researcherId, limit, offset],
  );
  return { rows, total };
}

async function getApplicationById(
  applicationId: number,
): Promise<{ kind: 'student' | 'researcher'; row: ApplicationDetailsRow } | null> {
  const [studentRows] = await pool.query<ApplicationDetailsRow[]>(
    `SELECT psa.id, psa.post_id, psa.project_id, psa.student_id AS applicant_id, psa.status, psa.cover_letter, psa.applied_at, psa.reviewed_at, psa.reviewed_by_researcher_id, psa.notes,
            pp.title AS post_title, pp.status AS post_status, p.title AS project_title,
            s.first_name AS applicant_first_name, s.last_name AS applicant_last_name, s.email AS applicant_email,
            s.institution AS applicant_institution, s.bio AS applicant_bio, s.gpa AS applicant_gpa, s.profile_image_url AS applicant_profile_image_url,
            pp.created_by_researcher_id AS creator_id, cr.first_name AS creator_first_name, cr.last_name AS creator_last_name, cr.email AS creator_email
     FROM post_student_applications psa
     INNER JOIN project_posts pp ON pp.id = psa.post_id
     INNER JOIN projects p ON p.id = psa.project_id
     INNER JOIN students s ON s.id = psa.student_id
     INNER JOIN researchers cr ON cr.id = pp.created_by_researcher_id
     WHERE psa.id = ?
     LIMIT 1`,
    [applicationId],
  );

  const studentRow = studentRows[0];
  if (studentRow) {
    return { kind: 'student', row: studentRow };
  }

  const [researcherRows] = await pool.query<ApplicationDetailsRow[]>(
    `SELECT pra.id, pra.post_id, pra.project_id, pra.researcher_id AS applicant_id, pra.status, pra.cover_letter, pra.applied_at, pra.reviewed_at, pra.reviewed_by_researcher_id, pra.notes,
            pp.title AS post_title, pp.status AS post_status, p.title AS project_title,
            r.first_name AS applicant_first_name, r.last_name AS applicant_last_name, r.email AS applicant_email,
            r.institution AS applicant_institution, r.bio AS applicant_bio, NULL AS applicant_gpa, r.profile_image_url AS applicant_profile_image_url,
            pp.created_by_researcher_id AS creator_id, cr.first_name AS creator_first_name, cr.last_name AS creator_last_name, cr.email AS creator_email
     FROM post_researcher_applications pra
     INNER JOIN project_posts pp ON pp.id = pra.post_id
     INNER JOIN projects p ON p.id = pra.project_id
     INNER JOIN researchers r ON r.id = pra.researcher_id
     INNER JOIN researchers cr ON cr.id = pp.created_by_researcher_id
     WHERE pra.id = ?
     LIMIT 1`,
    [applicationId],
  );

  const researcherRow = researcherRows[0];
  if (researcherRow) {
    return { kind: 'researcher', row: researcherRow };
  }

  return null;
}

function isApplicantKind(value: unknown): value is 'student' | 'researcher' {
  return value === 'student' || value === 'researcher';
}

type QueryLike = Pick<PoolConnection, 'query'>;

async function addProjectMemberFromAcceptedApplication(
  exec: QueryLike,
  projectId: number,
  kind: 'student' | 'researcher',
  userId: number,
): Promise<void> {
  if (kind === 'student') {
    await exec.query(
      `INSERT INTO project_students (project_id, student_id, participation_role, joined_at, status)
       VALUES (?, ?, 'student_researcher', NOW(), 'active')
       ON DUPLICATE KEY UPDATE
         status = 'active',
         participation_role = 'student_researcher',
         joined_at = NOW()`,
      [projectId, userId],
    );
    return;
  }

  await exec.query(
    `INSERT IGNORE INTO project_researchers (project_id, researcher_id, project_role, joined_at)
     VALUES (?, ?, 'collaborator', NOW())`,
    [projectId, userId],
  );
}

/** Revoke project access when an application moves from accepted → rejected (or similar). */
async function removeProjectMemberAfterReject(
  exec: QueryLike,
  projectId: number,
  kind: 'student' | 'researcher',
  userId: number,
): Promise<void> {
  if (kind === 'student') {
    await exec.query(
      `UPDATE project_students
       SET status = 'withdrawn', left_at = NOW()
       WHERE project_id = ? AND student_id = ?`,
      [projectId, userId],
    );
    return;
  }

  await exec.query(
    `DELETE FROM project_researchers
     WHERE project_id = ? AND researcher_id = ? AND project_role = 'collaborator'`,
    [projectId, userId],
  );
}

async function getApplicationByIdAndKind(
  applicationId: number,
  kind: 'student' | 'researcher',
): Promise<{ kind: 'student' | 'researcher'; row: ApplicationDetailsRow } | null> {
  if (kind === 'student') {
    const [studentRows] = await pool.query<ApplicationDetailsRow[]>(
      `SELECT psa.id, psa.post_id, psa.project_id, psa.student_id AS applicant_id, psa.status, psa.cover_letter, psa.applied_at, psa.reviewed_at, psa.reviewed_by_researcher_id, psa.notes,
              pp.title AS post_title, pp.status AS post_status, p.title AS project_title,
              s.first_name AS applicant_first_name, s.last_name AS applicant_last_name, s.email AS applicant_email,
              s.institution AS applicant_institution, s.bio AS applicant_bio, s.gpa AS applicant_gpa, s.profile_image_url AS applicant_profile_image_url,
              pp.created_by_researcher_id AS creator_id, cr.first_name AS creator_first_name, cr.last_name AS creator_last_name, cr.email AS creator_email
       FROM post_student_applications psa
       INNER JOIN project_posts pp ON pp.id = psa.post_id
       INNER JOIN projects p ON p.id = psa.project_id
       INNER JOIN students s ON s.id = psa.student_id
       INNER JOIN researchers cr ON cr.id = pp.created_by_researcher_id
       WHERE psa.id = ?
       LIMIT 1`,
      [applicationId],
    );
    const row = studentRows[0];
    return row ? { kind: 'student', row } : null;
  }

  const [researcherRows] = await pool.query<ApplicationDetailsRow[]>(
    `SELECT pra.id, pra.post_id, pra.project_id, pra.researcher_id AS applicant_id, pra.status, pra.cover_letter, pra.applied_at, pra.reviewed_at, pra.reviewed_by_researcher_id, pra.notes,
            pp.title AS post_title, pp.status AS post_status, p.title AS project_title,
            r.first_name AS applicant_first_name, r.last_name AS applicant_last_name, r.email AS applicant_email,
            r.institution AS applicant_institution, r.bio AS applicant_bio, NULL AS applicant_gpa, r.profile_image_url AS applicant_profile_image_url,
            pp.created_by_researcher_id AS creator_id, cr.first_name AS creator_first_name, cr.last_name AS creator_last_name, cr.email AS creator_email
     FROM post_researcher_applications pra
     INNER JOIN project_posts pp ON pp.id = pra.post_id
     INNER JOIN projects p ON p.id = pra.project_id
     INNER JOIN researchers r ON r.id = pra.researcher_id
     INNER JOIN researchers cr ON cr.id = pp.created_by_researcher_id
     WHERE pra.id = ?
     LIMIT 1`,
    [applicationId],
  );
  const row = researcherRows[0];
  return row ? { kind: 'researcher', row } : null;
}

router.get('/mine/student', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);
    const [countRows] = await pool.query<Array<{ total: number }>>('SELECT COUNT(*) AS total FROM post_student_applications WHERE student_id = ?', [req.user.id]);
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT psa.id, psa.post_id, psa.project_id, psa.student_id, psa.status, psa.cover_letter, psa.applied_at, psa.reviewed_at, psa.reviewed_by_researcher_id, psa.notes,
              pp.title AS post_title, pp.status AS post_status, p.title AS project_title
       FROM post_student_applications psa
       INNER JOIN project_posts pp ON pp.id = psa.post_id
       INNER JOIN projects p ON p.id = psa.project_id
       WHERE psa.student_id = ?
       ORDER BY psa.applied_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset],
    );

    res.json({ success: true, data: rows, pagination: { page, limit, total } });
  } catch (error) {
    console.error('Get mine student applications error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/mine/researcher', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'researcher') {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);
    const [countRows] = await pool.query<Array<{ total: number }>>('SELECT COUNT(*) AS total FROM post_researcher_applications WHERE researcher_id = ?', [req.user.id]);
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT pra.id, pra.post_id, pra.project_id, pra.researcher_id, pra.status, pra.cover_letter, pra.applied_at, pra.reviewed_at, pra.reviewed_by_researcher_id, pra.notes,
              pp.title AS post_title, pp.status AS post_status, p.title AS project_title
       FROM post_researcher_applications pra
       INNER JOIN project_posts pp ON pp.id = pra.post_id
       INNER JOIN projects p ON p.id = pra.project_id
       WHERE pra.researcher_id = ?
       ORDER BY pra.applied_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset],
    );

    res.json({ success: true, data: rows, pagination: { page, limit, total } });
  } catch (error) {
    console.error('Get mine researcher applications error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.delete('/student/:app_id', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const appId = Number(req.params.app_id);
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE post_student_applications SET status = ?, reviewed_at = NOW() WHERE id = ? AND student_id = ?',
      ['withdrawn', appId, req.user.id],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.json({ success: true, message: 'Application withdrawn' });
  } catch (error) {
    console.error('Withdraw student application error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.delete('/researcher/:app_id', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'researcher') {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const appId = Number(req.params.app_id);
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE post_researcher_applications SET status = ?, reviewed_at = NOW() WHERE id = ? AND researcher_id = ?',
      ['withdrawn', appId, req.user.id],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.json({ success: true, message: 'Application withdrawn' });
  } catch (error) {
    console.error('Withdraw researcher application error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query as Record<string, string>);
    const search = getSearchTerm(req.query as Record<string, string>);
    const sort = parseSortOrder(req.query.sort as string | undefined, 'desc');

    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const result = req.user.role === 'student'
      ? await listStudentApplications(req.user.id, page, limit, search, sort)
      : await listResearcherApplications(req.user.id, page, limit, search, sort);

    sendSuccess(res, 200, result.rows, 'Operation successful', { page, limit, total: result.total });
  } catch (error) {
    console.error('List applications error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const postId = Number(req.body?.post_id);
    const coverLetter = normalizeText(req.body?.cover_letter);
    if (!postId) {
      sendError(res, 400, 'post_id is required');
      return;
    }

    const post = await getPostDetails(postId);
    if (!post) {
      sendError(res, 404, 'Post not found');
      return;
    }

    if (post.status !== 'open') {
      sendError(res, 400, 'Applications are not open');
      return;
    }

    if (req.user.role === 'student') {
      if (!post.allow_students) {
        sendError(res, 400, 'Applications are not open for students');
        return;
      }

      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO post_student_applications (post_id, project_id, student_id, status, cover_letter, applied_at, reviewed_at, reviewed_by_researcher_id, notes)
         VALUES (?, ?, ?, 'submitted', ?, NOW(), NULL, NULL, NULL)`,
        [postId, post.project_id, req.user.id, coverLetter || null],
      );

      sendSuccess(res, 201, { id: result.insertId }, 'Application submitted');
      return;
    }

    if (!post.allow_researchers) {
      sendError(res, 400, 'Applications are not open for researchers');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO post_researcher_applications (post_id, project_id, researcher_id, status, cover_letter, applied_at, reviewed_at, reviewed_by_researcher_id, notes)
       VALUES (?, ?, ?, 'submitted', ?, NOW(), NULL, NULL, NULL)`,
      [postId, post.project_id, req.user.id, coverLetter || null],
    );

    sendSuccess(res, 201, { id: result.insertId }, 'Application submitted');
  } catch (error) {
    console.error('Create application error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/post-summaries', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'researcher') {
      sendError(res, 403, 'Forbidden');
      return;
    }

    const search = getSearchTerm(req.query as Record<string, string>);
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);
    const conditions: string[] = ['pp.created_by_researcher_id = ?'];
    const params: Array<string | number> = [req.user.id];

    if (search) {
      const like = `%${escapeLike(search)}%`;
      conditions.push('(pp.title LIKE ? OR pp.description LIKE ?)');
      params.push(like, like);
    }

    const whereClause = conditions.join(' AND ');

    const [countRows] = await pool.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM project_posts pp WHERE ${whereClause}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query<Array<{
      id: number;
      title: string;
      status: string;
      project_id: number;
      created_at: Date | string;
      updated_at: Date | string;
      student_application_count: number | bigint;
      researcher_application_count: number | bigint;
    }>>(
      `SELECT pp.id, pp.title, pp.status, pp.project_id, pp.created_at, pp.updated_at,
              (SELECT COUNT(*) FROM post_student_applications psa WHERE psa.post_id = pp.id) AS student_application_count,
              (SELECT COUNT(*) FROM post_researcher_applications pra WHERE pra.post_id = pp.id) AS researcher_application_count
       FROM project_posts pp
       WHERE ${whereClause}
       ORDER BY pp.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const data = (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      project_id: r.project_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
      student_application_count: Number(r.student_application_count || 0),
      researcher_application_count: Number(r.researcher_application_count || 0),
      application_count: Number(r.student_application_count || 0) + Number(r.researcher_application_count || 0),
    }));

    sendSuccess(res, 200, data, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('Managed post summaries error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/posts/:postId', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'researcher') {
      sendError(res, 403, 'Forbidden');
      return;
    }

    const postId = Number(req.params.postId);
    const researcherId = req.user.id;

    const post = await getPostDetails(postId);

    if (!post || post.created_by_researcher_id !== researcherId) {
      sendError(res, 404, 'Post not found or you do not have permission to view it.');
      return;
    }

    type RowOut = ApplicationListRow & {
      applicant_kind: 'student' | 'researcher';
      applicant_email: string;
      applicant_institution: string | null;
    };

    const [studentApplications] = await pool.query<RowOut[]>(
      `SELECT psa.id, psa.post_id, psa.project_id, psa.student_id AS applicant_id, psa.status, psa.cover_letter, psa.applied_at, psa.reviewed_at, psa.reviewed_by_researcher_id, psa.notes,
              pp.title AS post_title, pp.status AS post_status, p.title AS project_title,
              s.first_name AS applicant_first_name, s.last_name AS applicant_last_name,
              s.email AS applicant_email, s.institution AS applicant_institution,
              'student' AS applicant_kind
       FROM post_student_applications psa
       INNER JOIN project_posts pp ON pp.id = psa.post_id
       INNER JOIN projects p ON p.id = psa.project_id
       JOIN students s ON s.id = psa.student_id
       WHERE psa.post_id = ?`,
      [postId],
    );

    const [researcherApplications] = await pool.query<RowOut[]>(
      `SELECT pra.id, pra.post_id, pra.project_id, pra.researcher_id AS applicant_id, pra.status, pra.cover_letter, pra.applied_at, pra.reviewed_at, pra.reviewed_by_researcher_id, pra.notes,
              pp.title AS post_title, pp.status AS post_status, p.title AS project_title,
              r.first_name AS applicant_first_name, r.last_name AS applicant_last_name,
              r.email AS applicant_email, r.institution AS applicant_institution,
              'researcher' AS applicant_kind
       FROM post_researcher_applications pra
       INNER JOIN project_posts pp ON pp.id = pra.post_id
       INNER JOIN projects p ON p.id = pra.project_id
       JOIN researchers r ON r.id = pra.researcher_id
       WHERE pra.post_id = ?`,
      [postId],
    );

    const applications = [...(studentApplications || []), ...(researcherApplications || [])].sort(
      (a, b) => new Date(String(b.applied_at)).getTime() - new Date(String(a.applied_at)).getTime(),
    );

    sendSuccess(res, 200, applications);
  } catch (error) {
    console.error('Error fetching applications for post:', error);
    sendError(res, 500, 'Failed to fetch applications');
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const applicationId = Number(req.params.id);
    const record = await getApplicationById(applicationId);
    if (!record) {
      sendError(res, 404, 'Application not found');
      return;
    }

    const { row, kind } = record;
    const isOwner = (kind === 'student' && req.user.role === 'student' && row.applicant_id === req.user.id)
      || (kind === 'researcher' && req.user.role === 'researcher' && row.applicant_id === req.user.id);
    const isCreator = req.user.role === 'researcher' && row.creator_id === req.user.id;

    if (!isOwner && !isCreator) {
      sendError(res, 403, 'Forbidden');
      return;
    }

    sendSuccess(res, 200, { kind, ...row }, 'Operation successful');
  } catch (error) {
    console.error('Get application error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const applicationId = Number(req.params.id);
    const kindHint = req.body?.applicant_kind;
    const record = isApplicantKind(kindHint)
      ? await getApplicationByIdAndKind(applicationId, kindHint)
      : await getApplicationById(applicationId);
    if (!record) {
      sendError(res, 404, 'Application not found');
      return;
    }

    const { row, kind } = record;
    const isOwner = (kind === 'student' && req.user.role === 'student' && row.applicant_id === req.user.id)
      || (kind === 'researcher' && req.user.role === 'researcher' && row.applicant_id === req.user.id);
    const isCreator = req.user.role === 'researcher' && row.creator_id === req.user.id;

    const updates: string[] = [];
    const values: Array<string | number | null> = [];

    if (req.body?.cover_letter !== undefined) {
      if (!isOwner) {
        sendError(res, 403, 'Forbidden');
        return;
      }
      updates.push('cover_letter = ?');
      values.push(normalizeText(req.body.cover_letter));
    }

    if (req.body?.status !== undefined) {
      if (!isApplicationStatus(req.body.status)) {
        sendError(res, 400, 'Invalid status');
        return;
      }

      if (!isCreator && !(isOwner && req.body.status === 'withdrawn')) {
        sendError(res, 403, 'Forbidden');
        return;
      }

      updates.push('status = ?');
      values.push(req.body.status);

      updates.push('reviewed_at = NOW()');
      if (isCreator) {
        updates.push('reviewed_by_researcher_id = ?');
        values.push(req.user.id);
      }
    }

    if (req.body?.notes !== undefined) {
      if (!isCreator) {
        sendError(res, 403, 'Forbidden');
        return;
      }
      updates.push('notes = ?');
      values.push(normalizeText(req.body.notes));
    }

    if (updates.length === 0) {
      sendError(res, 400, 'No fields to update');
      return;
    }

    const table = kind === 'student' ? 'post_student_applications' : 'post_researcher_applications';
    values.push(applicationId);

    const statusBody = req.body?.status;
    const accepting =
      typeof statusBody === 'string' &&
      statusBody === 'accepted' &&
      isCreator &&
      record.row.status !== 'accepted';

    const rejectingAfterAccept =
      typeof statusBody === 'string' &&
      statusBody === 'rejected' &&
      isCreator &&
      record.row.status === 'accepted';

    if (accepting || rejectingAfterAccept) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [result] = await conn.query<ResultSetHeader>(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`, values);
        if (result.affectedRows === 0) {
          await conn.rollback();
          sendError(res, 404, 'Application not found');
          return;
        }
        if (accepting) {
          await addProjectMemberFromAcceptedApplication(conn, record.row.project_id, kind, record.row.applicant_id);
        } else {
          await removeProjectMemberAfterReject(conn, record.row.project_id, kind, record.row.applicant_id);
        }
        await conn.commit();
      } catch (memberErr) {
        await conn.rollback();
        console.error('Application status / project membership transaction error:', memberErr);
        sendError(
          res,
          500,
          accepting ? 'Could not accept application or grant project access' : 'Could not reject application or update project access',
        );
        return;
      } finally {
        conn.release();
      }
    } else {
      const [result] = await pool.query<ResultSetHeader>(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`, values);
      if (result.affectedRows === 0) {
        sendError(res, 404, 'Application not found');
        return;
      }
    }

    const updated = await getApplicationByIdAndKind(applicationId, kind);
    sendSuccess(res, 200, updated ? { kind: updated.kind, ...updated.row } : { id: applicationId }, 'Application updated');
  } catch (error) {
    console.error('Update application error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const applicationId = Number(req.params.id);
    const record = await getApplicationById(applicationId);
    if (!record) {
      sendError(res, 404, 'Application not found');
      return;
    }

    const { row, kind } = record;
    const isOwner = (kind === 'student' && req.user.role === 'student' && row.applicant_id === req.user.id)
      || (kind === 'researcher' && req.user.role === 'researcher' && row.applicant_id === req.user.id);
    if (!isOwner) {
      sendError(res, 403, 'Forbidden');
      return;
    }

    const table = kind === 'student' ? 'post_student_applications' : 'post_researcher_applications';
    const [result] = await pool.query<ResultSetHeader>(`UPDATE ${table} SET status = 'withdrawn', reviewed_at = NOW() WHERE id = ?`, [applicationId]);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Application not found');
      return;
    }

    sendSuccess(res, 200, { id: applicationId, status: 'withdrawn' }, 'Application withdrawn');
  } catch (error) {
    console.error('Delete application error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

export default router;
