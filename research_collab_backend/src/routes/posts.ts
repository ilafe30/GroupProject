import { Router } from 'express';
import { ResultSetHeader } from 'mysql2';
import { pool } from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { escapeLike, getSearchTerm, parsePagination, parseSortOrder, sendError, sendSuccess, toBoolean, normalizeText } from '../lib/http';

const router = Router();

function parseId(value: string): number {
  return Number(value);
}

function parseBooleanQuery(value: string | string[] | undefined): boolean | null {
  if (typeof value !== 'string') {
    return null;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  return null;
}

function requireResearcher(req: any, res: any): boolean {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return false;
  }

  if (req.user.role !== 'researcher') {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return false;
  }

  return true;
}

async function isPostCreator(postId: number, researcherId: number): Promise<boolean> {
  const [rows] = await pool.query<Array<{ id: number }>>(
    'SELECT id FROM project_posts WHERE id = ? AND created_by_researcher_id = ? LIMIT 1',
    [postId, researcherId],
  );
  return rows.length > 0;
}

async function getPostRow(postId: number) {
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
    created_at: Date | string;
    updated_at: Date | string;
  }>>(
    'SELECT id, project_id, created_by_researcher_id, title, description, status, allow_students, allow_researchers, application_deadline, created_at, updated_at FROM project_posts WHERE id = ? LIMIT 1',
    [postId],
  );

  return rows[0] || null;
}

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);
    const projectId = req.query.project_id ? Number(req.query.project_id) : null;
    const createdByResearcherId = req.query.created_by_researcher_id ? Number(req.query.created_by_researcher_id) : null;
    const allowStudents = parseBooleanQuery(req.query.allow_students as string | string[] | undefined);
    const allowResearchers = parseBooleanQuery(req.query.allow_researchers as string | string[] | undefined);
    const status = normalizeText(req.query.status);
    const search = getSearchTerm(req.query as Record<string, string>);
    const sort = parseSortOrder(req.query.sort as string | undefined, 'desc');

    const conditions: string[] = [];
    const params: Array<string | number | boolean> = [];

    if (search) {
      const like = `%${escapeLike(search)}%`;
      conditions.push(`(
        pp.title LIKE ? OR
        pp.description LIKE ? OR
        p.title LIKE ? OR
        r.first_name LIKE ? OR
        r.last_name LIKE ? OR
        r.email LIKE ? OR
        EXISTS (
          SELECT 1
          FROM post_requirements pr
          WHERE pr.post_id = pp.id
            AND (pr.requirement_text LIKE ? OR pr.requirement_type LIKE ? OR pr.target_type LIKE ?)
        )
      )`);
      params.push(like, like, like, like, like, like, like, like, like);
    }

    if (status) {
      conditions.push('pp.status = ?');
      params.push(status);
    }

    if (projectId) {
      conditions.push('pp.project_id = ?');
      params.push(projectId);
    }

    if (createdByResearcherId) {
      conditions.push('pp.created_by_researcher_id = ?');
      params.push(createdByResearcherId);
    }

    if (allowStudents !== null) {
      conditions.push('pp.allow_students = ?');
      params.push(allowStudents);
    }

    if (allowResearchers !== null) {
      conditions.push('pp.allow_researchers = ?');
      params.push(allowResearchers);
    }

    const whereClause = conditions.length ? conditions.join(' AND ') : '1 = 1';
    const [countRows] = await pool.query<Array<{ total: number }>>(
      `SELECT COUNT(DISTINCT pp.id) AS total
       FROM project_posts pp
       INNER JOIN projects p ON p.id = pp.project_id
       INNER JOIN researchers r ON r.id = pp.created_by_researcher_id
       WHERE ${whereClause}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT pp.id, pp.project_id, pp.created_by_researcher_id, pp.title, pp.description, pp.status,
              pp.allow_students, pp.allow_researchers, pp.application_deadline, pp.created_at, pp.updated_at,
              p.title AS project_title,
              r.first_name AS creator_first_name, r.last_name AS creator_last_name, r.email AS creator_email
       FROM project_posts pp
       INNER JOIN projects p ON p.id = pp.project_id
       INNER JOIN researchers r ON r.id = pp.created_by_researcher_id
       WHERE ${whereClause}
       GROUP BY pp.id
       ORDER BY pp.created_at ${sort.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    sendSuccess(res, 200, rows, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('List posts error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const { project_id, title, description, status, allow_students, allow_researchers, application_deadline } = req.body ?? {};
    const projectId = Number(project_id);

    if (!projectId || !title) {
      sendError(res, 400, 'project_id and title are required');
      return;
    }

    const projectRows = await pool.query<Array<{ id: number }>>('SELECT id FROM projects WHERE id = ? LIMIT 1', [projectId]);
    if (!projectRows[0].length) {
      sendError(res, 404, 'Project not found');
      return;
    }

    const postStatus = ['draft', 'open', 'closed', 'archived'].includes(status) ? status : 'draft';
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO project_posts (
        project_id, created_by_researcher_id, title, description, status, allow_students, allow_researchers, application_deadline, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [projectId, req.user!.id, title, description || null, postStatus, allow_students !== undefined ? Boolean(allow_students) : true, allow_researchers !== undefined ? Boolean(allow_researchers) : false, application_deadline || null],
    );
    sendSuccess(res, 201, { id: result.insertId }, 'Operation successful');
  } catch (error) {
    console.error('Create post error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const postId = parseId(req.params.id);
    if (!postId) {
      sendError(res, 400, 'Invalid post id');
      return;
    }

    const post = await getPostRow(postId);
    if (!post) {
      sendError(res, 404, 'Post not found');
      return;
    }

    const [requirements] = await pool.query(
      `SELECT id, post_id, target_type, requirement_type, requirement_text, is_mandatory, created_at
       FROM post_requirements
       WHERE post_id = ?
       ORDER BY created_at ASC`,
      [postId],
    );

    const [projectRows] = await pool.query<Array<{
      id: number;
      title: string;
      category: string | null;
      duration_months: number | null;
      timeframe: string | null;
      status: 'draft' | 'open' | 'closed' | 'archived';
    }>>(
      'SELECT id, title, category, duration_months, timeframe, status FROM projects WHERE id = ? LIMIT 1',
      [post.project_id],
    );

    sendSuccess(res, 200, { ...post, project: projectRows[0] || null, requirements }, 'Operation successful');
  } catch (error) {
    console.error('Get post error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const postId = parseId(req.params.id);
    if (!postId) {
      sendError(res, 400, 'Invalid post id');
      return;
    }

    if (!(await isPostCreator(postId, req.user!.id))) {
      sendError(res, 403, 'Forbidden');
      return;
    }
    const updates: string[] = [];
    const values: Array<string | number | boolean | null> = [];
    const allowedFields = ['title', 'description', 'status', 'allow_students', 'allow_researchers', 'application_deadline'] as const;

    for (const field of allowedFields) {
      if (req.body?.[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'allow_students' || field === 'allow_researchers') {
          values.push(Boolean(req.body[field]));
        } else {
          values.push(req.body[field]);
        }
      }
    }

    if (updates.length === 0) {
      sendError(res, 400, 'No fields to update');
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(postId);

    const [result] = await pool.query<ResultSetHeader>(`UPDATE project_posts SET ${updates.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Post not found');
      return;
    }

    const post = await getPostRow(postId);
    sendSuccess(res, 200, post, 'Post updated');
  } catch (error) {
    console.error('Update post error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const postId = parseId(req.params.id);
    if (!(await isPostCreator(postId, req.user!.id))) {
      sendError(res, 403, 'Forbidden');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('UPDATE project_posts SET status = ?, updated_at = NOW() WHERE id = ?', ['archived', postId]);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Post not found');
      return;
    }

    sendSuccess(res, 200, { id: postId, status: 'archived' }, 'Post archived');
  } catch (error) {
    console.error('Archive post error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

// GET /posts/:id/requirements - List requirements for post
router.get('/:id/requirements', async (req, res) => {
  try {
    const postId = parseId(req.params.id);
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);

    if (!postId) {
      sendError(res, 400, 'Invalid post id');
      return;
    }

    const [postExists] = await pool.query<Array<{ id: number }>>('SELECT id FROM project_posts WHERE id = ? LIMIT 1', [postId]);
    if (postExists.length === 0) {
      sendError(res, 404, 'Post not found');
      return;
    }

    const [countRows] = await pool.query<Array<{ total: number }>>(
      'SELECT COUNT(*) AS total FROM post_requirements WHERE post_id = ?',
      [postId],
    );
    const total = Number(countRows[0]?.total || 0);

    const [requirements] = await pool.query(
      `SELECT id, post_id, target_type, requirement_type, requirement_text, is_mandatory, created_at
       FROM post_requirements
       WHERE post_id = ?
       LIMIT ? OFFSET ?`,
      [postId, limit, offset],
    );

    sendSuccess(res, 200, requirements, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('List post requirements error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { project_id, post_type, title, description, status, allow_students, allow_researchers, application_deadline } = req.body ?? {};

    const isResearcher = req.user?.role === 'researcher';
    const isStudent = req.user?.role === 'student';

    // Students can only create discussion posts
    if (isStudent && post_type === 'recruitment') {
      sendError(res, 403, 'Students cannot create recruitment posts');
      return;
    }

    // Only researchers and students are allowed
    if (!isResearcher && !isStudent) {
      sendError(res, 403, 'Forbidden');
      return;
    }

    if (!title) {
      sendError(res, 400, 'title is required');
      return;
    }

    const projectId = project_id ? Number(project_id) : null;

    // Recruitment posts require a project
    if (post_type === 'recruitment' && !projectId) {
      sendError(res, 400, 'project_id is required for recruitment posts');
      return;
    }

    if (projectId) {
      const projectRows = await pool.query<Array<{ id: number }>>(
        'SELECT id FROM projects WHERE id = ? LIMIT 1', [projectId]
      );
      if (!projectRows[0].length) {
        sendError(res, 404, 'Project not found');
        return;
      }
    }

    const postStatus = ['draft', 'open', 'closed', 'archived'].includes(status) ? status : 'draft';

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO project_posts (
        project_id, created_by_researcher_id, title, description, status,
        allow_students, allow_researchers, application_deadline, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        projectId,
        isResearcher ? req.user!.id : null,  // null for students
        title,
        description || null,
        postStatus,
        allow_students !== undefined ? Boolean(allow_students) : true,
        allow_researchers !== undefined ? Boolean(allow_researchers) : false,
        application_deadline || null,
      ],
    );

    sendSuccess(res, 201, { id: result.insertId }, 'Operation successful');
  } catch (error) {
    console.error('Create post error:', error);
    sendError(res, 500, 'Internal server error');
  }
}); 

router.delete('/:id/requirements/:req_id', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const postId = parseId(req.params.id);
    const requirementId = parseId(req.params.req_id);

    if (!(await isPostCreator(postId, req.user!.id))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM post_requirements WHERE id = ? AND post_id = ?', [requirementId, postId]);
    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'Requirement not found' });
      return;
    }

    res.json({ success: true, message: 'Requirement removed' });
  } catch (error) {
    console.error('Remove post requirement error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/:id/apply/student', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const postId = parseId(req.params.id);
    const { cover_letter } = req.body ?? {};
    const post = await getPostRow(postId);
    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }

    if (!post.allow_students || post.status !== 'open') {
      res.status(400).json({ success: false, message: 'Applications are not open for students' });
      return;
    }

    try {
      await pool.query(
        `INSERT INTO post_student_applications (post_id, project_id, student_id, status, cover_letter, applied_at, reviewed_at, reviewed_by_researcher_id, notes)
         VALUES (?, ?, ?, 'submitted', ?, NOW(), NULL, NULL, NULL)`,
        [postId, post.project_id, req.user!.id, cover_letter || null],
      );
    } catch (error) {
      res.status(400).json({ success: false, message: 'Application already exists or could not be created' });
      return;
    }

    res.status(201).json({ success: true, message: 'Application submitted' });
  } catch (error) {
    console.error('Student apply error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/:id/apply/researcher', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const postId = parseId(req.params.id);
    const { cover_letter } = req.body ?? {};
    const post = await getPostRow(postId);
    if (!post) {
      res.status(404).json({ success: false, message: 'Post not found' });
      return;
    }

    if (!post.allow_researchers || post.status !== 'open') {
      res.status(400).json({ success: false, message: 'Applications are not open for researchers' });
      return;
    }

    try {
      await pool.query(
        `INSERT INTO post_researcher_applications (post_id, project_id, researcher_id, status, cover_letter, applied_at, reviewed_at, reviewed_by_researcher_id, notes)
         VALUES (?, ?, ?, 'submitted', ?, NOW(), NULL, NULL, NULL)`,
        [postId, post.project_id, req.user!.id, cover_letter || null],
      );
    } catch (error) {
      res.status(400).json({ success: false, message: 'Application already exists or could not be created' });
      return;
    }

    res.status(201).json({ success: true, message: 'Application submitted' });
  } catch (error) {
    console.error('Researcher apply error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/:id/applications', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const postId = parseId(req.params.id);
    if (!(await isPostCreator(postId, req.user!.id))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const [studentApplications] = await pool.query(
      `SELECT psa.id, psa.post_id, psa.project_id, psa.student_id, psa.status, psa.cover_letter, psa.applied_at, psa.reviewed_at, psa.reviewed_by_researcher_id, psa.notes,
              s.first_name, s.last_name, s.email, s.institution, s.bio, s.gpa, s.profile_image_url
       FROM post_student_applications psa
       INNER JOIN students s ON s.id = psa.student_id
       WHERE psa.post_id = ?
       ORDER BY psa.applied_at DESC`,
      [postId],
    );

    const [researcherApplications] = await pool.query(
      `SELECT pra.id, pra.post_id, pra.project_id, pra.researcher_id, pra.status, pra.cover_letter, pra.applied_at, pra.reviewed_at, pra.reviewed_by_researcher_id, pra.notes,
              r.first_name, r.last_name, r.email, r.institution, r.bio, r.global_role, r.profile_image_url
       FROM post_researcher_applications pra
       INNER JOIN researchers r ON r.id = pra.researcher_id
       WHERE pra.post_id = ?
       ORDER BY pra.applied_at DESC`,
      [postId],
    );

    res.json({ success: true, data: { students: studentApplications, researchers: researcherApplications } });
  } catch (error) {
    console.error('Get post applications error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

async function updateApplicationStatus(table: 'student' | 'researcher', appId: number, postId: number, researcherId: number, status: string) {
  const statusColumn = table === 'student' ? 'post_student_applications' : 'post_researcher_applications';
  const idColumn = table === 'student' ? 'student_id' : 'researcher_id';
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE ${statusColumn}
     SET status = ?, reviewed_at = NOW(), reviewed_by_researcher_id = ?, notes = COALESCE(notes, notes)
     WHERE id = ? AND post_id = ?`,
    [status, researcherId, appId, postId],
  );
  return result;
}

router.put('/:id/applications/students/:app_id', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const postId = parseId(req.params.id);
    const appId = parseId(req.params.app_id);
    const { status } = req.body ?? {};
    const allowedStatuses = new Set(['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn']);
    if (!allowedStatuses.has(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    if (!(await isPostCreator(postId, req.user!.id))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE post_student_applications SET status = ?, reviewed_at = NOW(), reviewed_by_researcher_id = ? WHERE id = ? AND post_id = ?',
      [status, req.user!.id, appId, postId],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.json({ success: true, message: 'Application updated' });
  } catch (error) {
    console.error('Update student application error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.put('/:id/applications/researchers/:app_id', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const postId = parseId(req.params.id);
    const appId = parseId(req.params.app_id);
    const { status } = req.body ?? {};
    const allowedStatuses = new Set(['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn']);
    if (!allowedStatuses.has(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    if (!(await isPostCreator(postId, req.user!.id))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE post_researcher_applications SET status = ?, reviewed_at = NOW(), reviewed_by_researcher_id = ? WHERE id = ? AND post_id = ?',
      [status, req.user!.id, appId, postId],
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.json({ success: true, message: 'Application updated' });
  } catch (error) {
    console.error('Update researcher application error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;


