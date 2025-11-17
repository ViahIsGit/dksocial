import { useCallback, useEffect, useState } from 'react'
import NavigationDrawer from './components/NavigationDrawer'
import BottomNav from './components/BottomNav'
import Feed from './components/Feed'
import Messages from './components/Messages'
import Camera from './components/Camera'
import { LayoutProvider, useLayout } from './context/LayoutContext'
import SplashScreen from './pages/SplashScreen'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import PostSignup from './pages/PostSignup'
import { auth, db, doc, getDoc, onAuthStateChanged } from './firebase/config'
import { signOut } from 'firebase/auth'
import './App.css'

function AppShell({ onLogout }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('feed')
  const { chromeHidden } = useLayout()

  const handleMenuClick = () => {
    setDrawerOpen(!drawerOpen)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    // Lógica para mudar de aba pode ser adicionada aqui
  }

  const handleFABClick = () => {
    setActiveTab('camera')
  }

  return (
    <div className={`App ${drawerOpen ? 'drawer-open' : ''} no-header`}>
      {onLogout && (
        <button className="logout-button" type="button" onClick={onLogout}>
          Sair
        </button>
      )}
      <NavigationDrawer isOpen={drawerOpen} onClose={handleDrawerClose} />
      <div className="app-main">
        {activeTab === 'feed' && <Feed />}
        {activeTab === 'messages' && <Messages />}
        {activeTab === 'camera' && <Camera />}
      </div>
      {!chromeHidden && (
        <BottomNav 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          onFABClick={handleFABClick}
        />
      )}
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [splashDone, setSplashDone] = useState(false)
  const [authView, setAuthView] = useState('login')
  const [profileStatus, setProfileStatus] = useState('idle')
  const [profileData, setProfileData] = useState(null)

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
      setProfileData({
        ...data,
        uid: currentUser.uid,
        email: currentUser.email,
        fullName: data.fullName || currentUser.displayName || ''
      })
      const isComplete = Boolean(data.profileSetupCompleted && data.username && data.userHandle)
      setProfileStatus(isComplete ? 'ready' : 'needs_setup')
    } catch (error) {
      console.error('Erro ao carregar perfil', error)
      setProfileStatus('error')
    }
  }, [db])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthReady(true)
      loadProfileData(currentUser)
    })

    return () => unsubscribe()
  }, [loadProfileData])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSplashDone(true)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
  }

  const shouldShowSplash = !authReady || !splashDone

  const renderAuthView = () => {
    switch (authView) {
      case 'register':
        return (
          <Register
            onShowLogin={() => setAuthView('login')}
            onShowForgot={() => setAuthView('forgot')}
          />
        )
      case 'forgot':
        return (
          <ForgotPassword
            onShowLogin={() => setAuthView('login')}
            onShowRegister={() => setAuthView('register')}
          />
        )
      default:
        return (
          <Login
            onShowRegister={() => setAuthView('register')}
            onShowForgot={() => setAuthView('forgot')}
          />
        )
    }
  }

  return (
    <LayoutProvider>
      {shouldShowSplash ? (
        <SplashScreen />
      ) : user ? (
        profileStatus === 'needs_setup' ? (
          <PostSignup
            details={profileData}
            onProfileUpdated={() => loadProfileData(user)}
            onLogout={handleLogout}
          />
        ) : profileStatus === 'checking' ? (
          <SplashScreen />
        ) : (
          <AppShell onLogout={handleLogout} />
        )
      ) : (
        renderAuthView()
      )}
    </LayoutProvider>
  )
}

