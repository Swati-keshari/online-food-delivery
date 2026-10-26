import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./userSlice.js";
import ownerSlice from "./ownerSlice.js";
import cartSlice, { CART_STORAGE_KEY, clearCart } from "./cartSlice.js";

export const store = configureStore({
  reducer: {
    user: userSlice,
    owner: ownerSlice,
    cart: cartSlice,
  },
})

// Save the cart whenever it changes so a refresh does not empty it.
let lastSavedCartItems = store.getState().cart.cartItems
store.subscribe(() => {
  const { cartItems } = store.getState().cart
  if (cartItems === lastSavedCartItems) return
  lastSavedCartItems = cartItems
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
  } catch {
    // Storage can be blocked (e.g. private mode); the cart still works for this visit.
  }
})

// A cart belongs to the account that filled it: switching accounts or being signed out empties it.
const CART_OWNER_KEY = "vingo-cart-owner"
let lastUserId
store.subscribe(() => {
  const userId = store.getState().user.userData?._id ?? null
  if (userId === lastUserId) return
  const wasSignedIn = Boolean(lastUserId)
  lastUserId = userId
  try {
    const cartOwner = localStorage.getItem(CART_OWNER_KEY)
    if (userId) {
      if (cartOwner && cartOwner !== userId) store.dispatch(clearCart())
      localStorage.setItem(CART_OWNER_KEY, userId)
    } else if (wasSignedIn) {
      store.dispatch(clearCart())
      localStorage.removeItem(CART_OWNER_KEY)
    }
  } catch {
    // Storage can be blocked; the cart is then only kept for this visit anyway.
  }
})
