import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from './config/environment.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import chatRoutes from './routes/chat.routes.js';
import specialLotsRoutes from './routes/specialLots.routes.js';
import { Logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Application = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(
  cors({
    // Preview and production deployments on Vercel each get their own
    // random subdomain, so an exact-match allowlist can't keep up — any
    // *.vercel.app origin is trusted in addition to the configured list.
    origin: (origin, callback) => {
      if (!origin || ENV.CORS.ALLOWED_ORIGINS.includes(origin) || /\.vercel\.app$/.test(new URL(origin).hostname)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use('/static', express.static(path.join(__dirname, '..', 'public'), {
  maxAge: '1y',
  etag: true,
  lastModified: true,
}));

app.use((req, res, next) => {
  Logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
  });
});

app.use(`/api/${ENV.API_VERSION}/auth`, authRoutes);
app.use(`/api/${ENV.API_VERSION}/users`, userRoutes);
app.use(`/api/${ENV.API_VERSION}/admin`, adminRoutes);
app.use(`/api/${ENV.API_VERSION}/chat`, chatRoutes);
app.use(`/api/${ENV.API_VERSION}/admin/special-lots`, specialLotsRoutes);

// In production this one Node process serves the built frontend too, so the
// site works behind a single CloudPanel Node.js app/port with no separate
// static host. The frontend dev server (Vite) handles this itself locally.
if (ENV.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');

  app.use(express.static(frontendDist, { maxAge: '1y', etag: true }));

  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/static/') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

app.use(errorHandler);

export default app;
