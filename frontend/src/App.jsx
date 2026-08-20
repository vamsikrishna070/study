import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/error-boundary.jsx';
import { Toaster } from './components/ui/toaster.jsx';
import { TooltipProvider } from './components/ui/tooltip.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { SubjectsPage } from './pages/SubjectsPage.jsx';
import SubjectDetail from './pages/SubjectDetail.jsx';
import Syllabus from './pages/Syllabus.jsx';
import { NotesPage } from './pages/NotesPage.jsx';
import { TasksPage } from './pages/TasksPage.jsx';
import ExamsPage from './pages/ExamsPage.jsx';
import ResourcesPage from './pages/ResourcesPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import StudySession from './pages/StudySession.jsx';
import Recordings from './pages/Recordings.jsx';
import Reminders from './pages/Reminders.jsx';
import Calendar from './pages/Calendar.jsx';
import Search from './pages/Search.jsx';

const queryClient = new QueryClient();

function Router() {
  const { pathname: location } = useLocation();
  return <ErrorBoundary resetKey={location}><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    <Route path="/subjects" element={<ProtectedRoute><SubjectsPage /></ProtectedRoute>} />
    <Route path="/subjects/:id" element={<ProtectedRoute><SubjectDetail /></ProtectedRoute>} />
    <Route path="/syllabus" element={<ProtectedRoute><Syllabus /></ProtectedRoute>} />
    <Route path="/study-session" element={<ProtectedRoute><StudySession /></ProtectedRoute>} />
    <Route path="/recordings" element={<ProtectedRoute><Recordings /></ProtectedRoute>} />
    <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
    <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
    <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
    <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
    <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
    <Route path="/exams" element={<ProtectedRoute><ExamsPage /></ProtectedRoute>} />
    <Route path="/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
    <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    <Route path="*" element={<div className="rounded-2xl border border-card-border bg-card p-12 text-center"><h1 className="font-display text-4xl">Page not found</h1><Link className="mt-4 inline-block text-accent" to="/">Return to overview</Link></div>} />
  </Routes></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><BrowserRouter><AuthProvider><Router /></AuthProvider></BrowserRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
