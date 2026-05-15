import { config } from 'dotenv';
import { createPool } from 'mysql2/promise';

config();

const rawPool = createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'research_collab_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

type QueryablePool = typeof rawPool & {
  query<T = unknown>(sql: string, values?: unknown[]): Promise<[T, unknown]>;
  execute<T = unknown>(sql: string, values?: unknown[]): Promise<[T, unknown]>;
};

const pool = rawPool as QueryablePool;

export { pool };
