import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/error-boundary.jsx';
import { Toaster } from './components/ui/toaster.jsx';
import { TooltipProvider } from './components/ui/tooltip.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SrmApRoute from './components/SrmApRoute.jsx';
import { LoadingBlock } from './components/shared.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx').then(m => ({ default: m.DashboardPage })));
const SubjectsPage = lazy(() => import('./pages/SubjectsPage.jsx').then(m => ({ default: m.SubjectsPage })));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail.jsx'));
const Syllabus = lazy(() => import('./pages/Syllabus.jsx'));
const NotesPage = lazy(() => import('./pages/NotesPage.jsx').then(m => ({ default: m.NotesPage })));
const TasksPage = lazy(() => import('./pages/TasksPage.jsx').then(m => ({ default: m.TasksPage })));
const ExamsPage = lazy(() => import('./pages/ExamsPage.jsx'));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage.jsx'));
const ProgressPage = lazy(() => import('./pages/ProgressPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const StudySession = lazy(() => import('./pages/StudySession.jsx'));
const StudyLogPage = lazy(() => import('./pages/StudyLogPage.jsx'));
const Recordings = lazy(() => import('./pages/Recordings.jsx'));
const Reminders = lazy(() => import('./pages/Reminders.jsx'));
const Calendar = lazy(() => import('./pages/Calendar.jsx'));
const Search = lazy(() => import('./pages/Search.jsx'));
const PortalDashboard = lazy(() => import('./pages/portal/PortalDashboard.jsx'));
const PortalAttendance = lazy(() => import('./pages/portal/PortalAttendance.jsx'));
const PortalAttendancePlanner = lazy(() => import('./pages/portal/PortalAttendancePlanner.jsx'));
const PortalTimetable = lazy(() => import('./pages/portal/PortalTimetable.jsx'));
const PortalExams = lazy(() => import('./pages/portal/PortalExams.jsx'));
const PortalResults = lazy(() => import('./pages/portal/PortalResults.jsx'));
const PortalCalendar = lazy(() => import('./pages/portal/PortalCalendar.jsx'));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="mx-auto max-w-5xl p-8">
      <LoadingBlock lines={6} />
    </div>
  );
}

function Router() {
  const { pathname: location } = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/portal" element={<ProtectedRoute><SrmApRoute><PortalDashboard /></SrmApRoute></ProtectedRoute>} />
          <Route path="/portal/attendance" element={<ProtectedRoute><SrmApRoute><PortalAttendance /></SrmApRoute></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><SrmApRoute><PortalAttendance /></SrmApRoute></ProtectedRoute>} />
          <Route path="/portal/attendance-planner" element={<ProtectedRoute><SrmApRoute><PortalAttendancePlanner /></SrmApRoute></ProtectedRoute>} />
          <Route path="/attendance-planner" element={<ProtectedRoute><SrmApRoute><PortalAttendancePlanner /></SrmApRoute></ProtectedRoute>} />
          <Route path="/portal/timetable" element={<ProtectedRoute><SrmApRoute><PortalTimetable /></SrmApRoute></ProtectedRoute>} />
          <Route path="/timetable" element={<ProtectedRoute><PortalTimetable /></ProtectedRoute>} />
          <Route path="/portal/exams" element={<ProtectedRoute><SrmApRoute><PortalExams /></SrmApRoute></ProtectedRoute>} />
          <Route path="/portal/results" element={<ProtectedRoute><SrmApRoute><PortalResults /></SrmApRoute></ProtectedRoute>} />
          <Route path="/portal/calendar" element={<ProtectedRoute><SrmApRoute><PortalCalendar /></SrmApRoute></ProtectedRoute>} />
          <Route path="/subjects" element={<ProtectedRoute><SubjectsPage /></ProtectedRoute>} />
          <Route path="/subjects/:id" element={<ProtectedRoute><SubjectDetail /></ProtectedRoute>} />
          <Route path="/syllabus" element={<ProtectedRoute><Syllabus /></ProtectedRoute>} />
          <Route path="/study-session" element={<ProtectedRoute><StudySession /></ProtectedRoute>} />
          <Route path="/study-session/:id" element={<ProtectedRoute><StudySession /></ProtectedRoute>} />
          <Route path="/study-sessions/:id" element={<ProtectedRoute><StudySession /></ProtectedRoute>} />
          <Route path="/recordings" element={<ProtectedRoute><Recordings /></ProtectedRoute>} />
          <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/exams" element={<ProtectedRoute><ExamsPage /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
          <Route path="/study-log" element={<ProtectedRoute><StudyLogPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<div className="rounded-2xl border border-card-border bg-card p-12 text-center"><h1 className="font-display text-4xl">Page not found</h1><Link className="mt-4 inline-block text-accent" to="/">Return to overview</Link></div>} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
