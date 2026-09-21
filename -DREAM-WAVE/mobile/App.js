import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Text } from 'react-native'

import { AuthProvider, useAuth } from './src/context/AuthContext'
import LoginScreen    from './src/screens/LoginScreen'
import DashboardScreen from './src/screens/DashboardScreen'
import ChatScreen     from './src/screens/ChatScreen'
import TasksScreen    from './src/screens/TasksScreen'
import GoalsScreen    from './src/screens/GoalsScreen'

const Stack = createStackNavigator()
const Tab   = createBottomTabNavigator()

const tabIcon = (name) => ({ color, size }) => <Text style={{ color, fontSize: size - 4 }}>{name}</Text>

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#111827', borderTopColor: 'rgba(255,255,255,0.05)' },
      tabBarActiveTintColor: '#a855f7',
      tabBarInactiveTintColor: '#6b7280',
    }}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: tabIcon('🏠') }} />
    <Tab.Screen name="Goals"     component={GoalsScreen}     options={{ tabBarIcon: tabIcon('🎯') }} />
    <Tab.Screen name="Tasks"     component={TasksScreen}     options={{ tabBarIcon: tabIcon('✅') }} />
    <Tab.Screen name="Chat"      component={ChatScreen}      options={{ tabBarIcon: tabIcon('🧠') }} />
  </Tab.Navigator>
)

const RootNavigator = () => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated
        ? <Stack.Screen name="Main" component={MainTabs} />
        : <Stack.Screen name="Login" component={LoginScreen} />
      }
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
