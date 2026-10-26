import { useState } from 'react'
import { FaStar } from 'react-icons/fa'
import { rateShopOrder } from '../lib/orders'

const StarInput = ({ value, onChange, label }) => (
  <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        role="radio"
        aria-checked={value === star}
        aria-label={`${star} star${star > 1 ? 's' : ''}`}
        onClick={() => onChange(star)}
        className="p-0.5 text-xl transition hover:scale-110"
      >
        <FaStar className={star <= value ? 'text-yellow-400' : 'text-gray-300'} aria-hidden="true" />
      </button>
    ))}
  </div>
)

// Shown under a delivered shop part: rate each item once, with an optional review.
const RateOrder = ({ orderId, shopOrder, onRated }) => {
  const [ratings, setRatings] = useState({})
  const [review, setReview] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  if (shopOrder.ratedAt) {
    return (
      <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-gray-700">
        <p className="font-medium text-green-700">Thanks for rating!</p>
        {shopOrder.shopOrderItems.map((item) =>
          item.rating ? (
            <p key={item.item} className="flex items-center gap-1">
              {item.name}: {item.rating}
              <FaStar className="text-yellow-400" aria-hidden="true" />
            </p>
          ) : null,
        )}
        {shopOrder.review && <p className="mt-1 italic text-gray-600">“{shopOrder.review}”</p>}
      </div>
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      const result = await rateShopOrder(orderId, shopOrder._id, { ratings, review })
      onRated(orderId, result.shopOrder)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-lg border border-orange-100 bg-white p-3">
      <p className="text-sm font-semibold text-gray-900">Rate your food</p>
      {shopOrder.shopOrderItems.map((item) => (
        <div key={item.item} className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-700">
          <span>{item.name}</span>
          <StarInput
            label={`Rating for ${item.name}`}
            value={ratings[item.item] || 0}
            onChange={(stars) => setRatings((current) => ({ ...current, [item.item]: stars }))}
          />
        </div>
      ))}
      <textarea
        value={review}
        onChange={(event) => setReview(event.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Write a review (optional)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]"
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSaving || Object.keys(ratings).length === 0}
        className="rounded-lg bg-[#ff4d2d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e64327] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? 'Saving...' : 'Submit Rating'}
      </button>
    </form>
  )
}

export default RateOrder
