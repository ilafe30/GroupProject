import type { NextFunction, Request, Response } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { pool } from '../db/connection';
import type { AccessRole, AuthUser, JwtPayloadShape } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'dev_jwt_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '24h';

function getTokenFromHeader(headerValue?: string): string | null {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function getAuthUserPayload(user: AuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

function getAuthErrorMessage(error: unknown): string {
  if (error instanceof TokenExpiredError) {
    return 'Token expired';
  }

  if (error instanceof JsonWebTokenError) {
    return 'Invalid token';
  }

  return 'Invalid token';
}

function sendAuthError(res: Response, message: string): void {
  res.status(401).json({ success: false, message });
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign(getAuthUserPayload(user), JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY } as SignOptions);
}

export function signRefreshToken(user: AuthUser): string {
  return jwt.sign(getAuthUserPayload(user), JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayloadShape {
  return jwt.verify(token, JWT_SECRET) as JwtPayloadShape;
}

export function verifyRefreshToken(token: string): JwtPayloadShape {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayloadShape;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = getTokenFromHeader(req.headers.authorization);
  if (!token) {
    sendAuthError(res, 'Unauthorized');
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    sendAuthError(res, getAuthErrorMessage(error));
  }
}

export function requireRole(...allowedRoles: AccessRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendAuthError(res, 'Unauthorized');
        return;
      }

      if (allowedRoles.includes(req.user.role)) {
        next();
        return;
      }

    if (!allowedRoles.some((role) => ['admin', 'member', 'team_leader', 'none'].includes(role))) {
     res.status(403).json({ success: false, message: 'Forbidden' });
      return;
}

if (req.user.role !== 'researcher') {
  res.status(403).json({ success: false, message: 'Forbidden' });
  return;
}



      const [rows] = await pool.query<Array<{ global_role: AccessRole }>>('SELECT global_role FROM researchers WHERE id = ? AND is_active = TRUE LIMIT 1', [req.user.id]);
      const researcher = rows[0];
      if (!researcher || !allowedRoles.includes(researcher.global_role)) {
        res.status(403).json({ success: false, message: 'Forbidden' });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
