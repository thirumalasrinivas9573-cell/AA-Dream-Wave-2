import { AuthProvider } from '@shared/context/AuthContext'
import { ThemeProvider } from '@shared/context/ThemeContext'
import GamificationProvider from '@shared/components/Gamification'
import AppRouter from './AppRouter'
import { PlatformDataProvider } from '@shared/context/PlatformDataContext'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlatformDataProvider>
          <GamificationProvider>
            <AppRouter />
          </GamificationProvider>
        </PlatformDataProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
