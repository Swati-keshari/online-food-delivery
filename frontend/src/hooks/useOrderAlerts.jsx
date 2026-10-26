import { useEffect, useRef } from 'react'
import useSocketEvent from './useSocketEvent'

// Short two-tone "ding" made in the browser, so no sound file is needed.
const playDing = (audioContext) => {
  if (!audioContext) return
  const now = audioContext.currentTime
  ;[880, 1320].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    const start = now + index * 0.18
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
    oscillator.connect(gain).connect(audioContext.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.4)
  })
}

const showNotification = (title, body) => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/favicon.svg', tag: title })
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
}

const alertsByRole = {
  owner: { event: 'order:new', title: 'New order received', body: 'Open My Orders to start preparing it.' },
  deliveryBoy: { event: 'delivery:new', title: 'New delivery request', body: 'A nearby order is ready to be picked up.' },
}

// Rings and shows a browser notification when an owner gets an order or a delivery boy gets a request.
const useOrderAlerts = (role) => {
  const audioContextRef = useRef(null)
  const alert = alertsByRole[role]

  // Browsers allow sound and the notification prompt only after the user interacts with the page.
  useEffect(() => {
    if (!alert) return undefined
    const unlock = () => {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (AudioContext && !audioContextRef.current) audioContextRef.current = new AudioContext()
      audioContextRef.current?.resume?.()
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [alert])

  useSocketEvent(alert?.event || 'alerts:none', () => {
    if (!alert) return
    playDing(audioContextRef.current)
    if (document.visibilityState !== 'visible') showNotification(alert.title, alert.body)
  })
}

export default useOrderAlerts
