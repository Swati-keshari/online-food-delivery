export const placeOrder = async ({ cartItems, paymentMethod, deliveryAddress, couponCode }) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      cartItems: cartItems.map(({ id, quantity }) => ({ id, quantity })),
      paymentMethod,
      deliveryAddress,
      couponCode,
    }),
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to place your order.')
  }

  return result
}

export const getMyOrders = async () => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/orders/my-orders`, {
    method: 'GET',
    credentials: 'include',
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to load your orders.')
  }

  return result.orders
}

export const getOrderTracking = async (orderId) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/orders/${orderId}/track`, {
    method: 'GET',
    credentials: 'include',
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to load order tracking.')
  }

  return result.order
}

export const getOwnerOrders = async () => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/orders/owner-orders`, {
    method: 'GET',
    credentials: 'include',
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to load shop orders.')
  }

  return result.orders
}

export const updateShopOrderStatus = async (orderId, shopOrderId, status) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/orders/${orderId}/shop-orders/${shopOrderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status }),
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to update the order status.')
  }

  return result
}

export const verifyPayment = async (paymentDetails) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/orders/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(paymentDetails),
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to verify the payment.')
  }

  return result.order
}

let razorpayScriptPromise = null

export const loadRazorpayScript = () => {
  if (window.Razorpay) return Promise.resolve()
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve()
      script.onerror = () => {
        razorpayScriptPromise = null
        reject(new Error('Could not load Razorpay. Check your internet connection.'))
      }
      document.body.appendChild(script)
    })
  }
  return razorpayScriptPromise
}

// Opens the Razorpay popup and resolves with the payment response, or rejects if closed.
export const openRazorpayCheckout = ({ razorpay, user }) =>
  new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: razorpay.keyId,
      order_id: razorpay.orderId,
      amount: razorpay.amount,
      currency: razorpay.currency,
      name: 'Vingo',
      description: 'Food order',
      prefill: {
        name: user?.fullName,
        email: user?.email,
        contact: user?.mobile,
      },
      theme: { color: '#ff4d2d' },
      handler: resolve,
      modal: {
        ondismiss: () => reject(new Error('Payment was cancelled.')),
      },
    })
    checkout.on('payment.failed', (response) => {
      reject(new Error(response.error?.description || 'Payment failed. Please try again.'))
    })
    checkout.open()
  })

const orderRequest = async (path, options = {}, fallbackMessage) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/orders${path}`, {
    credentials: 'include',
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || fallbackMessage)
  }

  return result
}

export const cancelOrder = async (orderId) =>
  orderRequest(`/${orderId}/cancel`, { method: 'POST' }, 'Unable to cancel the order.')

export const rateShopOrder = async (orderId, shopOrderId, { ratings, review }) =>
  orderRequest(
    `/${orderId}/shop-orders/${shopOrderId}/rate`,
    { method: 'POST', body: JSON.stringify({ ratings, review }) },
    'Unable to save your rating.',
  )

export const getOwnerStats = async () => {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const params = new URLSearchParams({ since: startOfToday.toISOString() })
  return orderRequest(`/owner-stats?${params}`, {}, "Unable to load today's sales.")
}

export const getCoupons = async () => (await orderRequest('/coupons', {}, 'Unable to load coupons.')).coupons

export const applyCoupon = async ({ cartItems, couponCode }) =>
  orderRequest(
    '/coupons/apply',
    {
      method: 'POST',
      body: JSON.stringify({
        cartItems: cartItems.map(({ id, quantity }) => ({ id, quantity })),
        couponCode,
      }),
    },
    'Unable to apply the coupon.',
  )
