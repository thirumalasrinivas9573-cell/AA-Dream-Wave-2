import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PublicLayout from './layouts/PublicLayout';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Spinner } from './components/ui/Spinner';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { AuthProvider } from './context/AuthContext';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MentorPage = lazy(() => import('./pages/MentorPage'));
const AIStudioPage = lazy(() => import('./pages/AIStudioPage'));
const LearningPage = lazy(() => import('./pages/LearningPage'));
const ProductivityPage = lazy(() => import('./pages/ProductivityPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const ResumePage = lazy(() => import('./pages/ResumePage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const BooksPage = lazy(() => import('./pages/BooksPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const InstitutionPage = lazy(() => import('./pages/institution/InstitutionPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner label="Loading page" />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/mentor" element={<MentorPage />} />
            <Route path="/ai" element={<AIStudioPage />} />
            <Route path="/learning" element={<LearningPage />} />
            <Route path="/productivity" element={<ProductivityPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/resume" element={<ResumePage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/institution" element={<InstitutionPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute adminOnly />}>
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const applyTheme = useThemeStore((s) => s.applyTheme);

  useEffect(() => {
    applyTheme();
    bootstrap();
  }, [bootstrap, applyTheme]);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-wave-600 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to main content
          </a>
          <Suspense fallback={<PageFallback />}>
            <AnimatedRoutes />
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
