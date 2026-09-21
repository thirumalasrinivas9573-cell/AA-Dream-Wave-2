import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Change this to your Render backend URL in production
const BASE_URL = 'http://localhost:5001'

const client = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } })

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('dw_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      await AsyncStorage.multiRemove(['dw_token', 'dw_user'])
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  login:  (email, password)       => client.post('/api/auth/login',  { email, password }),
  signup: (name, email, password) => client.post('/api/auth/signup', { name, email, password }),
  me:     ()                      => client.get('/api/auth/me'),
}

export const aiAPI = {
  chat:    (message, session = 'mentor') => client.post('/api/ai/chat',  { message, session }),
  history: (session = 'mentor')          => client.get(`/api/ai/history?session=${session}`),
  agent:   (message, agentType)          => client.post('/api/ai/agent', { message, agentType }),
}

export const goalsAPI = {
  getAll: ()       => client.get('/api/goals'),
  create: (data)   => client.post('/api/goals', data),
  update: (id, d)  => client.put(`/api/goals/${id}`, d),
  remove: (id)     => client.delete(`/api/goals/${id}`),
}

export const tasksAPI = {
  getAll: ()              => client.get('/api/tasks'),
  create: (data)          => client.post('/api/tasks', data),
  toggle: (id, completed) => client.put(`/api/tasks/${id}`, { completed }),
  remove: (id)            => client.delete(`/api/tasks/${id}`),
}

export default client
