import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'

const primaryColor = '#ff4d2d'
const borderColor = '#e5e7eb'
const inputClass = 'w-full rounded-lg border px-4 py-3 outline-none focus:ring-2'
const buttonClass = 'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-[#ff4d2d]/20 disabled:cursor-not-allowed disabled:opacity-60'

const LoadingIndicator = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

const ForgetPassword = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSendOtp = async (event) => {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
      const response = await fetch(`${apiUrl}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Unable to send OTP. Please try again.')
      }

      setStep(2)
      setMessage(result.message || 'OTP sent successfully.')
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? 'Cannot connect to the server. Make sure the backend is running and try again.'
          : error.message || 'Unable to send OTP. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (event) => {
    event.preventDefault()
    setMessage('')
    setIsSubmitting(true)

    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
      const response = await fetch(`${apiUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'OTP verification failed. Please try again.')
      }

      setStep(3)
      setMessage(result.message || 'OTP verified successfully.')
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? 'Cannot connect to the server. Make sure the backend is running and try again.'
          : error.message || 'OTP verification failed. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    if (password !== confirmPassword) {
      setMessage('Passwords do not match. Please check and try again.')
      return
    }

    setMessage('')
    setIsSubmitting(true)

    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
      const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword: password }),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Unable to reset password. Please try again.')
      }

      navigate('/signin', {
        state: {
          email,
          message: result.message || 'Password reset successfully. Please sign in with your new password.',
        },
      })
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? 'Cannot connect to the server. Make sure the backend is running and try again.'
          : error.message || 'Unable to reset password. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fff9f6] px-4 py-10">
      <main className="w-full rounded-2xl bg-white p-8 shadow-lg" style={{ maxWidth: '24rem' }}>
        {step === 1 && (
          <section>
            <div className="mb-7 flex items-center justify-center gap-3">
              <Link
                to="/signin"
                aria-label="Back to sign in"
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition hover:bg-orange-50 hover:text-[#ff4d2d]"
              >
                <FaArrowLeft aria-hidden="true" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
            </div>
            <form className="space-y-5" onSubmit={handleSendOtp}>
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
                  className={inputClass}
                  style={{ borderColor }}
                />
              </label>
              <button type="submit" disabled={isSubmitting} className={buttonClass} style={{ backgroundColor: primaryColor }}>
                {isSubmitting ? <><LoadingIndicator />Sending...</> : 'Send OTP'}
              </button>
            </form>
          </section>
        )}

        {step === 2 && (
          <section>
            <div className="mb-7 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setMessage('')
                }}
                aria-label="Back to email"
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition hover:bg-orange-50 hover:text-[#ff4d2d]"
              >
                <FaArrowLeft aria-hidden="true" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
            </div>
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <input
                type="text"
                name="otp"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Enter your OTP"
                aria-label="Enter your OTP"
                pattern="[0-9]{4}"
                maxLength={4}
                required
                className={inputClass}
                style={{ borderColor }}
              />
              <button type="submit" disabled={isSubmitting} className={buttonClass} style={{ backgroundColor: primaryColor }}>
                {isSubmitting ? <><LoadingIndicator />Verifying...</> : 'Verify'}
              </button>
            </form>
          </section>
        )}

        {step === 3 && (
          <section>
            <div className="mb-7 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep(2)
                  setMessage('')
                }}
                aria-label="Back to OTP"
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition hover:bg-orange-50 hover:text-[#ff4d2d]"
              >
                <FaArrowLeft aria-hidden="true" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
            </div>
            <form className="space-y-5" onSubmit={handleResetPassword}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">New password</span>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  className={inputClass}
                  style={{ borderColor }}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Confirm new password</span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Enter password again"
                  minLength={6}
                  required
                  className={inputClass}
                  style={{ borderColor }}
                />
              </label>
              <button type="submit" disabled={isSubmitting} className={buttonClass} style={{ backgroundColor: primaryColor }}>
                {isSubmitting ? <><LoadingIndicator />Resetting...</> : 'Reset Password'}
              </button>
            </form>
          </section>
        )}

        {message && (
          <div role="status" className="mt-5 rounded-xl bg-orange-50 px-4 py-3 text-center text-sm leading-5 text-gray-600">
            {message}
          </div>
        )}

      </main>
    </div>
  )
}

export default ForgetPassword
