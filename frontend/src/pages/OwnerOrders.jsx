import { useCallback, useEffect, useState } from 'react'
import { IoArrowBack } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import OwnerOrderCard from '../components/OwnerOrderCard'
import { getOwnerOrders } from '../lib/orders'
import useSocketEvent from '../hooks/useSocketEvent'

const filters = [
  { value: 'active', label: 'Active', match: (status) => !['delivered', 'cancelled'].includes(status) },
  { value: 'completed', label: 'Completed', match: (status) => ['delivered', 'cancelled'].includes(status) },
  { value: 'all', label: 'All', match: () => true },
]

const OwnerOrders = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('active')
  const [reloadKey, setReloadKey] = useState(0)

  // New orders and delivery updates arrive live; reload the list when they do.
  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  useSocketEvent('order:new', reload)
  useSocketEvent('order:updated', reload)

  useEffect(() => {
    let isActive = true
    getOwnerOrders()
      .then((result) => {
        if (isActive) setOrders(result)
      })
      .catch((requestError) => {
        if (isActive) setError(requestError.message || 'Unable to load shop orders.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [reloadKey])

  // One order can have parts from several of this owner's shops, so match on the shop part.
  const handleStatusUpdated = (orderId, shopOrder) => {
    setOrders((current) =>
      current.map((item) =>
        item.shopOrder._id === shopOrder._id
          ? { ...item, shopOrder: { ...shopOrder, shop: item.shopOrder.shop } }
          : item,
      ),
    )
  }

  const activeFilter = filters.find((item) => item.value === filter)
  const visibleOrders = orders.filter((order) => activeFilter.match(order.shopOrder.status))
  const pendingCount = orders.filter((order) => order.shopOrder.status === 'pending').length

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
          <h1 className="text-2xl font-bold text-gray-900">Shop Orders</h1>
          {pendingCount > 0 && (
            <span className="rounded-full bg-[#ff4d2d] px-2.5 py-0.5 text-xs font-semibold text-white">
              {pendingCount} new
            </span>
          )}
        </div>

        <div className="mb-5 flex gap-2" role="tablist" aria-label="Filter orders">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filter === item.value
                  ? 'bg-[#ff4d2d] text-white'
                  : 'bg-white text-gray-700 shadow-sm hover:bg-orange-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-gray-600 shadow-sm">Loading orders...</p>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-white p-6 text-center text-sm text-red-600 shadow-sm">
            {error}
          </p>
        ) : visibleOrders.length === 0 ? (
          <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-600 shadow-sm">
            No {filter === 'all' ? '' : filter} orders yet.
          </p>
        ) : (
          <div className="space-y-5">
            {visibleOrders.map((order) => (
              <OwnerOrderCard
                key={order.shopOrder._id}
                data={order}
                onStatusUpdated={handleStatusUpdated}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default OwnerOrders
