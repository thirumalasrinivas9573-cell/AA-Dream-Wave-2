import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { tasksAPI } from '../api/client'

export default function TasksScreen() {
  const [tasks,   setTasks]   = useState([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    tasksAPI.getAll()
      .then(({ data }) => setTasks(data.tasks || []))
      .finally(() => setLoading(false))
  }, [])

  const add = async () => {
    if (!input.trim()) return
    setSaving(true)
    try {
      const { data } = await tasksAPI.create({ title: input.trim() })
      setTasks(prev => [data.task, ...prev])
      setInput('')
    } finally { setSaving(false) }
  }

  const toggle = async (task) => {
    setTasks(prev => prev.map(t => t._id === task._id ? { ...t, completed: !t.completed } : t))
    await tasksAPI.toggle(task._id, !task.completed)
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#a855f7" /></View>

  return (
    <View style={s.container}>
      <Text style={s.title}>✅ Tasks</Text>
      <View style={s.inputRow}>
        <TextInput style={s.input} value={input} onChangeText={setInput} placeholder="Add a task…" placeholderTextColor="#6b7280" />
        <TouchableOpacity style={s.addBtn} onPress={add} disabled={saving}>
          <Text style={s.addText}>{saving ? '…' : '+'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={tasks}
        keyExtractor={t => t._id}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.task} onPress={() => toggle(item)}>
            <Text style={s.check}>{item.completed ? '✅' : '⬜'}</Text>
            <Text style={[s.taskText, item.completed && s.done]}>{item.title}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.empty}>No tasks yet. Add one above.</Text>}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712', padding: 20, paddingTop: 52 },
  center:    { flex: 1, backgroundColor: '#030712', justifyContent: 'center', alignItems: 'center' },
  title:     { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  inputRow:  { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14 },
  addBtn:    { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  addText:   { color: '#fff', fontSize: 22, fontWeight: '700' },
  task:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  check:     { fontSize: 18 },
  taskText:  { color: '#e5e7eb', fontSize: 14, flex: 1 },
  done:      { textDecorationLine: 'line-through', color: '#6b7280' },
  empty:     { color: '#6b7280', textAlign: 'center', marginTop: 40 },
})
