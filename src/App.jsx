import { useState } from 'react'
import Header from './components/Header'
import NavigationDrawer from './components/NavigationDrawer'
import BottomNav from './components/BottomNav'
import Feed from './components/Feed'
import Messages from './components/Messages'
import Camera from './components/Camera'
import { LayoutProvider, useLayout } from './context/LayoutContext'
import './App.css'

function AppShell() {
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

  const showHeader = !chromeHidden && activeTab !== 'feed'

  return (
    <div className={`App ${drawerOpen ? 'drawer-open' : ''} ${!showHeader ? 'no-header' : ''}`}>
      {showHeader && <Header onMenuClick={handleMenuClick} drawerOpen={drawerOpen} activeTab={activeTab} />} 
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
  return (
    <LayoutProvider>
      <AppShell />
    </LayoutProvider>
  )
}

