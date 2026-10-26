import { useEffect } from 'react'
import { FaMinus, FaPlus, FaTrashCan, FaXmark } from 'react-icons/fa6'
import { FaShoppingCart } from 'react-icons/fa'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { clearCart, removeFromCart, setCartOpen, updateCartQuantity } from '../redux/cartSlice'

const CartDrawer = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { cartItems, isCartOpen } = useSelector((state) => state.cart)
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const closeCart = () => dispatch(setCartOpen(false))

  useEffect(() => {
    if (!isCartOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') dispatch(setCartOpen(false))
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [dispatch, isCartOpen])

  return (
    <div
      className={`fixed inset-0 z-50 ${isCartOpen ? '' : 'pointer-events-none'}`}
      aria-hidden={!isCartOpen}
    >
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          isCartOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            Your Cart{totalItems > 0 && ` (${totalItems})`}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
          >
            <FaXmark aria-hidden="true" />
          </button>
        </header>

        {cartItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-gray-500">
            <FaShoppingCart className="h-12 w-12 text-orange-200" aria-hidden="true" />
            <p>Your cart is empty.</p>
            <button
              type="button"
              onClick={closeCart}
              className="text-sm font-medium text-[#ff4d2d] hover:underline"
            >
              Browse food
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto px-5">
              {cartItems.map((item) => (
                <li key={item.id} className="flex gap-3 py-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-medium text-gray-900">{item.name}</h3>
                      <button
                        type="button"
                        onClick={() => dispatch(removeFromCart(item.id))}
                        aria-label={`Remove ${item.name} from cart`}
                        className="shrink-0 text-gray-400 transition hover:text-red-500"
                      >
                        <FaTrashCan size={14} aria-hidden="true" />
                      </button>
                    </div>
                    <p className="truncate text-xs text-gray-500">{item.shopName}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center overflow-hidden rounded-full border border-gray-200">
                        <button
                          type="button"
                          onClick={() =>
                            dispatch(updateCartQuantity({ id: item.id, quantity: item.quantity - 1 }))
                          }
                          aria-label={`Decrease ${item.name} quantity`}
                          className="px-2 py-1 text-gray-700 transition hover:bg-gray-100"
                        >
                          <FaMinus size={10} aria-hidden="true" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch(updateCartQuantity({ id: item.id, quantity: item.quantity + 1 }))
                          }
                          aria-label={`Increase ${item.name} quantity`}
                          className="px-2 py-1 text-gray-700 transition hover:bg-gray-100"
                        >
                          <FaPlus size={10} aria-hidden="true" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-gray-100 px-5 py-4">
              <div className="mb-4 flex items-center justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  closeCart()
                  navigate('/checkout')
                }}
                className="w-full rounded-lg bg-[#ff4d2d] py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e64327]"
              >
                Proceed to Checkout
              </button>
              <button
                type="button"
                onClick={() => dispatch(clearCart())}
                className="mt-2 w-full py-2 text-sm font-medium text-gray-500 transition hover:text-red-500"
              >
                Clear cart
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}

export default CartDrawer
