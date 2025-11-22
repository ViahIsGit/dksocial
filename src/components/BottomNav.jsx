import './BottomNav.css'
import { useMessages } from '../context/MessagesContext'

function BottomNav({ activeTab, onTabChange, onFABClick }) {
  const { totalUnreadCount } = useMessages()

  const tabs = [
    { id: 'feed', label: 'Feed', icon: 'home' },
    { id: 'messages', label: 'Mensagens', icon: 'mail', badge: totalUnreadCount > 0 ? (totalUnreadCount > 99 ? '99+' : totalUnreadCount.toString()) : null },
    { id: 'notifications', label: 'Notificações', icon: 'notifications', badge: '3' },
    { id: 'profile', label: 'Perfil', icon: 'person' }
  ]

  const handleTabClick = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId)
    }
  }

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-items">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            aria-label={tab.label}
          >
            <div className="bottom-nav-icon-container">
              <div className={`bottom-nav-indicator ${activeTab === tab.id ? 'active' : ''}`}></div>
              <md-icon className="bottom-nav-icon">{tab.icon}</md-icon>
              {tab.badge && (
                <span className="bottom-nav-badge">{tab.badge}</span>
              )}
            </div>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* FAB Bottom Right */}
      <div className="bottom-nav-fab-container">
        <md-fab
          className="bottom-nav-fab"
          onClick={onFABClick}
          aria-label="Adicionar novo vídeo"
          label="Novo"
          variant="primary"
        >
          <md-icon slot="icon">add</md-icon>
        </md-fab>
      </div>
    </nav>
  )
}

export default BottomNav

