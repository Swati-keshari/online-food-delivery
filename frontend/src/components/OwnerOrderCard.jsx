import { useState } from 'react'
import { FaEnvelope, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { updateShopOrderStatus } from '../lib/orders'

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
const fallbackImage =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80'

const getImageUrl = (image) => {
  if (!image) return fallbackImage
  return image.startsWith('http') ? image : `${apiUrl}${image}`
}

const formatDateTime = (date) =>
  new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

// Owner can only move an order up to "out of delivery"; delivered/cancelled are shown, not chosen.
const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'out-for-delivery', label: 'Out Of Delivery' },
]
const finalStatusLabels = { delivered: 'Delivered', cancelled: 'Cancelled' }

// Mirrors allowedNextStatuses in backend/controllers/order.controllers.js
const allowedNextStatuses = {
  pending: ['preparing', 'out-for-delivery', 'cancelled'],
  preparing: ['out-for-delivery', 'cancelled'],
  'out-for-delivery': [],
  delivered: [],
  cancelled: [],
}

const OwnerOrderCard = ({ data, onStatusUpdated }) => {
  const { shopOrder } = data
  const nextStatuses = allowedNextStatuses[shopOrder.status] || []
  const isFinal = nextStatuses.length === 0
  const [isUpdating, setIsUpdating] = useState(false)
  const navigate = useNavigate()

  const handleUpdateStatus = async (orderId, shopOrderId, status) => {
    if (status === shopOrder.status) return
    if (status === 'cancelled' && !window.confirm('Cancel this order?')) return
    setIsUpdating(true)
    try {
      const result = await updateShopOrderStatus(orderId, shopOrderId, status)
      const updatedShopOrder = result.availableBoys
        ? {
            ...result.shopOrder,
            assignment: result.assignment && { _id: result.assignment, broadcastedTo: result.availableBoys },
          }
        : result.shopOrder
      onStatusUpdated(orderId, updatedShopOrder)
      if (status === 'out-for-delivery') alert(result.message)
    } catch (requestError) {
      alert(requestError.message || 'Unable to update the order status.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <article className="flex flex-col rounded-xl bg-white p-4 shadow-sm sm:p-5">
      <header className="border-b border-gray-100 pb-3">
        {shopOrder.shop?.name && (
          <p className="mb-1 inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-[#ff4d2d]">
            {shopOrder.shop.name}
          </p>
        )}
        <p className="font-semibold text-gray-900">{data.user?.fullName || 'Customer'}</p>
        <p className="text-xs text-gray-500">
          order #{data._id.slice(-6)} · {formatDateTime(data.createdAt)}
        </p>
        <div className="mt-2 space-y-1 text-sm text-gray-600">
          {data.user?.email && (
            <a href={`mailto:${data.user.email}`} className="flex items-center gap-2 hover:text-[#ff4d2d]">
              <FaEnvelope className="text-[#ff4d2d]" aria-hidden="true" />
              {data.user.email}
            </a>
          )}
          {data.user?.mobile && (
            <a href={`tel:${data.user.mobile}`} className="flex items-center gap-2 hover:text-[#ff4d2d]">
              <FaPhoneAlt className="text-[#ff4d2d]" aria-hidden="true" />
              {data.user.mobile}
            </a>
          )}
          <p className="flex items-start gap-2">
            <FaMapMarkerAlt className="mt-0.5 shrink-0 text-[#ff4d2d]" aria-hidden="true" />
            <span>{data.deliveryAddress?.text}</span>
          </p>
          {data.deliveryAddress?.latitude != null && data.deliveryAddress?.longitude != null && (
            <p className="pl-6 text-xs text-gray-500">
              Lat: {data.deliveryAddress.latitude}, Lon: {data.deliveryAddress.longitude}
            </p>
          )}
        </div>
      </header>

      <div className="category-scrollbar mt-3 flex gap-3 overflow-x-auto pb-2">
        {shopOrder.shopOrderItems.map((item) => (
          <div key={item.item} className="w-36 flex-none rounded-lg border border-gray-200 bg-white p-2">
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

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <span className="text-sm">
          status:{' '}
          <span className="font-semibold capitalize text-[#ff4d2d]">
            {statusOptions.find((option) => option.value === shopOrder.status)?.label ||
              finalStatusLabels[shopOrder.status] ||
              shopOrder.status}
          </span>
        </span>

        <select
          value={shopOrder.status}
          onChange={(event) => handleUpdateStatus(data._id, shopOrder._id, event.target.value)}
          disabled={isFinal || isUpdating}
          aria-label="Change order status"
          className="rounded-md border border-[#ff4d2d] px-3 py-1 text-sm text-[#ff4d2d] focus:outline-none focus:ring-2 focus:ring-[#ff4d2d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="pending" disabled={shopOrder.status !== 'pending'}>
            Pending
          </option>
          <option value="preparing" disabled={!['pending', 'preparing'].includes(shopOrder.status)}>
            Preparing
          </option>
          <option value="out-for-delivery">Out Of Delivery</option>
          {finalStatusLabels[shopOrder.status] && (
            <option value={shopOrder.status}>{finalStatusLabels[shopOrder.status]}</option>
          )}
        </select>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-xs text-gray-500">
          {data.paymentMethod === 'online' ? 'Paid online' : 'Cash on Delivery'}
        </span>
        <span className="font-bold text-gray-800">Total: ₹{shopOrder.subtotal}</span>
      </div>

      {shopOrder.status === 'delivered' && shopOrder.assignedDeliveryBoy?.fullName && (
        <div className="mt-3 rounded-lg border border-green-600 bg-green-50 px-3 py-2 text-sm text-gray-800">
          <p>Delivered by:</p>
          <p className="font-medium">
            {shopOrder.assignedDeliveryBoy.fullName}
            {shopOrder.assignedDeliveryBoy.mobile && `-${shopOrder.assignedDeliveryBoy.mobile}`}
          </p>
        </div>
      )}

      {shopOrder.status === 'out-for-delivery' && (
        <div className="mt-3 rounded-lg border border-gray-800 bg-orange-50 px-3 py-2 text-sm text-gray-800">
          {shopOrder.assignedDeliveryBoy?.fullName ? (
            <>
              <p>Assigned Delivery Boy:</p>
              <p className="font-medium">
                {shopOrder.assignedDeliveryBoy.fullName}
                {shopOrder.assignedDeliveryBoy.mobile && `-${shopOrder.assignedDeliveryBoy.mobile}`}
              </p>
              <button
                type="button"
                onClick={() => navigate(`/track-order/${data._id}`)}
                className="mt-2 w-full rounded-lg bg-[#ff4d2d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e64327]"
              >
                Track Order
              </button>
            </>
          ) : shopOrder.assignment?.broadcastedTo?.length > 0 ? (
            <>
              <p>Available Delivery Boys:</p>
              {shopOrder.assignment.broadcastedTo.map((boy) => (
                <p key={boy._id}>
                  {boy.fullName}
                  {boy.mobile && (
                    <a href={`tel:${boy.mobile}`} className="hover:text-[#ff4d2d] hover:underline">
                      -{boy.mobile}
                    </a>
                  )}
                </p>
              ))}
            </>
          ) : (
            <p>Waiting for delivery boy</p>
          )}
        </div>
      )}
    </article>
  )
}

export default OwnerOrderCard
