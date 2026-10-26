import { useCallback, useEffect, useState } from 'react'
import { FaEnvelope, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa'
import { IoArrowBack } from 'react-icons/io5'
import { Link, useNavigate } from 'react-router-dom'
import { cancelOrder, getMyOrders } from '../lib/orders'
import useSocketEvent from '../hooks/useSocketEvent'
import RateOrder from '../components/RateOrder'

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
const fallbackImage =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80'

const getImageUrl = (image) => {
  if (!image) return fallbackImage
  return image.startsWith('http') ? image : `${apiUrl}${image}`
}

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const statusColors = {
  pending: 'text-blue-600',
  preparing: 'text-amber-600',
  'out-for-delivery': 'text-purple-600',
  delivered: 'text-green-600',
  cancelled: 'text-red-600',
}

// The order is only as far along as its slowest shop.
const statusOrder = ['pending', 'preparing', 'out-for-delivery', 'delivered']
const getOrderStatus = (shopOrders) => {
  const statuses = shopOrders.map((part) => part.status)
  if (statuses.length > 0 && statuses.every((status) => status === 'cancelled')) return 'cancelled'
  const active = statuses.filter((status) => status !== 'cancelled')
  return active.reduce(
    (slowest, status) => (statusOrder.indexOf(status) < statusOrder.indexOf(slowest) ? status : slowest),
    'delivered',
  )
}

const StatusText = ({ status, className = '' }) => (
  <span className={`font-semibold capitalize ${statusColors[status] || 'text-gray-600'} ${className}`}>
    {status.replaceAll('-', ' ')}
  </span>
)

const MyOrders = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [cancellingId, setCancellingId] = useState('')
  const [notice, setNotice] = useState('')

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return
    setCancellingId(orderId)
    setNotice('')
    try {
      const result = await cancelOrder(orderId)
      setNotice(result.message)
      setReloadKey((key) => key + 1)
    } catch (requestError) {
      setNotice(requestError.message)
    } finally {
      setCancellingId('')
    }
  }

  const handleRated = (orderId, ratedShopOrder) =>
    setOrders((current) =>
      current.map((order) =>
        order._id === orderId
          ? {
              ...order,
              shopOrder: order.shopOrder.map((part) =>
                part._id === ratedShopOrder._id ? { ...part, shopOrderItems: ratedShopOrder.shopOrderItems, review: ratedShopOrder.review, ratedAt: ratedShopOrder.ratedAt } : part,
              ),
            }
          : order,
      ),
    )

  // Status changes from the shop or delivery boy arrive live.
  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  useSocketEvent('order:updated', reload)

  useEffect(() => {
    let isActive = true
    getMyOrders()
      .then((result) => {
        if (!isActive) return
        setError('')
        setOrders(result)
      })
      .catch((requestError) => {
        if (isActive) setError(requestError.message || 'Unable to load your orders.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [reloadKey])

  return (
    <main className="min-h-screen bg-[#fff9f6] px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            aria-label="Go back to home"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#ff4d2d] transition hover:bg-orange-100"
          >
            <IoArrowBack className="h-6 w-6" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        </div>

        {notice && (
          <p role="status" className="mb-4 rounded-lg bg-orange-50 px-4 py-3 text-sm text-gray-700">
            {notice}
          </p>
        )}

        {isLoading ? (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
            Loading your orders...
          </p>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-white p-6 text-center text-sm text-red-600 shadow-sm">
            {error}
          </p>
        ) : orders.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="text-gray-600">You have not placed any orders yet.</p>
            <Link to="/home" className="mt-3 inline-block text-sm font-medium text-[#ff4d2d] hover:underline">
              Order some food
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <article key={order._id} className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
                <header className="flex items-start justify-between gap-3 border-b border-gray-300 pb-3">
                  <div>
                    <p className="font-semibold text-gray-900">order #{order._id.slice(-6)}</p>
                    <p className="text-sm text-gray-500">Date: {formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase text-gray-500">
                      {order.paymentMethod === 'online' ? 'Paid online' : 'COD'}
                    </p>
                    <StatusText status={getOrderStatus(order.shopOrder)} />
                  </div>
                </header>

                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  {order.user?.fullName && <p className="font-medium text-gray-800">{order.user.fullName}</p>}
                  {order.user?.email && (
                    <p className="flex items-center gap-2">
                      <FaEnvelope className="text-[#ff4d2d]" aria-hidden="true" />
                      {order.user.email}
                    </p>
                  )}
                  {order.user?.mobile && (
                    <p className="flex items-center gap-2">
                      <FaPhoneAlt className="text-[#ff4d2d]" aria-hidden="true" />
                      {order.user.mobile}
                    </p>
                  )}
                  {order.deliveryAddress?.text && (
                    <p className="flex items-start gap-2">
                      <FaMapMarkerAlt className="mt-0.5 shrink-0 text-[#ff4d2d]" aria-hidden="true" />
                      <span>{order.deliveryAddress.text}</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-4">
                  {order.shopOrder.map((part) => (
                    <section key={part._id} className="rounded-lg bg-[#fffaf7] p-3 sm:p-4">
                      <h2 className="mb-3 font-medium text-gray-800">{part.shop?.name || 'Shop'}</h2>
                      <div className="category-scrollbar flex gap-3 overflow-x-auto pb-2">
                        {part.shopOrderItems.map((item) => (
                          <div
                            key={item.item}
                            className="w-36 flex-none rounded-lg border border-gray-300 bg-white p-2"
                          >
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              className="h-24 w-full rounded object-cover"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.src = fallbackImage
                              }}
                            />
                            <p className="mt-1 truncate text-sm font-medium text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity} x ₹{item.price}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-gray-300 pt-2 text-sm">
                        <span className="font-semibold text-gray-900">Subtotal: ₹{part.subtotal}</span>
                        <StatusText status={part.status} className="text-sm" />
                      </div>
                      {part.assignedDeliveryBoy?.fullName && (
                        <p className="mt-2 text-sm text-gray-700">
                          <span className="font-semibold">
                            {part.status === 'delivered' ? 'Delivered by:' : 'Delivery Boy:'}
                          </span>{' '}
                          {part.assignedDeliveryBoy.fullName}
                          {part.assignedDeliveryBoy.mobile && ` - ${part.assignedDeliveryBoy.mobile}`}
                        </p>
                      )}
                      {part.status === 'delivered' && (
                        <RateOrder orderId={order._id} shopOrder={part} onRated={handleRated} />
                      )}
                    </section>
                  ))}
                </div>

                <footer className="mt-4 flex items-center justify-between border-t border-gray-300 pt-3">
                  <div>
                    <p className="font-semibold text-gray-900">Total: ₹{order.totalAmount}</p>
                    {order.deliveryFee > 0 && (
                      <p className="text-xs text-gray-500">Includes ₹{order.deliveryFee} delivery fee</p>
                    )}
                    {order.discount > 0 && (
                      <p className="text-xs text-green-600">
                        {order.couponCode} saved you ₹{order.discount}
                      </p>
                    )}
                    {order.paymentStatus === 'refunded' && (
                      <p className="text-xs font-medium text-green-600">Refunded</p>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {/* Cancellable until a shop starts preparing. */}
                    {order.shopOrder.every((part) => part.status === 'pending') && (
                      <button
                        type="button"
                        onClick={() => handleCancel(order._id)}
                        disabled={cancellingId === order._id}
                        className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        {cancellingId === order._id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                    {getOrderStatus(order.shopOrder) !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/track-order/${order._id}`)}
                        className="rounded-lg bg-[#ff4d2d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e64327]"
                      >
                        Track Order
                      </button>
                    )}
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default MyOrders
