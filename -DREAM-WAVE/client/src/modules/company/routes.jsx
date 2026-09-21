import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import CompanyLayout from './layouts/CompanyLayout'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Jobs = lazy(() => import('./pages/Jobs'))
const Internships = lazy(() => import('./pages/Internships'))
const Applications = lazy(() => import('./pages/Applications'))
const Candidates = lazy(() => import('./pages/Candidates'))
const Interviews = lazy(() => import('./pages/Interviews'))
const Departments = lazy(() => import('./pages/Departments'))
const Employees = lazy(() => import('./pages/Employees'))
const Projects = lazy(() => import('./pages/Projects'))
const Training = lazy(() => import('./pages/Training'))
const Announcements = lazy(() => import('./pages/Announcements'))
const Events = lazy(() => import('./pages/Events'))
const Gallery = lazy(() => import('./pages/Gallery'))
const Videos = lazy(() => import('./pages/Videos'))
const Followers = lazy(() => import('./pages/Followers'))
const Reports = lazy(() => import('./pages/Reports'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))

function Loader() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: '#94A3B8' }}>Loading company portal…</div>
}

export default function CompanyRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route element={<CompanyLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="internships" element={<Internships />} />
          <Route path="applications" element={<Applications />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="interviews" element={<Interviews />} />
          <Route path="departments" element={<Departments />} />
          <Route path="employees" element={<Employees />} />
          <Route path="projects" element={<Projects />} />
          <Route path="training" element={<Training />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="events" element={<Events />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="videos" element={<Videos />} />
          <Route path="followers" element={<Followers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          {/* Legacy aliases from older nav */}
          <Route path="job-posts" element={<Navigate to="../jobs" replace />} />
          <Route path="recruitment" element={<Navigate to="../applications" replace />} />
          <Route path="promotions" element={<Navigate to="../announcements" replace />} />
          <Route path="hr" element={<Navigate to="../dashboard" replace />} />
          <Route path="screening" element={<Navigate to="../candidates" replace />} />
          <Route path="ranking" element={<Navigate to="../candidates" replace />} />
          <Route path="attendance" element={<Navigate to="../employees" replace />} />
          <Route path="performance" element={<Navigate to="../employees" replace />} />
          <Route path="payroll" element={<Navigate to="../employees" replace />} />
          <Route path="notifications" element={<Navigate to="../dashboard" replace />} />
          <Route path="certificates" element={<Navigate to="../training" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
