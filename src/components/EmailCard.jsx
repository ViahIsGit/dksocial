import { useState } from 'react'
import './EmailCard.css'

function EmailCard({ email, onClick }) {
  const [isSelected, setIsSelected] = useState(false)
  const [isStarred, setIsStarred] = useState(email.starred || false)

  const formatTime = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days === 1) return 'Ontem'
    if (days < 7) return `${days}d`
    const date = new Date(timestamp)
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  }

  const handleStarClick = (e) => {
    e.stopPropagation()
    setIsStarred(!isStarred)
  }

  const handleSelect = (e) => {
    e.stopPropagation()
    setIsSelected(!isSelected)
  }

  return (
    <div 
      className={`email-card ${email.unread ? 'unread' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="email-checkbox" onClick={handleSelect}>
        <md-checkbox checked={isSelected}></md-checkbox>
      </div>
      
      <div className="email-star" onClick={handleStarClick}>
        <md-icon-button>
          <md-icon className={isStarred ? 'starred' : ''}>
            {isStarred ? 'star' : 'star_border'}
          </md-icon>
        </md-icon-button>
      </div>

      <div className="email-avatar">
        <img src={email.avatar} alt={email.from} />
      </div>

      <div className="email-content">
        <div className="email-header">
          <span className="email-from">{email.from}</span>
          <span className="email-time">{formatTime(email.timestamp)}</span>
        </div>
        <div className="email-subject">{email.subject}</div>
        <div className="email-preview">{email.preview}</div>
        {email.attachments && email.attachments > 0 && (
          <div className="email-attachments">
            <md-icon>attach_file</md-icon>
            <span>{email.attachments}</span>
          </div>
        )}
      </div>

      <div className="email-labels">
        {email.labels && email.labels.map((label, index) => (
          <span key={index} className="email-label">{label}</span>
        ))}
      </div>
    </div>
  )
}

export default EmailCard

