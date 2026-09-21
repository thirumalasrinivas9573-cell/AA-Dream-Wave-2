import React, { useEffect } from 'react'
import PortalLoginForm from '@shared/components/auth/PortalLoginForm'
import { setSelectedPortal } from '@shared/auth/portalSession'
import '../styles/company.css'

/**
 * Company login — Orange box theme on deep blue background.
 */
export default function CompanyLogin() {
  useEffect(() => {
    setSelectedPortal('company')
  }, [])

  return (
    <PortalLoginForm
      portal="company"
      portalLabel="Company & Recruiter Portal"
      icon="🏢"
      accent="#F97316"
      accentLight="#FB923C"
      signupPath="/company/signup"
      cssClass="company-module"
    />
  )
}
