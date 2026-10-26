import Order from "../models/order.model.js"

// Discounts apply to the food subtotal, not the delivery fee.
const COUPONS = {
    FIRST50: {
        description: "₹50 off your first order (min ₹150)",
        minSubtotal: 150,
        firstOrderOnly: true,
        discountFor: () => 50,
    },
    SAVE20: {
        description: "20% off up to ₹100 (min ₹300)",
        minSubtotal: 300,
        discountFor: (subtotal) => Math.min(100, Math.round(subtotal * 0.2)),
    },
}

export class CouponError extends Error {}

export const listCoupons = () =>
    Object.entries(COUPONS).map(([code, coupon]) => ({ code, description: coupon.description }))

// Returns { code, discount, description }, or throws CouponError with a message for the customer.
export const applyCoupon = async (rawCode, subtotal, userId) => {
    const code = String(rawCode || "").trim().toUpperCase()
    const coupon = COUPONS[code]
    if (!coupon) {
        throw new CouponError("This coupon code is not valid.")
    }
    if (subtotal < coupon.minSubtotal) {
        throw new CouponError(`Add items worth ₹${coupon.minSubtotal - subtotal} more to use ${code}.`)
    }
    if (coupon.firstOrderOnly) {
        // Real earlier orders: COD or paid online, and not cancelled by the customer.
        const hasOrdered = await Order.exists({
            user: userId,
            cancelledAt: null,
            $or: [{ paymentMethod: "cod" }, { paymentStatus: "paid" }],
        })
        if (hasOrdered) {
            throw new CouponError(`${code} is only for your first order.`)
        }
    }
    return { code, discount: Math.min(coupon.discountFor(subtotal), subtotal), description: coupon.description }
}
