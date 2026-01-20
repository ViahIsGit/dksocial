import { db, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, doc, setDoc, deleteDoc } from '../firebase/config'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// Helper to get API Key safely
const getApiKey = () => {
    return import.meta.env.VITE_GROQ_API_KEY
}

/**
 * Sends a message to the Groq API (Yoky).
 * @param {Array} messages - Array of message objects { role, content }
 * @returns {Promise<string>} - The assistant's response content
 */
export const sendMessageToGroq = async (messages, options = {}) => {
    const apiKey = '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'
    if (!apiKey) {
        throw new Error('Groq API Key not found. Please set VITE_GROQ_API_KEY in .env')
    }

    const {
        model = 'openai/gpt-oss-120b', // Default
        temperature = 0.7
    } = options

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: 2048
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('Groq API Error:', errorData)

            if (response.status === 404 || (errorData.error && errorData.error.code === 'model_not_found')) {
                throw new Error(`Model not found or API error: ${errorData.error?.message || response.statusText}`)
            }
            throw new Error(`API Error: ${response.statusText}`)
        }

        const data = await response.json()
        return data.choices[0]?.message?.content || ''
    } catch (error) {
        console.error('Error sending message to Yoky:', error)
        throw error
    }
}

// ==========================================
// SESSION MANAGEMENT (Multi-Chat)
// ==========================================

/**
 * Create a new chat session.
 * @param {string} userId 
 * @param {string} title 
 * @returns {Promise<string>} sessionId
 */
export const createSession = async (userId, title = 'New Chat') => {
    if (!userId) throw new Error('User ID required')

    try {
        const docRef = await addDoc(collection(db, 'users', userId, 'yoky_sessions'), {
            title,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        })
        return docRef.id
    } catch (error) {
        console.error('Error creating session:', error)
        throw error
    }
}

/**
 * Get all chat sessions for a user.
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
export const getSessions = async (userId) => {
    if (!userId) return []
    try {
        const q = query(
            collection(db, 'users', userId, 'yoky_sessions'),
            orderBy('updatedAt', 'desc')
        )
        const snapshot = await getDocs(q)
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (error) {
        console.error('Error fetching sessions:', error)
        return []
    }
}

/**
 * Delete a chat session and all its messages.
 * @param {string} userId 
 * @param {string} sessionId 
 */
export const deleteSession = async (userId, sessionId) => {
    if (!userId || !sessionId) return
    try {
        // Delete messages first (best effort for client-side)
        const msgsQ = query(collection(db, 'users', userId, 'yoky_sessions', sessionId, 'messages'))
        const snapshot = await getDocs(msgsQ)
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref))
        await Promise.all(deletePromises)

        // Delete session doc
        await deleteDoc(doc(db, 'users', userId, 'yoky_sessions', sessionId))
    } catch (error) {
        console.error('Error deleting session:', error)
        throw error
    }
}


// ==========================================
// MESSAGE MANAGEMENT
// ==========================================

/**
 * Save a message to a specific session.
 * @param {string} userId 
 * @param {string} sessionId 
 * @param {object} message 
 */
export const saveMessageToSession = async (userId, sessionId, message) => {
    if (!userId || !sessionId) return

    try {
        // Save message
        await addDoc(collection(db, 'users', userId, 'yoky_sessions', sessionId, 'messages'), {
            ...message,
            timestamp: serverTimestamp()
        })

        // Update session timestamp and snippet
        await setDoc(doc(db, 'users', userId, 'yoky_sessions', sessionId), {
            updatedAt: serverTimestamp(),
            lastMessage: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '')
        }, { merge: true })

    } catch (error) {
        console.error('Error saving message to session:', error)
    }
}

/**
 * Fetch messages for a specific session.
 * @param {string} userId 
 * @param {string} sessionId 
 * @returns {Promise<Array>}
 */
export const getSessionMessages = async (userId, sessionId) => {
    if (!userId || !sessionId) return []

    try {
        const q = query(
            collection(db, 'users', userId, 'yoky_sessions', sessionId, 'messages'),
            orderBy('timestamp', 'asc') // Oldest first for chat flow
        )
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
        console.error('Error fetching session messages:', error)
        return []
    }
}

// Legacy support (to avoid breaking if called elsewhere, but we should migrate)
export const getYokyHistory = async (userId) => {
    // If we want to support legacy linear history, we could query the 'legacy' or just return empty
    return []
}
export const saveMessageToHistory = async () => { } // Deprecated
export const clearYokyHistory = async () => { } // Deprecated
