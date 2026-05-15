import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { Response } from 'express';
import { sendError, sendSuccess } from '../lib/http';

export interface RelationshipConfig {
  parentTable: string;
  childTable: string;
  junctionTable: string;
  parentIdField: string;
  childIdField: string;
  parentIdParam?: string; // field name in junction table, defaults to parent_id
  childIdParam?: string; // field name in junction table, defaults to child_id
  additionalFields?: Record<string, unknown>; // Extra fields to insert (e.g., role, status)
}

export interface RelationshipCheckFunction {
  (pool: Pool, id: number): Promise<boolean>;
}

/**
 * Generic add relationship handler
 * Handles: validate parent, validate child, prevent duplicates, insert
 */
export async function addRelationship(
  pool: Pool,
  res: Response,
  parentId: number,
  childId: number,
  config: RelationshipConfig,
  checkParentFn?: RelationshipCheckFunction,
  additionalFields?: Record<string, unknown>,
): Promise<boolean> {
  try {
    // Validate parent
    if (checkParentFn) {
      const parentExists = await checkParentFn(pool, parentId);
      if (!parentExists) {
        sendError(res, 404, `${config.parentTable} not found`);
        return false;
      }
    } else {
      const [parentRows] = await pool.query<RowDataPacket[]>(
        `SELECT id FROM ${config.parentTable} WHERE id = ? LIMIT 1`,
        [parentId],
      );
      if (parentRows.length === 0) {
        sendError(res, 404, `${config.parentTable} not found`);
        return false;
      }
    }

    // Validate child
    const [childRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM ${config.childTable} WHERE id = ? LIMIT 1`,
      [childId],
    );
    if (childRows.length === 0) {
      sendError(res, 404, `${config.childTable} not found`);
      return false;
    }

    // Prepare INSERT statement
    const parentIdField = config.parentIdParam || 'parent_id';
    const childIdField = config.childIdParam || 'child_id';
    const mergedFields = { [parentIdField]: parentId, [childIdField]: childId, ...additionalFields };
    const fieldNames = Object.keys(mergedFields).join(', ');
    const placeholders = Object.keys(mergedFields).map(() => '?').join(', ');
    const values = Object.values(mergedFields);

    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO ${config.junctionTable} (${fieldNames}) VALUES (${placeholders})`,
        values,
      );
      sendSuccess(res, 201, { id: result.insertId }, `${config.childTable} added`);
      return true;
    } catch (error: any) {
      // Handle duplicate key error
      if (error.code === 'ER_DUP_ENTRY') {
        sendError(res, 400, `${config.childTable} already linked`);
        return false;
      }
      throw error;
    }
  } catch (error) {
    console.error(`Add ${config.childTable} error:`, error);
    sendError(res, 500, 'Internal server error');
    return false;
  }
}

/**
 * Generic remove relationship handler
 * Handles: validate parent, validate relationship exists, delete
 */
export async function removeRelationship(
  pool: Pool,
  res: Response,
  parentId: number,
  childId: number,
  config: RelationshipConfig,
  checkAuthFn?: (pool: Pool, parentId: number, userId: number) => Promise<boolean>,
  userId?: number,
): Promise<boolean> {
  try {
    // Check authorization if function provided
    if (checkAuthFn && userId) {
      const authorized = await checkAuthFn(pool, parentId, userId);
      if (!authorized) {
        sendError(res, 403, 'Forbidden');
        return false;
      }
    }

    const parentIdField = config.parentIdParam || 'parent_id';
    const childIdField = config.childIdParam || 'child_id';

    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM ${config.junctionTable} WHERE ${parentIdField} = ? AND ${childIdField} = ?`,
      [parentId, childId],
    );

    if (result.affectedRows === 0) {
      sendError(res, 404, `${config.childTable} not linked`);
      return false;
    }

    sendSuccess(res, 200, { removed: true }, `${config.childTable} removed`);
    return true;
  } catch (error) {
    console.error(`Remove ${config.childTable} error:`, error);
    sendError(res, 500, 'Internal server error');
    return false;
  }
}

/**
 * Generic list relationship handler
 * Handles: query junction table with JOINs, return paginated list
 */
export async function listRelationships(
  pool: Pool,
  res: Response,
  parentId: number,
  config: RelationshipConfig,
  selectFields: string, // e.g., "c.id, c.name, c.description"
  childAlias: string = 'c', // default alias for child in JOIN
  page: number = 1,
  limit: number = 20,
): Promise<boolean> {
  try {
    const offset = (page - 1) * limit;
    const parentIdField = config.parentIdParam || 'parent_id';
    const childIdField = config.childIdParam || 'child_id';

    // Get total count
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ${config.junctionTable} WHERE ${parentIdField} = ?`,
      [parentId],
    );
    const total = Number((countRows[0] as any)?.total || 0);

    // Get paginated results
    const [rows] = await pool.query(
      `SELECT ${selectFields}
       FROM ${config.junctionTable} j
       INNER JOIN ${config.childTable} ${childAlias} ON ${childAlias}.id = j.${childIdField}
       WHERE j.${parentIdField} = ?
       LIMIT ? OFFSET ?`,
      [parentId, limit, offset],
    );

    sendSuccess(res, 200, rows, 'Operation successful', { page, limit, total });
    return true;
  } catch (error) {
    console.error(`List relationships error:`, error);
    sendError(res, 500, 'Internal server error');
    return false;
  }
}

/**
 * Generic check parent exists function factory
 */
export function createParentChecker(tableName: string): RelationshipCheckFunction {
  return async (pool: Pool, id: number) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM ${tableName} WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows.length > 0;
  };
}

/**
 * Generic check authorization function factory (owner check)
 */
export function createOwnerChecker(tableName: string, ownerIdField: string): (pool: Pool, parentId: number, userId: number) => Promise<boolean> {
  return async (pool: Pool, parentId: number, userId: number) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM ${tableName} WHERE id = ? AND ${ownerIdField} = ? LIMIT 1`,
      [parentId, userId],
    );
    return rows.length > 0;
  };
}
