import PortalLoginForm from '@shared/components/auth/PortalLoginForm'

export default function AdminLogin() {
  return (
    <PortalLoginForm
      portal="admin"
      portalLabel="Admin Portal"
      icon="DW"
      accent="#38BDF8"
      accentLight="#BAE6FD"
      cssClass="admin-auth"
    />
  )
}
