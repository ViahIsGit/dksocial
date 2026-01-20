import { useEffect, useMemo, useState } from 'react'
import { collection, db, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from '../firebase/config'
import '@material/web/textfield/filled-text-field.js'
import '@material/web/button/filled-button.js'
import '@material/web/icon/icon.js'
import './PostSignup.css'

function compressImageToBase64(file, maxSize = 512, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else if (height > width && height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        } else if (width === height && width > maxSize) {
          width = maxSize
          height = maxSize
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PostSignup({ details, onProfileUpdated, onLogout }) {
  if (!details?.uid) return null

  const [form, setForm] = useState({
    username: details?.username || details?.fullName || '',
    userHandle: details?.userHandle || '',
    bio: details?.bio || '',
    link: details?.link || ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(details?.avatarBase64 || '')
  const [avatarBase64, setAvatarBase64] = useState(details?.avatarBase64 || '')

  useEffect(() => {
    setForm({
      username: details?.username || details?.fullName || '',
      userHandle: details?.userHandle || '',
      bio: details?.bio || '',
      link: details?.link || ''
    })
    setAvatarPreview(details?.avatarBase64 || '')
    setAvatarBase64(details?.avatarBase64 || '')
  }, [details])

  const cleanHandle = form.userHandle.trim().replace(/^@+/, '').toLowerCase()

  const canSubmit = useMemo(() => {
    return (
      form.username.trim().length >= 3 &&
      cleanHandle.length >= 3 &&
      !loading
    )
  }, [form, cleanHandle, loading])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const base64 = await compressImageToBase64(file)
      setAvatarBase64(base64)
      setAvatarPreview(base64)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    try {
      const handleQuery = query(
        collection(db, 'users'),
        where('userHandle', '==', cleanHandle),
        limit(1)
      )
      const snapshot = await getDocs(handleQuery)
      const handleTaken = !snapshot.empty && snapshot.docs.some((doc) => doc.id !== details?.uid)

      if (handleTaken) {
        setErrors(prev => ({ ...prev, userHandle: 'Handle already taken.' }))
        setLoading(false)
        return
      }

      await setDoc(doc(db, 'users', details.uid), {
        username: form.username.trim(),
        userHandle: cleanHandle,
        bio: form.bio.trim(),
        link: form.link.trim() || null,
        avatarBase64: avatarBase64 || null,
        profileSetupCompleted: true,
        updatedAt: serverTimestamp()
      }, { merge: true })

      onProfileUpdated?.()
    } catch (err) {
      console.error(err)
      setErrors({ form: 'Could not save profile.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="postsignup-page">
      <div className="postsignup-container">
        <header className="postsignup-header">
          <span className="eyebrow">Almost done</span>
          <h1 className="postsignup-title">Set up your profile</h1>
          <p className="postsignup-subtitle">Add a photo and choose your handle to get started.</p>
        </header>

        <form className="postsignup-form" onSubmit={handleSubmit}>
          <div className="avatar-upload-container">
            <label className="avatar-label">
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
              <div className="avatar-preview">
                {avatarPreview ? <img src={avatarPreview} alt="Avatar" /> : <md-icon style={{ fontSize: 40 }}>add_a_photo</md-icon>}
              </div>
              <div className="avatar-icon-overlay">
                <md-icon style={{ fontSize: 18 }}>edit</md-icon>
              </div>
            </label>
          </div>

          <md-filled-text-field
            value={form.username}
            onInput={handleChange('username')}
            label="Display Name"
            required
          >
            <md-icon slot="leading-icon">badge</md-icon>
          </md-filled-text-field>

          <md-filled-text-field
            value={form.userHandle}
            onInput={handleChange('userHandle')}
            label="@Handle"
            supportingText={errors.userHandle}
            error={!!errors.userHandle}
            required
          >
            <md-icon slot="leading-icon">alternate_email</md-icon>
          </md-filled-text-field>

          <md-filled-text-field
            value={form.bio}
            onInput={handleChange('bio')}
            label="Bio (Optional)"
            type="textarea"
            rows={3}
          >
            <md-icon slot="leading-icon">edit_note</md-icon>
          </md-filled-text-field>

          {errors.form && <div className="form-error">{errors.form}</div>}

          <md-filled-button type="submit">
            {loading ? 'Saving...' : 'Complete Setup'}
          </md-filled-button>

          <button type="button" className="ghost-link" onClick={onLogout}>
            Log out
          </button>
        </form>
      </div>
    </div>
  )
}
