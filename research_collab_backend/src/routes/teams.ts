import { Router } from 'express';
import { ResultSetHeader } from 'mysql2';
import { pool } from '../db/connection';
import { requireAuth, requireRole } from '../middleware/auth';
import { escapeLike, getSearchTerm, normalizeText, parseId, parsePagination, parseSortOrder, sendError, sendSuccess } from '../lib/http';

const router = Router();

async function teamExists(teamId: number): Promise<boolean> {
  const [rows] = await pool.query<Array<{ id: number }>>('SELECT id FROM teams WHERE id = ? AND is_active = TRUE LIMIT 1', [teamId]);
  return rows.length > 0;
}

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);
    const search = getSearchTerm(req.query as Record<string, string>);
    const sort = parseSortOrder(req.query.sort as string | undefined, 'desc');
    const labId = req.query.lab_id ? Number(req.query.lab_id) : null;

    const conditions: string[] = ['t.is_active = TRUE'];
    const params: Array<string | number> = [];

    if (search) {
      const like = `%${escapeLike(search)}%`;
      conditions.push('(t.name LIKE ? OR t.description LIKE ? OR l.name LIKE ?)');
      params.push(like, like, like);
    }

    if (labId) {
      conditions.push('t.lab_id = ?');
      params.push(labId);
    }

    const whereClause = conditions.join(' AND ');

    const [countRows] = await pool.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM teams t LEFT JOIN labs l ON l.id = t.lab_id WHERE ${whereClause}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);
    const [rows] = await pool.query(
      `SELECT t.id, t.lab_id, t.name, t.description, t.is_active, t.created_at, t.updated_at, l.name AS lab_name
       FROM teams t
       LEFT JOIN labs l ON l.id = t.lab_id
       WHERE ${whereClause}
       ORDER BY t.created_at ${sort.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    sendSuccess(res, 200, rows, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('List teams error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const labId = Number(req.body?.lab_id);
    const name = normalizeText(req.body?.name);
    const description = normalizeText(req.body?.description);

    if (!labId || !name) {
      sendError(res, 400, 'lab_id and name are required');
      return;
    }

    const [labRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM labs WHERE id = ? LIMIT 1', [labId]);
    if (labRows.length === 0) {
      sendError(res, 404, 'Lab not found');
      return;
    }

    const [existing] = await pool.query<Array<{ id: number }>>('SELECT id FROM teams WHERE name = ? LIMIT 1', [name]);
    if (existing.length > 0) {
      sendError(res, 400, 'Team already exists');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO teams (lab_id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, TRUE, NOW(), NOW())',
      [labId, name, description || null],
    );

    sendSuccess(res, 201, { id: result.insertId, lab_id: labId, name, description: description || null, is_active: true }, 'Operation successful');
  } catch (error) {
    console.error('Create team error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const teamId = parseId(req.params.id);
    if (!teamId) {
      sendError(res, 400, 'Invalid team id');
      return;
    }

    const [teamRows] = await pool.query<Array<{ id: number; lab_id: number | null; name: string; description: string | null; is_active: number | boolean; created_at: Date | string; updated_at: Date | string; lab_name: string | null }>>(
      `SELECT t.id, t.lab_id, t.name, t.description, t.is_active, t.created_at, t.updated_at, l.name AS lab_name
       FROM teams t
       LEFT JOIN labs l ON l.id = t.lab_id
       WHERE t.id = ? LIMIT 1`,
      [teamId],
    );

    const team = teamRows[0];
    if (!team) {
      sendError(res, 404, 'Team not found');
      return;
    }

    const [members] = await pool.query(
      `SELECT tm.id, tm.team_id, tm.researcher_id, tm.membership_role, tm.joined_at, tm.left_at, tm.is_active, tm.notes,
              r.first_name, r.last_name, r.email, r.institution, r.bio, r.global_role, r.profile_image_url
       FROM team_memberships tm
       INNER JOIN researchers r ON r.id = tm.researcher_id
       WHERE tm.team_id = ?
       ORDER BY tm.joined_at DESC`,
      [teamId],
    );

    sendSuccess(res, 200, { ...team, members }, 'Operation successful');
  } catch (error) {
    console.error('Get team error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const teamId = parseId(req.params.id);
    if (!teamId) {
      sendError(res, 400, 'Invalid team id');
      return;
    }

    const labId = req.body?.lab_id === undefined ? undefined : Number(req.body.lab_id);
    const name = req.body?.name === undefined ? undefined : normalizeText(req.body.name);
    const description = req.body?.description === undefined ? undefined : normalizeText(req.body.description);
    const isActive = req.body?.is_active;
    const updates: string[] = [];
    const values: Array<string | number | boolean | null> = [];

    if (labId !== undefined) {
      if (!labId) {
        sendError(res, 400, 'Invalid lab_id');
        return;
      }
      updates.push('lab_id = ?');
      values.push(labId);
    }

    if (name !== undefined) {
      if (!name) {
        sendError(res, 400, 'Invalid name');
        return;
      }
      updates.push('name = ?');
      values.push(name);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(Boolean(isActive));
    }

    if (updates.length === 0) {
      sendError(res, 400, 'No fields to update');
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(teamId);

    const [result] = await pool.query<ResultSetHeader>(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Team not found');
      return;
    }

    const [rows] = await pool.query<Array<{ id: number; lab_id: number | null; name: string; description: string | null; is_active: number | boolean; created_at: Date | string; updated_at: Date | string; lab_name: string | null }>>(
      `SELECT t.id, t.lab_id, t.name, t.description, t.is_active, t.created_at, t.updated_at, l.name AS lab_name
       FROM teams t
       LEFT JOIN labs l ON l.id = t.lab_id
       WHERE t.id = ? LIMIT 1`,
      [teamId],
    );

    sendSuccess(res, 200, rows[0], 'Team updated');
  } catch (error) {
    console.error('Update team error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const teamId = parseId(req.params.id);
    if (!teamId) {
      sendError(res, 400, 'Invalid team id');
      return;
    }

    const [existingRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM teams WHERE id = ? LIMIT 1', [teamId]);
    if (existingRows.length === 0) {
      sendError(res, 404, 'Team not found');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('UPDATE teams SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [teamId]);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Team not found');
      return;
    }

    sendSuccess(res, 200, { id: teamId }, 'Team deleted');
  } catch (error) {
    console.error('Delete team error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/:id/members', async (req, res) => {
  try {
    const teamId = parseId(req.params.id);
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);

    if (!teamId) {
      sendError(res, 400, 'Invalid team id');
      return;
    }

    if (!(await teamExists(teamId))) {
      sendError(res, 404, 'Team not found');
      return;
    }

    const [countRows] = await pool.query<Array<{ total: number }>>(
      'SELECT COUNT(*) AS total FROM team_memberships WHERE team_id = ? AND is_active = TRUE',
      [teamId],
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT tm.id, tm.team_id, tm.researcher_id, tm.membership_role, tm.joined_at, tm.left_at, tm.is_active, tm.notes,
              r.first_name, r.last_name, r.email, r.institution, r.bio, r.global_role, r.profile_image_url, r.is_active AS researcher_active
       FROM team_memberships tm
       INNER JOIN researchers r ON r.id = tm.researcher_id
       WHERE tm.team_id = ? AND tm.is_active = TRUE
       ORDER BY tm.joined_at DESC
       LIMIT ? OFFSET ?`,
      [teamId, limit, offset],
    );

    sendSuccess(res, 200, rows, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('Get team members error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/:id/members', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const teamId = parseId(req.params.id);
    const { researcher_id, membership_role } = req.body ?? {};
    const researcherId = researcher_id ? Number(researcher_id) : null;

    if (!teamId || !researcherId || !membership_role) {
      sendError(res, 400, 'researcher_id and membership_role are required');
      return;
    }

    if (!await teamExists(teamId)) {
      sendError(res, 404, 'Team not found');
      return;
    }

    const [researcherRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM researchers WHERE id = ? AND is_active = TRUE LIMIT 1', [researcherId]);
    if (researcherRows.length === 0) {
      sendError(res, 404, 'Researcher not found');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO team_memberships (team_id, researcher_id, membership_role, joined_at, left_at, is_active, notes)
       VALUES (?, ?, ?, CURDATE(), NULL, TRUE, NULL)
       ON DUPLICATE KEY UPDATE membership_role = VALUES(membership_role), joined_at = VALUES(joined_at), left_at = NULL, is_active = TRUE`,
      [teamId, researcherId, membership_role],
    );

    sendSuccess(res, 201, { id: result.insertId }, 'Member added');
  } catch (error) {
    console.error('Add team member error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.delete('/:id/members/:researcher_id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const teamId = parseId(req.params.id);
    const researcherId = parseId(req.params.researcher_id);

    if (!teamId || !researcherId) {
      sendError(res, 400, 'Invalid team or researcher id');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE team_memberships SET is_active = FALSE, left_at = CURDATE() WHERE team_id = ? AND researcher_id = ?',
      [teamId, researcherId],
    );

    if (result.affectedRows === 0) {
      sendError(res, 404, 'Membership not found');
      return;
    }

    sendSuccess(res, 200, { removed: true }, 'Member removed');
  } catch (error) {
    console.error('Remove team member error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

export default router;
