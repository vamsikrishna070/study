import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import router from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { perfLogger } from './middleware/perfLogger.js';
import { globalApiLimiter } from './middleware/rateLimiter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(perfLogger);
app.use(helmet());

const configuredOrigins = env.CLIENT_URL
  ? env.CLIENT_URL.split(',').map((o) => o.trim()).filter(Boolean)
  : ['*'];

app.use(
  cors({
    origin: (origin, callback) => {

      if (!origin) return callback(null, true);
      if (configuredOrigins.includes('*') || configuredOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/', (_req, res) => res.json({ success: true, data: { service: 'StudyArena API' } }));

app.use('/api', globalApiLimiter, router);
app.use(notFound);
app.use(errorHandler);

export default app;