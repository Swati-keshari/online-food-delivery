const userRequest = async (path, options = {}, fallbackMessage) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/user${path}`, {
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

export const updateProfile = async ({ fullName, mobile }) =>
  (await userRequest('/profile', { method: 'PATCH', body: JSON.stringify({ fullName, mobile }) }, 'Unable to update your profile.'))
    .user

export const addAddress = async ({ label, text, latitude, longitude }) =>
  (
    await userRequest(
      '/addresses',
      { method: 'POST', body: JSON.stringify({ label, text, latitude, longitude }) },
      'Unable to save the address.',
    )
  ).addresses

export const deleteAddress = async (addressId) =>
  (await userRequest(`/addresses/${addressId}`, { method: 'DELETE' }, 'Unable to remove the address.')).addresses
