import { useEffect, useState } from 'react'

const useGetCity = () => {
  const [city, setCity] = useState('')
  const [detectedCity, setDetectedCity] = useState('')
  const [state, setState] = useState('')
  const [address, setAddress] = useState('')
  const [geolocationPosition, setGeolocationPosition] = useState(null)
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const apiKey = import.meta.env.VITE_GEOAPIKEY

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()

    const finishWithError = (message) => {
      if (isActive) {
        setError(message)
        setLoading(false)
      }
    }

    if (!navigator.geolocation) {
      finishWithError('Location is not supported by this browser. Enter your city.')
    } else {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { coords } = position

          console.log('GeolocationPosition:', position)

          if (isActive) {
            setGeolocationPosition(position)
            setLatitude(coords.latitude)
            setLongitude(coords.longitude)
          }

          try {
            if (!apiKey) {
              throw new Error('VITE_GEOAPIKEY is not configured. Enter your city manually.')
            }

            const params = new URLSearchParams({
              lat: String(coords.latitude),
              lon: String(coords.longitude),
              format: 'json',
              apiKey,
            })
            const response = await fetch(
              `https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`,
              { signal: controller.signal },
            )

            if (!response.ok) {
              throw new Error('Could not look up your city. Enter it manually.')
            }

            const result = await response.json()
            const locationDetails = result.results?.[0]
            const detectedCity = locationDetails?.city

            if (!detectedCity) {
              throw new Error('Could not detect a city near you. Enter it manually.')
            }

            if (isActive) {
              setCity(detectedCity)
              setDetectedCity(detectedCity)
              setState(locationDetails.state || locationDetails.state_district || '')
              setAddress(
                [
                  locationDetails.address_line1 || locationDetails.street,
                  locationDetails.suburb ||
                    locationDetails.neighbourhood ||
                    locationDetails.quarter,
                  locationDetails.postcode,
                  detectedCity,
                  locationDetails.state || locationDetails.state_district,
                  locationDetails.country,
                ]
                  .filter((part, index, parts) => part && parts.indexOf(part) === index)
                  .join(', ') || locationDetails.formatted || '',
              )
              setError('')
            }
          } catch (error) {
            if (isActive && error.name !== 'AbortError') {
              setError(error instanceof Error ? error.message : 'Could not detect your city.')
            }
          } finally {
            if (isActive) {
              setLoading(false)
            }
          }
        },
        (locationError) => {
          const message =
            locationError.code === locationError.PERMISSION_DENIED
              ? 'Allow location access or enter your city.'
              : 'Could not detect your location. Enter your city.'
          finishWithError(message)
        },
        { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 },
      )
    }

    return () => {
      isActive = false
      controller.abort()
    }
  }, [apiKey])

  return {
    city,
    setCity,
    detectedCity,
    state,
    setState,
    address,
    setAddress,
    geolocationPosition,
    latitude,
    longitude,
    loading,
    error,
  }
}

export default useGetCity
