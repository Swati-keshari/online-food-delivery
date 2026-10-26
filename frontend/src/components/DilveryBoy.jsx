import { useCallback, useEffect, useState } from 'react'
import { FaMapMarkerAlt, FaPhoneAlt, FaStore, FaSyncAlt } from 'react-icons/fa'
import {
  acceptDelivery,
  getCurrentDelivery,
  getDeliveryAssignments,
  sendDeliveryOtp,
  verifyDeliveryOtp,
} from '../lib/delivery'
import useSocketEvent from '../hooks/useSocketEvent'
import DeliveryBoyTracking from './DeliveryBoyTracking'
import TodayDeliveries from './TodayDeliveries'

const formatShopAddress = (address) =>
  [address?.street, address?.city].filter(Boolean).join(', ')

const formatCoordinate = (value) => (value == null ? '—' : Number(value).toFixed(7))

const DilveryBoy = ({ user, latitude, longitude }) => {
  const [assignments, setAssignments] = useState([])
  const [currentDelivery, setCurrentDelivery] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [livePosition, setLivePosition] = useState(null)
  const [otpSentTo, setOtpSentTo] = useState('')
  const [otp, setOtp] = useState('')
  const [statsKey, setStatsKey] = useState(0)

  // While on a delivery, follow the delivery boy's own position on the map.
  const hasCurrentDelivery = Boolean(currentDelivery)
  useEffect(() => {
    if (!hasCurrentDelivery || !navigator.geolocation) return undefined
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => setLivePosition({ latitude: coords.latitude, longitude: coords.longitude }),
      (watchError) => console.error('Location watch error:', watchError.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [hasCurrentDelivery])

  const loadDeliveries = useCallback(async () => {
    try {
      const [current, available] = await Promise.all([getCurrentDelivery(), getDeliveryAssignments()])
      setError('')
      setCurrentDelivery(current)
      setAssignments(available)
    } catch (requestError) {
      // A failed background refresh shows a note but keeps the current order and OTP form on screen.
      setMessage(requestError.message || 'Unable to refresh deliveries.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // New requests, and requests taken by someone else, arrive live.
  useSocketEvent('delivery:new', loadDeliveries)
  useSocketEvent('delivery:updated', loadDeliveries)

  useEffect(() => {
    let isActive = true
    Promise.all([getCurrentDelivery(), getDeliveryAssignments()])
      .then(([current, available]) => {
        if (!isActive) return
        setCurrentDelivery(current)
        setAssignments(available)
      })
      .catch((requestError) => {
        if (isActive) setError(requestError.message || 'Unable to load deliveries.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [])

  const handleAccept = async (assignmentId) => {
    setBusyId(assignmentId)
    setMessage('')
    try {
      const delivery = await acceptDelivery(assignmentId)
      setCurrentDelivery(delivery)
      setAssignments((current) => current.filter((item) => item._id !== assignmentId))
      setMessage('Delivery accepted. Pick up the order from the shop.')
    } catch (requestError) {
      setMessage(requestError.message)
      loadDeliveries()
    } finally {
      setBusyId('')
    }
  }

  const handleSendOtp = async () => {
    setBusyId(currentDelivery._id)
    setMessage('')
    try {
      const result = await sendDeliveryOtp(currentDelivery._id)
      setOtpSentTo(result.customerName || currentDelivery.customer?.fullName || 'customer')
      setOtp('')
    } catch (requestError) {
      setMessage(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  const handleVerifyOtp = async (event) => {
    event.preventDefault()
    setBusyId(currentDelivery._id)
    setMessage('')
    try {
      await verifyDeliveryOtp(currentDelivery._id, otp)
      setCurrentDelivery(null)
      setOtpSentTo('')
      setOtp('')
      setMessage('Order delivered. Great job!')
      setStatsKey((key) => key + 1)
      loadDeliveries()
    } catch (requestError) {
      setMessage(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:py-8">
      <div className="rounded-2xl bg-white p-5 text-center shadow-md">
        <h1 className="text-xl font-bold text-[#ff4d2d]">Welcome, {user?.fullName || 'Delivery Partner'}</h1>
        <p className="mt-2 text-sm text-[#ff4d2d]">
          <span className="font-semibold">Latitude:</span> {formatCoordinate(latitude)},{' '}
          <span className="font-semibold">Longitude:</span> {formatCoordinate(longitude)}
        </p>
      </div>

      <TodayDeliveries refreshKey={statsKey} />

      {message && (
        <p role="status" className="rounded-lg bg-orange-50 px-4 py-3 text-sm text-gray-700">
          {message}
        </p>
      )}

      {isLoading ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-600 shadow-md">Loading deliveries...</p>
      ) : error ? (
        <p role="alert" className="rounded-2xl bg-white p-6 text-center text-sm text-red-600 shadow-md">
          {error}
        </p>
      ) : currentDelivery ? (
        <article className="rounded-2xl bg-white p-5 shadow-md">
          <h2 className="mb-3 text-lg font-bold text-gray-900">📦 Current Order</h2>
          <div className="space-y-2 rounded-lg border border-gray-800 p-4 text-sm text-gray-700">
            <p className="flex items-start gap-2">
              <FaStore className="mt-0.5 shrink-0 text-[#ff4d2d]" aria-hidden="true" />
              <span>
                <span className="font-semibold text-gray-900">Pickup: {currentDelivery.shopName}</span>
                {formatShopAddress(currentDelivery.shop?.address) && (
                  <span className="block text-gray-500">{formatShopAddress(currentDelivery.shop.address)}</span>
                )}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <FaMapMarkerAlt className="mt-0.5 shrink-0 text-[#ff4d2d]" aria-hidden="true" />
              <span>
                <span className="font-semibold text-gray-900">Drop: {currentDelivery.customer?.fullName}</span>
                <span className="block text-gray-500">{currentDelivery.deliveryAddress?.text}</span>
              </span>
            </p>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            {currentDelivery.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            ₹{currentDelivery.subtotal} ·{' '}
            <span className="font-normal text-gray-500">
              {currentDelivery.paymentMethod === 'online' ? 'Paid online' : 'Collect cash'}
            </span>
          </p>
          {currentDelivery.customer?.mobile && (
            <a
              href={`tel:${currentDelivery.customer.mobile}`}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#ff4d2d] hover:underline"
            >
              <FaPhoneAlt aria-hidden="true" />
              Call customer ({currentDelivery.customer.mobile})
            </a>
          )}
          <div className="mt-4">
            <DeliveryBoyTracking
              deliveryBoy={{ ...(livePosition || { latitude, longitude }), fullName: 'You' }}
              customer={{
                latitude: currentDelivery.deliveryAddress?.latitude,
                longitude: currentDelivery.deliveryAddress?.longitude,
                label: currentDelivery.customer?.fullName,
              }}
            />
          </div>
          {otpSentTo ? (
            <form onSubmit={handleVerifyOtp} className="mt-4 rounded-xl border border-gray-800 bg-gray-50 p-4">
              <label htmlFor="delivery-otp" className="text-sm font-semibold text-gray-800">
                Enter Otp send to <span className="text-[#ff4d2d]">{otpSentTo}</span>
              </label>
              <input
                id="delivery-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                placeholder="Enter OTP"
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]"
              />
              <button
                type="submit"
                disabled={otp.length !== 4 || busyId === currentDelivery._id}
                className="mt-3 w-full rounded-lg bg-[#ff4d2d] py-2.5 text-sm font-semibold text-white transition hover:bg-[#e64327] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === currentDelivery._id ? 'Verifying...' : 'Submit OTP'}
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={busyId === currentDelivery._id}
                className="mt-2 w-full text-center text-xs font-medium text-[#ff4d2d] hover:underline disabled:opacity-60"
              >
                Resend OTP
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={busyId === currentDelivery._id}
              className="mt-4 w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyId === currentDelivery._id ? 'Sending OTP...' : 'Mark As Delivered'}
            </button>
          )}
        </article>
      ) : (
        <div className="rounded-2xl bg-white p-5 shadow-md">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">Available Orders</h2>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true)
                loadDeliveries()
              }}
              aria-label="Refresh orders"
              title="Refresh"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#ff4d2d] transition hover:bg-orange-50"
            >
              <FaSyncAlt aria-hidden="true" />
            </button>
          </div>

          {assignments.length === 0 ? (
            <p className="text-sm text-gray-500">No Available Orders</p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <article
                  key={assignment._id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-800 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{assignment.shopName}</p>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Delivery Address:</span> {assignment.deliveryAddress?.text}
                    </p>
                    <p className="text-xs text-gray-400">
                      {assignment.items.length} items | ₹{assignment.subtotal}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAccept(assignment._id)}
                    disabled={Boolean(busyId)}
                    className="shrink-0 rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyId === assignment._id ? 'Accepting...' : 'Accept'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default DilveryBoy
