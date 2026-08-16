import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import router from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL === '*' ? true : env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/', (_req, res) => res.json({ success: true, data: { service: 'StudyArena API' } }));
app.use('/api', router);
app.use(notFound);
app.use(errorHandler);

export default app;