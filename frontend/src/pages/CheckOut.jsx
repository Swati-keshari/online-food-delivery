import { useEffect, useState } from 'react'
import { FaCreditCard, FaMobileAlt } from 'react-icons/fa'
import { MdDeliveryDining } from 'react-icons/md'
import { IoArrowBack, IoLocationSharp, IoSearchOutline } from 'react-icons/io5'
import { TbCurrentLocation } from 'react-icons/tb'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { applyCoupon, getCoupons, loadRazorpayScript, openRazorpayCheckout, placeOrder, verifyPayment } from '../lib/orders'
import { addAddress } from '../lib/user'
import { setUserData } from '../redux/userSlice'
import { getShopById } from '../lib/marketplace'
import { reverseGeocode, searchAddress } from '../lib/geocode'
import { clearCart, refreshCartPrices } from '../redux/cartSlice'

// Keep in sync with DELIVERY_FEE in backend/controllers/order.controllers.js
const DELIVERY_FEE = 40
const DEFAULT_POSITION = { lat: 28.6139, lng: 77.209 }

// Bundlers break Leaflet's default marker image paths, so set them explicitly.
const markerIconConfig = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
})

const RecenterMap = ({ position }) => {
  const map = useMap()
  useEffect(() => {
    map.setView([position.lat, position.lng], map.getZoom(), { animate: true })
  }, [map, position.lat, position.lng])
  return null
}

const paymentOptions = [
  {
    value: 'cod',
    label: 'Cash on Delivery',
    note: 'Pay when your food arrives',
    icons: [{ Icon: MdDeliveryDining, className: 'bg-green-100 text-green-600' }],
  },
  {
    value: 'online',
    label: 'UPI / Credit / Debit Card',
    note: 'Pay securely online',
    icons: [
      { Icon: FaMobileAlt, className: 'bg-purple-100 text-purple-600' },
      { Icon: FaCreditCard, className: 'bg-blue-100 text-blue-600' },
    ],
  },
]

const CheckOut = ({ location }) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const cartItems = useSelector((state) => state.cart.cartItems)
  const user = useSelector((state) => state.user.userData)
  const [addressText, setAddressText] = useState(null)
  // True while the typed address has not been located on the map yet.
  const [isAddressTyped, setIsAddressTyped] = useState(false)
  const [currentAddress, setCurrentAddress] = useState('')
  const [pickedPosition, setPickedPosition] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponMessage, setCouponMessage] = useState('')
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [availableCoupons, setAvailableCoupons] = useState([])
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [addressSaveMessage, setAddressSaveMessage] = useState('')

  const detectedPosition =
    location.latitude != null && location.longitude != null
      ? { lat: location.latitude, lng: location.longitude }
      : null
  const position = pickedPosition ?? detectedPosition ?? DEFAULT_POSITION
  const deliveryAddressText = addressText ?? (currentAddress || location.address || '')

  // Show the address of the same current latitude/longitude the map is centred on.
  const { latitude, longitude } = location
  useEffect(() => {
    if (latitude == null || longitude == null) return undefined

    let isActive = true
    reverseGeocode({ lat: latitude, lng: longitude })
      .then((address) => {
        if (isActive && address) setCurrentAddress(address)
      })
      .catch((lookupError) => {
        if (isActive) setLocationError(lookupError.message)
      })
    return () => {
      isActive = false
    }
  }, [latitude, longitude])
  // The saved cart may hold old prices; the order is charged at the shop's current ones.
  const cartShopIds = [...new Set(cartItems.map((item) => item.shopId).filter(Boolean))].sort().join(',')
  useEffect(() => {
    if (!cartShopIds) return undefined
    let isActive = true
    Promise.all(cartShopIds.split(',').map((shopId) => getShopById(shopId)))
      .then((shops) => {
        if (!isActive) return
        const currentPrices = {}
        for (const shop of shops) {
          for (const item of shop.items || []) currentPrices[item._id] = Number(item.price)
        }
        dispatch(refreshCartPrices(currentPrices))
      })
      // Offline or a shop failed to load: keep the cart; the server still charges correct prices.
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [cartShopIds, dispatch])

  useEffect(() => {
    let isActive = true
    getCoupons()
      .then((coupons) => {
        if (isActive) setAvailableCoupons(coupons)
      })
      .catch(() => {})
    return () => {
      isActive = false
    }
  }, [])

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  // A coupon was checked against one cart; if the cart changes it must be applied again.
  const activeCoupon = appliedCoupon?.subtotal === subtotal ? appliedCoupon : null
  const discount = activeCoupon?.discount ?? 0
  const totalAmount = subtotal - discount + DELIVERY_FEE
  const savedAddresses = user?.addresses || []
  const isAddressSaved = savedAddresses.some((address) => address.text === deliveryAddressText)

  const handleApplyCoupon = async (code = couponInput) => {
    const couponCode = code.trim().toUpperCase()
    if (!couponCode) return
    setIsApplyingCoupon(true)
    setCouponMessage('')
    try {
      const result = await applyCoupon({ cartItems, couponCode })
      setAppliedCoupon({ code: result.coupon.code, discount: result.coupon.discount, subtotal })
      setCouponInput(result.coupon.code)
      setCouponMessage(`${result.coupon.code} applied: you save ₹${result.coupon.discount}.`)
    } catch (requestError) {
      setAppliedCoupon(null)
      setCouponMessage(requestError.message)
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const pickSavedAddress = (address) => {
    setPickedPosition({ lat: address.latitude, lng: address.longitude })
    setAddressText(address.text)
    setIsAddressTyped(false)
    setLocationError('')
  }

  const handleSaveAddress = async () => {
    setIsSavingAddress(true)
    setAddressSaveMessage('')
    try {
      const label = savedAddresses.some((address) => address.label === 'Home') ? 'Other' : 'Home'
      const addresses = await addAddress({
        label,
        text: deliveryAddressText,
        latitude: position.lat,
        longitude: position.lng,
      })
      dispatch(setUserData({ ...user, addresses }))
      setAddressSaveMessage(`Saved as ${label}.`)
    } catch (requestError) {
      setAddressSaveMessage(requestError.message)
    } finally {
      setIsSavingAddress(false)
    }
  }

  const moveToPosition = async (nextPosition) => {
    setPickedPosition(nextPosition)
    setLocationError('')
    try {
      const address = await reverseGeocode(nextPosition)
      if (address) setAddressText(address)
      setIsAddressTyped(false)
    } catch (lookupError) {
      setLocationError(lookupError.message)
    }
  }

  const handleSearch = async () => {
    if (!deliveryAddressText.trim()) return
    setIsLocating(true)
    setLocationError('')
    try {
      const place = await searchAddress(deliveryAddressText.trim())
      setPickedPosition(place.position)
      setAddressText(place.address)
      setIsAddressTyped(false)
    } catch (searchError) {
      setLocationError(searchError.message)
    } finally {
      setIsLocating(false)
    }
  }

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location is not supported by this browser.')
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        await moveToPosition({ lat: coords.latitude, lng: coords.longitude })
        setIsLocating(false)
      },
      (geoError) => {
        setLocationError(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Allow location access in your browser.'
            : 'Could not detect your location.',
        )
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handlePlaceOrder = async (event) => {
    event.preventDefault()
    setError('')
    setIsPlacing(true)

    try {
      // A typed address must be located first, or the order would carry the old pin's coordinates.
      let deliveryPosition = position
      let deliveryText = deliveryAddressText
      if (isAddressTyped) {
        const place = await searchAddress(deliveryAddressText.trim())
        deliveryPosition = place.position
        deliveryText = place.address
        setPickedPosition(place.position)
        setAddressText(place.address)
        setIsAddressTyped(false)
      }

      if (paymentMethod === 'online') await loadRazorpayScript()

      const { order, razorpay } = await placeOrder({
        cartItems,
        paymentMethod,
        couponCode: activeCoupon?.code,
        deliveryAddress: {
          text: deliveryText,
          latitude: deliveryPosition.lat,
          longitude: deliveryPosition.lng,
        },
      })

      if (paymentMethod === 'online') {
        const payment = await openRazorpayCheckout({ razorpay, user })
        const paymentDetails = {
          orderId: order._id,
          razorpayOrderId: payment.razorpay_order_id,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpaySignature: payment.razorpay_signature,
        }
        // The money has already been taken here, so a network blip must not lose the order.
        let paidOrder = null
        let verifyError = null
        for (let attempt = 0; attempt < 3 && !paidOrder; attempt += 1) {
          if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500))
          try {
            paidOrder = await verifyPayment(paymentDetails)
          } catch (requestError) {
            verifyError = requestError
            // A rejected signature will not change on retry.
            if (/verification failed/i.test(requestError.message)) break
          }
        }
        if (!paidOrder) {
          throw new Error(
            /verification failed/i.test(verifyError?.message || '')
              ? verifyError.message
              : `Payment received (ID ${payment.razorpay_payment_id}) but we could not confirm your order. Please do not pay again — contact support with this payment ID.`,
          )
        }
        setPlacedOrder(paidOrder)
      } else {
        setPlacedOrder(order)
      }
      dispatch(clearCart())
    } catch (requestError) {
      setError(requestError.message || 'Unable to place your order.')
    } finally {
      setIsPlacing(false)
    }
  }

  if (placedOrder) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff9f6] p-4">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-600">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Order Placed!</h1>
          <p className="mt-2 text-sm text-gray-600">
            Total ₹{Number(placedOrder.totalAmount).toFixed(2)} ·{' '}
            {placedOrder.paymentMethod === 'online' ? 'Paid online' : 'Cash on Delivery'}
          </p>
          <ul className="mt-4 space-y-1 text-sm text-gray-600">
            {placedOrder.shopOrder.map((part) => (
              <li key={part._id}>
                {part.shop?.name}: {part.shopOrderItems.length} item(s)
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => navigate('/home', { replace: true })}
            className="mt-6 w-full rounded-lg bg-[#ff4d2d] py-3 text-sm font-semibold text-white transition hover:bg-[#e64327]"
          >
            Back to Home
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fff9f6] px-4 py-6 sm:py-12">
      <section className="relative mx-auto w-full max-w-3xl rounded-2xl bg-white p-5 shadow-lg sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/home')}
            aria-label="Go back to home"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-[#ff4d2d] transition hover:bg-orange-100"
          >
            <IoArrowBack className="h-6 w-6" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
        </div>

        {cartItems.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-600">Your cart is empty.</p>
            <Link to="/home" className="mt-3 inline-block text-sm font-medium text-[#ff4d2d] hover:underline">
              Browse food
            </Link>
          </div>
        ) : (
          <form onSubmit={handlePlaceOrder} className="space-y-6">
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <IoLocationSharp className="text-[#ff4d2d]" aria-hidden="true" />
                Delivery Location
              </h2>
              {savedAddresses.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2" aria-label="Saved addresses">
                  {savedAddresses.map((address) => (
                    <button
                      key={address._id}
                      type="button"
                      onClick={() => pickSavedAddress(address)}
                      title={address.text}
                      aria-pressed={deliveryAddressText === address.text}
                      className={`max-w-full truncate rounded-full border px-3 py-1 text-xs font-medium transition ${
                        deliveryAddressText === address.text
                          ? 'border-[#ff4d2d] bg-[#ff4d2d] text-white'
                          : 'border-gray-300 text-gray-700 hover:border-[#ff4d2d]'
                      }`}
                    >
                      📍 {address.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={deliveryAddressText}
                  onChange={(event) => {
                    setAddressText(event.target.value)
                    setIsAddressTyped(true)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleSearch()
                    }
                  }}
                  placeholder="Enter your delivery address"
                  aria-label="Delivery address"
                  required
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#ff4d2d] focus:ring-2 focus:ring-[#ff4d2d]/20"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isLocating}
                  aria-label="Search address on map"
                  title="Search address"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ff4d2d] text-white transition hover:bg-[#e64327] disabled:opacity-60"
                >
                  <IoSearchOutline size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleCurrentLocation}
                  disabled={isLocating}
                  aria-label="Use my current location"
                  title="Use current location"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white transition hover:bg-blue-600 disabled:opacity-60"
                >
                  <TbCurrentLocation size={17} aria-hidden="true" />
                </button>
              </div>
              {locationError && <p role="alert" className="mb-2 text-xs text-red-600">{locationError}</p>}
              <div className="relative z-0 h-52 overflow-hidden rounded-xl border border-gray-400 sm:h-56">
                <MapContainer
                  center={[position.lat, position.lng]}
                  zoom={16}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <RecenterMap position={position} />
                  <Marker
                    position={[position.lat, position.lng]}
                    icon={markerIconConfig}
                    draggable
                    eventHandlers={{
                      dragend: (event) => {
                        const { lat, lng } = event.target.getLatLng()
                        moveToPosition({ lat, lng })
                      },
                    }}
                  />
                </MapContainer>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500">Drag the pin to your exact delivery spot.</p>
                {deliveryAddressText.trim() && !isAddressTyped && !isAddressSaved && savedAddresses.length < 5 && (
                  <button
                    type="button"
                    onClick={handleSaveAddress}
                    disabled={isSavingAddress}
                    className="text-xs font-medium text-[#ff4d2d] hover:underline disabled:opacity-60"
                  >
                    {isSavingAddress ? 'Saving...' : '+ Save this address'}
                  </button>
                )}
              </div>
              {addressSaveMessage && <p className="mt-1 text-xs text-gray-600">{addressSaveMessage}</p>}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Payment Method</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {paymentOptions.map(({ value, label, note, icons }) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                      paymentMethod === value
                        ? 'border-[#ff4d2d] bg-orange-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={value}
                      checked={paymentMethod === value}
                      onChange={() => setPaymentMethod(value)}
                      className="sr-only"
                    />
                    {icons.map(({ Icon, className }) => (
                      <span
                        key={className}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${className}`}
                      >
                        <Icon aria-hidden="true" />
                      </span>
                    ))}
                    <span>
                      <span className="block text-sm font-medium text-gray-900">{label}</span>
                      <span className="block text-xs text-gray-500">{note}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Coupon</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleApplyCoupon()
                    }
                  }}
                  placeholder="Enter coupon code"
                  aria-label="Coupon code"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase outline-none focus:border-[#ff4d2d] focus:ring-2 focus:ring-[#ff4d2d]/20"
                />
                {activeCoupon ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null)
                      setCouponInput('')
                      setCouponMessage('')
                    }}
                    className="rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={isApplyingCoupon || !couponInput.trim()}
                    className="rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
                  >
                    {isApplyingCoupon ? '...' : 'Apply'}
                  </button>
                )}
              </div>
              {couponMessage && (
                <p role="status" className={`mt-1 text-xs ${activeCoupon ? 'text-green-600' : 'text-red-600'}`}>
                  {couponMessage}
                </p>
              )}
              {appliedCoupon && !activeCoupon && (
                <p className="mt-1 text-xs text-amber-600">Your cart changed. Apply {appliedCoupon.code} again.</p>
              )}
              {!activeCoupon && availableCoupons.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableCoupons.map((coupon) => (
                    <button
                      key={coupon.code}
                      type="button"
                      onClick={() => handleApplyCoupon(coupon.code)}
                      className="rounded-lg border border-dashed border-[#ff4d2d] px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-orange-50"
                    >
                      <span className="font-bold text-[#ff4d2d]">{coupon.code}</span> · {coupon.description}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Order Summary</h2>
              <div className="rounded-xl border border-gray-400 bg-gray-50 p-4">
                <ul className="divide-y divide-gray-200">
                  {cartItems.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3 py-2 text-sm text-gray-700">
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span className="shrink-0">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 space-y-2 border-t border-gray-200 pt-3 text-sm">
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Delivery Fee</span>
                    <span>₹{DELIVERY_FEE}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({activeCoupon.code})</span>
                      <span>−₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 text-base font-bold text-[#ff4d2d]">
                    <span>Total</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </section>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isPlacing}
              className="w-full rounded-lg bg-[#ff4d2d] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e64327] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPlacing
                ? 'Processing...'
                : paymentMethod === 'online'
                  ? `Pay ₹${totalAmount.toFixed(2)}`
                  : 'Place Order'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

export default CheckOut
