import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'

import NavigationDrawer from './components/NavigationDrawer'
import BottomNav from './components/BottomNav'
import Feed from './components/Feed'
import Messages from './components/Messages'
import Camera from './components/Camera'
import Notifications from './pages/Notifications'
import MusicPage from './pages/MusicPage'

import { LayoutProvider, useLayout } from './context/LayoutContext'
import { MessagesProvider } from './context/MessagesContext'
import { ThemeProvider } from './context/ThemeContext'

import PostDetails from './pages/PostDetails'

import SplashScreen from './pages/SplashScreen'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import PostSignup from './pages/PostSignup'
import Download from './pages/Download'
import FAQ from './pages/FAQ'
import Terms from './pages/Terms'

import Profile from './components/Profile'
import EditProfile from './components/EditProfile'
import SettingsPage from './components/SettingsPage'
import CreatePostModal from './components/CreatePostModal'
import YokyChat from './pages/YokyChat'
import Pay from './pages/Pay'

import { auth, db, doc, getDoc, onAuthStateChanged } from './firebase/config'

import './App.css'


/* ===============================
   📦 App Shell
================================ */
function AppShell({ profileData }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { chromeHidden, bottomNavHidden } = useLayout()
  const location = useLocation()
  const navigate = useNavigate()

  const handleMenuClick = () => setDrawerOpen(!drawerOpen)
  const handleDrawerClose = () => setDrawerOpen(false)

  const handleTabChange = (tabId) => {
    if (tabId === 'profile') {
      if (profileData?.userHandle) {
        navigate(`/u/${profileData.userHandle}`)
      } else {
        navigate('/feed')
      }
      return
    }

    const routes = {
      feed: '/feed',
      messages: '/messages',
      camera: '/camera',
      notifications: '/notifications',
      yoky: '/yoky'
    }

    if (routes[tabId]) navigate(routes[tabId])
  }

  const handleFABClick = () => setIsCreateModalOpen(true)

  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/feed' || path === '/dash') return 'feed'
    if (path === '/messages') return 'messages'
    if (path === '/camera') return 'camera'
    if (path === '/yoky') return 'yoky'
    if (path.startsWith('/u')) return 'profile'
    return 'feed'
  }

  return (
    <div className={`App ${drawerOpen ? 'drawer-open' : ''} no-header`}>
      <NavigationDrawer isOpen={drawerOpen} onClose={handleDrawerClose} />

      <div className="app-main">
        <Routes>
          <Route path="/download" element={<Download />} />
          <Route path="/post/:id" element={<PostDetails />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/dash" element={<Feed initialTab="dash" />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/music/:id" element={<MusicPage />} />
          <Route path="/yoky" element={<YokyChat profileData={profileData} />} />
          <Route path="/pay" element={<Pay />} />

          {/* 👇 PERFIL POR HANDLE */}
          <Route
            path="/u/:handle"
            element={
              <Profile
                onMenuClick={handleMenuClick}
                drawerOpen={drawerOpen}
              />
            }
          />

          {/* 👇 EDITAR PERFIL (fixo) */}
          <Route path="/u/edit" element={<EditProfile />} />

          <Route path="/settings" element={<SettingsPage profileData={profileData} />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms" element={<Terms />} />

          {/* ⚠️ SEMPRE POR ÚLTIMO */}
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </div>

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={auth.currentUser}
      />

      {!chromeHidden && !bottomNavHidden && (
        <BottomNav
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          onFABClick={handleFABClick}
          showFab={location.pathname !== '/dash'}
        />
      )}
    </div>
  )
}

/* ===============================
   🔐 Protected Route
================================ */
function ProtectedRoute({ children, profileStatus, profileData, onProfileUpdated, onLogout }) {
  if (profileStatus === 'needs_setup') {
    return (
      <PostSignup
        details={profileData}
        onProfileUpdated={onProfileUpdated}
        onLogout={onLogout}
      />
    )
  }

  if (profileStatus === 'checking') {
    return <SplashScreen />
  }

  return children
}

/* ===============================
   🔑 Auth Routes
================================ */
function AuthRoutes({ setAuthView }) {
  return (
    <Routes>
      <Route path="/login" element={<Login onShowRegister={() => setAuthView('register')} onShowForgot={() => setAuthView('forgot')} />} />
      <Route path="/register" element={<Register onShowLogin={() => setAuthView('login')} onShowForgot={() => setAuthView('forgot')} />} />
      <Route path="/forgot-password" element={<ForgotPassword onShowLogin={() => setAuthView('login')} onShowRegister={() => setAuthView('register')} />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

import { useFcm } from './hooks/useFcm'

/* ===============================
   🚀 App Root
================================ */
import Welcome from './pages/Welcome'

// ... existing imports

/* ===============================
   🚀 App Root
================================ */
export default function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [splashDone, setSplashDone] = useState(false)
  const [authView, setAuthView] = useState('login')
  const [profileStatus, setProfileStatus] = useState('idle')
  const [profileData, setProfileData] = useState(null)

  // State for Welcome Screen
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
    return localStorage.getItem('hasSeenWelcome') === 'true'
  })

  // Initialize FCM
  useFcm(user)

  const loadProfileData = useCallback(async (currentUser) => {
    if (!currentUser) {
      setProfileStatus('idle')
      setProfileData(null)
      return
    }

    setProfileStatus('checking')

    try {
      const ref = doc(db, 'users', currentUser.uid)
      const snapshot = await getDoc(ref)

      if (!snapshot.exists()) {
        setProfileData({
          uid: currentUser.uid,
          email: currentUser.email,
          fullName: currentUser.displayName || ''
        })
        setProfileStatus('needs_setup')
        return
      }

      const data = snapshot.data()
      const isComplete = Boolean(data.profileSetupCompleted && data.username && data.userHandle)

      setProfileData({
        ...data,
        uid: currentUser.uid,
        email: currentUser.email,
        fullName: data.fullName || currentUser.displayName || ''
      })

      setProfileStatus(isComplete ? 'ready' : 'needs_setup')
    } catch (err) {
      console.error('Erro ao carregar perfil', err)
      setProfileStatus('error')
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthReady(true)
      loadProfileData(currentUser)
    })

    return () => unsub()
  }, [loadProfileData])

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  const handleWelcomeComplete = () => {
    setHasSeenWelcome(true)
    localStorage.setItem('hasSeenWelcome', 'true')
  }

  const shouldShowSplash = !authReady || !splashDone

  return (
    <LayoutProvider>
      <ThemeProvider>
        <MessagesProvider>
          <BrowserRouter>
            {shouldShowSplash ? (
              <SplashScreen />
            ) : user ? (
              <ProtectedRoute
                profileStatus={profileStatus}
                profileData={profileData}
                onProfileUpdated={() => loadProfileData(user)}
                onLogout={async () => {
                  const { signOut } = await import('firebase/auth')
                  await signOut(auth)
                }}
              >
                <AppShell profileData={profileData} />
              </ProtectedRoute>
            ) : !hasSeenWelcome ? (
              <Welcome onComplete={handleWelcomeComplete} />
            ) : (
              <AuthRoutes setAuthView={setAuthView} />
            )}
          </BrowserRouter>
        </MessagesProvider>
      </ThemeProvider>
    </LayoutProvider>
  )
}
