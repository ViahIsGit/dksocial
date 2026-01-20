import { useState, useRef } from 'react'
import { db, collection, addDoc, serverTimestamp, storage } from '../firebase/config'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import './CreatePostModal.css'
import '@material/web/icon/icon.js'
import '@material/web/progress/circular-progress.js'
import '@material/web/textfield/filled-text-field.js'

export default function CreatePostModal({ isOpen, onClose, currentUser, onPostCreated }) {
    const [text, setText] = useState('')
    const [mediaFile, setMediaFile] = useState(null)
    const [mediaPreview, setMediaPreview] = useState(null)
    const [mediaType, setMediaType] = useState(null) // 'image' | 'video'

    // Poll State
    const [isPollMode, setIsPollMode] = useState(false)
    const [pollOptions, setPollOptions] = useState(['', ''])

    // Location State
    const [location, setLocation] = useState(null)
    const [locationName, setLocationName] = useState('')
    const [showLocationInput, setShowLocationInput] = useState(false)
    const [locationLoading, setLocationLoading] = useState(false)
    const [locationSuggestions, setLocationSuggestions] = useState([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const searchTimeoutRef = useRef(null)

    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef(null)
    const textareaRef = useRef(null)

    if (!isOpen) return null

    // --- Text Formatting ---
    const insertFormat = (tag) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = text.substring(start, end)
        const before = text.substring(0, start)
        const after = text.substring(end)

        const newText = `${before}${tag}${selectedText}${tag}${after}`
        setText(newText)

        // Restore focus and selection
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + tag.length, end + tag.length)
        }, 0)
    }

    // --- Media Logic ---
    const handleMediaSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const fileType = file.type.split('/')[0]
        if (fileType !== 'image' && fileType !== 'video') return

        setIsPollMode(false) // Disable poll if media is added
        setMediaFile(file)
        setMediaType(fileType)
        setMediaPreview(URL.createObjectURL(file))
    }

    const clearMedia = () => {
        setMediaFile(null)
        setMediaPreview(null)
        setMediaType(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // --- Poll Logic ---
    const togglePoll = () => {
        if (mediaFile) return // Can't have media and poll together for now
        setIsPollMode(!isPollMode)
    }

    const handleOptionChange = (index, value) => {
        const newOptions = [...pollOptions]
        newOptions[index] = value
        setPollOptions(newOptions)
    }

    const addOption = () => {
        if (pollOptions.length < 4) setPollOptions([...pollOptions, ''])
    }

    const removeOption = (index) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, i) => i !== index))
        }
    }

    // --- Location Logic ---
    const toggleLocationMode = () => {
        if (location || showLocationInput) {
            setLocation(null)
            setShowLocationInput(false)
            setLocationName('')
            setLocationSuggestions([])
        } else {
            setShowLocationInput(true)
        }
    }

    const handleLocationInput = (e) => {
        const value = e.target.value
        setLocationName(value)

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

        if (!value.trim()) {
            setLocationSuggestions([])
            setShowSuggestions(false)
            return
        }

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}`)
                const data = await res.json()
                setLocationSuggestions(data.slice(0, 5)) // Limit to 5
                setShowSuggestions(true)
            } catch (err) {
                console.error("Autosuggest error:", err)
            }
        }, 500)
    }

    const selectLocation = (item) => {
        setLocationName(item.display_name.split(',')[0]) // Keep it short visually if possible, or full name
        setLocation({
            name: item.display_name,
            lat: item.lat,
            lng: item.lon
        })
        setShowSuggestions(false)
    }

    const handleGpsClick = () => {
        setLocationLoading(true)
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.")
            setLocationLoading(false)
            return
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                const data = await response.json()

                const city = data.address.city || data.address.town || data.address.village || data.address.state
                const country = data.address.country
                const formattedName = `${city}, ${country}`

                setLocationName(formattedName)
                setLocation({
                    name: formattedName,
                    lat: latitude,
                    lng: longitude
                })
            } catch (error) {
                console.error("Location error:", error)
                alert("Could not fetch location details.")
            } finally {
                setLocationLoading(false)
            }
        }, (error) => {
            console.error(error)
            setLocationLoading(false)
            let msg = "Could not access location."
            if (error.code === 1) msg = "Location permission denied."
            if (error.code === 2) msg = "Position unavailable. Check your network/GPS."
            if (error.code === 3) msg = "Location request timed out."
            alert(msg)
        }, { timeout: 10000 })
    }

    // --- Submit ---
    const handlePost = async () => {
        if ((!text.trim() && !mediaFile && !isPollMode) || !currentUser) return

        // Validation for Poll
        if (isPollMode) {
            const validOptions = pollOptions.filter(o => o.trim().length > 0)
            if (validOptions.length < 2) {
                alert("Please add at least 2 poll options.")
                return
            }
        }

        setLoading(true)
        try {
            let mediaUrl = null
            let finalMediaType = null

            if (mediaFile) {
                const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${mediaFile.name}`)
                const snapshot = await uploadBytes(storageRef, mediaFile)
                mediaUrl = await getDownloadURL(snapshot.ref)
                finalMediaType = mediaType
            }

            // Construct Location Object
            let finalLocation = null
            if (location) {
                finalLocation = location
            } else if (locationName.trim()) {
                // Fallback if they just typed something but didn't pick from list/GPS
                finalLocation = {
                    name: locationName.trim(),
                    lat: null,
                    lng: null
                }
            }

            const postData = {
                text: text,
                userId: currentUser.uid,
                createdAt: serverTimestamp(),
                likes: [],
                comments: 0,
                mediaUrl,
                mediaType: finalMediaType,
                location: finalLocation
            }

            if (isPollMode) {
                postData.type = 'poll'
                postData.pollOptions = pollOptions.filter(o => o.trim()).map((opt, i) => ({
                    id: i,
                    text: opt,
                    votes: [] // array of userIds
                }))
            }

            await addDoc(collection(db, 'posts'), postData)

            setText('')
            clearMedia()
            setLocation(null)
            setLocationName('')
            setShowLocationInput(false)
            setIsPollMode(false)
            setPollOptions(['', ''])
            if (onClose) onClose()
            if (onPostCreated) onPostCreated()
        } catch (e) {
            console.error(e)
            alert('Error creating post')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="create-post-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="create-post-modal">
                <div className="modal-header">
                    <button className="close-btn" onClick={onClose} title="Close">
                        <md-icon>close</md-icon>
                    </button>
                    <button
                        className="post-action-btn"
                        onClick={handlePost}
                        disabled={loading || (!text.trim() && !mediaFile && !isPollMode)}
                    >
                        {loading ? <md-circular-progress indeterminate style={{ width: 20, height: 20 }}></md-circular-progress> : 'Post'}
                        {!loading && <md-icon>send</md-icon>}
                    </button>
                </div>

                <div className="modal-body">
                    <div className="user-avatar-area">
                        <img
                            src={currentUser?.photoURL || currentUser?.avatarBase64 || 'https://via.placeholder.com/150'}
                            className="modal-avatar"
                            alt="avatar"
                            onError={(e) => { e.target.style.display = 'none' }}
                        />
                        {/* Fallback Icon */}
                        {(!currentUser?.photoURL && !currentUser?.avatarBase64) &&
                            <div className="modal-avatar-fallback">
                                <md-icon>person</md-icon>
                            </div>
                        }
                    </div>

                    <div className="modal-content-area">
                        {/* Formatting Toolbar */}
                        <div className="format-toolbar">
                            <button className="format-btn" onClick={() => insertFormat('**')} title="Bold"><strong>B</strong></button>
                            <button className="format-btn" onClick={() => insertFormat('_')} title="Italic"><em>I</em></button>
                        </div>

                        <textarea
                            ref={textareaRef}
                            className="post-textarea"
                            placeholder={isPollMode ? "Ask a question..." : "What's happening?"}
                            autoFocus
                            value={text}
                            onChange={e => setText(e.target.value)}
                        />

                        {/* Media Preview */}
                        {mediaPreview && (
                            <div className="media-preview-container">
                                {mediaType === 'video' ? <video src={mediaPreview} controls className="media-preview-video" /> : <img src={mediaPreview} alt="preview" className="media-preview-image" />}
                                <button className="remove-media-btn" onClick={clearMedia}><md-icon>close</md-icon></button>
                            </div>
                        )}

                        {/* Poll Creator */}
                        {isPollMode && (
                            <div className="poll-creator">
                                {pollOptions.map((opt, index) => (
                                    <div key={index} className="poll-option-row">
                                        <md-filled-text-field
                                            placeholder={`Option ${index + 1}`}
                                            value={opt}
                                            onInput={(e) => handleOptionChange(index, e.target.value)}
                                            style={{ width: '100%' }}
                                        ></md-filled-text-field>
                                        {pollOptions.length > 2 && (
                                            <button className="remove-option-btn" onClick={() => removeOption(index)}>
                                                <md-icon>close</md-icon>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {pollOptions.length < 4 && (
                                    <button className="add-option-btn" onClick={addOption}>
                                        <md-icon>add</md-icon> Add Option
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Location Input with Suggestions */}
                        {showLocationInput && (
                            <div className="location-wrapper" style={{ position: 'relative' }}>
                                <div className="location-input-container">
                                    <md-filled-text-field
                                        placeholder="Search location"
                                        value={locationName}
                                        onInput={handleLocationInput}
                                        style={{ flex: 1 }}
                                    >
                                        <md-icon slot="leading-icon">location_on</md-icon>
                                    </md-filled-text-field>
                                    <button className="gps-btn" onClick={handleGpsClick} title="Use my current location">
                                        {locationLoading ? <md-circular-progress indeterminate style={{ width: 20, height: 20 }}></md-circular-progress> : <md-icon>my_location</md-icon>}
                                    </button>
                                </div>
                                {showSuggestions && locationSuggestions.length > 0 && (
                                    <div className="location-suggestions">
                                        {locationSuggestions.map((item, i) => (
                                            <div key={i} className="suggestion-item" onClick={() => selectLocation(item)}>
                                                {item.display_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="media-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Media"
                        disabled={isPollMode}
                        style={{ opacity: isPollMode ? 0.3 : 1 }}
                    >
                        <md-icon>perm_media</md-icon>
                        <input type="file" ref={fileInputRef} accept="image/*,video/*" onChange={handleMediaSelect} />
                    </button>

                    <button
                        className={`media-btn ${isPollMode ? 'active' : ''}`}
                        onClick={togglePoll}
                        title="Poll"
                        disabled={!!mediaFile}
                        style={{ opacity: mediaFile ? 0.3 : 1 }}
                    >
                        <md-icon>poll</md-icon>
                    </button>

                    <button
                        className={`media-btn ${showLocationInput ? 'active' : ''}`}
                        onClick={toggleLocationMode}
                        title="Location"
                    >
                        <md-icon>location_on</md-icon>
                    </button>
                </div>
            </div>
        </div>
    )
}
