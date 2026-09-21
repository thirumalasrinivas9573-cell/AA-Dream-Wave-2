import { useEffect, useState } from 'react'
import { institutionService } from '../services/api'

/** Ensures institution profile exists after login. */
export function useInstitutionBootstrap(user) {
  const [institution, setInstitution] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    institutionService.bootstrap({ name: user?.organizationName })
      .then((r) => { if (!cancelled) setInstitution(r.data.institution) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReady(true) })
    return () => { cancelled = true }
  }, [user?.organizationName, user?._id])

  return { institution, ready }
}
