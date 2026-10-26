// Address <-> coordinates lookups through Geoapify.
const geoapifyKey = import.meta.env.VITE_GEOAPIKEY

export const reverseGeocode = async ({ lat, lng }) => {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: 'json', apiKey: geoapifyKey })
  const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?${params}`)
  if (!response.ok) throw new Error('Could not find the address for this location.')
  const result = await response.json()
  return result.results?.[0]?.formatted || ''
}

export const searchAddress = async (text) => {
  const params = new URLSearchParams({ text, format: 'json', limit: '1', apiKey: geoapifyKey })
  const response = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`)
  if (!response.ok) throw new Error('Address search failed. Please try again.')
  const place = (await response.json()).results?.[0]
  if (!place) throw new Error('No place found for this address.')
  return { position: { lat: place.lat, lng: place.lon }, address: place.formatted || text }
}
