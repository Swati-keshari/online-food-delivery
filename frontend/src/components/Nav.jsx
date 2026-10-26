import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaClipboardList, FaMapMarkerAlt, FaPlus, FaSearch, FaShoppingCart } from 'react-icons/fa'
import { IoClose } from 'react-icons/io5'
import { setUserData } from '../redux/userSlice'
import { setMyShopData } from '../redux/ownerSlice'
import { clearCart, setCartOpen } from '../redux/cartSlice'
import CartDrawer from './CartDrawer'
import { getOwnerOrders } from '../lib/orders'
import useSocketEvent from '../hooks/useSocketEvent'

const roleNavigation = {
  user: {
    searchPlaceholder: 'Search delicious food...',
    actionLabel: 'My Orders',
    showCart: true,
  },
  owner: {
    showSearch: false,
    actionLabel: 'Add Food Item',
    secondaryActionLabel: 'My Orders',
    showCart: false,
  },
  deliveryBoy: {
    searchPlaceholder: 'Search assigned deliveries...',
    actionLabel: 'My Deliveries',
    showCart: false,
  },
}

const Nav = ({
  role,
  fullName,
  city,
  setCity,
  cityLoading,
  cityError,
  searchValue,
  onSearchChange,
}) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dispatch = useDispatch()
  const myShopData = useSelector((state) => state.owner.myShopData)
  const cartCount = useSelector((state) =>
    state.cart.cartItems.reduce((sum, item) => sum + item.quantity, 0),
  )
  const navigate = useNavigate()
  const navigation = roleNavigation[role] || roleNavigation.user
  const canAddFoodItem = role === 'owner' && Boolean(myShopData)
  const profileInitial = fullName?.trim()?.charAt(0)?.toUpperCase() || 'U'
  const [pendingOrderCount, setPendingOrderCount] = useState(0)
  const [orderReloadKey, setOrderReloadKey] = useState(0)
  const reloadOrderCount = useCallback(() => setOrderReloadKey((key) => key + 1), [])
  useSocketEvent('order:new', reloadOrderCount)
  useSocketEvent('order:updated', reloadOrderCount)

  useEffect(() => {
    if (role !== 'owner') return undefined
    let isActive = true
    getOwnerOrders()
      .then((orders) => {
        if (isActive) {
          setPendingOrderCount(orders.filter((order) => order.shopOrder?.status === 'pending').length)
        }
      })
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [role, orderReloadKey])

  const handleLogout = async () => {
    setLogoutError('')
    setIsLoggingOut(true)

    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
      await axios.get(`${apiUrl}/api/auth/signout`, { withCredentials: true })
      dispatch(setUserData(null))
      dispatch(setMyShopData(null))
      dispatch(clearCart())
      navigate('/signin', { replace: true })
    } catch (error) {
      setLogoutError(
        error.response?.data?.message || error.message || 'Unable to log out. Please try again.',
      )
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <nav className="bg-[#fffaf7] px-3 py-3 sm:px-6">
      <div
        className={`mx-auto flex w-full flex-wrap items-center gap-x-3 gap-y-3 sm:gap-x-4 lg:flex-nowrap ${
          role === 'owner' ? 'max-w-6xl justify-center' : 'max-w-180'
        }`}
      >
        <h1 className="shrink-0 text-xl font-bold tracking-tight text-[#ff4d2d] sm:text-2xl">Vingo</h1>

        <div
          className={`${role === 'owner' ? '' : 'ml-auto'} flex items-center gap-2 lg:hidden`}
        >
          {navigation.showSearch !== false ? (
            <button
              type="button"
              aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
              aria-expanded={mobileSearchOpen}
              onClick={() => setMobileSearchOpen((isOpen) => !isOpen)}
              className="flex h-8 w-7 items-center justify-center text-[#ff4d2d]"
            >
              {mobileSearchOpen ? <IoClose aria-hidden="true" /> : <FaSearch aria-hidden="true" />}
            </button>
          ) : (
            <>
              {navigation.secondaryActionLabel && (
                <button
                  type="button"
                  aria-label={`${navigation.secondaryActionLabel}, ${pendingOrderCount} pending orders`}
                  onClick={() => navigate('/owner/orders')}
                  className="relative flex h-8 w-7 items-center justify-center text-[#ff4d2d]"
                >
                  <FaClipboardList aria-hidden="true" />
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#ff4d2d] px-0.5 text-[9px] font-semibold leading-none text-white">
                    {pendingOrderCount}
                  </span>
                </button>
              )}
              {(!navigation.secondaryActionLabel || canAddFoodItem) && (
                <button
                  type="button"
                  aria-label={navigation.actionLabel}
                  onClick={() => role === 'owner' && navigate('/owner/add-item')}
                  className="flex h-8 w-7 items-center justify-center text-[#ff4d2d]"
                >
                  <FaPlus aria-hidden="true" />
                </button>
              )}
            </>
          )}
          {navigation.showCart && (
            <button
              type="button"
              aria-label={`Shopping cart, ${cartCount} items`}
              onClick={() => dispatch(setCartOpen(true))}
              className="relative flex h-8 w-7 items-center justify-center text-[#ff4d2d]"
            >
              <FaShoppingCart aria-hidden="true" />
              <span className="absolute right-0 top-0 text-[10px] font-semibold">{cartCount}</span>
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              aria-label={`Profile${fullName ? `: ${fullName}` : ''}`}
              aria-expanded={showProfileMenu}
              onClick={() => {
                setShowProfileMenu((isOpen) => !isOpen)
                setLogoutError('')
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff4d2d] text-xs font-semibold text-white shadow-sm"
            >
              {profileInitial}
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-gray-100 bg-white p-3 shadow-lg">
                {fullName && <p className="mb-2 truncate text-sm font-medium text-gray-800">{fullName}</p>}
                {role === 'user' && (
                  <button
                    type="button"
                    onClick={() => navigate('/my-orders')}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-orange-50"
                  >
                    My Orders
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-orange-50"
                >
                  My Profile
                </button>
                {logoutError && <p role="alert" className="mb-2 text-xs text-red-600">{logoutError}</p>}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-[#ff4d2d] hover:bg-orange-50 disabled:opacity-60"
                >
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
                </button>
              </div>
            )}
          </div>
        </div>

        {navigation.showSearch !== false && (
        <div className={`${mobileSearchOpen ? 'flex' : 'hidden'} order-3 h-12 w-full items-center rounded-lg bg-white px-3 shadow-[0_5px_18px_rgba(0,0,0,0.12)] sm:px-4 lg:order-0 lg:flex lg:w-auto lg:flex-1`}>
          <label className="flex min-w-0 flex-1 items-center gap-2 pr-3 sm:pr-4">
            <FaMapMarkerAlt className="shrink-0 text-[#ff4d2d]" aria-hidden="true" />
            <span className="sr-only">Your city</span>
            <input
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder={cityLoading ? 'Detecting city...' : 'Enter your city'}
              aria-label="Your city"
              title={cityError || undefined}
              autoComplete="address-level2"
              className="w-full min-w-0 bg-transparent text-xs text-gray-700 outline-none"
            />
          </label>

          <span className="h-6 border-l border-gray-300" aria-hidden="true" />

          <label className="flex min-w-0 flex-[1.8] items-center gap-2 pl-3 sm:pl-4">
            <FaSearch className="shrink-0 text-[#ff4d2d]" aria-hidden="true" />
            <span className="sr-only">{navigation.searchPlaceholder}</span>
            <input
              type="search"
              placeholder={navigation.searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              className="w-full min-w-0 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
            />
          </label>
        </div>
        )}

        <div
          className={`${role === 'owner' ? '' : 'ml-auto'} hidden shrink-0 items-center gap-2 lg:flex`}
        >
          {navigation.showCart && (
            <button
              type="button"
              aria-label={`Shopping cart, ${cartCount} items`}
              onClick={() => dispatch(setCartOpen(true))}
              className="relative flex h-10 w-10 items-center justify-center text-[#ff4d2d] transition hover:bg-orange-50"
            >
              <FaShoppingCart className="text-lg" aria-hidden="true" />
              <span className="absolute right-0.5 top-0 text-[10px] font-semibold text-[#ff4d2d]">{cartCount}</span>
            </button>
          )}
          {navigation.secondaryActionLabel && (
            <button
              type="button"
              aria-label={`${navigation.secondaryActionLabel}, ${pendingOrderCount} pending orders`}
              onClick={() => navigate('/owner/orders')}
              className="relative rounded-md bg-[#fff0eb] px-3 py-2 text-xs font-semibold text-[#ff4d2d] transition hover:bg-[#ffe3da]"
            >
              {navigation.secondaryActionLabel}
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff4d2d] px-1 text-[10px] font-semibold leading-none text-white">
                {pendingOrderCount}
              </span>
            </button>
          )}
          {(!navigation.secondaryActionLabel || canAddFoodItem) && (
            <button
              type="button"
              onClick={() => {
                if (role === 'owner') navigate('/owner/add-item')
                if (role === 'user') navigate('/my-orders')
                // A delivery boy's deliveries live on their home dashboard.
                if (role === 'deliveryBoy') navigate('/home')
              }}
              className="flex items-center gap-1.5 rounded-md bg-[#fff0eb] px-3 py-2 text-xs font-semibold text-[#ff4d2d] transition hover:bg-[#ffe3da]"
            >
              {role === 'owner' && <FaPlus aria-hidden="true" />}
              {navigation.actionLabel}
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              aria-label={`Profile${fullName ? `: ${fullName}` : ''}`}
              aria-expanded={showProfileMenu}
              onClick={() => {
                setShowProfileMenu((isOpen) => !isOpen)
                setLogoutError('')
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff4d2d] text-sm font-semibold text-white shadow-sm"
            >
              {profileInitial}
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 top-11 z-20 w-48 rounded-lg border border-gray-100 bg-white p-3 shadow-lg">
                {fullName && <p className="mb-2 truncate text-sm font-medium text-gray-800">{fullName}</p>}
                {role === 'user' && (
                  <button
                    type="button"
                    onClick={() => navigate('/my-orders')}
                    className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-orange-50"
                  >
                    My Orders
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-orange-50"
                >
                  My Profile
                </button>
                {logoutError && <p role="alert" className="mb-2 text-xs text-red-600">{logoutError}</p>}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-[#ff4d2d] hover:bg-orange-50 disabled:opacity-60"
                >
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {navigation.showCart && <CartDrawer />}
    </nav>
  )
}

export default Nav
