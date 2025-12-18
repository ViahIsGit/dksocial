import './BottomNav.css'
import { useMessages } from '../context/MessagesContext'
import '@material/web/icon/icon.js'
import '@material/web/fab/fab.js'

function BottomNav({ activeTab, onTabChange, onFABClick }) {
  const { totalUnreadCount } = useMessages()

  const tabs = [
    { id: 'feed', label: 'Feed', icon: 'inbox' },
    {
      id: 'messages',
      label: 'Mensagens',
      icon: 'mail',
      badge:
        totalUnreadCount > 0
          ? totalUnreadCount > 99
            ? '99+'
            : totalUnreadCount.toString()
          : null
    },
    { id: 'notifications', label: 'Notificações', icon: 'notifications', badge: '3' },
    { id: 'profile', label: 'Perfil', icon: 'person' }
  ]

  const handleTabClick = (tabId) => {
    onTabChange?.(tabId)
  }

  return (
    <div className="bottom-nav-wrapper">
      <nav className="bottom-nav" role="navigation" aria-label="Barra inferior">
        <div className="bottom-nav-items">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
              aria-label={tab.label}
              type="button"
            >
              {/* indicador pequeno redondo atrás do ícone (aparece só quando ativo) */}
              <div className={`bottom-nav-indicator ${activeTab === tab.id ? 'active' : ''}`} />
              <md-icon className="bottom-nav-icon" aria-hidden="true">{tab.icon}</md-icon>

              {tab.badge && (
                <span className="bottom-nav-badge" aria-hidden="true">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* FAB quadrado arredondado ao lado */}
      <md-fab
        class="bottom-nav-fab"
        aria-label="Criar"
        onClick={onFABClick}
      >
        <md-icon slot="icon">add</md-icon>
      </md-fab>
    </div>
  )
}

export default BottomNav



