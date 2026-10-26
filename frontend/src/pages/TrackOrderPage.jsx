import { useCallback, useEffect, useState } from 'react'
import { FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa'
import { IoArrowBack } from 'react-icons/io5'
import { useNavigate, useParams } from 'react-router-dom'
import DeliveryBoyTracking from '../components/DeliveryBoyTracking'
import useSocketEvent from '../hooks/useSocketEvent'
import { getOrderTracking } from '../lib/orders'

const statusLabels = {
  pending: 'Pending',
  preparing: 'Preparing',
  'out-for-delivery': 'Out Of Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const PREP_MINUTES = 15
const RIDER_SPEED_KMPH = 20

// Rough arrival time before a rider is assigned: kitchen time plus the ride from the shop.
const estimateArrival = (part, deliveryAddress) => {
  const start = new Date(part.createdAt || Date.now()).getTime()
  let rideMinutes = 15
  if (part.shopLocation && deliveryAddress?.latitude != null) {
    const toRadians = (degrees) => (degrees * Math.PI) / 180
    const dLat = toRadians(deliveryAddress.latitude - part.shopLocation.latitude)
    const dLng = toRadians(deliveryAddress.longitude - part.shopLocation.longitude)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(part.shopLocation.latitude)) * Math.cos(toRadians(deliveryAddress.latitude)) * Math.sin(dLng / 2) ** 2
    const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    // Roads are longer than a straight line; 1.3x is a common rule of thumb.
    rideMinutes = Math.max(5, Math.round(((km * 1.3) / RIDER_SPEED_KMPH) * 60))
  }
  const arrival = new Date(Math.max(start + (PREP_MINUTES + rideMinutes) * 60000, Date.now() + rideMinutes * 60000))
  return arrival.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

const TrackOrderPage = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // A delivery boy accepting or delivering changes what this page shows.
  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  useSocketEvent('order:updated', reload)

  // The assigned delivery boy's position arrives live as they move.
  useSocketEvent('delivery:location', (payload) => {
    if (payload.orderId !== orderId) return
    setOrder((current) =>
      current && {
        ...current,
        shopOrders: current.shopOrders.map((part) =>
          part._id === payload.shopOrderId && part.deliveryBoy
            ? { ...part, deliveryBoy: { ...part.deliveryBoy, latitude: payload.latitude, longitude: payload.longitude } }
            : part,
        ),
      },
    )
  })

  useEffect(() => {
    let isActive = true
    getOrderTracking(orderId)
      .then((result) => {
        if (!isActive) return
        setError('')
        setOrder(result)
      })
      .catch((requestError) => {
        if (isActive) setError(requestError.message || 'Unable to load order tracking.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [orderId, reloadKey])

  return (
    <main className="min-h-screen bg-[#fff9f6] px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/my-orders')}
            aria-label="Go back to my orders"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#ff4d2d] transition hover:bg-orange-100"
          >
            <IoArrowBack className="h-6 w-6" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Track Order</h1>
        </div>

        {isLoading ? (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-600 shadow-sm">Loading tracking...</p>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-white p-6 text-center text-sm text-red-600 shadow-sm">
            {error}
          </p>
        ) : (
          <div className="space-y-6">
            {order.shopOrders.map((part) => (
              <article key={part._id} className="space-y-3 rounded-xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
                <div>
                  <p className="text-lg font-bold text-[#ff4d2d]">{part.shopName || 'Shop'}</p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Items:</span>{' '}
                    {part.shopOrderItems.map((item) => `${item.name} × ${item.quantity}`).join(', ')}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Subtotal:</span> ₹{part.subtotal}
                  </p>
                  <p className="flex items-start gap-1 text-sm text-gray-700">
                    <FaMapMarkerAlt className="mt-0.5 shrink-0 text-[#ff4d2d]" aria-hidden="true" />
                    <span>{order.deliveryAddress?.text}</span>
                  </p>
                </div>

                {part.status === 'delivered' ? (
                  <div>
                    <p className="text-lg font-semibold text-green-600">Delivered</p>
                    {part.deliveryBoy?.fullName && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Delivered by:</span> {part.deliveryBoy.fullName}
                        {part.deliveryBoy.mobile && ` - ${part.deliveryBoy.mobile}`}
                      </p>
                    )}
                  </div>
                ) : part.status === 'cancelled' ? (
                  <p className="text-lg font-semibold text-red-600">Cancelled</p>
                ) : part.deliveryBoy ? (
                  <>
                    <div className="text-sm text-gray-700">
                      <p>
                        <span className="font-semibold">Delivery Boy:</span> {part.deliveryBoy.fullName}
                      </p>
                      {part.deliveryBoy.mobile && (
                        <a
                          href={`tel:${part.deliveryBoy.mobile}`}
                          className="inline-flex items-center gap-2 font-medium text-[#ff4d2d] hover:underline"
                        >
                          <FaPhoneAlt aria-hidden="true" />
                          {part.deliveryBoy.mobile}
                        </a>
                      )}
                    </div>
                    <DeliveryBoyTracking
                      deliveryBoy={part.deliveryBoy}
                      customer={{
                        latitude: order.deliveryAddress?.latitude,
                        longitude: order.deliveryAddress?.longitude,
                        label: 'Your Address',
                      }}
                    />
                  </>
                ) : (
                  <>
                    <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-gray-700">
                      Status: <span className="font-semibold">{statusLabels[part.status] || part.status}</span> ·
                      Delivery boy is not assigned yet.
                    </p>
                    <p className="text-sm font-medium text-gray-800">
                      🕒 Estimated arrival around{' '}
                      <span className="text-[#ff4d2d]">{estimateArrival(part, order.deliveryAddress)}</span>
                    </p>
                    {/* Until a delivery boy accepts, the map shows only where the order is going. */}
                    <DeliveryBoyTracking
                      customer={{
                        latitude: order.deliveryAddress?.latitude,
                        longitude: order.deliveryAddress?.longitude,
                        label: 'Your Address',
                      }}
                    />
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default TrackOrderPage
