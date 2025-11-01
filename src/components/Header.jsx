import { useState } from 'react'
import './Header.css'

function Header({ onMenuClick, drawerOpen }) {
  const [searchValue, setSearchValue] = useState('')

  return (
    <header className="app-header">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-left">
            <md-icon-button 
              onClick={onMenuClick}
              className="menu-button desktop-menu only-desktop"
              aria-label="Abrir menu de navegação"
              tabIndex={window.innerWidth < 960 ? -1 : 0}
              style={{ display: window.innerWidth < 960 ? 'none' : undefined }}
            >
              <md-icon>{drawerOpen ? 'close' : 'menu'}</md-icon>
            </md-icon-button>
            
            <div className="navbar-logo">
              <md-icon>home</md-icon>
            </div>
          </div>

          <div className="navbar-center">
            <div className="header-search">
              <md-icon className="search-icon">search</md-icon>
              <input
                type="text"
                placeholder="Pesquisar emails"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="search-input"
              />
              {searchValue && (
                <md-icon-button 
                  onClick={() => setSearchValue('')}
                  className="search-clear"
                >
                  <md-icon>close</md-icon>
                </md-icon-button>
              )}
            </div>
          </div>

          <div className="navbar-right">
            <md-icon-button aria-label="Google Apps">
              <md-icon>apps</md-icon>
            </md-icon-button>
            
            <md-icon-button aria-label="Notificações">
              <md-icon>notifications</md-icon>
            </md-icon-button>
            
            <md-icon-button aria-label="Conta">
              <md-icon>account_circle</md-icon>
            </md-icon-button>
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Header

