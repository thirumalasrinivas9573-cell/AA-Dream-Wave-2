import PortalSignupForm from '@shared/components/auth/PortalSignupForm'
import { INSTITUTION_THEME, institutionPath } from '../theme'
import '../styles/institution.css'

export default function InstitutionSignup() {
  const t = INSTITUTION_THEME
  return (
    <PortalSignupForm
      portal="institution"
      portalLabel="Institution"
      icon="🏛️"
      accent={t.accentMid}
      accentLight={t.accentLight}
      loginPath={institutionPath('login')}
      cssClass="institution-module"
    />
  )
}
