import { useState } from 'react'
import './NavigationDrawer.css'

function NavigationDrawer({ isOpen, onClose }) {
  const [activeItem, setActiveItem] = useState('inbox')

  const menuItems = [
    { id: 'feed', label: 'Feed', icon: 'dynamic_feed' },
    { id: 'messages', label: 'Mensagens', icon: 'mail', badge: '5' },
    { id: 'notifications', label: 'Notificações', icon: 'notifications', badge: '3' },
    { id: 'friends', label: 'Amigos', icon: 'group' },
    { id: 'profile', label: 'Perfil', icon: 'person' },
    { id: 'settings', label: 'Configurações', icon: 'settings' },
    { id: 'logout', label: 'Sair', icon: 'logout' }
  ]

  const handleItemClick = (id) => {
    setActiveItem(id)
    // Em mobile, fechar o drawer ao clicar
    if (window.innerWidth < 960) {
      onClose()
    }
  }

  return (
    <>
      {isOpen && (
        <div 
          className={`drawer-backdrop ${isOpen ? 'visible' : ''}`} 
          onClick={onClose} 
        />
      )}
      <nav className={`navigation-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-compose">
          <md-filled-button>
            <md-icon slot="icon">add</md-icon>
            Nova Postagem
          </md-filled-button>
        </div>

        <div className="drawer-menu">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`menu-item ${activeItem === item.id ? 'active' : ''}`}
              onClick={() => handleItemClick(item.id)}
            >
              <md-icon className="menu-icon">{item.icon}</md-icon>
              <span className="menu-label">{item.label}</span>
              {item.badge && <span className="menu-badge">{item.badge}</span>}
            </div>
          ))}
        </div>

        <div className="drawer-footer">
          <div className="drawer-label">Categorias</div>
          <md-icon-button>
            <md-icon>category</md-icon>
          </md-icon-button>
        </div>
      </nav>
    </>
  )
}

export default NavigationDrawer

