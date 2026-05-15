import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { ResultSetHeader } from 'mysql2';
import { pool } from '../db/connection';
import { requireAuth, signAccessToken, signRefreshToken, verifyRefreshToken } from '../middleware/auth';
import type { AuthUser, UserRole } from '../types';
import { normalizeText, sendError, sendSuccess, validateEmail, validatePassword } from '../lib/http';

const router = Router();
const saltRounds = 12;

function isUserRole(value: unknown): value is UserRole {
  return value === 'student' || value === 'researcher';
}

function getAuthPayload(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { role } = req.body ?? {};
    const firstName = normalizeText(req.body?.first_name);
    const lastName = normalizeText(req.body?.last_name);
    const email = normalizeText(req.body?.email);
    const password = req.body?.password;
    const institution = normalizeText(req.body?.institution);

    if (!isUserRole(role) || !firstName || !lastName || !email || !password) {
      sendError(res, 400, 'Missing required fields');
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

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const table = role === 'student' ? 'students' : 'researchers';
    const [existingRows] = await pool.query<Array<{ id: number }>>(`SELECT id FROM ${table} WHERE email = ? LIMIT 1`, [email]);
    if (existingRows.length > 0) {
      sendError(res, 400, 'Email already exists');
      return;
    }

    const insertSql = role === 'student'
      ? `INSERT INTO students (first_name, last_name, email, password_hash, institution, bio, gpa, profile_image_url, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, TRUE, NOW(), NOW())`
      : `INSERT INTO researchers (first_name, last_name, email, password_hash, institution, bio, global_role, profile_image_url, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, 'none', NULL, TRUE, NOW(), NOW())`;

    const [result] = await pool.query<ResultSetHeader>(insertSql, [firstName, lastName, email, hashedPassword, institution || null]);
    const user = getAuthPayload({ id: result.insertId, email, role });
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    sendSuccess(res, 201, {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role, first_name: firstName, last_name: lastName },
    }, 'Operation successful');
  } catch (error) {
    console.error('Register error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { role } = req.body ?? {};
    const email = normalizeText(req.body?.email);
    const password = req.body?.password;

    if (!isUserRole(role) || !email || !password) {
      sendError(res, 400, 'Missing required fields');
      return;
    }

    const table = role === 'student' ? 'students' : 'researchers';
    const [rows] = await pool.query<Array<{ id: number; email: string; first_name: string; last_name: string; password_hash: string; is_active: number | boolean }>>(
      `SELECT id, email, first_name, last_name, password_hash, is_active FROM ${table} WHERE email = ? LIMIT 1`,
      [email],
    );

    const userRow = rows[0];
    if (!userRow) {
      sendError(res, 401, 'Invalid credentials');
      return;
    }

    if (!userRow.is_active) {
      sendError(res, 403, 'Account disabled');
      return;
    }

    const passwordMatches = await bcrypt.compare(password, userRow.password_hash);
    if (!passwordMatches) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const user = getAuthPayload({ id: userRow.id, email: userRow.email, role });
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    sendSuccess(res, 200, {
      accessToken,
      refreshToken,
      user: { id: userRow.id, email: userRow.email, role, first_name: userRow.first_name, last_name: userRow.last_name },
    }, 'Operation successful');
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = normalizeText(req.body?.refreshToken);
    if (!refreshToken) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const accessToken = signAccessToken({ id: decoded.id, email: decoded.email, role: decoded.role });
    sendSuccess(res, 200, { accessToken }, 'Operation successful');
  } catch (error) {
    const message = error instanceof Error && error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    sendError(res, 401, message);
  }
});

router.post('/logout', async (_req, res) => {
  try {
    sendSuccess(res, 200, null, 'Logged out');
  } catch (error) {
    console.error('Logout error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

async function getAuthenticatedProfile(user: AuthUser) {
  const table = user.role === 'student' ? 'students' : 'researchers';
  const [rows] = await pool.query<Array<{ id: number; first_name: string; last_name: string; email: string; institution: string | null; bio: string | null; is_active: number | boolean; created_at: Date | string; updated_at: Date | string }>>(
    `SELECT id, first_name, last_name, email, institution, bio, is_active, created_at, updated_at FROM ${table} WHERE id = ? LIMIT 1`,
    [user.id],
  );
  return rows[0] || null;
}

router.get('/me', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const profile = await getAuthenticatedProfile(req.user);
    if (!profile) {
      sendError(res, 404, 'Account not found');
      return;
    }

    sendSuccess(res, 200, profile, 'Operation successful');
  } catch (error) {
    console.error('Get auth me error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.put('/me', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const updates: string[] = [];
    const values: Array<string | null> = [];
    const table = req.user.role === 'student' ? 'students' : 'researchers';

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

    if (req.body?.password !== undefined) {
      if (!validatePassword(req.body.password, 8)) {
        sendError(res, 400, 'Password must be at least 8 characters');
        return;
      }
      const newHash = await bcrypt.hash(req.body.password, saltRounds);
      updates.push('password_hash = ?');
      values.push(newHash);
    }

    if (updates.length === 0) {
      sendError(res, 400, 'No fields to update');
      return;
    }

    updates.push('updated_at = NOW()');
    values.push(String(req.user.id));

    const [result] = await pool.query<ResultSetHeader>(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = ?`, values);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Account not found');
      return;
    }

    const profile = await getAuthenticatedProfile(req.user);
    sendSuccess(res, 200, profile, 'Account updated');
  } catch (error) {
    console.error('Update auth me error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

router.delete('/me', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Unauthorized');
      return;
    }

    const table = req.user.role === 'student' ? 'students' : 'researchers';
    const [existingRows] = await pool.query<Array<{ id: number }>>(`SELECT id FROM ${table} WHERE id = ? LIMIT 1`, [req.user.id]);
    if (existingRows.length === 0) {
      sendError(res, 404, 'Account not found');
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(`UPDATE ${table} SET is_active = FALSE, updated_at = NOW() WHERE id = ?`, [req.user.id]);
    if (result.affectedRows === 0) {
      sendError(res, 404, 'Account not found');
      return;
    }

    sendSuccess(res, 200, { id: req.user.id }, 'Account deleted');
  } catch (error) {
    console.error('Delete auth me error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

export default router;
