import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db, doc, serverTimestamp, setDoc } from '../firebase/config'
import '@material/web/textfield/filled-text-field.js'
import '@material/web/button/filled-button.js'
import '@material/web/icon/icon.js'
import './Register.css'

function getFriendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'Email is already taken.',
    'auth/invalid-email': 'Invalid email format.',
    'auth/weak-password': 'Password should be at least 6 chars.',
  }
  return map[code] || 'Could not create account.'
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordsMatch = form.password.trim() !== '' && form.password === form.confirm

  const canSubmit = useMemo(() => {
    return (
      form.name.trim() !== '' &&
      form.email.trim() !== '' &&
      form.password.trim().length >= 6 &&
      passwordsMatch &&
      !loading
    )
  }, [form, loading, passwordsMatch])

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
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password)
      if (form.name.trim()) {
        await updateProfile(user, { displayName: form.name.trim() })
      }

      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          fullName: form.name.trim(),
          email: form.email.trim(),
          profileSetupCompleted: false,
          createdAt: serverTimestamp()
        },
        { merge: true }
      )
      navigate('/feed')
    } catch (authError) {
      setError(getFriendlyError(authError.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <div className="register-card">
        <header className="register-header">
          <div className="register-icon-circle">
            <md-icon>person_add</md-icon>
          </div>
          <h1 className="register-title">Create Account</h1>
          <p className="register-subtitle">Join DKSocial to connect and share.</p>
        </header>

        <form className="register-form" onSubmit={handleSubmit}>
          <md-filled-text-field
            value={form.name}
            onInput={handleChange('name')}
            label="Full Name"
            required
          >
            <md-icon slot="leading-icon">badge</md-icon>
          </md-filled-text-field>

          <md-filled-text-field
            type="email"
            value={form.email}
            onInput={handleChange('email')}
            label="Email"
            required
          >
            <md-icon slot="leading-icon">mail</md-icon>
          </md-filled-text-field>

          <md-filled-text-field
            type="password"
            value={form.password}
            onInput={handleChange('password')}
            label="Password"
            required
          >
            <md-icon slot="leading-icon">lock</md-icon>
          </md-filled-text-field>

          <md-filled-text-field
            type="password"
            value={form.confirm}
            onInput={handleChange('confirm')}
            label="Confirm Password"
            required
            error={!passwordsMatch && form.confirm.trim() !== ''}
            errorText={!passwordsMatch && form.confirm.trim() !== '' ? "Passwords do not match" : ""}
          >
            <md-icon slot="leading-icon">check_circle</md-icon>
          </md-filled-text-field>

          {error && <div className="form-error">{error}</div>}

          <md-filled-button type="submit">
            {loading ? 'Creating...' : 'Sign Up'}
          </md-filled-button>
        </form>

        <footer className="register-footer">
          Already have an account?
          <button className="login-link" onClick={() => navigate('/login')}>Sign in</button>
        </footer>
      </div>
    </div>
  )
}
