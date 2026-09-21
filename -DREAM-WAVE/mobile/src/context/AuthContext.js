import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authAPI } from '../api/client'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem('dw_token')
      if (!token) { setLoading(false); return }
      try {
        const { data } = await authAPI.me()
        setUser(data.user)
      } catch {
        await AsyncStorage.multiRemove(['dw_token', 'dw_user'])
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const login = async (email, password) => {
    const { data } = await authAPI.login(email, password)
    await AsyncStorage.setItem('dw_token', data.token)
    await AsyncStorage.setItem('dw_user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const signup = async (name, email, password) => {
    const { data } = await authAPI.signup(name, email, password)
    await AsyncStorage.setItem('dw_token', data.token)
    await AsyncStorage.setItem('dw_user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const logout = async () => {
    await AsyncStorage.multiRemove(['dw_token', 'dw_user'])
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
