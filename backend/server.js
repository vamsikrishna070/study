import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { startScheduler } from './jobs/scheduler.js';

async function startServer() {
  await connectDB();
  startScheduler();
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
  });
}

startServer().catch((error) => {
  console.error(`Unable to start StudyArena API: ${error.message}`);
  process.exit(1);
});