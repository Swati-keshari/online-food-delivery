// Counts per hour, from the first to the last busy hour of the day.
export const toHourlyCounts = (deliveredAt) => {
  const counts = new Map()
  for (const time of deliveredAt) {
    const hour = new Date(time).getHours()
    counts.set(hour, (counts.get(hour) || 0) + 1)
  }
  if (counts.size === 0) return []
  const hours = [...counts.keys()]
  const result = []
  for (let hour = Math.min(...hours); hour <= Math.max(...hours); hour += 1) {
    result.push({ hour, count: counts.get(hour) || 0 })
  }
  return result
}
