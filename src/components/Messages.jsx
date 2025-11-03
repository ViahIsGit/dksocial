import { useEffect, useMemo, useState } from 'react'
import { useLayout } from '../context/LayoutContext'
import './Messages.css'

function Messages() {
  const { hideChrome, showChrome } = useLayout()
  const [activeChatId, setActiveChatId] = useState(null)

  useEffect(() => {
    if (activeChatId) {
      hideChrome()
      // Atualiza URL sem dependências de router
      const newUrl = `/chat/${activeChatId}`
      window.history.pushState({}, '', newUrl)
    } else {
      showChrome()
      const newUrl = `/messages`
      window.history.pushState({}, '', newUrl)
    }
    return () => {
      // Ao desmontar, garantir restauração
      showChrome()
    }
  }, [activeChatId, hideChrome, showChrome])

  const chats = useMemo(() => (
    Array.from({ length: 12 }).map((_, i) => ({
      id: `${i + 1}`,
      name: `Contato ${i + 1}`,
      lastMessage: 'Prévia da última mensagem...'
    }))
  ), [])

  const inConversation = !!activeChatId

  return (
    <div className={`messages-page font-google-sans ${inConversation ? 'in-conversation' : ''}`}>
      <div className="messages-container">
        <aside className="messages-sidebar">
          <div className="sidebar-header">
            <h2>Mensagens</h2>
            <md-icon-button aria-label="Nova conversa" className="only-desktop">
              <md-icon>edit</md-icon>
            </md-icon-button>
          </div>

          <div className="sidebar-search">
            <md-icon className="search-icon">search</md-icon>
            <input type="text" placeholder="Buscar conversas" />
            <md-icon-button className="search-clear" aria-label="Limpar">
              <md-icon>close</md-icon>
            </md-icon-button>
          </div>

          <div className="conversations-list">
            {chats.map((c, i) => (
              <button 
                key={c.id} 
                className={`conversation-item ${i === 0 && !activeChatId ? 'active' : ''}`}
                onClick={() => setActiveChatId(c.id)}
              >
                <div className="avatar">
                  <img src="/feed/fizz.png" alt="Avatar" />
                </div>
                <div className="conversation-meta">
                  <div className="row-1">
                    <span className="name">{c.name}</span>
                    <span className="time">{i === 0 ? 'Agora' : `${i}h`}</span>
                  </div>
                  <div className="row-2">
                    <span className="last-message">{c.lastMessage}</span>
                    {i < 3 && <span className="badge">{i + 1}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="messages-chat">
          <div className="chat-header">
            <div className="chat-peer">
              {inConversation && (
                <md-icon-button 
                  aria-label="Voltar" 
                  className="mobile-only"
                  onClick={() => setActiveChatId(null)}
                >
                  <md-icon>arrow_back</md-icon>
                </md-icon-button>
              )}
              <div className="avatar">
                <img src="/feed/logo.png" alt="Avatar" />
              </div>
              <div className="peer-info">
                <h3>{inConversation ? `Contato ${activeChatId}` : 'Selecione uma conversa'}</h3>
                <span className="status">online • digitando...</span>
              </div>
            </div>
            <div className="chat-actions">
              <md-icon-button aria-label="Chamada de voz"><md-icon>call</md-icon></md-icon-button>
              <md-icon-button aria-label="Chamada de vídeo"><md-icon>videocam</md-icon></md-icon-button>
              <md-icon-button aria-label="Mais opções"><md-icon>more_vert</md-icon></md-icon-button>
            </div>
          </div>

          <div className="chat-body">
            <div className="day-separator"><span>Hoje</span></div>

            <div className="message-row you">
              <div className="bubble">
                Oi! Esta é a interface de mensagens. Sem funções ainda ;)
                <span className="meta">10:25</span>
              </div>
            </div>

            <div className="message-row peer">
              <div className="bubble">
                Perfeito! Vamos deixar super responsiva.
                <span className="meta">10:26</span>
              </div>
            </div>

            <div className="message-row you">
              <div className="bubble">
                Envie também imagens, vídeos e emojis quando implementarmos.
                <span className="meta">10:27</span>
              </div>
            </div>
          </div>

          <div className="chat-input">
            <md-icon-button aria-label="Abrir anexos" className="mobile-only">
              <md-icon>add</md-icon>
            </md-icon-button>
            <div className="input-box">
              <md-icon className="prefix">mood</md-icon>
              <input type="text" placeholder="Escreva uma mensagem" disabled />
              <md-icon className="suffix">attach_file</md-icon>
            </div>
            <md-icon-button aria-label="Enviar" disabled>
              <md-icon>send</md-icon>
            </md-icon-button>
          </div>
        </main>

        <aside className="messages-details only-desktop">
          <div className="details-header">
            <h4>Detalhes</h4>
          </div>
          <div className="details-section">
            <div className="section-title">Participantes</div>
            <div className="participant">
              <div className="avatar small">
                <img src="/feed/logo.png" alt="Avatar" />
              </div>
              <div className="participant-info">
                <span className="name">Contato 1</span>
                <span className="handle">@contato1</span>
              </div>
            </div>
          </div>
          <div className="details-section">
            <div className="section-title">Mídias</div>
            <div className="media-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="media-thumb" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Messages


