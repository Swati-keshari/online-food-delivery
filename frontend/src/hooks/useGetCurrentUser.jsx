import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { fetchCurrentUser } from '../lib/currentUser'
import { setUserData } from '../redux/userSlice'

const useGetCurrentUser = () => {
  const dispatch = useDispatch()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isActive = true

    const loadUser = async () => {
      try {
        const currentUser = await fetchCurrentUser()
        if (isActive) {
          setUser(currentUser)
          dispatch(setUserData(currentUser))
        }
      } catch (error) {
        if (isActive) {
          setError(error instanceof Error ? error : new Error(String(error)))
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      isActive = false
    }
  }, [dispatch])

  return { user, loading, error }
}

export default useGetCurrentUser
