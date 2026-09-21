import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useAuth } from '../context/AuthContext'

const cards = [
  { emoji: '🎯', label: 'Goals',    color: '#7c3aed' },
  { emoji: '✅', label: 'Tasks',    color: '#2563eb' },
  { emoji: '🧠', label: 'Mentor',   color: '#db2777' },
  { emoji: '📚', label: 'Books',    color: '#059669' },
  { emoji: '🗺️', label: 'Roadmap', color: '#d97706' },
  { emoji: '👥', label: 'Community',color: '#7c3aed' },
]

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Hero */}
      <View style={s.hero}>
        <Text style={s.greeting}>{greeting} 👋</Text>
        <Text style={s.title}>Welcome to{'\n'}DREAM WAVE AI</Text>
        <Text style={s.sub}>Your personal AI-powered career companion</Text>
      </View>

      {/* Quick access */}
      <Text style={s.sectionTitle}>Quick Access</Text>
      <View style={s.grid}>
        {cards.map(c => (
          <TouchableOpacity key={c.label} style={[s.card, { borderColor: c.color + '40' }]}>
            <Text style={s.cardEmoji}>{c.emoji}</Text>
            <Text style={s.cardLabel}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#030712' },
  hero:         { margin: 20, padding: 20, backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)' },
  greeting:     { color: '#a78bfa', fontSize: 13, marginBottom: 6 },
  title:        { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 32, marginBottom: 8 },
  sub:          { color: '#9ca3af', fontSize: 13 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginHorizontal: 20, marginBottom: 12 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  card:         { width: '44%', margin: '3%', backgroundColor: '#111827', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1 },
  cardEmoji:    { fontSize: 28, marginBottom: 8 },
  cardLabel:    { color: '#d1d5db', fontSize: 13, fontWeight: '600' },
  logoutBtn:    { margin: 20, padding: 14, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center' },
  logoutText:   { color: '#f87171', fontSize: 14, fontWeight: '600' },
})
