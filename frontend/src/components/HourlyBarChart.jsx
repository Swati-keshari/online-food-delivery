import { useState } from 'react'

const CHART = { width: 520, height: 200, left: 28, right: 8, top: 10, bottom: 28 }
const BAR_COLOR = '#ff4d2d'

const formatHour = (hour) => `${String(hour).padStart(2, '0')}:00`

// Bar with a 4px rounded top, flat on the baseline.
const barPath = (x, y, width, height) => {
  const radius = Math.min(4, width / 2, height)
  return `M${x},${y + height} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + width - radius} Q${x + width},${y} ${x + width},${y + radius} V${y + height} Z`
}

// Bar chart of counts per hour of today. `unit` names one count, e.g. "delivery" or "order".
const HourlyBarChart = ({ data, unit = 'delivery', unitPlural = 'deliveries' }) => {
  const [hovered, setHovered] = useState(null)
  const maxCount = Math.max(...data.map((point) => point.count))
  const yMax = Math.max(4, maxCount)
  const ticks = Array.from({ length: yMax + 1 }, (_, index) => index).filter(
    (tick) => yMax <= 6 || tick % Math.ceil(yMax / 5) === 0,
  )
  const plotWidth = CHART.width - CHART.left - CHART.right
  const plotHeight = CHART.height - CHART.top - CHART.bottom
  const slot = plotWidth / data.length
  const barWidth = Math.min(64, slot - 2)
  const y = (count) => CHART.top + plotHeight - (count / yMax) * plotHeight
  const hoveredPoint = hovered != null ? data[hovered] : null

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${unitPlural} per hour today: ${data.map((point) => `${formatHour(point.hour)} ${point.count}`).join(', ')}`}
        onMouseLeave={() => setHovered(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={CHART.left}
              x2={CHART.width - CHART.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={tick === 0 ? '#9ca3af' : '#e5e7eb'}
              strokeDasharray={tick === 0 ? undefined : '3 3'}
            />
            <text x={CHART.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" fontSize="11" fill="#6b7280">
              {tick}
            </text>
          </g>
        ))}
        {data.map((point, index) => {
          const x = CHART.left + index * slot + (slot - barWidth) / 2
          const barHeight = y(0) - y(point.count)
          return (
            <g key={point.hour}>
              {barHeight > 0 && (
                <path
                  d={barPath(x, y(point.count), barWidth, barHeight)}
                  fill={BAR_COLOR}
                  opacity={hovered == null || hovered === index ? 1 : 0.55}
                />
              )}
              <text x={x + barWidth / 2} y={CHART.height - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
                {formatHour(point.hour)}
              </text>
              {/* Hit target: the whole column, bigger than the bar. */}
              <rect
                x={CHART.left + index * slot}
                y={CHART.top}
                width={slot}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHovered(index)}
                onClick={() => setHovered(index)}
              />
            </g>
          )
        })}
      </svg>
      {hoveredPoint && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: `${((CHART.left + (hovered + 0.5) * slot) / CHART.width) * 100}%` }}
        >
          <p className="font-medium text-gray-900">{formatHour(hoveredPoint.hour)}</p>
          <p className="flex items-center gap-1.5 text-gray-600">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: BAR_COLOR }} />
            {hoveredPoint.count} {hoveredPoint.count === 1 ? unit : unitPlural}
          </p>
        </div>
      )}
    </div>
  )
}

export default HourlyBarChart
