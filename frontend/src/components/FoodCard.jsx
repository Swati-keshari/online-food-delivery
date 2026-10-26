import { useState } from 'react'
import { FaShoppingCart, FaUtensils } from 'react-icons/fa'
import { FaMinus, FaPlus, FaRegStar, FaStar, FaStarHalfStroke } from 'react-icons/fa6'
import { useDispatch, useSelector } from 'react-redux'
import { addToCart, setCartOpen } from '../redux/cartSlice'

const fallbackImage =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80'

const getImageUrl = (image, apiUrl) => {
  if (!image) return fallbackImage
  return image.startsWith('http') ? image : `${apiUrl}${image}`
}

// Full star up to the rating, half star for a remainder of .5 or more, empty after.
const renderStars = (rating) => {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      stars.push(<FaStar key={i} className="text-yellow-500" />)
    } else if (i - rating <= 0.5) {
      stars.push(<FaStarHalfStroke key={i} className="text-yellow-500" />)
    } else {
      stars.push(<FaRegStar key={i} className="text-yellow-500" />)
    }
  }
  return stars
}

const FoodCard = ({ data, apiUrl, unavailableReason = '' }) => {
  const rating = Number(data.rating?.average || 0)
  const ratingCount = Number(data.rating?.count || 0)
  const [quantity, setQuantity] = useState(0)
  const dispatch = useDispatch()
  const isInCart = useSelector((state) =>
    state.cart.cartItems.some((cartItem) => cartItem.id === data._id),
  )

  const handleAddToCart = () => {
    dispatch(
      addToCart({
        id: data._id,
        name: data.name,
        price: Number(data.price || 0),
        image: getImageUrl(data.image, apiUrl),
        shopId: data.shopId,
        shopName: data.shopName,
        quantity: Math.max(quantity, 1),
      }),
    )
    setQuantity(0)
    dispatch(setCartOpen(true))
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm transition hover:shadow-md">
      <img
        src={getImageUrl(data.image, apiUrl)}
        alt={data.name}
        className="h-44 w-full object-cover"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.src = fallbackImage
        }}
      />
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-gray-900">{data.name}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {data.shopName} · {data.category}
        </p>
        <div
          className="mt-2 flex items-center gap-1 text-sm"
          aria-label={`Rated ${rating.toFixed(1)} out of 5 from ${ratingCount} ratings`}
        >
          <span className="flex items-center gap-0.5" aria-hidden="true">
            {renderStars(rating)}
          </span>
          <span className="ml-1 text-xs text-gray-500" aria-hidden="true">
            {ratingCount > 0 ? `${rating.toFixed(1)} (${ratingCount})` : 'No ratings yet'}
          </span>
        </div>
        {data.description && (
          <p className="mt-2 line-clamp-2 text-sm text-gray-600">{data.description}</p>
        )}
        <p className="mt-3 flex items-center gap-1 text-xs font-medium text-gray-500">
          <FaUtensils className="text-[#ff4d2d]" aria-hidden="true" />
          {data.foodType === 'non-veg' ? 'Non-veg' : 'Veg'}
        </p>

        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-lg font-bold text-gray-900">
            ₹{Number(data.price || 0).toFixed(2)}
          </span>

          {unavailableReason ? (
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
              {unavailableReason}
            </span>
          ) : (
            <div className="flex items-center overflow-hidden rounded-full border border-gray-200 shadow-sm">
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(current - 1, 0))}
                disabled={quantity === 0}
                aria-label={`Decrease ${data.name} quantity`}
                className="px-2 py-1 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FaMinus size={12} aria-hidden="true" />
              </button>
              <span className="min-w-6 text-center text-sm font-medium" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((current) => current + 1)}
                aria-label={`Increase ${data.name} quantity`}
                className="px-2 py-1 text-gray-700 transition hover:bg-gray-100"
              >
                <FaPlus size={12} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                aria-label={`Add ${data.name} to cart`}
                title="Add to cart"
                className={`px-3 py-2 text-white transition ${
                  isInCart ? 'bg-gray-800 hover:bg-gray-900' : 'bg-[#ff4d2d] hover:bg-[#e64327]'
                }`}
              >
                <FaShoppingCart size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default FoodCard
