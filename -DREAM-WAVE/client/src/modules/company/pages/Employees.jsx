import CompanyCrudPage from '../components/CompanyCrudPage'
import { companyService } from '../services/api'

export default function Employees() {
  return (
    <CompanyCrudPage
      title="Employees"
      subtitle="Employee directory with teams and attendance overview."
      api={companyService.employees}
      fields={[
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'team', label: 'Team' },
        { key: 'attendancePercent', label: 'Attendance %', type: 'number', default: 0 },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'on-leave', 'terminated'], default: 'active' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'team', label: 'Team' },
        { key: 'attendancePercent', label: 'Attendance' },
        { key: 'status', label: 'Status' },
      ]}
      emptyHint="No employees recorded."
    />
  )
}
