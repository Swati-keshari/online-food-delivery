const request = async (path, options = {}, fallbackMessage) => {
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')
  const response = await fetch(`${apiUrl}/api/delivery${path}`, {
    credentials: 'include',
    ...options,
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || fallbackMessage)
  }

  return result
}

export const getDeliveryAssignments = async () =>
  (await request('/assignments', {}, 'Unable to load delivery requests.')).assignments

export const getCurrentDelivery = async () =>
  (await request('/current', {}, 'Unable to load your current delivery.')).delivery

export const getTodayStats = async () => {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const params = new URLSearchParams({ since: startOfToday.toISOString() })
  return request(`/today-stats?${params}`, {}, "Unable to load today's deliveries.")
}

export const acceptDelivery = async (assignmentId) =>
  (await request(`/assignments/${assignmentId}/accept`, { method: 'POST' }, 'Unable to accept the delivery.'))
    .delivery

export const sendDeliveryOtp = async (assignmentId) =>
  request(`/assignments/${assignmentId}/send-otp`, { method: 'POST' }, 'Unable to send the OTP.')

export const verifyDeliveryOtp = async (assignmentId, otp) =>
  request(
    `/assignments/${assignmentId}/verify-otp`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ otp }) },
    'Unable to verify the OTP.',
  )
