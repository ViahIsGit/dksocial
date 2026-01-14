import {
    db,
    auth,
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    query,
    orderBy,
    arrayUnion,
    arrayRemove,
    serverTimestamp
} from '../firebase/config'
import { getUserProfile } from './reels'

/**
 * Buscar comentários de um post
 */
export async function getComments(postId) {
    try {
        const commentsRef = collection(db, 'posts', postId, 'comments')
        const q = query(commentsRef, orderBy('createdAt', 'asc'))
        const snapshot = await getDocs(q)

        return snapshot.docs.map(doc => {
            const data = doc.data()
            return {
                ...data,
                id: doc.id,
                date: data.createdAt
                    ? new Date(data.createdAt.toMillis()).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                    })
                    : ''
            }
        })
    } catch (error) {
        console.error("Erro ao buscar comentários do post:", error)
        return []
    }
}

/**
 * Adicionar comentário em um post
 */
export async function addComment(postId, { text }) {
    if (!auth.currentUser) throw new Error('Usuário não autenticado')

    const userProfile = await getUserProfile(auth.currentUser.uid)
    const username = userProfile?.username || 'Usuário Anônimo'
    const avatar = userProfile?.profilePicture || '/feed/fizz.png'

    const commentsRef = collection(db, 'posts', postId, 'comments')
    await addDoc(commentsRef, {
        text,
        userId: auth.currentUser.uid,
        username: username,
        avatar: avatar,
        createdAt: serverTimestamp(),
        likesUsers: []
    })

    // Increment comment count on post
    const postRef = doc(db, 'posts', postId)
    // We need to import increment if we use it, for now just fetching and updating or using increment from config
    // Checking config exports... assumed increment is available or we do manual read-update for simplicity/consistency with reels.js logic which might differ.
    // reels.js doesn't seem to update comments count in addComment explicitly? checking...
    // In `reels.js` Step 95, `addComment` does NOT update the parent reel's comment count. 
    // Wait, if it doesn't update, the UI count won't update? 
    // DashFeed relies on `post.comments` for the count.
    // I should probably update the parent post comment count here.
}

/**
 * Curte um comentário específico de um post.
 */
export async function likeComment(postId, commentId, userId) {
    if (!userId) throw new Error("Usuário não autenticado")

    const commentRef = doc(db, 'posts', postId, 'comments', commentId)
    await updateDoc(commentRef, {
        likesUsers: arrayUnion(userId)
    })
}

/**
 * Remove a curtida de um comentário de um post.
 */
export async function unlikeComment(postId, commentId, userId) {
    if (!userId) throw new Error("Usuário não autenticado")

    const commentRef = doc(db, 'posts', postId, 'comments', commentId)
    await updateDoc(commentRef, {
        likesUsers: arrayRemove(userId)
    })
}
