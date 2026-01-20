import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import '@material/web/textfield/filled-text-field.js'
import '@material/web/button/filled-button.js'
import '@material/web/button/outlined-button.js'
import '@material/web/icon/icon.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/progress/linear-progress.js'
import './Login.css'

function getFriendlyError(code) {
  const map = {
    'auth/invalid-credential': 'Credenciais inválidas.',
    'auth/invalid-email': 'Email inválido.',
    'auth/user-not-found': 'Conta não encontrada.',
    'auth/wrong-password': 'Senha incorreta.',
  }
  return map[code] || 'Erro ao entrar. Tente novamente.'
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Passkey Simulation State
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  useEffect(() => {
    if (location.state?.email) {
      setForm(prev => ({ ...prev, email: location.state.email }))
    }
  }, [location.state])

  const canSubmit = useMemo(
    () => form.email.trim() !== '' && form.password.trim() !== '' && !loading,
    [form, loading]
  )

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')

    try {
      await signInWithEmailAndPassword(auth, form.email, form.password)
      window.localStorage.setItem('logged', 'true')
      navigate('/feed')
    } catch (authError) {
      setError(getFriendlyError(authError.code))
    } finally {
      setLoading(false)
    }
  }

  // Simulated WebAuthn / Passkey flow
  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true);
    // In a real app, strict WebAuthn calls happen here.
    // For now, we simulate the browser interaction and show a helpful message because backend needs setup.
    setTimeout(() => {
      setPasskeyLoading(false);
      const hasPasskey = false; // Toggle this if we actually had it
      if (!hasPasskey) {
        setError("Nenhuma Passkey configurada neste dispositivo.");
      } else {
        // Proceed to login
        navigate('/feed');
      }
    }, 1500);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand / Logo */}
        <div className="brand-logo-container">
          <md-icon>social_distance</md-icon>
        </div>

        <h1 className="login-title">Welcome Back</h1>
        <p className="login-subtitle">Enter your credentials to continue</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <md-filled-text-field
            type="email"
            value={form.email}
            label="Email"
            onInput={handleChange('email')}
            required
            error={!!error}
          >
            <md-icon slot="leading-icon">mail</md-icon>
          </md-filled-text-field>

          <md-filled-text-field
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            label="Password"
            onInput={handleChange('password')}
            required
            error={!!error}
          >
            <md-icon slot="leading-icon">lock</md-icon>
            <md-icon-button slot="trailing-icon" type="button" onClick={() => setShowPassword(!showPassword)}>
              <md-icon>{showPassword ? 'visibility' : 'visibility_off'}</md-icon>
            </md-icon-button>
          </md-filled-text-field>

          <button type="button" className="forgot-link" onClick={() => navigate('/forgot-password')}>
            Forgot Password?
          </button>

          {error && <div style={{ color: 'var(--md-sys-color-error)', fontSize: '0.9rem' }}>{error}</div>}

          <div className="actions-container">
            <md-filled-button type="submit">
              {loading ? 'Signing In...' : 'Sign In'}
            </md-filled-button>
          </div>
        </form>

        <div className="divider-container">
          <div className="divider-line"></div>
          <span>or</span>
          <div className="divider-line"></div>
        </div>

        <md-outlined-button type="button" onClick={handlePasskeyLogin}>
          <md-icon slot="icon">fingerprint</md-icon>
          {passkeyLoading ? 'Verifying...' : 'Sign in with Passkey'}
        </md-outlined-button>

        <footer className="login-footer">
          Don't have an account?
          <button className="create-account-link" onClick={() => navigate('/register')}>Create one</button>
        </footer>
      </div>
    </div>
  )
}
