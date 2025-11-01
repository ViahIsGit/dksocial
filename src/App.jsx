import { useState } from 'react'
import Header from './components/Header'
import NavigationDrawer from './components/NavigationDrawer'
import BottomNav from './components/BottomNav'
import Feed from './components/Feed'
import './App.css'

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('feed')

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
    // Lógica para ação do FAB
    console.log('FAB clicado!')
    // Exemplo: abrir modal de criar novo vídeo
    alert('Criar novo vídeo!')
  }

  const showHeader = activeTab !== 'feed'

  return (
    <div className={`App ${drawerOpen ? 'drawer-open' : ''} ${!showHeader ? 'no-header' : ''}`}>
      {showHeader && <Header onMenuClick={handleMenuClick} drawerOpen={drawerOpen} />}
      <NavigationDrawer isOpen={drawerOpen} onClose={handleDrawerClose} />
      <div className="app-main">
        <Feed />
      </div>
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        onFABClick={handleFABClick}
      />
    </div>
  )
}

export default App

