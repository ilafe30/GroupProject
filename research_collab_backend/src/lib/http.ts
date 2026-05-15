import type { Response } from 'express';
import type { PaginationMeta } from '../types';

type QueryValue = string | string[] | number | boolean | null | undefined;
type QueryLike = Record<string, QueryValue>;

export function sendSuccess<T>(res: Response, status: number, data: T, message = 'Operation successful', pagination?: PaginationMeta): Response {
  const body: Record<string, unknown> = { success: true, message, data };

  if (pagination) {
    body.pagination = pagination;
  }
  
  return res.status(status).json(body);
}

export function sendError(res: Response, status: number, message: string, details?: any): Response {
  return res.status(status).json({
    success: false,
    message,
    details,
  });
}

export function getSingleQuery(query: QueryValue): string | undefined {
  if (Array.isArray(query)) {
    return String(query[0]);
  }
  return query ? String(query) : undefined;
}

export function getQuery(query: QueryValue): string[] | undefined {
  if (Array.isArray(query)) {
    return query.map(String);
  }
  return query ? [String(query)] : undefined;
}

export function getNumericQuery(query: QueryValue): number | undefined {
  const value = getSingleQuery(query);
  if (value) {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

export function getBooleanQuery(query: QueryValue): boolean | undefined {
  const value = getSingleQuery(query);
  if (value) {
    return value.toLowerCase() === 'true';
  }
  return undefined;
}

export function getQueryString(value: QueryValue): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? '');
  }

  return value === undefined || value === null ? '' : String(value);
}

export function parseId(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parsePagination(query: QueryLike) {
  const page = Math.max(1, Number(getQueryString(query.page) || 1));
  const limit = Math.min(100, Math.max(1, Number(getQueryString(query.limit) || 20)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function parseSortOrder(value: QueryValue, fallback: 'asc' | 'desc' = 'desc'): 'asc' | 'desc' {
  const normalized = getQueryString(value).toLowerCase();
  return normalized === 'asc' ? 'asc' : normalized === 'desc' ? 'desc' : fallback;
}

export function getSearchTerm(query: QueryLike): string {
  return getQueryString(query.search).trim();
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? null : numericValue;
}

export function toBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value === true || value === 'true' || value === '1' || value === 1) {
    return true;
  }

  if (value === false || value === 'false' || value === '0' || value === 0) {
    return false;
  }

  return null;
}

export function validateEmail(value: unknown): value is string {
  return typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value.trim());
}

export function validatePassword(value: unknown, minLength = 8): value is string {
  return typeof value === 'string' && value.length >= minLength;
}

export function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
