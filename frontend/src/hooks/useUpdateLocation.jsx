import { useEffect } from 'react'

const MIN_SEND_INTERVAL_MS = 10000

// Keeps the logged-in user's live position saved on the server while enabled.
const useUpdateLocation = (enabled) => {
  useEffect(() => {
    if (!enabled || !navigator.geolocation) return undefined

    const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
    let lastSentAt = 0

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const now = Date.now()
        if (now - lastSentAt < MIN_SEND_INTERVAL_MS) return
        lastSentAt = now

        fetch(`${apiUrl}/api/user/update-location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ lat: coords.latitude, lon: coords.longitude }),
        }).catch((error) => console.error('Location update failed:', error))
      },
      (error) => console.error('Location watch error:', error.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [enabled])
}

export default useUpdateLocation
