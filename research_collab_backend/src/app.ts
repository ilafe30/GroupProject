import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { uploadDir } from './middleware/upload';
import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import researcherRoutes from './routes/researchers';
import projectRoutes from './routes/projects';
import postRoutes from './routes/posts';
import recruitmentPostRoutes from './routes/recruitmentPosts';
import discussionPostRoutes from './routes/discussionPosts';
import postApplicationRoutes from './routes/postApplications';
import teamRoutes from './routes/teams';
import skillRoutes from './routes/skills';
import researchAreaRoutes from './routes/researchAreas';
import applicationRoutes from './routes/applications';


config();

const app = express();
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

fs.mkdirSync(uploadDir, { recursive: true });

const allowedOrigins = [clientUrl, 'http://localhost:3001', 'http://localhost:3002', 'http://192.168.56.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow local dev addresses (match localhost and local LAN IPs)
    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
}));

// Custom JSON serializer to handle BigInt values
app.set('json replacer', (_key: string, value: any) => {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/researchers', researcherRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/posts', postRoutes);
// TODO: Migrate old posts routes to new recruitment/discussion posts
app.use('/api/recruitment-posts', recruitmentPostRoutes);
app.use('/api/discussion-posts', discussionPostRoutes);
app.use('/api/post-applications', postApplicationRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/research-areas', researchAreaRoutes);
app.use('/api/applications', applicationRoutes);


app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', error);

  if (typeof error === 'object' && error && 'name' in error && error.name === 'MulterError') {
    res.status(400).json({ success: false, message: 'Upload failed' });
    return;
  }

  res.status(500).json({ success: false, message: 'Internal server error' });
});

export default app;
