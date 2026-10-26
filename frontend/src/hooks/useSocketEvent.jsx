import { useEffect, useRef } from 'react'
import { socket } from '../lib/socket'

// Runs handler whenever the server sends this live event.
const useSocketEvent = (event, handler) => {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    const listener = (payload) => handlerRef.current(payload)
    socket.on(event, listener)
    return () => {
      socket.off(event, listener)
    }
  }, [event])
}

export default useSocketEvent
