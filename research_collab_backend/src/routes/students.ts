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

async function studentExists(studentId: number): Promise<boolean> {
  const [rows] = await pool.query<Array<{ id: number }>>('SELECT id FROM students WHERE id = ? LIMIT 1', [studentId]);
  return rows.length > 0;
}

function ensureStudentAccess(req: any, res: any, studentId: number): boolean {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return false;
  }

  if (req.user.role !== 'student' || req.user.id !== studentId) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return false;
  }

  return true;
}

async function getStudentProfile(studentId: number) {
  const [rows] = await pool.query<Array<{
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
  }>>(
    'SELECT id, first_name, last_name, email, institution, bio, gpa, profile_image_url, is_active, created_at, updated_at FROM students WHERE id = ? LIMIT 1',
    [studentId],
  );

  return rows[0] || null;
}

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);
    const search = getSearchTerm(req.query as Record<string, string>);
    const sort = parseSortOrder(req.query.sort as string | undefined, 'desc');
    const isActive = req.query.is_active === undefined ? null : String(req.query.is_active) === 'true' ? true : String(req.query.is_active) === 'false' ? false : null;
    const institution = normalizeText(req.query.institution);

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
          FROM student_skills ss
          INNER JOIN skills s ON s.id = ss.skill_id
          WHERE ss.student_id = students.id
            AND (s.name LIKE ? OR s.description LIKE ?)
        )
      )`);
      params.push(like, like, like, like, like, like, like);
    }

    if (institution) {
      conditions.push('institution = ?');
      params.push(institution);
    }

    if (isActive !== null) {
      conditions.push('is_active = ?');
      params.push(isActive);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query<Array<{ total: number }>>(`SELECT COUNT(*) AS total FROM students ${whereClause}`, params);
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT id, first_name, last_name, email, institution, bio, gpa, profile_image_url, is_active, created_at, updated_at
       FROM students
       ${whereClause}
       ORDER BY created_at ${sort.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    sendSuccess(res, 200, rows, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('List students error:', error);
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
    const gpa = toNullableNumber(req.body?.gpa);

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

    if (gpa !== null && (Number.isNaN(gpa) || gpa < 0 || gpa > 4)) {
      sendError(res, 400, 'Invalid GPA');
      return;
    }

    const [existingRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM students WHERE email = ? LIMIT 1', [email]);
    if (existingRows.length > 0) {
      sendError(res, 400, 'Email already exists');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO students (first_name, last_name, email, password_hash, institution, bio, gpa, profile_image_url, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, TRUE, NOW(), NOW())`,
      [firstName, lastName, email, passwordHash, institution || null, bio || null, gpa],
    );

    sendSuccess(res, 201, {
      id: result.insertId,
      first_name: firstName,
      last_name: lastName,
      email,
      institution: institution || null,
      bio: bio || null,
      gpa,
      is_active: true,
    }, 'Operation successful');
  } catch (error) {
    console.error('Create student error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      sendError(res, 403, 'Forbidden');
      return;
    }

    const profile = await getStudentProfile(req.user.id);
    if (!profile) {
      sendError(res, 404, 'Student not found');
      return;
    }

    sendSuccess(res, 200, profile, 'Operation successful');
  } catch (error) {
    console.error('Get student me error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.put('/me', requireAuth, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      sendError(res, 403, 'Forbidden');
      return;
    }

    const { first_name, last_name, institution, bio, gpa } = req.body ?? {};
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

    if (gpa !== undefined) {
      const numericGpa = gpa === null || gpa === '' ? null : Number(gpa);
      if (numericGpa !== null && (Number.isNaN(numericGpa) || numericGpa < 0 || numericGpa > 4)) {
        res.status(400).json({ success: false, message: 'Invalid GPA' });
        return;
      }
      updates.push('gpa = ?');
      values.push(numericGpa);
    }

    if (updates.length === 0) {
      sendError(res, 400, 'No fields to update');
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(req.user.id);

    const [result] = await pool.query<ResultSetHeader>(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Student not found');
      return;
    }

    const profile = await getStudentProfile(req.user.id);
    sendSuccess(res, 200, profile, 'Student updated');
  } catch (error) {
    console.error('Update student error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/:id/projects', async (req, res) => {
  try {
    const studentId = parseId(req.params.id);
    if (!studentId) {
      res.status(400).json({ success: false, message: 'Invalid student id' });
      return;
    }

    if (!(await studentExists(studentId))) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.category, p.status, ps.participation_role, ps.status AS membership_status, ps.joined_at
       FROM project_students ps
       INNER JOIN projects p ON p.id = ps.project_id
       WHERE ps.student_id = ?
         AND ps.status IN ('active', 'candidate')
       ORDER BY ps.joined_at DESC`,
      [studentId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get student projects error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/** Discussion threads created by this student (public profile + activity feed). */
router.get('/:id/posts', async (req, res) => {
  try {
    const studentId = parseId(req.params.id);
    if (!studentId) {
      res.status(400).json({ success: false, message: 'Invalid student id' });
      return;
    }

    if (!(await studentExists(studentId))) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const [rows] = await pool.query(
      `SELECT id, COALESCE(project_id, 0) AS project_id, title, description, 'open' AS status,
              created_at, updated_at, 'discussion' AS post_kind
       FROM discussion_posts
       WHERE created_by_student_id = ?
       ORDER BY created_at DESC
       LIMIT 80`,
      [studentId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get student posts error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const studentId = parseId(req.params.id);
    if (!studentId) {
      sendError(res, 400, 'Invalid student id');
      return;
    }

    const profile = await getStudentProfile(studentId);
    if (!profile) {
      sendError(res, 404, 'Student not found');
      return;
    }

    sendSuccess(res, 200, profile, 'Operation successful');
  } catch (error) {
    console.error('Get student error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const studentId = parseId(req.params.id);
    if (!studentId) {
      sendError(res, 400, 'Invalid student id');
      return;
    }

    if (!req.user || (req.user.role !== 'student' || req.user.id !== studentId)) {
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

    if (req.body?.gpa !== undefined) {
      const numericGpa = toNullableNumber(req.body.gpa);
      if (numericGpa !== null && (numericGpa < 0 || numericGpa > 4)) {
        sendError(res, 400, 'Invalid GPA');
        return;
      }
      updates.push('gpa = ?');
      values.push(numericGpa);
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
    values.push(studentId);

    const [result] = await pool.query<ResultSetHeader>(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Student not found');
      return;
    }

    const profile = await getStudentProfile(studentId);
    sendSuccess(res, 200, profile, 'Student updated');
  } catch (error) {
    console.error('Update student by id error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const studentId = parseId(req.params.id);
    if (!studentId) {
      sendError(res, 400, 'Invalid student id');
      return;
    }

    if (!req.user || (req.user.role !== 'student' || req.user.id !== studentId)) {
      sendError(res, 403, 'Forbidden');
      return;
    }

    if (!(await studentExists(studentId))) {
      sendError(res, 404, 'Student not found');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('UPDATE students SET is_active = FALSE, updated_at = NOW() WHERE id = ?', [studentId]);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Student not found');
      return;
    }

    sendSuccess(res, 200, { id: studentId }, 'Student deleted');
  } catch (error) {
    console.error('Delete student error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.get('/:id/skills', async (req, res) => {
  try {
    const studentId = parseId(req.params.id);
    const { page, limit, offset } = parsePagination(req.query as Record<string, string>);

    if (!studentId) {
      sendError(res, 400, 'Invalid student id');
      return;
    }

    if (!(await studentExists(studentId))) {
      sendError(res, 404, 'Student not found');
      return;
    }

    const [countRows] = await pool.query<Array<{ total: number }>>(
      'SELECT COUNT(*) AS total FROM student_skills WHERE student_id = ?',
      [studentId],
    );
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT s.id, s.name, s.description, ss.source, ss.confidence
       FROM student_skills ss
       INNER JOIN skills s ON s.id = ss.skill_id
       WHERE ss.student_id = ?
       ORDER BY s.name ASC
       LIMIT ? OFFSET ?`,
      [studentId, limit, offset],
    );

    sendSuccess(res, 200, rows, 'Operation successful', { page, limit, total });
  } catch (error) {
    console.error('Get student skills error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/:id/skills', requireAuth, async (req, res) => {
  try {
    const studentId = parseId(req.params.id);
    if (!ensureStudentAccess(req, res, studentId)) {
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
      `INSERT INTO student_skills (student_id, skill_id, source, confidence)
       VALUES (?, ?, ?, 1.0000)
       ON DUPLICATE KEY UPDATE source = VALUES(source), confidence = VALUES(confidence)`,
      [studentId, resolvedSkillId, normalizedSource],
    );

    sendSuccess(res, 201, { id: result.insertId }, 'Skill added');
  } catch (error) {
    console.error('Add student skill error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.delete('/:id/skills/:skill_id', requireAuth, async (req, res) => {
  try {
    const studentId = parseId(req.params.id);
    const skillId = parseId(req.params.skill_id);
    if (!ensureStudentAccess(req, res, studentId)) {
      return;
    }

    const [result] = await pool.query<ResultSetHeader>('DELETE FROM student_skills WHERE student_id = ? AND skill_id = ?', [studentId, skillId]);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Skill not linked');
      return;
    }

    sendSuccess(res, 200, { removed: true }, 'Skill removed');
  } catch (error) {
    console.error('Delete student skill error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/:id/cv', requireAuth, uploadCv.single('file'), async (req, res) => {
  try {
    const studentId = parseId(req.params.id);
    if (!ensureStudentAccess(req, res, studentId)) {
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'CV file is required' });
      return;
    }

    const relativePath = path.relative(process.cwd(), req.file.path).split(path.sep).join('/');

    const [studentRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM students WHERE id = ? AND is_active = TRUE LIMIT 1', [studentId]);
    if (studentRows.length === 0) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const [previousPrimaryRows] = await pool.query<Array<{ id: number }>>('SELECT id FROM student_cvs WHERE student_id = ? AND is_primary = TRUE', [studentId]);
    if (previousPrimaryRows.length > 0) {
      await pool.query('UPDATE student_cvs SET is_primary = FALSE WHERE student_id = ?', [studentId]);
    }

    const [documentResult] = await pool.query<ResultSetHeader>(
      'INSERT INTO documents (file_name, file_path, mime_type, file_size, uploaded_at) VALUES (?, ?, ?, ?, NOW())',
      [req.file.originalname, relativePath, req.file.mimetype, req.file.size],
    );

    const extractedText = null;
    await pool.query(
      'INSERT INTO student_cvs (student_id, document_id, extracted_text, is_primary, uploaded_at) VALUES (?, ?, ?, TRUE, NOW())',
      [studentId, documentResult.insertId, extractedText],
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
    console.error('Upload student CV error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/:id/applications', requireAuth, async (req, res) => {
  try {
    const studentId = parseId(req.params.id);
    if (!ensureStudentAccess(req, res, studentId)) {
      return;
    }

    const [rows] = await pool.query(
      `SELECT psa.id, psa.post_id, psa.project_id, psa.student_id, psa.status, psa.cover_letter, psa.applied_at, psa.reviewed_at, psa.reviewed_by_researcher_id, psa.notes,
              pp.title AS post_title, pp.status AS post_status, p.title AS project_title
       FROM post_student_applications psa
       INNER JOIN project_posts pp ON pp.id = psa.post_id
       INNER JOIN projects p ON p.id = psa.project_id
       WHERE psa.student_id = ?
       ORDER BY psa.applied_at DESC`,
      [studentId],
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get student applications error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
