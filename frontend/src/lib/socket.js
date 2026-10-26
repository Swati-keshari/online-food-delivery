import { io } from 'socket.io-client'

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')

// One shared connection; App.jsx connects it after login. The login cookie authenticates it.
export const socket = io(apiUrl, {
  withCredentials: true,
  autoConnect: false,
})
