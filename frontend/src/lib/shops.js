export const fetchMyShops = async () => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/shops/my-shop`, {
    method: 'GET',
    credentials: 'include',
  })
  const result = await response.json()

  if (!response.ok) {
    const error = new Error(result.message || 'Unable to load your shop.')
    error.status = response.status
    throw error
  }

  return result.shops ?? (result.shop ? [result.shop] : [])
}

export const createMyShop = async (formData) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/shops`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to create your shop.')
  }

  return result.shop
}

export const editMyShop = async (shopId, formData) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/shops/${shopId}`, {
    method: 'PATCH',
    credentials: 'include',
    body: formData,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to update your shop.')
  }

  return result.shop
}

export const setShopClosed = async (shopId, isClosed) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/shops/${shopId}/closed`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ isClosed }),
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to update the shop.')
  }

  return result.shop
}
