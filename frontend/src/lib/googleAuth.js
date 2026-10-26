import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../../firebase'

export const authenticateWithGoogle = async ({ mode, mobile, role }) => {
  const provider = new GoogleAuthProvider()
  let user

  try {
    ;({ user } = await signInWithPopup(auth, provider))
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Google sign-in was cancelled.')
    }
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Google sign-in is not enabled in Firebase Authentication.')
    }
    throw error
  }

  const idToken = await user.getIdToken()
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ idToken, mode, mobile, role }),
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Google authentication failed. Please try again.')
  }

  return result
}
