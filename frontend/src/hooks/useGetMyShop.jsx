import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { fetchMyShops } from '../lib/shops'
import {
  setMyShops,
  setMyShopError,
  setMyShopLoading,
  setMyShopNotFound,
} from '../redux/ownerSlice'

const useGetMyShop = (enabled = true) => {
  const dispatch = useDispatch()

  useEffect(() => {
    if (!enabled) {
      dispatch(setMyShopLoading(false))
      dispatch(setMyShopError(''))
      dispatch(setMyShopNotFound(false))
      return undefined
    }

    let isActive = true
    dispatch(setMyShopLoading(true))
    dispatch(setMyShopError(''))
    dispatch(setMyShopNotFound(false))

    const loadShop = async () => {
      try {
        const shops = await fetchMyShops()
        if (isActive) dispatch(setMyShops(shops))
      } catch (fetchError) {
        if (isActive) {
          dispatch(setMyShops([]))
          dispatch(setMyShopNotFound(false))
          dispatch(setMyShopError(fetchError.message || 'Unable to load your shop.'))
        }
      } finally {
        if (isActive) dispatch(setMyShopLoading(false))
      }
    }

    loadShop()
    return () => {
      isActive = false
    }
  }, [dispatch, enabled])
}

export default useGetMyShop