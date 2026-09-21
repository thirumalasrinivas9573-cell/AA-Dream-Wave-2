import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import InstitutionLayout from './layouts/InstitutionLayout'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Students = lazy(() => import('./pages/Students'))
const Faculty = lazy(() => import('./pages/Faculty'))
const Departments = lazy(() => import('./pages/Departments'))
const Courses = lazy(() => import('./pages/Courses'))
const Admissions = lazy(() => import('./pages/Admissions'))
const Placements = lazy(() => import('./pages/Placements'))
const Events = lazy(() => import('./pages/Events'))
const News = lazy(() => import('./pages/News'))
const Announcements = lazy(() => import('./pages/Announcements'))
const Promotions = lazy(() => import('./pages/Promotions'))
const Gallery = lazy(() => import('./pages/Gallery'))
const Videos = lazy(() => import('./pages/Videos'))
const Scholarships = lazy(() => import('./pages/Scholarships'))
const Research = lazy(() => import('./pages/Research'))
const Reports = lazy(() => import('./pages/Reports'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))

function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: '#64748B' }}>
      Loading institution portal…
    </div>
  )
}

export default function InstitutionRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route element={<InstitutionLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="students" element={<Students />} />
          <Route path="faculty" element={<Faculty />} />
          <Route path="departments" element={<Departments />} />
          <Route path="courses" element={<Courses />} />
          <Route path="admissions" element={<Admissions />} />
          <Route path="placements" element={<Placements />} />
          <Route path="events" element={<Events />} />
          <Route path="news" element={<News />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="promotions" element={<Promotions />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="videos" element={<Videos />} />
          <Route path="scholarships" element={<Scholarships />} />
          <Route path="research" element={<Research />} />
          <Route path="reports" element={<Reports />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
