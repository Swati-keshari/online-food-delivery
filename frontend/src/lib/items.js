export const createMenuItem = async (formData) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/items`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to add the food item.')
  }

  return result.shop
}

export const getMenuItem = async (itemId) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/items/get-by-id/${itemId}`, {
    method: 'GET',
    credentials: 'include',
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to load the food item.')
  }

  return result.item
}

export const editMenuItem = async (itemId, formData) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/items/${itemId}`, {
    method: 'PATCH',
    credentials: 'include',
    body: formData,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to update the food item.')
  }

  return result.shop
}

export const deleteMenuItem = async (itemId) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/items/${itemId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to delete the food item.')
  }

  return result.shop
}

export const setItemAvailability = async (itemId, isAvailable) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/items/${itemId}/availability`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ isAvailable }),
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to update the item.')
  }

  return result.shop
}
