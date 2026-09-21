import React, { useEffect } from 'react'
import PortalLoginForm from '@shared/components/auth/PortalLoginForm'
import { setSelectedPortal } from '@shared/auth/portalSession'

/**
 * Student Login — 3D Cinematic Futuristic Auth
 */
export default function StudentLogin() {
  useEffect(() => {
    setSelectedPortal('student')
  }, [])

  return (
    <PortalLoginForm
      portal="student"
      portalLabel="Student Portal"
      icon="🎓"
      accent="#8B5CF6"
      accentLight="#C084FC"
      signupPath="/student/signup"
      cssClass="student-module"
    />
  )
}
