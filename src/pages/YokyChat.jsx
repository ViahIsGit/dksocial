import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase/config'
import {
    sendMessageToGroq,
    createSession,
    getSessions,
    getSessionMessages,
    saveMessageToSession,
    deleteSession
} from '../services/yoky'
import { useLayout } from '../context/LayoutContext'
import { useTheme } from '../context/ThemeContext'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import './YokyChat.css'

// Material Web Imports
import '@material/web/button/filled-button.js'
import '@material/web/button/filled-tonal-button.js'
import '@material/web/iconbutton/icon-button.js'
import '@material/web/textfield/filled-text-field.js'
import '@material/web/icon/icon.js'
import '@material/web/list/list.js'
import '@material/web/list/list-item.js'
import '@material/web/progress/circular-progress.js'

// 🎭 Personalities
const PERSONALITIES = {
    helpful: {
        id: 'helpful',
        name: 'Yoky',
        sub: 'AI Assistant',
        icon: 'sparkle',
        prompt: 'You are Yoky, a helpful, friendly, and knowledgeable AI assistant. Be concise and elegant in your responses. Use Markdown for formatting.'
    },
    coder: {
        id: 'coder',
        name: 'Dev Mode',
        sub: 'Code Expert',
        icon: 'terminal',
        prompt: 'You are Dev Yoky, an expert software engineer. Provide concise code and technical explanations. Always use code blocks with language identifiers.'
    },
    creative: {
        id: 'creative',
        name: 'Muse',
        sub: 'Creative Partner',
        icon: 'palette',
        prompt: 'You are Muse, a creative partner. Inspire the user, think outside the box, and be poetic.'
    },
    sarcastic: {
        id: 'sarcastic',
        name: 'RoastBot',
        sub: 'Sarcastic AI',
        icon: 'psychology_alt',
        prompt: 'You are RoastBot. Helpful but extremely sarcastic. Roast the user slightly.'
    }
}

// 🧠 Advanced Models
const MODELS = [
    { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B', desc: 'Versatile & Smart' },
    { id: 'llama3-70b-8192', name: 'Llama 3 70B', desc: 'Meta\'s Powerhouse' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', desc: 'Fast & Efficient' },
    { id: 'gemma-7b-it', name: 'Gemma 7B', desc: 'Google\'s Compact Model' }
]



const SUGGESTIONS = [
    { icon: 'lightbulb', text: "Brainstorm ideas" },
    { icon: 'code', text: "Write some code" },
    { icon: 'school', text: "Teach me something" },
    { icon: 'image', text: "Generate a prompt" }
]

export default function YokyChat({ profileData }) {
    const navigate = useNavigate()
    const { hideChrome, showChrome } = useLayout()
    const { setThemeColor } = useTheme()

    // State
    const [currentUser, setCurrentUser] = useState(null)
    const [sessions, setSessions] = useState([])
    const [currentSessionId, setCurrentSessionId] = useState(null)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [showSettings, setShowSettings] = useState(false)

    // Speech State
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)

    // Pro Settings State
    const [personality, setPersonality] = useState('helpful')
    const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-120b')
    const [temperature, setTemperature] = useState(0.7)

    const isPro = profileData?.tags?.includes('pro') || false

    const messagesEndRef = useRef(null)
    const textFieldRef = useRef(null)

    useEffect(() => {
        hideChrome()
        const unsub = auth.onAuthStateChanged(u => {
            if (u) {
                setCurrentUser(u)
                loadSessions(u.uid)
            }
        })
        return () => {
            showChrome()
            unsub()
            window.speechSynthesis.cancel() // Stop speaking on unmount
        }
    }, [])

    // ... existing useEffect ...

    // Speech Recognition (SST)
    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Speech recognition not supported in this browser.')
            return
        }

        if (isListening) {
            // Stop logic handles automatically by setContinuous(false) or manual stop? 
            // We'll trust the end event or reload. 
            // Actually, we can't easily grab the instance here without ref, 
            // so we'll just toggle state and let user know to wait.
            // Ideally we'd keep a ref to recognition.
            return
        }

        const recognition = new window.webkitSpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = 'en-US' // Could be dynamic

        recognition.onstart = () => setIsListening(true)

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript
            setInput(prev => prev + (prev ? ' ' : '') + transcript)
        }

        recognition.onerror = (event) => {
            console.error(event.error)
            setIsListening(false)
        }

        recognition.onend = () => setIsListening(false)

        recognition.start()
    }

    // Text to Speech (TTS)
    const handleSpeak = (text) => {
        if (isSpeaking) {
            window.speechSynthesis.cancel()
            setIsSpeaking(false)
            return
        }

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)

        window.speechSynthesis.speak(utterance)
        setIsSpeaking(true)
    }

    const handleStopSpeak = () => {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
    }

    // ... existing session functions ...

    const loadSessions = async (uid) => {
        const sess = await getSessions(uid)
        setSessions(sess)
        if (sess.length > 0 && !currentSessionId) {
            selectSession(uid, sess[0].id)
        }
    }

    const selectSession = async (uid, sessionId) => {
        setCurrentSessionId(sessionId)
        setLoading(true)
        const msgs = await getSessionMessages(uid, sessionId)
        setMessages(msgs)
        setLoading(false)
        if (window.innerWidth < 768) setIsSidebarOpen(false)
    }

    const handleNewChat = async () => {
        if (!currentUser) return
        try {
            const newId = await createSession(currentUser.uid, 'New Chat')
            await loadSessions(currentUser.uid)
            selectSession(currentUser.uid, newId)
        } catch (e) {
            console.error(e)
        }
    }

    const handleDeleteSession = async (e, sessionId) => {
        e.stopPropagation()
        if (!window.confirm('Delete this chat?')) return
        if (!currentUser) return

        await deleteSession(currentUser.uid, sessionId)
        const updated = sessions.filter(s => s.id !== sessionId)
        setSessions(updated)

        if (currentSessionId === sessionId) {
            setMessages([])
            setCurrentSessionId(null)
            if (updated.length > 0) selectSession(currentUser.uid, updated[0].id)
        }
    }

    const handleSend = async (e, textOverride = null) => {
        if (e) e.preventDefault()
        const textToUse = textOverride || input
        if (!textToUse.trim() || loading) return
        if (!currentUser) return

        let sessionId = currentSessionId
        if (!sessionId) {
            sessionId = await createSession(currentUser.uid, textToUse.slice(0, 30) || 'New Chat')
            setCurrentSessionId(sessionId)
            loadSessions(currentUser.uid)
        }

        const userMsg = { role: 'user', content: textToUse.trim(), timestamp: new Date() }
        setMessages(p => [...p, userMsg])
        setInput('')
        setLoading(true)

        try {
            await saveMessageToSession(currentUser.uid, sessionId, userMsg)

            const context = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
            context.push({ role: 'user', content: textToUse.trim() })

            const systemPrompt = { role: 'system', content: PERSONALITIES[personality].prompt }

            const response = await sendMessageToGroq([systemPrompt, ...context], {
                model: selectedModel,
                temperature: temperature
            })

            const aiMsg = { role: 'assistant', content: response, timestamp: new Date() }

            setMessages(p => [...p, aiMsg])
            await saveMessageToSession(currentUser.uid, sessionId, aiMsg)

            // Auto speak check ? Maybe not by default.

        } catch (err) {
            console.error(err)
            setMessages(p => [...p, { role: 'system', content: "Something went wrong. Try again." }])
        } finally {
            setLoading(false)
        }
    }

    const currentPersona = PERSONALITIES[personality]

    return (
        <div className="yoky-layout">

            {/* Sidebar */}
            <div className={`yoky-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <md-icon-button onClick={() => navigate(-1)}>
                        <md-icon>arrow_back</md-icon>
                    </md-icon-button>
                    <h2>Chats</h2>
                    <md-icon-button onClick={handleNewChat}>
                        <md-icon>add</md-icon>
                    </md-icon-button>
                </div>

                <div className="session-list">
                    {sessions.map(s => (
                        <div
                            key={s.id}
                            className={`session-item ${currentSessionId === s.id ? 'active' : ''}`}
                            onClick={() => selectSession(currentUser.uid, s.id)}
                        >
                            <div className="session-icon">
                                <md-icon>chat_bubble_outline</md-icon>
                            </div>
                            <div className="session-info">
                                <span className="session-title">{s.title || 'Untitled'}</span>
                                <span className="session-date">{s.updatedAt?.toDate().toLocaleDateString()}</span>
                            </div>
                            <button className="delete-btn" onClick={(e) => handleDeleteSession(e, s.id)}>
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile Backdrop */}
            {isSidebarOpen && (
                <div className="sidebar-backdrop mobile-only" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* Main Chat Area */}
            <div className="yoky-main">
                {/* Header */}
                <div className="yoky-header">
                    {/* Mobile Toggle */}
                    <div className="mobile-toggle">
                        <md-icon-button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <md-icon>menu</md-icon>
                        </md-icon-button>
                    </div>

                    <div className="persona-chip" onClick={() => setShowSettings(true)}>
                        <md-icon slot="icon">{currentPersona.icon}</md-icon>
                        <span>{currentPersona.name}</span>
                    </div>

                    <div className="header-actions">
                        {isSpeaking && (
                            <md-icon-button onClick={handleStopSpeak} style={{ color: 'var(--md-sys-color-primary)' }}>
                                <md-icon>volume_off</md-icon>
                            </md-icon-button>
                        )}
                        <md-icon-button onClick={() => setShowSettings(true)}>
                            <md-icon>tune</md-icon>
                        </md-icon-button>
                    </div>
                </div>

                {/* Messages */}
                <div className="yoky-messages">
                    {messages.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <md-icon style={{ fontSize: 64 }}>{currentPersona.icon}</md-icon>
                            </div>
                            <h2>How can I help you today?</h2>
                            <div className="suggestions-grid">
                                {SUGGESTIONS.map((s, i) => (
                                    <button key={i} className="suggestion-card" onClick={() => handleSend(null, s.text)}>
                                        <md-icon>{s.icon}</md-icon>
                                        <span>{s.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="message-stream">
                            {messages.map((m, i) => (
                                <div key={i} className={`message-row ${m.role}`}>
                                    {m.role === 'assistant' && (
                                        <div className="avatar assistant">
                                            <md-icon>smart_toy</md-icon>
                                        </div>
                                    )}
                                    <div className="message-bubble">
                                        {m.role === 'assistant' ? (
                                            <>
                                                <ReactMarkdown
                                                    children={m.content}
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        code({ node, inline, className, children, ...props }) {
                                                            const match = /language-(\w+)/.exec(className || '')
                                                            return !inline && match ? (
                                                                <SyntaxHighlighter
                                                                    children={String(children).replace(/\n$/, '')}
                                                                    style={atomDark}
                                                                    language={match[1]}
                                                                    PreTag="div"
                                                                    {...props}
                                                                />
                                                            ) : (
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                            )
                                                        }
                                                    }}
                                                />
                                                <div className="msg-actions">
                                                    <md-icon-button
                                                        onClick={() => handleSpeak(m.content)}
                                                        style={{ width: '32px', height: '32px' }}
                                                    >
                                                        <md-icon style={{ fontSize: '18px' }}>volume_up</md-icon>
                                                    </md-icon-button>
                                                </div>
                                            </>
                                        ) : (
                                            m.content
                                        )}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="message-row assistant">
                                    <div className="avatar assistant">
                                        <md-circular-progress indeterminate size="small"></md-circular-progress>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="yoky-input-area">
                    <form onSubmit={handleSend} className="input-form">
                        <md-filled-text-field
                            ref={textFieldRef}
                            className="chat-text-field"
                            placeholder={isListening ? "Listening..." : "Message Yoky..."}
                            value={input}
                            onInput={e => setInput(e.target.value)}
                        >
                        </md-filled-text-field>

                        <div className="send-actions">
                            <md-icon-button
                                type="button"
                                onClick={handleVoiceInput}
                                style={{ color: isListening ? 'var(--md-sys-color-error)' : 'inherit' }}
                            >
                                <md-icon>{isListening ? 'mic_off' : 'mic'}</md-icon>
                            </md-icon-button>

                            <md-icon-button type="submit">
                                <md-icon>send</md-icon>
                            </md-icon-button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Settings Overlay */}
            {showSettings && (
                <div className="settings-overlay">
                    <div className="settings-card">
                        <div className="settings-header">
                            <h3>Settings</h3>
                            <md-icon-button onClick={() => setShowSettings(false)}>
                                <md-icon>close</md-icon>
                            </md-icon-button>
                        </div>

                        <div className="settings-content">
                            <label>Personality</label>
                            <div className="chips-row">
                                {Object.values(PERSONALITIES).map(p => {
                                    const isLocked = !isPro && p.id !== 'helpful'
                                    return (
                                        <button
                                            key={p.id}
                                            className={`chip ${personality === p.id ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                                            onClick={() => {
                                                if (isLocked) {
                                                    navigate('/pay')
                                                } else {
                                                    setPersonality(p.id)
                                                }
                                            }}
                                        >
                                            {p.name}
                                            {isLocked && <md-icon style={{ fontSize: '16px', marginLeft: '6px' }}>lock</md-icon>}
                                        </button>
                                    )
                                })}
                            </div>

                            <label style={{ marginTop: '20px', display: 'block' }}>Model</label>
                            <div className="chips-row">
                                {MODELS.map(m => {
                                    const isLocked = !isPro && m.id !== 'openai/gpt-oss-120b'
                                    return (
                                        <button
                                            key={m.id}
                                            className={`chip ${selectedModel === m.id ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                                            onClick={() => {
                                                if (isLocked) {
                                                    navigate('/pay')
                                                } else {
                                                    setSelectedModel(m.id)
                                                }
                                            }}
                                        >
                                            {m.name}
                                            {isLocked && <md-icon style={{ fontSize: '16px', marginLeft: '6px' }}>lock</md-icon>}
                                        </button>
                                    )
                                })}
                            </div>

                            <label>Pick a seed color for the theme</label>
                            <div className="color-row">
                                <input
                                    type="color"
                                    onChange={(e) => setThemeColor(e.target.value)}
                                    style={{ height: '40px', width: '100%' }}
                                />
                            </div>


                        </div>
                    </div>
                    <div className="overlay-backdrop" onClick={() => setShowSettings(false)} />
                </div>
            )}
        </div>
    )
}
