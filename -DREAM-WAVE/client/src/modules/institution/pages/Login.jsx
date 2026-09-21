import React, { useEffect } from 'react'
import PortalLoginForm from '@shared/components/auth/PortalLoginForm'
import { setSelectedPortal } from '@shared/auth/portalSession'
import '../styles/institution.css'

/**
 * Institution / College login — Orange box theme on deep blue background.
 */
export default function InstitutionLogin() {
  useEffect(() => {
    setSelectedPortal('institution')
  }, [])

  return (
    <PortalLoginForm
      portal="institution"
      portalLabel="College / Institution Portal"
      icon="🏛️"
      accent="#F97316"
      accentLight="#FB923C"
      signupPath="/institution/signup"
      cssClass="institution-module"
    />
  )
}
