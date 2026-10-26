import { useEffect, useState } from 'react'
import { FaMapMarkerAlt, FaStore, FaUtensils } from 'react-icons/fa'
import { IoArrowBack } from 'react-icons/io5'
import { useNavigate, useParams } from 'react-router-dom'
import CartDrawer from '../components/CartDrawer'
import FoodCard from '../components/FoodCard'
import { getShopById } from '../lib/marketplace'

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
const fallbackImage =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80'

const getImageUrl = (image) => {
  if (!image) return fallbackImage
  return image.startsWith('http') ? image : `${apiUrl}${image}`
}

const formatAddress = (address) =>
  [address?.street, address?.city, address?.state, address?.postalCode]
    .filter(Boolean)
    .join(', ')

const ShopPage = () => {
  const { shopId } = useParams()
  const navigate = useNavigate()
  const [shop, setShop] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true
    getShopById(shopId)
      .then((result) => {
        if (isActive) setShop(result)
      })
      .catch((requestError) => {
        if (isActive) setError(requestError.message || 'Unable to load the shop.')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [shopId])

  return (
    <main className="min-h-screen bg-white">
      <button
        type="button"
        onClick={() => navigate('/home')}
        aria-label="Go back to home"
        className="fixed left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white shadow-md transition hover:bg-black/70"
      >
        <IoArrowBack className="h-6 w-6" aria-hidden="true" />
      </button>

      {isLoading ? (
        <p className="p-10 text-center text-sm text-gray-600">Loading shop...</p>
      ) : error ? (
        <p role="alert" className="p-10 text-center text-sm text-red-600">
          {error}
        </p>
      ) : (
        <>
          <header className="relative h-64 w-full sm:h-80 lg:h-96">
            <img
              src={getImageUrl(shop.image)}
              alt=""
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.src = fallbackImage
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 px-4 text-center text-white">
              <FaStore className="mb-3 h-9 w-9 drop-shadow-md" aria-hidden="true" />
              <h1 className="text-3xl font-extrabold drop-shadow-md sm:text-5xl">{shop.name}</h1>
              {formatAddress(shop.address) && (
                <p className="mt-3 flex items-center gap-2 text-sm font-medium drop-shadow-md sm:text-base">
                  <FaMapMarkerAlt className="shrink-0 text-red-500" aria-hidden="true" />
                  {formatAddress(shop.address)}
                </p>
              )}
            </div>
          </header>

          <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <h2 className="mb-8 flex items-center justify-center gap-3 text-2xl font-bold text-gray-900">
              <FaUtensils className="text-red-500" aria-hidden="true" />
              Our Menu
            </h2>
            {shop.isClosed && (
              <p role="status" className="mx-auto mb-6 max-w-md rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
                {shop.name} is closed right now. You can browse the menu and order when it opens.
              </p>
            )}
            {shop.items?.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-6">
                {shop.items.map((item) => (
                  <div key={item._id} className="w-full sm:w-64">
                    <FoodCard
                      data={{ ...item, shopId: shop._id, shopName: shop.name }}
                      apiUrl={apiUrl}
                      unavailableReason={shop.isClosed ? 'Shop closed' : ''}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500">No items available in this shop yet.</p>
            )}
          </section>
        </>
      )}
      <CartDrawer />
    </main>
  )
}

export default ShopPage
