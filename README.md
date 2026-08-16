# StudyArena

StudyArena is a full-stack personal academic workspace designed to help you focus on your studies, manage tasks, track resources, and review notes efficiently.

## Features
- **Dashboard**: High-level overview of upcoming tasks, exams, and daily priorities.
- **Subjects**: Organize your study materials and track progress per subject.
- **Notes & Resources**: Powerful note-taking with full attachment support (PDFs, images, audio, video).
- **Tasks & Exams**: Stay ahead of your deadlines and exams with built-in scheduling.
- **Reminders**: Push notifications to keep you on track.
- **Dark Mode**: Fully responsive, accessible, and supports an elegant dark mode.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS v4, React Router, React Query
- **Backend**: Node.js, Express, MongoDB/Mongoose
- **Integrations**: Cloudinary (File Storage), Web Push (Notifications)

---

## Deployment

The application is fully configured for a production deployment utilizing **Vercel** for the frontend and **Render** for the backend APIs and background Cron tasks.

### 1. Database (MongoDB Atlas)
Ensure you have a MongoDB Atlas cluster created.
- Get the Connection String (URI).
- Make sure Network Access is set to allow connections from anywhere (`0.0.0.0/0`) since Render IPs are dynamic, or configure VPC peering if supported on your tier.

### 2. File Storage (Cloudinary)
Ensure you have a Cloudinary account for media uploads.
- Keep the `CLOUDINARY_API_SECRET` strictly on the backend.
- Set up the environment variables provided in the Cloudinary Dashboard.

### 3. Backend Deployment (Render)
The project includes a `render.yaml` infrastructure-as-code file. You can simply connect your GitHub repository to Render and use the Blueprint sync.

**Services Created by render.yaml:**
1. **Web Service (`studyarena-api`)**: The main Express backend.
2. **Cron Job (`studyarena-reminders`)**: A background worker that wakes up every 15 minutes to process and dispatch reminders.

**Required Environment Variables (Render):**
- `NODE_ENV`: `production`
- `MONGODB_URI`: Your Atlas connection string
- `JWT_SECRET`: A secure random string for authentication
- `CLIENT_URL`: Your Vercel frontend URL (e.g., `https://studyarena.vercel.app`)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: For Web Push Notifications

### 4. Frontend Deployment (Vercel)
Connect the repository to Vercel. 
- Vercel will automatically detect Vite. 
- The project includes `vercel.json` which automatically configures SPA routing to prevent 404 errors on page refreshes.

**Required Environment Variable (Vercel):**
- `VITE_API_URL`: Your Render backend URL (e.g., `https://studyarena-api.onrender.com/api`)

---

## Local Development

1. Clone the repository.
2. Install dependencies for both frontend and backend:
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```
3. Copy the `.env.example` to `.env` in both directories and fill out your local credentials.
4. Run the development servers concurrently:
   ```bash
   # Terminal 1 (Frontend)
   cd frontend && npm run dev
   
   # Terminal 2 (Backend)
   cd backend && npm run dev
   ```
