import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

const Dashboard     = lazy(() => import('./pages/Dashboard'))
const Goals         = lazy(() => import('./pages/Goals'))
const Roadmap       = lazy(() => import('./pages/Roadmap'))
const Learn         = lazy(() => import('./pages/Learn'))
const Tasks         = lazy(() => import('./pages/Tasks'))
const StudyPlanner  = lazy(() => import('./pages/StudyPlanner'))
const FocusMode     = lazy(() => import('./pages/FocusMode'))
const Mentor        = lazy(() => import('./pages/Mentor'))
const Reports       = lazy(() => import('./pages/Reports'))
const Resume        = lazy(() => import('./pages/Resume'))
const CareerHub     = lazy(() => import('../career/pages/CareerDashboard'))
const JobExplorer   = lazy(() => import('../career/pages/OpportunityExplorer').then((module) => ({ default: module.JobExplorer })))
const InternshipExplorer = lazy(() => import('../career/pages/OpportunityExplorer').then((module) => ({ default: module.InternshipExplorer })))
const ApplicationTracker = lazy(() => import('../career/pages/ApplicationTracker'))
const Books         = lazy(() => import('./pages/Books'))
const Community     = lazy(() => import('./pages/Community'))
const Profile       = lazy(() => import('./pages/Profile'))
const Settings      = lazy(() => import('./pages/Settings'))
const Certificates  = lazy(() => import('./pages/CertificatesPage'))
const Analytics     = lazy(() => import('./pages/AnalyticsPage'))
const IntelligenceHome = lazy(() => import('./pages/IntelligenceHome'))
const DailyLife = lazy(() => import('./pages/DailyLife'))
const PersonalOperating = lazy(() => import('./pages/PersonalOperating'))
const KnowledgeCenter = lazy(() => import('./pages/KnowledgeCenter'))
const AgentWorkspace = lazy(() => import('./pages/AgentWorkspace'))
const WorkflowCenter = lazy(() => import('./pages/WorkflowCenter'))
const MemoryManagement = lazy(() => import('./pages/MemoryManagement'))
const CommandCenter = lazy(() => import('./pages/CommandCenter'))
const ResearchHome = lazy(() => import('./pages/ResearchHome'))
const ResearchWorkspace = lazy(() => import('./pages/ResearchWorkspace'))
const AcademicsHome = lazy(() => import('./pages/AcademicsHome'))
const SubjectWorkspace = lazy(() => import('./pages/SubjectWorkspace'))

function Loader() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div className="spinner spinner-lg" /></div>
}

export default function StudentRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="goals" element={<Goals />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="learn" element={<Learn />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="planner" element={<StudyPlanner />} />
        <Route path="focus" element={<FocusMode />} />
        <Route path="mentor" element={<Mentor />} />
        <Route path="intelligence" element={<IntelligenceHome />} />
        <Route path="daily-life" element={<DailyLife />} />
        <Route path="personal-ai" element={<PersonalOperating />} />
        <Route path="knowledge" element={<KnowledgeCenter />} />
        <Route path="agent" element={<AgentWorkspace />} />
        <Route path="workflows" element={<WorkflowCenter />} />
        <Route path="memory" element={<MemoryManagement />} />
        <Route path="command-center" element={<CommandCenter />} />
        <Route path="research" element={<ResearchHome />} />
        <Route path="research/:id" element={<ResearchWorkspace />} />
        <Route path="academics" element={<AcademicsHome />} />
        <Route path="academics/subjects/:id" element={<SubjectWorkspace />} />
        <Route path="reports" element={<Reports />} />
        <Route path="resume" element={<Resume />} />
        <Route path="career" element={<CareerHub />} />
        <Route path="career/resume" element={<Resume />} />
        <Route path="career/jobs" element={<JobExplorer />} />
        <Route path="career/internships" element={<InternshipExplorer />} />
        <Route path="career/applications" element={<ApplicationTracker />} />
        <Route path="books" element={<Books />} />
        <Route path="community" element={<Community />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
