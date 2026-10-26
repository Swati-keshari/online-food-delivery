export const fetchCurrentUser = async () => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/user/current-user`, {
    method: 'GET',
    credentials: 'include',
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Unable to load the current user.')
  }

  return result.user
}
