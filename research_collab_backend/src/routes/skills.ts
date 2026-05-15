import { Router } from 'express';
import { ResultSetHeader } from 'mysql2';
import { pool } from '../db/connection';
import { requireAuth, requireRole } from '../middleware/auth';
import { escapeLike, getSearchTerm, normalizeText, parseId, parsePagination, parseSortOrder, sendError, sendSuccess } from '../lib/http';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);
    const search = getSearchTerm(req.query as Record<string, string>);
    const sort = parseSortOrder(req.query.sort as string | undefined, 'asc');

    const conditions: string[] = [];
    const params: Array<string> = [];

    if (search) {
      const like = `%${escapeLike(search)}%`;
      conditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(like, like);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query<Array<{ total: number }>>(`SELECT COUNT(*) AS total FROM skills ${whereClause}`, params);
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT id, name, description
       FROM skills
       ${whereClause}
       ORDER BY name ${sort.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    sendSuccess(res, 200, rows, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('List skills error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/', requireAuth, requireRole('admin', 'researcher'), async (req, res) => {
  try {
    const name = normalizeText(req.body?.name);
    const description = normalizeText(req.body?.description);

    if (!name) {
      sendError(res, 400, 'Skill name is required');
      return;
    }

    const [existing] = await pool.query<Array<{ id: number }>>('SELECT id FROM skills WHERE name = ? LIMIT 1', [name]);
    if (existing.length > 0) {
      sendError(res, 400, 'Skill already exists');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('INSERT INTO skills (name, description) VALUES (?, ?)', [name, description || null]);
    sendSuccess(res, 201, { id: result.insertId, name, description: description || null }, 'Operation successful');
  } catch (error) {
    console.error('Create skill error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const skillId = parseId(req.params.id);
    if (!skillId) {
      sendError(res, 400, 'Invalid skill id');
      return;
    }

    const [rows] = await pool.query<Array<{ id: number; name: string; description: string | null }>>('SELECT id, name, description FROM skills WHERE id = ? LIMIT 1', [skillId]);
    const skill = rows[0];
    if (!skill) {
      sendError(res, 404, 'Skill not found');
      return;
    }

    sendSuccess(res, 200, skill, 'Operation successful');
  } catch (error) {
    console.error('Get skill error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.put('/:id', requireAuth, requireRole('admin', 'researcher'), async (req, res) => {
  try {
    const skillId = parseId(req.params.id);
    if (!skillId) {
      sendError(res, 400, 'Invalid skill id');
      return;
    }

    const existingName = req.body?.name === undefined ? undefined : normalizeText(req.body.name);
    const description = req.body?.description === undefined ? undefined : normalizeText(req.body.description);
    const updates: string[] = [];
    const values: Array<string | null | number> = [];

    if (existingName !== undefined) {
      if (!existingName) {
        sendError(res, 400, 'Skill name is required');
        return;
      }
      updates.push('name = ?');
      values.push(existingName);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (updates.length === 0) {
      sendError(res, 400, 'No fields to update');
      return;
    }

    const [existingRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM skills WHERE id = ? LIMIT 1', [skillId]);
    if (existingRows.length === 0) {
      sendError(res, 404, 'Skill not found');
      return;
    }

    if (existingName) {
      const [duplicateRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM skills WHERE name = ? AND id <> ? LIMIT 1', [existingName, skillId]);
      if (duplicateRows.length > 0) {
        sendError(res, 400, 'Skill already exists');
        return;
      }
    }

    values.push(skillId);
    const [result] = await pool.query<ResultSetHeader>(`UPDATE skills SET ${updates.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Skill not found');
      return;
    }

    const [rows] = await pool.query<Array<{ id: number; name: string; description: string | null }>>('SELECT id, name, description FROM skills WHERE id = ? LIMIT 1', [skillId]);
    sendSuccess(res, 200, rows[0], 'Skill updated');
  } catch (error) {
    console.error('Update skill error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.delete('/:id', requireAuth, requireRole('admin', 'researcher'), async (req, res) => {
  try {
    const skillId = parseId(req.params.id);
    if (!skillId) {
      sendError(res, 400, 'Invalid skill id');
      return;
    }

    const [existingRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM skills WHERE id = ? LIMIT 1', [skillId]);
    if (existingRows.length === 0) {
      sendError(res, 404, 'Skill not found');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM skills WHERE id = ?', [skillId]);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Skill not found');
      return;
    }

    sendSuccess(res, 200, { id: skillId }, 'Skill deleted');
  } catch (error) {
    console.error('Delete skill error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

export default router;
