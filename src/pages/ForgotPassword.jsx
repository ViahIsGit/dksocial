import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase/config'
import '@material/web/textfield/filled-text-field.js'
import '@material/web/button/filled-button.js'
import '@material/web/icon/icon.js'
import './ForgotPassword.css'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => email.trim() !== '' && !loading, [email, loading])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setStatus('idle')
    setError('')

    try {
      await sendPasswordResetEmail(auth, email)
      setStatus('sent')
    } catch (authError) {
      setError('Could not send reset email. Check address.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="recover-page">
      <div className="recover-container">
        <header className="recover-header">
          <div className="recover-icon-circle">
            <md-icon>lock_reset</md-icon>
          </div>
          <h1 className="recover-title">Reset Password</h1>
          <p className="recover-subtitle">Enter your email and we'll send you a link to reset your access.</p>
        </header>

        <form className="recover-form" onSubmit={handleSubmit}>
          {status === 'sent' ? (
            <div className="recover-success">
              <md-icon>check_circle</md-icon>
              <div>
                <strong>Check your email</strong>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>We sent a link to {email}</div>
              </div>
            </div>
          ) : (
            <>
              <md-filled-text-field
                type="email"
                value={email}
                onInput={(e) => setEmail(e.target.value)}
                label="Registered Email"
                required
              >
                <md-icon slot="leading-icon">email</md-icon>
              </md-filled-text-field>

              {error && <div className="form-error">{error}</div>}

              <md-filled-button type="submit" >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </md-filled-button>
            </>
          )}
        </form>

        <footer className="recover-footer">
          <button className="text-link" onClick={() => navigate('/login')}>Back to Login</button>
          <button className="text-link" onClick={() => navigate('/register')}>Create Account</button>
        </footer>
      </div>
    </div>
  )
}
