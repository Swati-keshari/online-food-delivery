import { createSlice } from '@reduxjs/toolkit'

const SELECTED_SHOP_KEY = 'vingo-selected-shop'

const readSelectedShopId = () => {
  try {
    return localStorage.getItem(SELECTED_SHOP_KEY)
  } catch {
    return null
  }
}

const saveSelectedShopId = (shopId) => {
  try {
    if (shopId) localStorage.setItem(SELECTED_SHOP_KEY, shopId)
    else localStorage.removeItem(SELECTED_SHOP_KEY)
  } catch {
    // Remembering the selected shop is only a convenience.
  }
}

// An owner can have several shops; myShopData is the one currently selected.
const ownerSlice = createSlice({
  name: 'owner',
  initialState: {
    myShops: [],
    myShopData: null,
    // Starts true so owner pages wait for the first fetch instead of redirecting on refresh.
    myShopLoading: true,
    myShopError: '',
    myShopNotFound: false,
  },
  reducers: {
    setMyShops: (state, action) => {
      const shops = action.payload || []
      const savedId = readSelectedShopId()
      state.myShops = shops
      state.myShopData = shops.find((shop) => shop._id === savedId) || shops[0] || null
      state.myShopNotFound = shops.length === 0
    },
    selectMyShop: (state, action) => {
      const shop = state.myShops.find((item) => item._id === action.payload)
      if (!shop) return
      state.myShopData = shop
      saveSelectedShopId(shop._id)
    },
    // Adds or replaces one shop (after create/edit/item changes) and selects it.
    // Passing null clears everything, e.g. on logout.
    setMyShopData: (state, action) => {
      const shop = action.payload
      if (!shop) {
        state.myShops = []
        state.myShopData = null
        saveSelectedShopId(null)
        return
      }
      const index = state.myShops.findIndex((item) => item._id === shop._id)
      if (index === -1) state.myShops.push(shop)
      else state.myShops[index] = shop
      state.myShopData = shop
      state.myShopNotFound = false
      saveSelectedShopId(shop._id)
    },
    setMyShopLoading: (state, action) => {
      state.myShopLoading = action.payload
    },
    setMyShopError: (state, action) => {
      state.myShopError = action.payload
    },
    setMyShopNotFound: (state, action) => {
      state.myShopNotFound = action.payload
    },
  },
})

export const {
  setMyShops,
  selectMyShop,
  setMyShopData,
  setMyShopLoading,
  setMyShopError,
  setMyShopNotFound,
} = ownerSlice.actions
export default ownerSlice.reducer
