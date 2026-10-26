import { useCallback, useEffect, useState } from 'react'
import { getOwnerStats } from '../lib/orders'
import useSocketEvent from '../hooks/useSocketEvent'
import HourlyBarChart from './HourlyBarChart'
import { toHourlyCounts } from '../lib/charts'

// Today's orders, sales and best sellers across all of the owner's shops.
const OwnerStats = () => {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  useSocketEvent('order:new', reload)
  useSocketEvent('order:updated', reload)

  useEffect(() => {
    let isActive = true
    getOwnerStats()
      .then((result) => {
        if (!isActive) return
        setStats(result)
        setError('')
      })
      .catch((requestError) => {
        if (isActive) setError(requestError.message)
      })
    return () => {
      isActive = false
    }
  }, [reloadKey])

  const hourly = stats ? toHourlyCounts(stats.orderTimes) : []
  const tiles = [
    { label: 'Orders', value: stats?.orderCount ?? 0 },
    { label: 'Delivered', value: stats?.deliveredCount ?? 0 },
    { label: 'Sales', value: `₹${stats?.sales ?? 0}`, accent: true },
  ]

  return (
    <section aria-labelledby="owner-stats-heading" className="mx-auto w-full max-w-3xl px-4 pb-6 sm:px-6">
      <div className="rounded-2xl bg-white p-5 shadow-md">
        <h2 id="owner-stats-heading" className="mb-4 text-lg font-bold text-[#ff4d2d]">
          Today&apos;s Sales
        </h2>
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {tiles.map((tile) => (
                <div key={tile.label} className="rounded-xl bg-[#fffaf7] p-3 text-center ring-1 ring-orange-100">
                  <p className="text-xs text-gray-500">{tile.label}</p>
                  <p className={`mt-1 text-xl font-bold ${tile.accent ? 'text-green-600' : 'text-gray-900'}`}>
                    {tile.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold text-gray-800">Orders per hour</p>
              {!stats ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : hourly.length > 0 ? (
                <HourlyBarChart data={hourly} unit="order" unitPlural="orders" />
              ) : (
                <p className="py-4 text-center text-sm text-gray-500">No orders yet today.</p>
              )}
            </div>
            {stats?.topItems?.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-gray-800">Best sellers today</p>
                <ol className="space-y-1 text-sm text-gray-700">
                  {stats.topItems.map((item, index) => (
                    <li key={item.name} className="flex justify-between gap-3">
                      <span>
                        {index + 1}. {item.name}
                      </span>
                      <span className="text-gray-500">
                        {item.quantity} sold · ₹{item.sales}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default OwnerStats
