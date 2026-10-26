import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaChevronLeft, FaChevronRight, FaMapMarkerAlt } from 'react-icons/fa'
import categories from '../category'
import { getPublicShops } from '../lib/marketplace'
import FoodCard from './FoodCard'

const fallbackImage =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80'

const getImageUrl = (image, apiUrl) => {
  if (!image) return fallbackImage
  return image.startsWith('http') ? image : `${apiUrl}${image}`
}

const UserDashboard = ({
  city,
  detectedCity,
  latitude,
  longitude,
  cityLoading,
  cityError,
  searchValue,
}) => {
  const navigate = useNavigate()
  const [shops, setShops] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [foodTypeFilter, setFoodTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recommended')
  const [loadedCity, setLoadedCity] = useState('')
  const [categoryScroll, setCategoryScroll] = useState({ max: 0, value: 0 })
  const categoryScrollRef = useRef(null)
  const [shopScroll, setShopScroll] = useState({ max: 0, value: 0 })
  const shopScrollRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')

  useEffect(() => {
    const scrollContainer = categoryScrollRef.current
    if (!scrollContainer) return undefined

    const updateScrollPosition = () => {
      setCategoryScroll({
        max: Math.max(scrollContainer.scrollWidth - scrollContainer.clientWidth, 0),
        value: scrollContainer.scrollLeft,
      })
    }

    updateScrollPosition()
    scrollContainer.addEventListener('scroll', updateScrollPosition, { passive: true })
    window.addEventListener('resize', updateScrollPosition)

    return () => {
      scrollContainer.removeEventListener('scroll', updateScrollPosition)
      window.removeEventListener('resize', updateScrollPosition)
    }
  }, [])

  // Nearby search only applies while the city is still the one detected from the
  // user's location; a manually typed city is matched by name alone.
  const useCurrentLocation =
    latitude != null && longitude != null && Boolean(detectedCity) && city.trim() === detectedCity.trim()

  useEffect(() => {
    let isActive = true
    if (!city.trim()) {
      return () => {
        isActive = false
      }
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      setError('')
      try {
        const result = await getPublicShops(
          city,
          useCurrentLocation ? { latitude, longitude } : null,
        )
        if (isActive) {
          setShops(result)
          setLoadedCity(city.trim())
        }
      } catch (requestError) {
        if (isActive) setError(requestError.message || 'Unable to load shops.')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }, 300)

    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [city, useCurrentLocation, latitude, longitude])

  const cityShops = useMemo(
    () => (city.trim() && loadedCity === city.trim() ? shops : []),
    [city, loadedCity, shops],
  )
  useEffect(() => {
    const scrollContainer = shopScrollRef.current
    if (!scrollContainer) return undefined

    const updateScrollPosition = () => {
      setShopScroll({
        max: Math.max(scrollContainer.scrollWidth - scrollContainer.clientWidth, 0),
        value: scrollContainer.scrollLeft,
      })
    }

    updateScrollPosition()
    scrollContainer.addEventListener('scroll', updateScrollPosition, { passive: true })
    window.addEventListener('resize', updateScrollPosition)

    return () => {
      scrollContainer.removeEventListener('scroll', updateScrollPosition)
      window.removeEventListener('resize', updateScrollPosition)
    }
  }, [cityShops])

  const isLoadingCityShops = city.trim()
    ? isLoading || loadedCity !== city.trim()
    : cityLoading

  const allItems = useMemo(
    () =>
      // Closed shops take no orders, so their food is not suggested.
      cityShops
        .filter((shop) => !shop.isClosed)
        .flatMap((shop) => (shop.items || []).map((item) => ({ ...item, shopName: shop.name, shopId: shop._id }))),
    [cityShops],
  )

  const visibleItems = useMemo(() => {
    const query = searchValue.trim().toLocaleLowerCase()
    const filtered = allItems.filter((item) => {
      const matchesCategory = !selectedCategory || item.category === selectedCategory
      const matchesSearch =
        !query ||
        [item.name, item.category, item.description, item.shopName]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(query))
      const matchesFoodType = foodTypeFilter === 'all' || (item.foodType || 'veg') === foodTypeFilter
      return matchesCategory && matchesSearch && matchesFoodType
    })
    const sorters = {
      'price-low': (a, b) => a.price - b.price,
      'price-high': (a, b) => b.price - a.price,
      rating: (a, b) => (b.rating?.average || 0) - (a.rating?.average || 0),
    }
    return sorters[sortBy] ? [...filtered].sort(sorters[sortBy]) : filtered
  }, [allItems, searchValue, selectedCategory, foodTypeFilter, sortBy])

  const clearFilters = () => {
    setSelectedCategory('')
    setFoodTypeFilter('all')
    setSortBy('recommended')
  }

  return (
    <main className="min-h-screen bg-[#fff9f6]">
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Find your next favourite
            </h1>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              Delicious food from shops near you
            </p>
          </div>
          {city && (
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-700 shadow-sm">
              <FaMapMarkerAlt className="text-[#ff4d2d]" aria-hidden="true" />
              {city}
            </p>
          )}
        </div>

        <section aria-labelledby="categories-heading" className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <h2 id="categories-heading" className="text-lg font-semibold text-gray-900 sm:text-xl">
              Inspiration for your first order
            </h2>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className="ml-auto text-sm font-medium text-[#e64327] hover:underline"
              >
                Clear category
              </button>
            )}
          </div>
          <div className="relative">
            <div
              ref={categoryScrollRef}
              aria-label="Food categories"
              className="category-scrollbar flex w-full gap-2 overflow-x-auto pb-3 sm:gap-3"
              role="region"
              tabIndex={0}
            >
              <button
                type="button"
                aria-pressed={!selectedCategory}
                onClick={() => setSelectedCategory('')}
                className={`group w-[min(40vw,9rem)] min-w-28 flex-none overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-40 ${
                  !selectedCategory ? 'border-[#ff4d2d] ring-2 ring-[#ff4d2d]/20' : 'border-orange-100'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-20 w-full items-center justify-center bg-orange-50 text-4xl transition duration-300 group-hover:scale-105 sm:h-28 sm:text-5xl"
                >
                  🍽️
                </span>
                <span className="block truncate px-2 py-2 text-center text-xs font-medium text-gray-700 sm:px-3 sm:text-sm">
                  All
                </span>
              </button>
              {categories.map((category) => {
                const isSelected = selectedCategory === category.name
                return (
                  <button
                    type="button"
                    key={category.name}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(isSelected ? '' : category.name)}
                    className={`group w-[min(40vw,9rem)] min-w-28 flex-none overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-40 ${
                      isSelected ? 'border-[#ff4d2d] ring-2 ring-[#ff4d2d]/20' : 'border-orange-100'
                    }`}
                  >
                    <img
                      src={category.image}
                      alt=""
                      className="h-20 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-28"
                      loading="lazy"
                    />
                    <span className="block truncate px-2 py-2 text-center text-xs font-medium text-gray-700 sm:px-3 sm:text-sm">
                      {category.name}
                    </span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              aria-label="Scroll categories left"
              disabled={categoryScroll.value <= 0}
              onClick={() => categoryScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-orange-200 bg-white/95 p-1.5 text-sm text-[#e64327] shadow-md transition hover:bg-orange-50 sm:left-2 sm:p-2 sm:text-base disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/95"
            >
              <FaChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Scroll categories right"
              disabled={categoryScroll.value >= categoryScroll.max - 1}
              onClick={() => categoryScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-orange-200 bg-white/95 p-1.5 text-sm text-[#e64327] shadow-md transition hover:bg-orange-50 sm:right-2 sm:p-2 sm:text-base disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/95"
            >
              <FaChevronRight aria-hidden="true" />
            </button>
          </div>
        </section>

        <section aria-labelledby="shops-heading" className="mb-10">
          <h2 id="shops-heading" className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl">
            Best shops{city ? ` in ${city}` : ''}
          </h2>
          {error ? (
            <p role="alert" className="rounded-xl bg-white p-5 text-sm text-red-600 shadow-sm">
              {error}
            </p>
          ) : isLoadingCityShops ? (
            <p className="rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm">
              {city ? `Finding shops in ${city}...` : 'Detecting your city...'}
            </p>
          ) : cityShops.length > 0 ? (
            <div className="relative">
              <div
                ref={shopScrollRef}
                aria-label={`Shops in ${city}`}
                className="category-scrollbar flex w-full gap-2 overflow-x-auto pb-3 sm:gap-3"
                role="region"
                tabIndex={0}
              >
                {cityShops.map((shop) => {
                  return (
                    <button
                      type="button"
                      key={shop._id}
                      onClick={() => navigate(`/shop/${shop._id}`)}
                      className="group w-[min(40vw,9rem)] min-w-28 flex-none overflow-hidden rounded-xl border border-orange-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-40"
                    >
                      <img
                        src={getImageUrl(shop.image, apiUrl)}
                        alt={shop.name}
                        className="h-20 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-28"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = fallbackImage
                        }}
                      />
                      <span className="block truncate bg-orange-50 px-2 py-2 text-center text-xs font-medium text-gray-800 sm:px-3 sm:text-sm">
                        {shop.name}
                      </span>
                      {shop.isClosed && (
                        <span className="block bg-red-50 pb-1 text-center text-[11px] font-semibold text-red-600">
                          Closed now
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                aria-label="Scroll shops left"
                disabled={shopScroll.value <= 0}
                onClick={() => shopScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-orange-200 bg-white/95 p-1.5 text-sm text-[#e64327] shadow-md transition hover:bg-orange-50 sm:left-2 sm:p-2 sm:text-base disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/95"
              >
                <FaChevronLeft aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Scroll shops right"
                disabled={shopScroll.value >= shopScroll.max - 1}
                onClick={() => shopScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full border border-orange-200 bg-white/95 p-1.5 text-sm text-[#e64327] shadow-md transition hover:bg-orange-50 sm:right-2 sm:p-2 sm:text-base disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/95"
              >
                <FaChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : !city.trim() ? (
            <p className="rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm">
              {cityError || 'Enter your city to find nearby shops.'}
            </p>
          ) : (
            <p className="rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm">
              No shops found{city ? ` in ${city}` : ''}.
            </p>
          )}
        </section>

        <section aria-labelledby="items-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="items-heading" className="text-lg font-semibold text-gray-900 sm:text-xl">
              {selectedCategory ? `${selectedCategory} items` : 'Suggested items'}
            </h2>
            {(selectedCategory || foodTypeFilter !== 'all' || sortBy !== 'recommended') && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-[#e64327] hover:underline"
              >
                Show all items
              </button>
            )}
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'veg', label: '🟢 Veg' },
              { value: 'non-veg', label: '🔴 Non-veg' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={foodTypeFilter === option.value}
                onClick={() => setFoodTypeFilter(option.value)}
                className={`rounded-full border px-3 py-1 text-sm transition ${
                  foodTypeFilter === option.value
                    ? 'border-[#ff4d2d] bg-[#ff4d2d] text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-[#ff4d2d]'
                }`}
              >
                {option.label}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">
              Sort by
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]"
              >
                <option value="recommended">Recommended</option>
                <option value="rating">Rating</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </label>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-white p-5 text-sm text-red-600 shadow-sm">
              {error}
            </p>
          ) : isLoadingCityShops ? (
            <p className="rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm">
              {city ? `Loading menu items in ${city}...` : 'Detecting your city...'}
            </p>
          ) : !city.trim() ? (
            <p className="rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm">
              {cityError || 'Enter your city to see available food.'}
            </p>
          ) : visibleItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleItems.map((item) => (
                <FoodCard key={item._id} data={item} apiUrl={apiUrl} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-white p-5 text-sm text-gray-600 shadow-sm">
              {searchValue.trim()
                ? 'No menu items match your search.'
                : 'No menu items found. Try another category or city.'}
            </p>
          )}
        </section>
      </section>
    </main>
  )
}

export default UserDashboard
