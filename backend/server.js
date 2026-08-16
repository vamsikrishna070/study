import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

async function startServer() {
  await connectDB();
  const port = env.PORT || 5000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error(`Unable to start StudyArena API: ${error.message}`);
  process.exit(1);
});