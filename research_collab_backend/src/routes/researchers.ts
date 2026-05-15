import path from 'path';
import { Router } from 'express';
import { ResultSetHeader } from 'mysql2';
import bcrypt from 'bcryptjs';
import { pool } from '../db/connection';
import { requireAuth } from '../middleware/auth';
import { uploadCv } from '../middleware/upload';
import { escapeLike, getSearchTerm, normalizeText, parsePagination, parseSortOrder, sendError, sendSuccess, toNullableNumber, validateEmail, validatePassword } from '../lib/http';

const router = Router();

function parseId(value: string): number {
  return Number(value);
}

async function researcherExists(researcherId: number): Promise<boolean> {
  const [rows] = await pool.query<Array<{ id: number }>>('SELECT id FROM researchers WHERE id = ? LIMIT 1', [researcherId]);
  return rows.length > 0;
}

function ensureResearcherAccess(req: any, res: any, researcherId: number): boolean {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return false;
  }

  if (req.user.role !== 'researcher' || req.user.id !== researcherId) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return false;
  }

  return true;
}

async function getResearcherProfile(researcherId: number) {
  const [rows] = await pool.query<Array<{
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    institution: string | null;
    bio: string | null;
    global_role: 'admin' | 'member' | 'team_leader' | 'none';
    profile_image_url: string | null;
    is_active: number | boolean;
    created_at: Date | string;
    updated_at: Date | string;
  }>>(
    'SELECT id, first_name, last_name, email, institution, bio, global_role, profile_image_url, is_active, created_at, updated_at FROM researchers WHERE id = ? LIMIT 1',
    [researcherId],
  );

  return rows[0] || null;
}

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);
    const search = getSearchTerm(req.query as Record<string, string>);
    const sort = parseSortOrder(req.query.sort as string | undefined, 'desc');
    const institution = normalizeText(req.query.institution);
    const globalRole = normalizeText(req.query.global_role);
    const isActive = req.query.is_active === undefined ? null : String(req.query.is_active) === 'true' ? true : String(req.query.is_active) === 'false' ? false : null;

    const conditions: string[] = [];
    const params: Array<string | boolean> = [];

    if (search) {
      const like = `%${escapeLike(search)}%`;
      conditions.push(`(
        first_name LIKE ? OR
        last_name LIKE ? OR
        email LIKE ? OR
        institution LIKE ? OR
        bio LIKE ? OR
        EXISTS (
          SELECT 1
          FROM researcher_skills rs
          INNER JOIN skills s ON s.id = rs.skill_id
          WHERE rs.researcher_id = researchers.id
            AND (s.name LIKE ? OR s.description LIKE ?)
        ) OR
        EXISTS (
          SELECT 1
          FROM researcher_research_areas rra
          INNER JOIN research_areas ra ON ra.id = rra.research_area_id
          WHERE rra.researcher_id = researchers.id
            AND (ra.name LIKE ? OR ra.description LIKE ?)
        )
      )`);
      params.push(like, like, like, like, like, like, like, like, like);
    }

    if (institution) {
      conditions.push('institution = ?');
      params.push(institution);
    }

    if (globalRole) {
      conditions.push('global_role = ?');
      params.push(globalRole);
    }

    if (isActive !== null) {
      conditions.push('is_active = ?');
      params.push(isActive);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query<Array<{ total: number }>>(`SELECT COUNT(*) AS total FROM researchers ${whereClause}`, params);
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, email, institution, bio, global_role, profile_image_url, is_active, created_at, updated_at
       FROM researchers
       ${whereClause}
       ORDER BY created_at ${sort.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    sendSuccess(res, 200, rows, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('List researchers error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/', async (req, res) => {
  try {
    const firstName = normalizeText(req.body?.first_name);
    const lastName = normalizeText(req.body?.last_name);
    const email = normalizeText(req.body?.email);
    const password = req.body?.password;
    const institution = normalizeText(req.body?.institution);
    const bio = normalizeText(req.body?.bio);
    const globalRole = normalizeText(req.body?.global_role) || 'none';
    const profileImageUrl = normalizeText(req.body?.profile_image_url);

    if (!firstName || !lastName || !email || !password) {
      sendError(res, 400, 'first_name, last_name, email, and password are required');
      return;
    }

    if (!validateEmail(email)) {
      sendError(res, 400, 'Invalid email');
      return;
    }

    if (!validatePassword(password, 8)) {
      sendError(res, 400, 'Password must be at least 8 characters');
      return;
    }

    const allowedRoles = new Set(['admin', 'member', 'team_leader', 'none']);
    if (!allowedRoles.has(globalRole)) {
      sendError(res, 400, 'Invalid global_role');
      return;
    }

    const [existingRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM researchers WHERE email = ? LIMIT 1', [email]);
    if (existingRows.length > 0) {
      sendError(res, 400, 'Email already exists');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO researchers (first_name, last_name, email, password_hash, institution, bio, global_role, profile_image_url, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())`,
      [firstName, lastName, email, passwordHash, institution || null, bio || null, globalRole, profileImageUrl || null],
    );

    sendSuccess(res, 201, {
      id: result.insertId,
      first_name: firstName,
      last_name: lastName,
      email,
      institution: institution || null,
      bio: bio || null,
      global_role: globalRole,
      profile_image_url: profileImageUrl || null,
      is_active: true,
    }, 'Operation successful');
  } catch (error) {
    console.error('Create researcher error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'researcher') {
      sendError(res, 403, 'Forbidden');
      return;
    }

    const profile = await getResearcherProfile(req.user.id);
    if (!profile) {
      sendError(res, 404, 'Researcher not found');
      return;
    }

    sendSuccess(res, 200, profile, 'Operation successful');
  } catch (error) {
    console.error('Get researcher me error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.put('/me', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'researcher') {
      sendError(res, 403, 'Forbidden');
      return;
    }

    const { first_name, last_name, institution, bio, profile_image_url } = req.body ?? {};
    const updates: string[] = [];
    const values: Array<string | number | null> = [];

    if (first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(first_name);
    }

    if (last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(last_name);
    }

    if (institution !== undefined) {
      updates.push('institution = ?');
      values.push(institution);
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio);
    }

    if (profile_image_url !== undefined) {
      updates.push('profile_image_url = ?');
      values.push(profile_image_url);
    }

    if (updates.length === 0) {
      sendError(res, 400, 'No fields to update');
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(req.user.id);

    const [result] = await pool.query<ResultSetHeader>(`UPDATE researchers SET ${updates.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Researcher not found');
      return;
    }

    const profile = await getResearcherProfile(req.user.id);
    sendSuccess(res, 200, profile, 'Researcher updated');
  } catch (error) {
    console.error('Update researcher error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    if (!researcherId) {
      sendError(res, 400, 'Invalid researcher id');
      return;
    }

    const profile = await getResearcherProfile(researcherId);
    if (!profile) {
      sendError(res, 404, 'Researcher not found');
      return;
    }

    sendSuccess(res, 200, profile, 'Operation successful');
  } catch (error) {
    console.error('Get researcher error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    if (!researcherId) {
      sendError(res, 400, 'Invalid researcher id');
      return;
    }

    if (!req.user || (req.user.role !== 'researcher' || req.user.id !== researcherId)) {
      sendError(res, 403, 'Forbidden');
      return;
    }

    const updates: string[] = [];
    const values: Array<string | number | null> = [];

    if (req.body?.first_name !== undefined) {
      const firstName = normalizeText(req.body.first_name);
      if (!firstName) {
        sendError(res, 400, 'first_name is required');
        return;
      }
      updates.push('first_name = ?');
      values.push(firstName);
    }

    if (req.body?.last_name !== undefined) {
      const lastName = normalizeText(req.body.last_name);
      if (!lastName) {
        sendError(res, 400, 'last_name is required');
        return;
      }
      updates.push('last_name = ?');
      values.push(lastName);
    }

    if (req.body?.institution !== undefined) {
      updates.push('institution = ?');
      values.push(normalizeText(req.body.institution));
    }

    if (req.body?.bio !== undefined) {
      updates.push('bio = ?');
      values.push(normalizeText(req.body.bio));
    }

    if (req.body?.global_role !== undefined) {
      const nextRole = normalizeText(req.body.global_role) || 'none';
      const allowedRoles = new Set(['admin', 'member', 'team_leader', 'none']);
      if (!allowedRoles.has(nextRole)) {
        sendError(res, 400, 'Invalid global_role');
        return;
      }
      updates.push('global_role = ?');
      values.push(nextRole);
    }

    if (req.body?.profile_image_url !== undefined) {
      updates.push('profile_image_url = ?');
      values.push(normalizeText(req.body.profile_image_url));
    }

    if (req.body?.password !== undefined) {
      if (!validatePassword(req.body.password, 8)) {
        sendError(res, 400, 'Password must be at least 8 characters');
        return;
      }
      const hash = await bcrypt.hash(req.body.password, 12);
      updates.push('password_hash = ?');
      values.push(hash);
    }

    if (updates.length === 0) {
      sendError(res, 400, 'No fields to update');
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(researcherId);

    const [result] = await pool.query<ResultSetHeader>(`UPDATE researchers SET ${updates.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Researcher not found');
      return;
    }

    const profile = await getResearcherProfile(researcherId);
    sendSuccess(res, 200, profile, 'Researcher updated');
  } catch (error) {
    console.error('Update researcher by id error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    if (!researcherId) {
      sendError(res, 400, 'Invalid researcher id');
      return;
    }

    if (!req.user || (req.user.role !== 'researcher' || req.user.id !== researcherId)) {
      sendError(res, 403, 'Forbidden');
      return;
    }

    if (!(await researcherExists(researcherId))) {
      sendError(res, 404, 'Researcher not found');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('UPDATE researchers SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [researcherId]);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Researcher not found');
      return;
    }

    sendSuccess(res, 200, { id: researcherId }, 'Researcher deleted');
  } catch (error) {
    console.error('Delete researcher error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    if (!researcherId) {
      res.status(400).json({ success: false, message: 'Invalid researcher id' });
      return;
    }

    const profile = await getResearcherProfile(researcherId);
    if (!profile) {
      res.status(404).json({ success: false, message: 'Researcher not found' });
      return;
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Get researcher error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/:id/skills', async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);

    if (!researcherId) {
      sendError(res, 400, 'Invalid researcher id');
      return;
    }

    if (!(await researcherExists(researcherId))) {
      sendError(res, 404, 'Researcher not found');
      return;
    }

    const [countRows] = await pool.query<Array<{ total: number }>>(
      'SELECT COUNT(*) AS total FROM researcher_skills WHERE researcher_id = ?',
      [researcherId],
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.description, rs.source, rs.confidence
       FROM researcher_skills rs
       INNER JOIN skills s ON s.id = rs.skill_id
       WHERE rs.researcher_id = ?
       ORDER BY s.name ASC
       LIMIT ? OFFSET ?`,
      [researcherId, limit, offset],
    );

    sendSuccess(res, 200, rows, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('Get researcher skills error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/:id/skills', requireAuth, async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    if (!ensureResearcherAccess(req, res, researcherId)) {
      return;
    }

    const { skill_id, skill_name, source } = req.body ?? {};
    const skillId = skill_id ? Number(skill_id) : null;
    const normalizedSkillName = typeof skill_name === 'string' ? normalizeText(skill_name) : '';

    if (!skillId && !normalizedSkillName) {
      sendError(res, 400, 'skill_id or skill_name is required');
      return;
    }

    const allowedSources = new Set(['manual', 'cv_nlp', 'inferred']);
    const normalizedSource = source && allowedSources.has(source) ? source : 'manual';

    let resolvedSkillId = skillId;
    if (!resolvedSkillId && normalizedSkillName) {
      const [existingRows] = await pool.query<Array<{ id: number }>>(
        'SELECT id FROM skills WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [normalizedSkillName],
      );

      if (existingRows.length > 0) {
        resolvedSkillId = existingRows[0].id;
      } else {
        const [createdSkill] = await pool.query<ResultSetHeader>(
          'INSERT INTO skills (name, description) VALUES (?, NULL)',
          [normalizedSkillName],
        );
        resolvedSkillId = createdSkill.insertId;
      }
    }

    if (!resolvedSkillId) {
      sendError(res, 404, 'Skill not found');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO researcher_skills (researcher_id, skill_id, source, confidence)
       VALUES (?, ?, ?, 1.0000)
       ON DUPLICATE KEY UPDATE source = VALUES(source), confidence = VALUES(confidence)`,
      [researcherId, resolvedSkillId, normalizedSource],
    );

    sendSuccess(res, 201, { id: result.insertId }, 'Skill added');
  } catch (error) {
    console.error('Add researcher skill error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.delete('/:id/skills/:skill_id', requireAuth, async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    const skillId = parseId(req.params.skill_id);
    if (!ensureResearcherAccess(req, res, researcherId)) {
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM researcher_skills WHERE researcher_id = ? AND skill_id = ?', [researcherId, skillId]);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Skill not linked');
      return;
    }

    sendSuccess(res, 200, { removed: true }, 'Skill removed');
  } catch (error) {
    console.error('Delete researcher skill error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/:id/research-areas', async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);

    if (!researcherId) {
      sendError(res, 400, 'Invalid researcher id');
      return;
    }

    if (!(await researcherExists(researcherId))) {
      sendError(res, 404, 'Researcher not found');
      return;
    }

    const [countRows] = await pool.query<Array<{ total: number }>>(
      'SELECT COUNT(*) AS total FROM researcher_research_areas WHERE researcher_id = ?',
      [researcherId],
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT ra.id, ra.name, ra.description
       FROM researcher_research_areas rra
       INNER JOIN research_areas ra ON ra.id = rra.research_area_id
       WHERE rra.researcher_id = ?
       ORDER BY ra.name ASC
       LIMIT ? OFFSET ?`,
      [researcherId, limit, offset],
    );

    sendSuccess(res, 200, rows, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('Get researcher areas error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/:id/research-areas', requireAuth, async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    if (!ensureResearcherAccess(req, res, researcherId)) {
      return;
    }

    const { research_area_id, research_area_name } = req.body ?? {};
    const areaId = research_area_id ? Number(research_area_id) : null;
    const normalizedAreaName = typeof research_area_name === 'string' ? normalizeText(research_area_name) : '';

    if (!areaId && !normalizedAreaName) {
      sendError(res, 400, 'research_area_id or research_area_name is required');
      return;
    }

    let resolvedAreaId = areaId;
    if (!resolvedAreaId && normalizedAreaName) {
      const [existingRows] = await pool.query<Array<{ id: number }>>(
        'SELECT id FROM research_areas WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [normalizedAreaName],
      );

      if (existingRows.length > 0) {
        resolvedAreaId = existingRows[0].id;
      } else {
        const [createdArea] = await pool.query<ResultSetHeader>(
          'INSERT INTO research_areas (name, description) VALUES (?, NULL)',
          [normalizedAreaName],
        );
        resolvedAreaId = createdArea.insertId;
      }
    }

    if (!resolvedAreaId) {
      sendError(res, 404, 'Research area not found');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('INSERT IGNORE INTO researcher_research_areas (researcher_id, research_area_id) VALUES (?, ?)', [researcherId, resolvedAreaId]);
    sendSuccess(res, 201, { id: result.insertId }, 'Research area added');
  } catch (error) {
    console.error('Add researcher area error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.delete('/:id/research-areas/:area_id', requireAuth, async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    const areaId = parseId(req.params.area_id);
    if (!ensureResearcherAccess(req, res, researcherId)) {
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM researcher_research_areas WHERE researcher_id = ? AND research_area_id = ?', [researcherId, areaId]);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Research area not linked');
      return;
    }

    sendSuccess(res, 200, { removed: true }, 'Research area removed');
  } catch (error) {
    console.error('Delete researcher area error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/:id/projects', async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    if (!researcherId) {
      res.status(400).json({ success: false, message: 'Invalid researcher id' });
      return;
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.category, p.duration_months, p.timeframe, p.application_deadline, p.description, p.status,
              pr.project_role, pr.joined_at
       FROM project_researchers pr
       INNER JOIN projects p ON p.id = pr.project_id
       WHERE pr.researcher_id = ?
       ORDER BY pr.joined_at DESC`,
      [researcherId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get researcher projects error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/:id/posts', async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    if (!researcherId) {
      res.status(400).json({ success: false, message: 'Invalid researcher id' });
      return;
    }

    const [legacyRows] = await pool.query(
      `SELECT id, project_id, created_by_researcher_id, title, description, status,
              allow_students, allow_researchers, application_deadline, created_at, updated_at,
              'project_post' AS post_kind
       FROM project_posts
       WHERE created_by_researcher_id = ?`,
      [researcherId],
    );

    const [recruitmentRows] = await pool.query(
      `SELECT id, project_id, created_by_researcher_id, title, description, status,
              CASE WHEN collaboration_type IN ('student','both') THEN 1 ELSE 0 END AS allow_students,
              CASE WHEN collaboration_type IN ('researcher','both') THEN 1 ELSE 0 END AS allow_researchers,
              deadline AS application_deadline, created_at, updated_at,
              'recruitment' AS post_kind
       FROM recruitment_posts
       WHERE created_by_researcher_id = ?`,
      [researcherId],
    );

    const [discussionRows] = await pool.query(
      `SELECT id, COALESCE(project_id, 0) AS project_id, COALESCE(created_by_researcher_id, 0) AS created_by_researcher_id,
              title, description, 'open' AS status,
              1 AS allow_students, 0 AS allow_researchers, NULL AS application_deadline, created_at, updated_at,
              'discussion' AS post_kind
       FROM discussion_posts
       WHERE created_by_researcher_id = ?`,
      [researcherId],
    );

    type Row = Record<string, unknown>;
    const merged = [...(legacyRows as Row[]), ...(recruitmentRows as Row[]), ...(discussionRows as Row[])].sort(
      (a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime(),
    );

    res.json({ success: true, data: merged });
  } catch (error) {
    console.error('Get researcher posts error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/:id/cv', requireAuth, uploadCv.single('file'), async (req, res) => {
  try {
    const researcherId = parseId(req.params.id);
    if (!ensureResearcherAccess(req, res, researcherId)) {
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'CV file is required' });
      return;
    }

    const relativePath = path.relative(process.cwd(), req.file.path).split(path.sep).join('/');

    const [researcherRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM researchers WHERE id = ? AND is_active = TRUE LIMIT 1', [researcherId]);
    if (researcherRows.length === 0) {
      res.status(404).json({ success: false, message: 'Researcher not found' });
      return;
    }

    await pool.query('UPDATE researcher_cvs SET is_primary = FALSE WHERE researcher_id = ?', [researcherId]);

    const [documentResult] = await pool.query<ResultSetHeader>(
      'INSERT INTO documents (file_name, file_path, mime_type, file_size, uploaded_at) VALUES (?, ?, ?, ?, NOW())',
      [req.file.originalname, relativePath, req.file.mimetype, req.file.size],
    );

    await pool.query(
      'INSERT INTO researcher_cvs (researcher_id, document_id, extracted_text, is_primary, uploaded_at) VALUES (?, ?, ?, TRUE, NOW())',
      [researcherId, documentResult.insertId, null],
    );

    res.status(201).json({
      success: true,
      data: {
        document_id: documentResult.insertId,
        file_name: req.file.originalname,
        file_path: relativePath,
      },
    });
  } catch (error) {
    console.error('Upload researcher CV error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
