import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '@shared/components/ui'
import { careerApi } from '@shared/services/api'
import StudentLayout from '../../student/layouts/StudentLayout'
import { useCareerDashboard } from '../hooks/useCareerData'
import { ApplicationTimeline, CareerArchitecture, CareerProfileDialog, CareerStats } from '../components/CareerWorkspace'
import '../styles/career.css'

export default function CareerDashboard() {
  const { dashboard, readiness, notifications, loading, error, load } = useCareerDashboard()
  const [profileOpen, setProfileOpen] = useState(false)
  if (loading) return <StudentLayout><div className="career-shell"><LoadingState label="Building your career workspace…" rows={8} /></div></StudentLayout>
  if (error || !dashboard) return <StudentLayout><ErrorState title="Career Hub unavailable" message={error} onRetry={load} /></StudentLayout>
  return (
    <StudentLayout>
      <div className="career-shell">
        <header className="career-hero">
          <div><span>Employment readiness workspace</span><h1>Build your career with evidence.</h1><p>Create strong resumes, discover verified opportunities, track every application, and understand your placement readiness.</p><nav><Link className="btn btn-primary" to="/student/career/resume">{dashboard.defaultResume ? 'Improve resume' : 'Create resume'}</Link><Link className="btn btn-secondary" to="/student/career/jobs">Explore jobs</Link><button type="button" className="btn btn-ghost" onClick={() => setProfileOpen(true)}>Career preferences</button></nav></div>
          <div className="career-progress-ring" style={{ '--progress': `${dashboard.careerProgress}%` }}><strong>{dashboard.careerProgress}%</strong><span>Career progress</span></div>
        </header>
        <CareerStats dashboard={dashboard} />
        <section className="career-actions">
          {[['Resume Builder','Create, edit, preview and export ATS-friendly resumes.','/student/career/resume','R'],['Internships','Discover verified student opportunities.','/student/career/internships','I'],['Jobs','Search open roles by skill, location and work mode.','/student/career/jobs','J'],['Applications','Track every hiring-stage transition.','/student/career/applications','A']].map(([title,detail,to,icon]) => <Link to={to} key={title}><span>{icon}</span><div><h2>{title}</h2><p>{detail}</p></div><i>→</i></Link>)}
        </section>
        <CareerArchitecture readiness={readiness} />
        <div className="career-dashboard-grid">
          <section className="career-panel">
            <header><div><span>Latest movement</span><h2>Applications</h2></div><Link to="/student/career/applications">View all</Link></header>
            {dashboard.applications?.length ? <div className="career-application-preview">{dashboard.applications.slice(0, 3).map((application) => <ApplicationTimeline application={application} key={application._id} />)}</div> : <div className="career-inline-empty"><strong>No applications yet</strong><span>Explore opportunities and submit your first application.</span><Link to="/student/career/jobs">Find jobs</Link></div>}
          </section>
          <section className="career-panel career-notifications">
            <header><div><span>Career alerts</span><h2>Notifications</h2></div><strong>{notifications.filter((item) => !item.read).length} unread</strong></header>
            {notifications.length ? <ul>{notifications.slice(0, 8).map((item) => <li key={item._id} className={!item.read ? 'is-unread' : ''}><i /><div><strong>{item.title}</strong><p>{item.body}</p><time>{new Date(item.createdAt).toLocaleString()}</time></div></li>)}</ul> : <div className="career-inline-empty"><strong>No career alerts</strong><span>New jobs, internships, deadlines and application changes will appear here.</span></div>}
          </section>
        </div>
      </div>
      {profileOpen && <CareerProfileDialog profile={dashboard.profile} onClose={() => setProfileOpen(false)} onSave={async (payload) => { await careerApi.updateProfile({ ...payload, revision: dashboard.profile.revision }); await load() }} />}
    </StudentLayout>
  )
}
