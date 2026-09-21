import PortalSignupForm from '@shared/components/auth/PortalSignupForm'
import { COMPANY_THEME, companyPath } from '../theme'
import '../styles/company.css'

export default function CompanySignup() {
  const t = COMPANY_THEME
  return (
    <PortalSignupForm
      portal="company"
      portalLabel="Company"
      icon="🏢"
      accent={t.accent}
      accentLight={t.accentLight}
      loginPath={companyPath('login')}
      cssClass="company-module"
    />
  )
}
