export const getShopById = async (shopId) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/shops/${shopId}`)
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to load the shop.')
  }

  return result.shop
}

export const getPublicShops = async (city, coordinates = null) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const normalizedCity = city.trim()
  if (!normalizedCity) {
    throw new Error('City is required to find shops.')
  }

  const params = new URLSearchParams()
  if (coordinates) {
    params.set('lat', String(coordinates.latitude))
    params.set('lng', String(coordinates.longitude))
  }
  const query = params.toString() ? `?${params.toString()}` : ''
  const response = await fetch(
    `${apiUrl}/api/shops/city/${encodeURIComponent(normalizedCity)}${query}`,
  )
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to load shops.')
  }

  return result.shops
}
