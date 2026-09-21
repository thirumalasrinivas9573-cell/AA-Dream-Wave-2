import { AuthProvider } from '@shared/context/AuthContext'
import GamificationProvider from '@shared/components/Gamification'
import AppRouter from './AppRouter'
import { PlatformDataProvider } from '@shared/context/PlatformDataContext'

export default function App() {
  return (
    <AuthProvider>
      <PlatformDataProvider>
        <GamificationProvider>
          <AppRouter />
        </GamificationProvider>
      </PlatformDataProvider>
    </AuthProvider>
  )
}
