import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useAuth } from '../context/AuthContext'

export default function LoginScreen() {
  const { login, signup } = useAuth()
  const [tab,      setTab]      = useState('login')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill all fields'); return }
    setLoading(true)
    try {
      if (tab === 'login') await login(email, password)
      else await signup(name, email, password)
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.logo}>⚡ Dream Wave AI</Text>
      <Text style={s.sub}>Your intelligent growth companion</Text>

      <View style={s.tabs}>
        {['login', 'signup'].map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'login' ? 'Sign In' : 'Sign Up'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'signup' && (
        <TextInput style={s.input} placeholder="Full name" placeholderTextColor="#6b7280"
          value={name} onChangeText={setName} />
      )}
      <TextInput style={s.input} placeholder="Email" placeholderTextColor="#6b7280"
        value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Password" placeholderTextColor="#6b7280"
        value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={s.btn} onPress={submit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>{tab === 'login' ? 'Sign In' : 'Create Account'}</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712', justifyContent: 'center', padding: 24 },
  logo:      { color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  sub:       { color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 32 },
  tabs:      { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab:       { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#7c3aed' },
  tabText:   { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  input:     { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 14, marginBottom: 12 },
  btn:       { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
})
