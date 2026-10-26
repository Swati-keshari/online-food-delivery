import { useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authenticateWithGoogle } from '../lib/googleAuth'
import { fetchCurrentUser } from '../lib/currentUser'
import { useDispatch } from 'react-redux'
import { setUserData } from '../redux/userSlice'

const SignIn = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState(location.state?.email || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleMessage, setGoogleMessage] = useState('')
  const [signInMessage, setSignInMessage] = useState(location.state?.message || '')
  const [currentUser, setCurrentUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const primaryColor = '#ff4d2d'
  const bgColor = '#fff9f6'
  const borderColor = '#ddd'
  const canSubmit = email.trim() && password.length >= 6

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSignInMessage('')
    setGoogleMessage('')
    setIsSubmitting(true)

    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
      const response = await fetch(`${apiUrl}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Sign in failed. Please try again.')
      }

      setSignInMessage('Signed in successfully.')
      try {
        const user = await fetchCurrentUser()
        setCurrentUser(user)
        dispatch(setUserData(user))
        navigate('/home', { replace: true })
      } catch (error) {
        setSignInMessage(`Signed in, but profile could not be loaded: ${error.message}`)
      }
    } catch (error) {
      setSignInMessage(
        error instanceof TypeError
          ? 'Cannot connect to the server. Make sure the backend is running and try again.'
          : error.message || 'Unable to sign in. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignin = async () => {
    setGoogleMessage('')
    setSignInMessage('')
    setIsSubmitting(true)
    try {
      const result = await authenticateWithGoogle({ mode: 'signin' })
      setGoogleMessage(result.message)
      try {
        const user = await fetchCurrentUser()
        setCurrentUser(user)
        dispatch(setUserData(user))
        navigate('/home', { replace: true })
      } catch (error) {
        setGoogleMessage(`Signed in, but profile could not be loaded: ${error.message}`)
      }
    } catch (error) {
      setGoogleMessage(error.message || 'Unable to sign in with Google. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10" style={{ backgroundColor: bgColor }}>
      <main className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-4xl font-bold" style={{ color: primaryColor }}>Vingo</h1>
        <p className="mb-8 text-center text-gray-600">Sign in to your account</p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="Enter your email"
              required
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
              style={{ borderColor }}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Password</span>
            <span className="relative block">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                minLength={6}
                aria-invalid={password.length > 0 && password.length < 6}
                className="w-full rounded-lg border px-4 py-3 pr-12 outline-none focus:ring-2"
                style={{ borderColor }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
              </button>
            </span>
            {password.length > 0 && password.length < 6 && (
              <span className="mt-1 block text-sm text-red-600" role="alert">
                Password must be at least 6 characters ({password.length}/6 entered).
              </span>
            )}
          </label>
          <div className="-mt-3 text-right">
            <Link to="/forget-password" className="text-sm font-medium hover:underline" style={{ color: primaryColor }}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold text-white transition-colors enabled:hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </>
            ) : 'Sign In'}
          </button>
          {signInMessage && (
            <p role="status" className="text-center text-sm text-gray-600">
              {signInMessage}{currentUser && ` Welcome, ${currentUser.fullName}.`}
            </p>
          )}
          <div className="flex items-center gap-3 text-sm text-gray-400" aria-hidden="true">
            <span className="h-px flex-1 bg-gray-200" />
            <span>or</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>
          <button
            type="button"
            onClick={handleGoogleSignin}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-3 rounded-lg border py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            style={{ borderColor }}
          >
            <FcGoogle className="text-xl" aria-hidden="true" />
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting to Google...
              </>
            ) : 'Sign in with Google'}
          </button>
          {googleMessage && (
            <p role="status" className="text-center text-sm text-gray-600">
              {googleMessage}{currentUser && ` Welcome, ${currentUser.fullName}.`}
            </p>
          )}
          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-semibold hover:underline" style={{ color: primaryColor }}>
              Sign up
            </Link>
          </p>
        </form>
      </main>
    </div>
  )
}

export default SignIn
