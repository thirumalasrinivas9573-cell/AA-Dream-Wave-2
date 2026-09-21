/**
 * Dream Wave — application router (redesigned).
 *
 * 1. Auth pages: eager imports, never blocked by auth loading.
 * 2. Guest redirect: side-effect after login UI mounts (AuthOutlet).
 * 3. Portals: /student/* /institution/* /company/* with PrivateRoute.
 */
import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation, useParams, Outlet } from 'react-router-dom'
import { useAuth } from '@shared/context/AuthContext'
import { PORTAL_DASHBOARD } from '@shared/auth/portalSession'
import Landing from '@shared/pages/Landing'
import StatusPage from '@shared/pages/StatusPage'

import StudentLogin from './modules/student/pages/Login'
import StudentSignup from './modules/student/pages/Signup'
import InstitutionLogin from './modules/institution/pages/Login'
import InstitutionSignup from './modules/institution/pages/Signup'
import CompanyLogin from './modules/company/pages/Login'
import CompanySignup from './modules/company/pages/Signup'
import AdminLogin from './modules/admin/pages/AdminLogin'

import StudentRoutes from './modules/student/routes'
import InstitutionRoutes from './modules/institution/routes'
import CompanyRoutes from './modules/company/routes'

const DiscoveryPage = lazy(() => import('./modules/discovery/pages/DiscoveryPage'))
const PromotionDetail = lazy(() => import('./modules/discovery/pages/PromotionDetail'))
const NotificationsPage = lazy(() => import('./modules/discovery/pages/NotificationsPage'))
const InstitutionsDirectory = lazy(() => import('./modules/institutions/pages/Directory'))
const InstitutionsCompare = lazy(() => import('./modules/institutions/pages/Compare'))
const InstitutionPublicProfile = lazy(() => import('./modules/institutions/pages/PublicProfile'))
const CompaniesDirectory = lazy(() => import('./modules/companies/pages/Directory'))
const CompaniesCompare = lazy(() => import('./modules/companies/pages/Compare'))
const CompanyPublicProfile = lazy(() => import('./modules/companies/pages/PublicProfile'))
const CompanyJobDetail = lazy(() => import('./modules/companies/pages/JobDetail'))
const CompanyInternshipDetail = lazy(() => import('./modules/companies/pages/InternshipDetail'))
const SearchPage = lazy(() => import('./modules/search/pages/SearchPage'))
const LibraryHome = lazy(() => import('./modules/digital-library/pages/LibraryHome'))
const LibrarySearch = lazy(() => import('./modules/digital-library/pages/LibrarySearch'))
const BookDetail = lazy(() => import('./modules/digital-library/pages/BookDetail'))
const CollectionDetail = lazy(() => import('./modules/digital-library/pages/CollectionDetail'))
const OrgLibraryDesk = lazy(() => import('./modules/digital-library/pages/OrgLibraryDesk'))
const PdfReader = lazy(() => import('./modules/digital-library/pages/PdfReader'))
const StudentPublicPortfolio = lazy(() => import('./modules/student/pages/PublicPortfolio'))
const AdminDashboard = lazy(() => import('./modules/admin/pages/AdminDashboard'))

function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader__content">
        <div className="spinner spinner-lg" />
        <span>Loading Dream Wave…</span>
      </div>
    </div>
  )
}

function PrivateRoute({ children, module, roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />

  if (!user) {
    return <Navigate to={`/${module}/login`} replace state={{ from: location }} />
  }

  // Require an explicit role — never coerce missing role to "student"
  if (!user.role) {
    return <Navigate to="/403" replace state={{ from: location, message: 'This account has no assigned portal role.' }} />
  }

  if (roles?.length && !roles.includes(user.role)) {
    return <Navigate to="/403" replace state={{ from: location }} />
  }
  return children
}

/** Redirect only when the signed-in role matches this login portal. */
function AuthOutlet() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading || !user?.role) return <Outlet />

  const portal = location.pathname.split('/')[1]
  if (portal === user.role && PORTAL_DASHBOARD[user.role]) {
    return <Navigate to={PORTAL_DASHBOARD[user.role]} replace />
  }

  return <Outlet />
}

function LegacyStudentRedirect({ to }) {
  const location = useLocation()
  return <Navigate to={`${to}${location.search || ''}`} replace />
}

function LegacyInstitutionRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/institutions/${slug}`} replace />
}

function LegacyCompanyRedirect() {
  const { slug } = useParams()
  return <Navigate to={`/companies/${slug}`} replace />
}

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Auth — eager, ungated, never behind PrivateRoute or loading spinner */}
        <Route element={<AuthOutlet />}>
          <Route path="student/login" element={<StudentLogin />} />
          <Route path="student/signup" element={<StudentSignup />} />
          <Route path="institution/login" element={<InstitutionLogin />} />
          <Route path="institution/signup" element={<InstitutionSignup />} />
          <Route path="company/login" element={<CompanyLogin />} />
          <Route path="company/signup" element={<CompanySignup />} />
          <Route path="admin/login" element={<AdminLogin />} />
        </Route>

        {/* Protected portals — splat keeps module route trees working */}
        <Route
          path="student/*"
          element={(
            <PrivateRoute module="student" roles={['student']}>
              <StudentRoutes />
            </PrivateRoute>
          )}
        />
        <Route
          path="institution/*"
          element={(
            <PrivateRoute module="institution" roles={['institution']}>
              <InstitutionRoutes />
            </PrivateRoute>
          )}
        />
        <Route
          path="company/*"
          element={(
            <PrivateRoute module="company" roles={['company']}>
              <CompanyRoutes />
            </PrivateRoute>
          )}
        />

        <Route path="discover" element={<DiscoveryPage />} />
        <Route path="discover/:id" element={<PromotionDetail />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="institutions" element={<InstitutionsDirectory />} />
        <Route path="institutions/compare" element={<InstitutionsCompare />} />
        <Route path="institutions/:slug" element={<InstitutionPublicProfile />} />
        <Route path="companies" element={<CompaniesDirectory />} />
        <Route path="companies/compare" element={<CompaniesCompare />} />
        <Route path="companies/jobs/:jobId" element={<CompanyJobDetail />} />
        <Route path="companies/internships/:internshipId" element={<CompanyInternshipDetail />} />
        <Route path="companies/:slug" element={<CompanyPublicProfile />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="library" element={<LibraryHome />} />
        <Route path="library/search" element={<LibrarySearch />} />
        <Route path="library/org" element={<OrgLibraryDesk />} />
        <Route path="library/collections/:id" element={<CollectionDetail />} />
        <Route path="library/books/:id" element={<BookDetail />} />
        <Route path="library/read/:id" element={<PdfReader />} />
        <Route path="students/:username" element={<StudentPublicPortfolio />} />
        <Route path="i/:slug" element={<LegacyInstitutionRedirect />} />
        <Route path="c/:slug" element={<LegacyCompanyRedirect />} />
        <Route
          path="admin"
          element={(
            <PrivateRoute module="admin" roles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          )}
        />
        <Route path="401" element={<StatusPage status={401} />} />
        <Route path="403" element={<StatusPage status={403} />} />
        <Route path="500" element={<StatusPage status={500} />} />

        <Route path="college/login" element={<Navigate to="/institution/login" replace />} />
        <Route path="college/*" element={<Navigate to="/institution/dashboard" replace />} />
        <Route path="login" element={<Landing />} />
        <Route path="signup" element={<Navigate to="/student/signup" replace />} />
        <Route path="dashboard" element={<LegacyStudentRedirect to="/student/dashboard" />} />
        <Route path="goals" element={<LegacyStudentRedirect to="/student/goals" />} />
        <Route path="roadmap" element={<LegacyStudentRedirect to="/student/roadmap" />} />
        <Route path="learn" element={<LegacyStudentRedirect to="/student/learn" />} />
        <Route path="tasks" element={<LegacyStudentRedirect to="/student/tasks" />} />
        <Route path="mentor" element={<LegacyStudentRedirect to="/student/mentor" />} />
        <Route path="reports" element={<LegacyStudentRedirect to="/student/reports" />} />
        <Route path="resume" element={<LegacyStudentRedirect to="/student/resume" />} />
        <Route path="books" element={<LegacyStudentRedirect to="/student/books" />} />
        <Route path="community" element={<LegacyStudentRedirect to="/student/community" />} />
        <Route path="profile" element={<LegacyStudentRedirect to="/student/profile" />} />
        <Route path="settings" element={<LegacyStudentRedirect to="/student/settings" />} />
        <Route path="certificates" element={<LegacyStudentRedirect to="/student/certificates" />} />
        <Route path="analytics" element={<LegacyStudentRedirect to="/student/analytics" />} />

        <Route path="*" element={<StatusPage status={404} />} />
      </Routes>
    </Suspense>
  )
}
