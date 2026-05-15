import { Router } from 'express';
import { ResultSetHeader } from 'mysql2';
import { pool } from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { escapeLike, getSearchTerm, normalizeText, parsePagination, parseSortOrder, sendError, sendSuccess, toNullableNumber } from '../lib/http';

const router = Router();

function parseId(value: string): number {
  return Number(value);
}

async function isProjectOwner(projectId: number, researcherId: number): Promise<boolean> {
  const [rows] = await pool.query<Array<{ id: number }>>(
    `SELECT id
     FROM project_researchers
     WHERE project_id = ? AND researcher_id = ? AND project_role = 'owner'
     LIMIT 1`,
    [projectId, researcherId],
  );
  return rows.length > 0;
}

async function ensureProjectExists(projectId: number): Promise<boolean> {
  const [rows] = await pool.query<Array<{ id: number }>>('SELECT id FROM projects WHERE id = ? LIMIT 1', [projectId]);
  return rows.length > 0;
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

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);
    const category = normalizeText(req.query.category);
    const search = getSearchTerm(req.query as Record<string, string>);
    const teamId = req.query.team_id ? Number(req.query.team_id) : null;
    const researchAreaId = req.query.research_area_id ? Number(req.query.research_area_id) : null;
    const createdByResearcherId = req.query.created_by_researcher_id ? Number(req.query.created_by_researcher_id) : null;
    const status = normalizeText(req.query.status);
    const sort = parseSortOrder(req.query.sort as string | undefined, 'desc');

    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (search) {
      const like = `%${escapeLike(search)}%`;
      conditions.push('(p.title LIKE ? OR p.category LIKE ? OR p.description LIKE ?)');
      params.push(like, like, like);
    }

    if (category) {
      conditions.push('p.category = ?');
      params.push(category);
    }

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }

    if (teamId) {
      conditions.push('EXISTS (SELECT 1 FROM project_teams pt WHERE pt.project_id = p.id AND pt.team_id = ?)');
      params.push(teamId);
    }

    if (researchAreaId) {
      conditions.push('EXISTS (SELECT 1 FROM project_research_areas pra WHERE pra.project_id = p.id AND pra.research_area_id = ?)');
      params.push(researchAreaId);
    }

    if (createdByResearcherId) {
      conditions.push('p.created_by_researcher_id = ?');
      params.push(createdByResearcherId);
    }

    const whereClause = conditions.length ? conditions.join(' AND ') : '1 = 1';
    const [countRows] = await pool.query<Array<{ total: number }>>(
      `SELECT COUNT(DISTINCT p.id) AS total
       FROM projects p
       WHERE ${whereClause}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.category, p.duration_months, p.timeframe, p.application_deadline, p.description,
              p.background_requirements, p.required_skills_text, p.interests_text, p.references_text, p.master_degrees_text,
              p.internship_season, p.minimum_gpa, p.phd_funding, p.stipend, p.status, p.created_by_researcher_id,
              p.created_at, p.updated_at
       FROM projects p
       WHERE ${whereClause}
       GROUP BY p.id
       ORDER BY p.created_at ${sort.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    sendSuccess(res, 200, rows, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('List projects error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

/** Projects the current user owns or participates in (must be registered before /:id) */
router.get('/mine', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const sort = parseSortOrder(req.query.sort as string | undefined, 'desc');

    if (req.user.role === 'student') {
      const [rows] = await pool.query(
        `SELECT DISTINCT p.id, p.title, p.category, p.duration_months, p.timeframe, p.application_deadline, p.description,
                p.background_requirements, p.required_skills_text, p.interests_text, p.references_text, p.master_degrees_text,
                p.internship_season, p.minimum_gpa, p.phd_funding, p.stipend, p.status, p.created_by_researcher_id,
                p.created_at, p.updated_at
         FROM projects p
         INNER JOIN project_students ps ON ps.project_id = p.id AND ps.student_id = ?
         WHERE ps.status IN ('active', 'candidate')
         ORDER BY p.created_at ${sort.toUpperCase()}`,
        [req.user.id],
      );
      sendSuccess(res, 200, rows, 'Operation successful');
      return;
    }

    if (req.user.role === 'researcher') {
      const rid = req.user.id;
      const [rows] = await pool.query(
        `SELECT DISTINCT p.id, p.title, p.category, p.duration_months, p.timeframe, p.application_deadline, p.description,
                p.background_requirements, p.required_skills_text, p.interests_text, p.references_text, p.master_degrees_text,
                p.internship_season, p.minimum_gpa, p.phd_funding, p.stipend, p.status, p.created_by_researcher_id,
                p.created_at, p.updated_at
         FROM projects p
         WHERE p.created_by_researcher_id = ?
            OR EXISTS (SELECT 1 FROM project_researchers pr WHERE pr.project_id = p.id AND pr.researcher_id = ?)
         ORDER BY p.created_at ${sort.toUpperCase()}`,
        [rid, rid],
      );
      sendSuccess(res, 200, rows, 'Operation successful');
      return;
    }

    sendSuccess(res, 200, [], 'Operation successful');
  } catch (error) {
    console.error('List my projects error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const {
      title,
      category,
      duration_months,
      timeframe,
      application_deadline,
      description,
      background_requirements,
      required_skills_text,
      interests_text,
      references_text,
      master_degrees_text,
      internship_season,
      minimum_gpa,
      phd_funding,
      stipend,
      status,
    } = req.body ?? {};

    if (!title || typeof title !== 'string') {
      sendError(res, 400, 'title is required');
      return;
    }

    const projectStatus = ['draft', 'open', 'closed', 'archived'].includes(status) ? status : 'draft';
    const durationMonths = duration_months !== undefined && duration_months !== null ? Number(duration_months) : null;
    const minGpa = minimum_gpa !== undefined && minimum_gpa !== null ? Number(minimum_gpa) : null;
    if (durationMonths !== null && Number.isNaN(durationMonths)) {
      sendError(res, 400, 'Invalid duration_months');
      return;
    }
    if (minGpa !== null && Number.isNaN(minGpa)) {
      sendError(res, 400, 'Invalid minimum_gpa');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO projects (
        title, category, duration_months, timeframe, application_deadline, description,
        background_requirements, required_skills_text, interests_text, references_text, master_degrees_text,
        internship_season, minimum_gpa, phd_funding, stipend, status, created_by_researcher_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title,
        category || null,
        durationMonths,
        timeframe || null,
        application_deadline || null,
        description || null,
        background_requirements || null,
        required_skills_text || null,
        interests_text || null,
        references_text || null,
        master_degrees_text || null,
        internship_season || null,
        minGpa,
        Boolean(phd_funding),
        Boolean(stipend),
        projectStatus,
        req.user!.id,
      ],
    );
    await pool.query(
      `INSERT INTO project_researchers (project_id, researcher_id, project_role, joined_at)
       VALUES (?, ?, 'owner', NOW())`,
      [result.insertId, req.user!.id],
    );
    sendSuccess(res, 201, { id: result.insertId }, 'Operation successful');
  } catch (error) {
    console.error('Create project error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const projectId = parseId(req.params.id);
    if (!projectId) {
      sendError(res, 400, 'Invalid project id');
      return;
    }

    const [projectRows] = await pool.query<Array<{
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
    }>>(
      `SELECT id, title, category, duration_months, timeframe, application_deadline, description,
              background_requirements, required_skills_text, interests_text, references_text, master_degrees_text,
              internship_season, minimum_gpa, phd_funding, stipend, status, created_by_researcher_id, created_at, updated_at
       FROM projects
       WHERE id = ?
       LIMIT 1`,
      [projectId],
    );

    const project = projectRows[0];
    if (!project) {
      sendError(res, 404, 'Project not found');
      return;
    }

    const [researchers] = await pool.query(
      `SELECT pr.id, pr.project_id, pr.researcher_id, pr.project_role, pr.joined_at,
              r.first_name, r.last_name, r.email, r.institution, r.bio, r.global_role, r.profile_image_url
       FROM project_researchers pr
       INNER JOIN researchers r ON r.id = pr.researcher_id
       WHERE pr.project_id = ?
       ORDER BY pr.joined_at ASC`,
      [projectId],
    );

    const [teams] = await pool.query(
      `SELECT pt.project_id, pt.team_id, pt.role_description, t.name, t.description, t.lab_id, t.is_active
       FROM project_teams pt
       INNER JOIN teams t ON t.id = pt.team_id
       WHERE pt.project_id = ?
       ORDER BY t.name ASC`,
      [projectId],
    );

    const [researchAreas] = await pool.query(
      `SELECT pra.project_id, pra.research_area_id, ra.name, ra.description
       FROM project_research_areas pra
       INNER JOIN research_areas ra ON ra.id = pra.research_area_id
       WHERE pra.project_id = ?
       ORDER BY ra.name ASC`,
      [projectId],
    );

    const [requirements] = await pool.query(
      `SELECT id, project_id, requirement_type, requirement_text, is_mandatory, created_at
       FROM project_requirements
       WHERE project_id = ?
       ORDER BY created_at ASC`,
      [projectId],
    );

    const [students] = await pool.query(
      `SELECT ps.id, ps.project_id, ps.student_id, ps.participation_role, ps.joined_at, ps.status,
              s.first_name, s.last_name, s.email, s.institution, s.bio, s.gpa, s.profile_image_url
       FROM project_students ps
       INNER JOIN students s ON s.id = ps.student_id
       WHERE ps.project_id = ?
       ORDER BY ps.joined_at ASC`,
      [projectId],
    );

    sendSuccess(res, 200, { ...project, researchers, students, teams, research_areas: researchAreas, requirements }, 'Operation successful');
  } catch (error) {
    console.error('Get project error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const projectId = parseId(req.params.id);
    if (!projectId) {
      sendError(res, 400, 'Invalid project id');
      return;
    }

    if (!(await ensureProjectExists(projectId))) {
      sendError(res, 404, 'Project not found');
      return;
    }

    if (!(await isProjectOwner(projectId, req.user!.id))) {
      sendError(res, 403, 'Forbidden');
      return;
    }
    const allowedFields = [
      'title', 'category', 'duration_months', 'timeframe', 'application_deadline', 'description',
      'background_requirements', 'required_skills_text', 'interests_text', 'references_text',
      'master_degrees_text', 'internship_season', 'minimum_gpa', 'phd_funding', 'stipend', 'status',
    ] as const;

    const updates: string[] = [];
    const values: Array<string | number | boolean | null> = [];

    for (const field of allowedFields) {
      if (req.body?.[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'duration_months' || field === 'minimum_gpa') {
          values.push(req.body[field] === null || req.body[field] === '' ? null : Number(req.body[field]));
        } else if (field === 'phd_funding' || field === 'stipend') {
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
    values.push(projectId);

    const [result] = await pool.query<ResultSetHeader>(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Project not found');
      return;
    }

    const [rows] = await pool.query<Array<{ id: number; title: string; category: string | null; duration_months: number | null; timeframe: string | null; application_deadline: Date | string | null; description: string | null; background_requirements: string | null; required_skills_text: string | null; interests_text: string | null; references_text: string | null; master_degrees_text: string | null; internship_season: string | null; minimum_gpa: string | number | null; phd_funding: number | boolean | null; stipend: number | boolean | null; status: 'draft' | 'open' | 'closed' | 'archived'; created_by_researcher_id: number; created_at: Date | string; updated_at: Date | string }>>(
      `SELECT id, title, category, duration_months, timeframe, application_deadline, description,
              background_requirements, required_skills_text, interests_text, references_text, master_degrees_text,
              internship_season, minimum_gpa, phd_funding, stipend, status, created_by_researcher_id, created_at, updated_at
       FROM projects WHERE id = ? LIMIT 1`,
      [projectId],
    );

    sendSuccess(res, 200, rows[0], 'Project updated');
  } catch (error) {
    console.error('Update project error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const projectId = parseId(req.params.id);
    if (!projectId) {
      sendError(res, 400, 'Invalid project id');
      return;
    }

    if (!(await isProjectOwner(projectId, req.user!.id))) {
      sendError(res, 403, 'Forbidden');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('UPDATE projects SET status = ? , updated_at = NOW() WHERE id = ?', ['archived', projectId]);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Project not found');
      return;
    }

    sendSuccess(res, 200, { id: projectId, status: 'archived' }, 'Project archived');
  } catch (error) {
    console.error('Archive project error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

// GET /projects/:id/researchers - List researchers for project
router.get('/:id/researchers', async (req, res) => {
  try {
    const projectId = parseId(req.params.id);
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);

    if (!projectId) {
      sendError(res, 400, 'Invalid project id');
      return;
    }

    if (!(await ensureProjectExists(projectId))) {
      sendError(res, 404, 'Project not found');
      return;
    }

    const [countRows] = await pool.query<Array<{ total: number }>>(
      'SELECT COUNT(*) AS total FROM project_researchers WHERE project_id = ?',
      [projectId],
    );
    const total = Number(countRows[0]?.total || 0);

    const [researchers] = await pool.query(
      `SELECT pr.id, pr.project_id, pr.researcher_id, pr.project_role, pr.joined_at,
              r.first_name, r.last_name, r.email, r.institution, r.bio, r.global_role, r.profile_image_url
       FROM project_researchers pr
       INNER JOIN researchers r ON r.id = pr.researcher_id
       WHERE pr.project_id = ?
       LIMIT ? OFFSET ?`,
      [projectId, limit, offset],
    );

    sendSuccess(res, 200, researchers, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('List project researchers error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

// GET /projects/:id/teams - List teams for project
router.get('/:id/teams', async (req, res) => {
  try {
    const projectId = parseId(req.params.id);
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);

    if (!projectId) {
      sendError(res, 400, 'Invalid project id');
      return;
    }

    if (!(await ensureProjectExists(projectId))) {
      sendError(res, 404, 'Project not found');
      return;
    }

    const [countRows] = await pool.query<Array<{ total: number }>>(
      'SELECT COUNT(*) AS total FROM project_teams WHERE project_id = ?',
      [projectId],
    );
    const total = Number(countRows[0]?.total || 0);

    const [teams] = await pool.query(
      `SELECT pt.project_id, pt.team_id, pt.role_description, t.name, t.description, t.lab_id, t.is_active, t.created_at, t.updated_at
       FROM project_teams pt
       INNER JOIN teams t ON t.id = pt.team_id
       WHERE pt.project_id = ?
       LIMIT ? OFFSET ?`,
      [projectId, limit, offset],
    );

    sendSuccess(res, 200, teams, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('List project teams error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

// GET /projects/:id/research-areas - List research areas for project
router.get('/:id/research-areas', async (req, res) => {
  try {
    const projectId = parseId(req.params.id);
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);

    if (!projectId) {
      sendError(res, 400, 'Invalid project id');
      return;
    }

    if (!(await ensureProjectExists(projectId))) {
      sendError(res, 404, 'Project not found');
      return;
    }

    const [countRows] = await pool.query<Array<{ total: number }>>(
      'SELECT COUNT(*) AS total FROM project_research_areas WHERE project_id = ?',
      [projectId],
    );
    const total = Number(countRows[0]?.total || 0);

    const [researchAreas] = await pool.query(
      `SELECT pra.project_id, pra.research_area_id, ra.name, ra.description
       FROM project_research_areas pra
       INNER JOIN research_areas ra ON ra.id = pra.research_area_id
       WHERE pra.project_id = ?
       LIMIT ? OFFSET ?`,
      [projectId, limit, offset],
    );

    sendSuccess(res, 200, researchAreas, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('List project research areas error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

// GET /projects/:id/requirements - List requirements for project
router.get('/:id/requirements', async (req, res) => {
  try {
    const projectId = parseId(req.params.id);
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);

    if (!projectId) {
      sendError(res, 400, 'Invalid project id');
      return;
    }

    if (!(await ensureProjectExists(projectId))) {
      sendError(res, 404, 'Project not found');
      return;
    }

    const [countRows] = await pool.query<Array<{ total: number }>>(
      'SELECT COUNT(*) AS total FROM project_requirements WHERE project_id = ?',
      [projectId],
    );
    const total = Number(countRows[0]?.total || 0);

    const [requirements] = await pool.query(
      `SELECT id, project_id, requirement_type, requirement_text, is_mandatory, created_at
       FROM project_requirements
       WHERE project_id = ?
       LIMIT ? OFFSET ?`,
      [projectId, limit, offset],
    );

    sendSuccess(res, 200, requirements, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('List project requirements error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/:id/researchers', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const projectId = parseId(req.params.id);
    const researcherId = Number(req.body?.researcher_id);
    const projectRole = req.body?.project_role;

    if (!projectId || !researcherId || !projectRole) {
      res.status(400).json({ success: false, message: 'researcher_id and project_role are required' });
      return;
    }

    if (!(await isProjectOwner(projectId, req.user!.id))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const [researcherRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM researchers WHERE id = ? AND is_active = TRUE LIMIT 1', [researcherId]);
    if (researcherRows.length === 0) {
      res.status(404).json({ success: false, message: 'Researcher not found' });
      return;
    }

    await pool.query(
      `INSERT INTO project_researchers (project_id, researcher_id, project_role, joined_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE project_role = VALUES(project_role), joined_at = VALUES(joined_at)`,
      [projectId, researcherId, projectRole],
    );

    res.status(201).json({ success: true, message: 'Researcher added' });
  } catch (error) {
    console.error('Add project researcher error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.delete('/:id/researchers/:researcher_id', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const projectId = parseId(req.params.id);
    const researcherId = parseId(req.params.researcher_id);

    if (!(await isProjectOwner(projectId, req.user!.id))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM project_researchers WHERE project_id = ? AND researcher_id = ?', [projectId, researcherId]);
    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'Researcher association not found' });
      return;
    }

    res.json({ success: true, message: 'Researcher removed' });
  } catch (error) {
    console.error('Remove project researcher error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/:id/teams', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const projectId = parseId(req.params.id);
    const teamId = Number(req.body?.team_id);
    const roleDescription = req.body?.role_description || null;

    if (!projectId || !teamId) {
      res.status(400).json({ success: false, message: 'team_id is required' });
      return;
    }

    if (!(await isProjectOwner(projectId, req.user!.id))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const [teamRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM teams WHERE id = ? AND is_active = TRUE LIMIT 1', [teamId]);
    if (teamRows.length === 0) {
      res.status(404).json({ success: false, message: 'Team not found' });
      return;
    }

    await pool.query(
      `INSERT INTO project_teams (project_id, team_id, role_description)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE role_description = VALUES(role_description)`,
      [projectId, teamId, roleDescription],
    );

    res.status(201).json({ success: true, message: 'Team added' });
  } catch (error) {
    console.error('Add project team error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.delete('/:id/teams/:team_id', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const projectId = parseId(req.params.id);
    const teamId = parseId(req.params.team_id);

    if (!(await isProjectOwner(projectId, req.user!.id))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM project_teams WHERE project_id = ? AND team_id = ?', [projectId, teamId]);
    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'Team association not found' });
      return;
    }

    res.json({ success: true, message: 'Team removed' });
  } catch (error) {
    console.error('Remove project team error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/:id/research-areas', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const projectId = parseId(req.params.id);
    const areaId = Number(req.body?.research_area_id);

    if (!projectId || !areaId) {
      res.status(400).json({ success: false, message: 'research_area_id is required' });
      return;
    }

    if (!(await isProjectOwner(projectId, req.user!.id))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const [areaRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM research_areas WHERE id = ? LIMIT 1', [areaId]);
    if (areaRows.length === 0) {
      res.status(404).json({ success: false, message: 'Research area not found' });
      return;
    }

    await pool.query('INSERT IGNORE INTO project_research_areas (project_id, research_area_id) VALUES (?, ?)', [projectId, areaId]);
    res.status(201).json({ success: true, message: 'Research area added' });
  } catch (error) {
    console.error('Add project research area error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.delete('/:id/research-areas/:area_id', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const projectId = parseId(req.params.id);
    const areaId = parseId(req.params.area_id);

    if (!(await isProjectOwner(projectId, req.user!.id))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM project_research_areas WHERE project_id = ? AND research_area_id = ?', [projectId, areaId]);
    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'Research area association not found' });
      return;
    }

    res.json({ success: true, message: 'Research area removed' });
  } catch (error) {
    console.error('Remove project research area error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/:id/requirements', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const projectId = parseId(req.params.id);
    const { requirement_type, requirement_text, is_mandatory } = req.body ?? {};

    if (!projectId || !requirement_type || !requirement_text) {
      res.status(400).json({ success: false, message: 'requirement_type and requirement_text are required' });
      return;
    }

    if (!(await isProjectOwner(projectId, req.user!.id))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const allowedTypes = new Set(['skill', 'background', 'interest', 'degree', 'other']);
    if (!allowedTypes.has(requirement_type)) {
      res.status(400).json({ success: false, message: 'Invalid requirement_type' });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO project_requirements (project_id, requirement_type, requirement_text, is_mandatory, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [projectId, requirement_type, requirement_text, Boolean(is_mandatory)],
    );

    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('Add project requirement error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.delete('/:id/requirements/:req_id', requireAuth, async (req, res) => {
  try {
    if (!requireResearcher(req, res)) {
      return;
    }

    const projectId = parseId(req.params.id);
    const requirementId = parseId(req.params.req_id);

    if (!(await isProjectOwner(projectId, req.user!.id))) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM project_requirements WHERE id = ? AND project_id = ?', [requirementId, projectId]);
    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'Requirement not found' });
      return;
    }

    res.json({ success: true, message: 'Requirement removed' });
  } catch (error) {
    console.error('Remove project requirement error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;


