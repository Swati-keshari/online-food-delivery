import { useState } from 'react'
import { FaPlus, FaPen, FaUtensils } from 'react-icons/fa'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Nav from './Nav'
import OwnerItemCard from './OwnerItemCard'
import OwnerStats from './OwnerStats'
import { setShopClosed } from '../lib/shops'
import { selectMyShop, setMyShopData } from '../redux/ownerSlice'

const OwnerDashboard = ({ user, location }) => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const getImageUrl = (image) => (image?.startsWith('http') ? image : `${apiUrl}${image}`)
  const { myShops, myShopData, myShopLoading, myShopError, myShopNotFound } = useSelector(
    (state) => state.owner,
  )
  const [isTogglingShop, setIsTogglingShop] = useState(false)

  const handleToggleShop = async () => {
    const closing = !myShopData.isClosed
    if (closing && !window.confirm(`Close ${myShopData.name}? Customers will not be able to order until you open it again.`)) {
      return
    }
    setIsTogglingShop(true)
    try {
      dispatch(setMyShopData(await setShopClosed(myShopData._id, closing)))
    } catch (requestError) {
      alert(requestError.message)
    } finally {
      setIsTogglingShop(false)
    }
  }

  const sortedItems = [...(myShopData?.items ?? [])].sort((a, b) => {
    const aTime = new Date(a?.createdAt || 0).getTime()
    const bTime = new Date(b?.createdAt || 0).getTime()
    return bTime - aTime
  })

  return (
    <main className="min-h-screen bg-[#fffaf7]">
      <Nav
        role="owner"
        fullName={user?.fullName}
        city={location.city}
        setCity={location.setCity}
        cityLoading={location.loading}
        cityError={location.error}
      />
      {myShops.length > 0 && (
        <section aria-labelledby="my-shops-heading" className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
          <h2 id="my-shops-heading" className="mb-3 text-lg font-semibold text-gray-900 sm:text-xl">
            Your Shops
          </h2>
          <div className="category-scrollbar flex gap-3 overflow-x-auto pb-3" role="region" aria-label="Your shops">
            {myShops.map((shop) => {
              const isSelected = shop._id === myShopData?._id
              return (
                <button
                  type="button"
                  key={shop._id}
                  aria-pressed={isSelected}
                  onClick={() => dispatch(selectMyShop(shop._id))}
                  className={`group w-36 flex-none overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-40 ${
                    isSelected ? 'border-[#ff4d2d] ring-2 ring-[#ff4d2d]/20' : 'border-orange-100'
                  }`}
                >
                  <img
                    src={getImageUrl(shop.image)}
                    alt=""
                    className="h-20 w-full object-cover sm:h-24"
                    loading="lazy"
                  />
                  <span className="block truncate bg-orange-50 px-2 py-2 text-center text-xs font-medium text-gray-800 sm:text-sm">
                    {shop.name}
                  </span>
                  <span className="block pb-2 text-center text-[11px] text-gray-500">
                    {shop.items?.length || 0} items
                    {shop.isClosed && <span className="ml-1 font-semibold text-red-600">· Closed</span>}
                  </span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => navigate('/owner/create-shop')}
              className="flex w-36 flex-none flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#ff4d2d]/50 bg-white text-sm font-medium text-[#ff4d2d] transition hover:bg-orange-50 sm:w-40"
            >
              <FaPlus className="h-6 w-6" aria-hidden="true" />
              Add Shop
            </button>
          </div>
        </section>
      )}
      {myShops.length > 0 && <div className="pt-6"><OwnerStats /></div>}
      {myShopData && (
        <section className="flex w-full flex-col items-center gap-6 px-4 py-8 sm:px-6 sm:py-12">
          <h1 className="flex flex-wrap items-center justify-center gap-3 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            <FaUtensils className="h-7 w-7 text-[#ff4d2d] sm:h-8 sm:w-8" aria-hidden="true" />
            <span>Welcome to {myShopData.name}</span>
          </h1>
          {myShopData.image && (
            <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-orange-100 bg-white shadow-lg transition-shadow duration-300 hover:shadow-2xl">
              <div className="relative">
                <img
                  src={
                    myShopData.image.startsWith('http')
                      ? myShopData.image
                      : `${apiUrl}${myShopData.image}`
                  }
                  alt={myShopData.name || 'Shop'}
                  className="h-56 w-full object-cover sm:h-80"
                />
                <button
                  type="button"
                  onClick={() => navigate('/owner/edit-shop')}
                  aria-label="Edit shop details"
                  title="Edit shop details"
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#ff4d2d] text-white shadow-md transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#ff4d2d]"
                >
                  <FaPen size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    {myShopData.name}
                  </h2>
                  <button
                    type="button"
                    onClick={handleToggleShop}
                    disabled={isTogglingShop}
                    aria-pressed={!myShopData.isClosed}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
                      myShopData.isClosed
                        ? 'bg-red-50 text-red-600 ring-1 ring-red-200 hover:bg-red-100'
                        : 'bg-green-50 text-green-700 ring-1 ring-green-200 hover:bg-green-100'
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${myShopData.isClosed ? 'bg-red-500' : 'bg-green-500'}`}
                      aria-hidden="true"
                    />
                    {myShopData.isClosed ? 'Closed · Tap to open' : 'Open · Tap to close'}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {[myShopData.address?.city, myShopData.address?.state]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                {[
                  myShopData.address?.street,
                  myShopData.address?.postalCode,
                  myShopData.address?.country,
                ]
                  .filter(Boolean)
                  .length > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    {[
                      myShopData.address?.street,
                      myShopData.address?.postalCode,
                      myShopData.address?.country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      )}
      {myShopData && (!myShopData.items || myShopData.items.length === 0) && (
        <section className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
          <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-6 text-center shadow-lg transition-shadow duration-300 hover:shadow-2xl sm:min-h-72 sm:p-8">
            <FaUtensils
              className="mb-4 h-16 w-16 text-[#ff4d2d] sm:h-20 sm:w-20"
              aria-hidden="true"
            />
            <h2 className="mb-2 text-xl font-bold text-gray-800 sm:text-2xl">
              Add Your Food Item
            </h2>
            <p className="mb-6 max-w-lg text-sm text-gray-600 sm:text-base">
              Share your delicious creations with our customers by adding them to the menu.
            </p>
            <button
              type="button"
              onClick={() => navigate('/owner/add-item')}
              className="inline-flex items-center gap-2 rounded-full bg-[#ff4d2d] px-5 py-2.5 font-medium text-white shadow-md transition-colors duration-200 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-[#ff4d2d] focus:ring-offset-2"
            >
              <FaPlus aria-hidden="true" />
              Add Food
            </button>
          </div>
        </section>
      )}
      {myShopData?.items?.length > 0 && (
        <section className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Your Menu Items</h2>
            <button
              type="button"
              onClick={() => navigate('/owner/add-item')}
              className="inline-flex items-center gap-2 rounded-full bg-[#ff4d2d] px-5 py-2.5 font-medium text-white shadow-md transition-colors duration-200 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-[#ff4d2d] focus:ring-offset-2"
            >
              <FaPlus aria-hidden="true" />
              Add Food
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {sortedItems.map((item) => (
              <OwnerItemCard key={item._id} data={item} apiUrl={apiUrl} />
            ))}
          </div>
        </section>
      )}
      {myShopLoading && <p className="px-4 py-8 text-center text-sm text-gray-600">Loading shop...</p>}
      {myShopError && !myShopNotFound && (
        <p role="alert" className="px-4 py-8 text-center text-sm text-red-600">{myShopError}</p>
      )}
      {!myShopData && !myShopLoading && myShopNotFound && (
        <div className="flex justify-center px-4 py-10 sm:py-16">
          <section className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-lg sm:p-8">
            <FaUtensils className="mx-auto mb-4 h-16 w-16 text-[#ff4d2d]" aria-hidden="true" />
            <h1 className="mb-2 text-xl font-bold text-gray-800 sm:text-2xl">Add Your Restaurant</h1>
            <p className="mb-5 text-sm leading-6 text-gray-600">
              Join our food delivery platform and reach thousands of hungry customers every day.
            </p>
            <button
              type="button"
              onClick={() => navigate('/owner/create-shop')}
              className="rounded-lg bg-[#ff4d2d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e64327]"
            >
              Get Started
            </button>
          </section>
        </div>
      )}
    </main>
  )
}

export default OwnerDashboard
