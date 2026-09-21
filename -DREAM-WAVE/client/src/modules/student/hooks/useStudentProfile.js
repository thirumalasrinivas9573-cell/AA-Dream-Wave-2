import { useCallback, useEffect, useState } from 'react'
import { profileApi } from '@shared/services/api'
import profileService from '@shared/services/profileService'

export default function useStudentProfile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await profileService.get()
      setUser(data.user)
      setProfile(data.profile)
      setSummary(data.summary)
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load your profile.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const update = async (payload) => {
    const { data } = await profileApi.update({ ...payload, revision: profile?.revision })
    profileService.invalidate()
    setProfile(data.profile)
    return data.profile
  }

  const addItem = async (section, payload) => {
    const { data } = await profileApi.addItem(section, payload)
    profileService.invalidate()
    setProfile((current) => ({ ...current, [section]: [...(current[section] || []), data.item], revision: data.revision }))
    return data.item
  }

  const updateItem = async (section, itemId, payload) => {
    const { data } = await profileApi.updateItem(section, itemId, payload)
    profileService.invalidate()
    setProfile((current) => ({
      ...current,
      [section]: current[section].map((item) => item._id === itemId ? data.item : item),
      revision: data.revision,
    }))
    return data.item
  }

  const deleteItem = async (section, itemId) => {
    const { data } = await profileApi.deleteItem(section, itemId)
    profileService.invalidate()
    setProfile((current) => ({
      ...current,
      [section]: current[section].filter((item) => item._id !== itemId),
      revision: data.revision,
    }))
  }

  return { user, setUser, profile, setProfile, summary, loading, error, setError, load, update, addItem, updateItem, deleteItem }
}
