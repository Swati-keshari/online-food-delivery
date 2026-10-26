import { useEffect, useState } from 'react'
import { getTodayStats } from '../lib/delivery'
import HourlyBarChart from './HourlyBarChart'
import { toHourlyCounts } from '../lib/charts'

const TodayDeliveries = ({ refreshKey }) => {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true
    getTodayStats()
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
  }, [refreshKey])

  const hourly = stats ? toHourlyCounts(stats.deliveredAt) : []

  return (
    <div className="rounded-2xl bg-white p-5 shadow-md">
      <h2 className="mb-4 text-lg font-bold text-[#ff4d2d]">Today Deliveries</h2>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : !stats ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : hourly.length > 0 ? (
        <HourlyBarChart data={hourly} />
      ) : (
        <p className="py-6 text-center text-sm text-gray-500">No deliveries yet today.</p>
      )}

      <div className="mx-auto mt-5 max-w-xs rounded-2xl bg-white px-6 py-5 text-center shadow-lg ring-1 ring-gray-100">
        <p className="text-lg font-medium text-gray-800">Today&apos;s Earning</p>
        <p className="mt-1 text-3xl font-bold text-green-600">₹{stats?.earning ?? 0}</p>
        {stats?.count > 0 && (
          <p className="mt-1 text-xs text-gray-500">
            {stats.count} {stats.count === 1 ? 'delivery' : 'deliveries'} × ₹{stats.earningPerDelivery}
          </p>
        )}
      </div>
    </div>
  )
}

export default TodayDeliveries
