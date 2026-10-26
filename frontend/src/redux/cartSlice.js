import { createSlice } from '@reduxjs/toolkit'

export const CART_STORAGE_KEY = 'vingo-cart'

// Restores the cart saved by store.js so it survives a page refresh.
const loadSavedCartItems = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY))
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    cartItems: loadSavedCartItems(),
    isCartOpen: false,
  },
  reducers: {
    // Adds a new item, or adds the given quantity to an item already in the cart.
    addToCart: (state, action) => {
      const item = action.payload
      const existingItem = state.cartItems.find((cartItem) => cartItem.id === item.id)
      if (existingItem) {
        existingItem.quantity += item.quantity
      } else {
        state.cartItems.push(item)
      }
    },
    updateCartQuantity: (state, action) => {
      const { id, quantity } = action.payload
      if (quantity <= 0) {
        state.cartItems = state.cartItems.filter((cartItem) => cartItem.id !== id)
        return
      }
      const existingItem = state.cartItems.find((cartItem) => cartItem.id === id)
      if (existingItem) existingItem.quantity = quantity
    },
    removeFromCart: (state, action) => {
      state.cartItems = state.cartItems.filter((cartItem) => cartItem.id !== action.payload)
    },
    clearCart: (state) => {
      state.cartItems = []
    },
    // Replaces saved prices with the shop's current ones; drops items no longer on the menu.
    refreshCartPrices: (state, action) => {
      const currentPrices = action.payload
      state.cartItems = state.cartItems
        .filter((cartItem) => currentPrices[cartItem.id] != null)
        .map((cartItem) => ({ ...cartItem, price: currentPrices[cartItem.id] }))
    },
    setCartOpen: (state, action) => {
      state.isCartOpen = action.payload
    },
  },
})

export const { addToCart, updateCartQuantity, removeFromCart, clearCart, refreshCartPrices, setCartOpen } =
  cartSlice.actions
export default cartSlice.reducer
