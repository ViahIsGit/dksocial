import './EmailDetail.css'

function EmailDetail({ email, onClose }) {
  if (!email) {
    return (
      <div className="email-detail empty">
        <div className="empty-state">
          <md-icon>mail</md-icon>
          <p>Selecione um email para visualizar</p>
        </div>
      </div>
    )
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="email-detail">
      <div className="detail-header">
        <div className="detail-header-top">
          <md-icon-button onClick={onClose} className="detail-close">
            <md-icon>close</md-icon>
          </md-icon-button>
          <div className="detail-actions">
            <md-icon-button>
              <md-icon>archive</md-icon>
            </md-icon-button>
            <md-icon-button>
              <md-icon>delete</md-icon>
            </md-icon-button>
            <md-icon-button>
              <md-icon>mark_email_read</md-icon>
            </md-icon-button>
            <md-icon-button>
              <md-icon>more_vert</md-icon>
            </md-icon-button>
          </div>
        </div>
        <div className="detail-subject">{email.subject}</div>
        <div className="detail-from-info">
          <div className="detail-from-main">
            <div className="detail-avatar">
              <img src={email.avatar} alt={email.from} />
            </div>
            <div className="detail-from-details">
              <div className="detail-from">{email.from}</div>
              <div className="detail-to">Para: eu</div>
            </div>
          </div>
          <div className="detail-date">{formatDate(email.timestamp)}</div>
        </div>
        {email.labels && email.labels.length > 0 && (
          <div className="detail-labels">
            {email.labels.map((label, index) => (
              <span key={index} className="detail-label">{label}</span>
            ))}
          </div>
        )}
      </div>

      <div className="detail-content">
        <div className="detail-body">
          <p>{email.preview}</p>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        </div>
      </div>
    </div>
  )
}

export default EmailDetail

