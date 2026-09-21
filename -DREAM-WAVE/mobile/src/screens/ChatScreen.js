import React, { useState, useRef, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { aiAPI } from '../api/client'

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Sage, your AI mentor. What's on your mind?" }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }, [messages])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setLoading(true)
    try {
      const { data } = await aiAPI.chat(msg, 'mentor')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please check your connection." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <Text style={s.headerTitle}>🧠 Mentor AI</Text>
        <Text style={s.headerSub}>Sage · Persistent memory</Text>
      </View>

      <ScrollView ref={scrollRef} style={s.messages} contentContainerStyle={{ padding: 16 }}>
        {messages.map((msg, i) => (
          <View key={i} style={[s.bubble, msg.role === 'user' ? s.userBubble : s.aiBubble]}>
            <Text style={[s.bubbleText, msg.role === 'user' ? s.userText : s.aiText]}>
              {msg.content}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={s.aiBubble}>
            <ActivityIndicator size="small" color="#a855f7" />
          </View>
        )}
      </ScrollView>

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your mentor…"
          placeholderTextColor="#6b7280"
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity style={s.sendBtn} onPress={send} disabled={loading || !input.trim()}>
          <Text style={s.sendText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#030712' },
  header:     { padding: 16, paddingTop: 52, backgroundColor: '#111827', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerTitle:{ color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub:  { color: '#6b7280', fontSize: 12, marginTop: 2 },
  messages:   { flex: 1 },
  bubble:     { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
  aiBubble:   { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderTopLeftRadius: 4 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#7c3aed', borderTopRightRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  aiText:     { color: '#e5e7eb' },
  userText:   { color: '#fff' },
  inputRow:   { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#111827', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  input:      { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14 },
  sendBtn:    { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  sendText:   { color: '#fff', fontSize: 20, fontWeight: '700' },
})
