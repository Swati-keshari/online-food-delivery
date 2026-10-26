import { useEffect, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const emojiIcon = (emoji) =>
  L.divIcon({
    html: `<span style="font-size:30px;line-height:1">${emoji}</span>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 30],
    popupAnchor: [0, -28],
  })

const deliveryBoyIcon = emojiIcon('🛵')
const customerIcon = emojiIcon('🏠')
const ARRIVED_METERS = 50

const isValidPoint = (point) =>
  Number.isFinite(Number(point?.latitude)) &&
  Number.isFinite(Number(point?.longitude)) &&
  !(Number(point.latitude) === 0 && Number(point.longitude) === 0)

const formatDistance = (meters) => (meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`)

// Road route from the delivery boy to the customer, from the public OSRM server.
// Rounded to ~10 m so small GPS jitter does not refetch the route.
const useRoadRoute = (from, to) => {
  const [route, setRoute] = useState(null)
  const key = from && to ? [...from, ...to].map((value) => value.toFixed(4)).join(',') : ''

  useEffect(() => {
    if (!key) return undefined
    const [fromLat, fromLng, toLat, toLng] = key.split(',')
    const controller = new AbortController()
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`,
      { signal: controller.signal },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        const best = result?.routes?.[0]
        setRoute(
          best && {
            key,
            points: best.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
            distance: best.distance,
            duration: best.duration,
            fetchedAt: Date.now(),
          },
        )
      })
      // No route service: the map falls back to a straight line.
      .catch(() => {})
    return () => controller.abort()
  }, [key])

  return route?.key === key ? route : null
}

// Keeps both markers in view as the delivery boy moves.
const FitBounds = ({ points }) => {
  const map = useMap()
  const key = points.map((point) => point.join(',')).join('|')
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 16)
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 17 })
    // points is rebuilt every render; key holds its value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
  return null
}

const DeliveryBoyTracking = ({ deliveryBoy, customer }) => {
  const boyPoint = isValidPoint(deliveryBoy) ? [Number(deliveryBoy.latitude), Number(deliveryBoy.longitude)] : null
  const customerPoint = isValidPoint(customer) ? [Number(customer.latitude), Number(customer.longitude)] : null
  const points = [boyPoint, customerPoint].filter(Boolean)
  const route = useRoadRoute(boyPoint, customerPoint)
  const straightDistance = boyPoint && customerPoint ? L.latLng(boyPoint).distanceTo(customerPoint) : null
  const hasArrived = straightDistance != null && straightDistance <= ARRIVED_METERS

  if (points.length === 0) {
    return (
      <p className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
        Waiting for the delivery boy&apos;s location...
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {straightDistance != null && (
        <p className="text-sm font-medium text-gray-800">
          {hasArrived ? (
            <span className="text-green-600">🛵 Delivery boy has reached the delivery location</span>
          ) : (
            <>
              🛵 {formatDistance(route?.distance ?? straightDistance)} away
              {route && (
                <span className="text-gray-500">
                  {' '}
                  · about {Math.max(1, Math.round(route.duration / 60))} min · arriving around{' '}
                  {new Date(route.fetchedAt + route.duration * 1000).toLocaleTimeString('en-IN', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </>
          )}
        </p>
      )}
      <div className="relative z-0 h-72 w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm sm:h-80">
        <MapContainer center={points[0]} zoom={16} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {customerPoint && (
            <Marker position={customerPoint} icon={customerIcon}>
              <Popup>{customer.label || 'Delivery Address'}</Popup>
            </Marker>
          )}
          {boyPoint && (
            // Drawn above the house so it stays visible when they are at the same spot.
            <Marker position={boyPoint} icon={deliveryBoyIcon} zIndexOffset={1000}>
              <Popup>{deliveryBoy.fullName || 'Delivery Boy'}</Popup>
            </Marker>
          )}
          {boyPoint && customerPoint && (
            <Polyline
              positions={route?.points || [boyPoint, customerPoint]}
              pathOptions={route ? { color: '#ff4d2d', weight: 5 } : { color: '#ff4d2d', weight: 4, dashArray: '8 8' }}
            />
          )}
          <FitBounds points={route?.points?.length ? route.points : points} />
        </MapContainer>
      </div>
    </div>
  )
}

export default DeliveryBoyTracking
