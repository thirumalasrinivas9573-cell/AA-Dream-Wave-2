import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { goalsAPI } from '../api/client'

export default function GoalsScreen() {
  const [goals,   setGoals]   = useState([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    goalsAPI.getAll()
      .then(({ data }) => setGoals(data.goals || []))
      .finally(() => setLoading(false))
  }, [])

  const add = async () => {
    if (!input.trim()) return
    setSaving(true)
    try {
      const { data } = await goalsAPI.create({ title: input.trim() })
      setGoals(prev => [data.goal, ...prev])
      setInput('')
    } finally { setSaving(false) }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#a855f7" /></View>

  return (
    <View style={s.container}>
      <Text style={s.title}>🎯 Goals</Text>
      <View style={s.inputRow}>
        <TextInput style={s.input} value={input} onChangeText={setInput} placeholder="Add a goal…" placeholderTextColor="#6b7280" />
        <TouchableOpacity style={s.addBtn} onPress={add} disabled={saving}>
          <Text style={s.addText}>{saving ? '…' : '+'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={goals}
        keyExtractor={g => g._id}
        renderItem={({ item }) => (
          <View style={s.goal}>
            <Text style={s.goalTitle}>{item.title}</Text>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${item.progress || 0}%` }]} />
            </View>
            <Text style={s.progressText}>{item.progress || 0}% · {item.category}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>No goals yet. Add one above.</Text>}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#030712', padding: 20, paddingTop: 52 },
  center:       { flex: 1, backgroundColor: '#030712', justifyContent: 'center', alignItems: 'center' },
  title:        { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  inputRow:     { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input:        { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14 },
  addBtn:       { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  addText:      { color: '#fff', fontSize: 22, fontWeight: '700' },
  goal:         { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  goalTitle:    { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  progressBar:  { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#7c3aed', borderRadius: 2 },
  progressText: { color: '#6b7280', fontSize: 11 },
  empty:        { color: '#6b7280', textAlign: 'center', marginTop: 40 },
})
