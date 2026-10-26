import mongoose from "mongoose"
import Item from "../models/item.model.js"
import Order from "../models/order.model.js"
import User from "../models/user.model.js"
import { applyCoupon, CouponError, listCoupons } from "../utils/coupons.js"
import {
    createRazorpayOrder,
    isRazorpayConfigured,
    isValidRazorpaySignature,
    refundRazorpayPayment,
} from "../utils/razorpay.js"
import { broadcastShopOrder } from "./delivery.controllers.js"
import { emitToUser } from "../utils/socket.js"

const notifyShopOwners = (order) => {
    for (const part of order.shopOrder) {
        emitToUser(part.owner, "order:new", { orderId: order._id })
    }
}

const roundAmount = (amount) => Math.round(amount * 100) / 100
// Keep in sync with DELIVERY_FEE in frontend/src/pages/CheckOut.jsx
const DELIVERY_FEE = 40

class CartError extends Error {}

// Prices a cart from the database (never from the client) and splits it into one part per shop.
const priceCart = async (cartItems) => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        throw new CartError("Your cart is empty.")
    }
    const quantities = new Map()
    for (const cartItem of cartItems) {
        const quantity = Number(cartItem?.quantity)
        if (!mongoose.isValidObjectId(cartItem?.id) || !Number.isInteger(quantity) || quantity < 1) {
            throw new CartError("Your cart has an invalid item.")
        }
        quantities.set(cartItem.id, (quantities.get(cartItem.id) || 0) + quantity)
    }

    const items = await Item.find({ _id: { $in: [...quantities.keys()] }, isAvailable: true })
        .populate("shop", "owner name isClosed")
    if (items.length !== quantities.size || items.some((item) => !item.shop)) {
        throw new CartError("Some items in your cart are no longer available.")
    }
    const closedShop = items.find((item) => item.shop.isClosed)?.shop
    if (closedShop) {
        throw new CartError(`${closedShop.name} is closed right now. Remove its items to continue.`)
    }

    // { shopId1: [item1, item3], shopId2: [item2] }
    const groupItemsByShop = {}
    items.forEach((item) => {
        const shopId = item.shop._id.toString()
        if (!groupItemsByShop[shopId]) {
            groupItemsByShop[shopId] = []
        }
        groupItemsByShop[shopId].push(item)
    })

    const shopOrder = Object.values(groupItemsByShop).map((shopItems) => {
        const shopOrderItems = shopItems.map((item) => ({
            item: item._id,
            name: item.name,
            image: item.image,
            price: item.price,
            quantity: quantities.get(item._id.toString()),
        }))
        return {
            shop: shopItems[0].shop._id,
            owner: shopItems[0].shop.owner,
            subtotal: roundAmount(shopOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)),
            shopOrderItems,
        }
    })
    return { shopOrder, subtotal: roundAmount(shopOrder.reduce((sum, part) => sum + part.subtotal, 0)) }
}

// Checks a coupon against the cart before ordering, so checkout can show the discount.
export const quoteCoupon = async (req, res) => {
    try {
        const { subtotal } = await priceCart(req.body.cartItems)
        const coupon = await applyCoupon(req.body.couponCode, subtotal, req.userId)
        return res.status(200).json({
            coupon,
            subtotal,
            deliveryFee: DELIVERY_FEE,
            totalAmount: roundAmount(subtotal - coupon.discount + DELIVERY_FEE),
        })
    } catch (error) {
        if (error instanceof CartError || error instanceof CouponError) {
            return res.status(400).json({ message: error.message })
        }
        console.error("Quote coupon error:", error)
        return res.status(500).json({ message: "Unable to apply the coupon." })
    }
}

export const getCoupons = (req, res) => res.status(200).json({ coupons: listCoupons() })

export const placeOrder = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("role")
        if (user?.role !== "user") {
            return res.status(403).json({ message: "Only customers can place orders." })
        }

        const { cartItems, paymentMethod, deliveryAddress } = req.body
        if (!["cod", "online"].includes(paymentMethod)) {
            return res.status(400).json({ message: "Please choose a valid payment method." })
        }
        if (paymentMethod === "online" && !isRazorpayConfigured()) {
            return res.status(503).json({ message: "Online payment is not configured on the server." })
        }
        const addressText = typeof deliveryAddress?.text === "string" ? deliveryAddress.text.trim() : ""
        const latitude = Number(deliveryAddress?.latitude)
        const longitude = Number(deliveryAddress?.longitude)
        if (
            !addressText ||
            deliveryAddress.latitude == null || deliveryAddress.longitude == null ||
            !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
            Math.abs(latitude) > 90 || Math.abs(longitude) > 180
        ) {
            return res.status(400).json({ message: "Send complete delivery address with location." })
        }

        const { shopOrder, subtotal } = await priceCart(cartItems)
        const coupon = req.body.couponCode ? await applyCoupon(req.body.couponCode, subtotal, req.userId) : null
        const discount = coupon?.discount ?? 0
        const order = await Order.create({
            user: req.userId,
            paymentMethod,
            deliveryAddress: { text: addressText, latitude, longitude },
            deliveryFee: DELIVERY_FEE,
            couponCode: coupon?.code,
            discount,
            totalAmount: roundAmount(subtotal - discount + DELIVERY_FEE),
            shopOrder,
        })

        if (paymentMethod === "online") {
            let razorpayOrder
            try {
                razorpayOrder = await createRazorpayOrder({
                    amount: order.totalAmount,
                    receipt: order._id.toString(),
                })
            } catch (error) {
                await Order.deleteOne({ _id: order._id })
                console.error("Razorpay order error:", error)
                return res.status(502).json({ message: "Unable to start online payment. Please try again." })
            }

            order.razorpayOrderId = razorpayOrder.id
            await order.save()
            return res.status(201).json({
                message: "Complete the payment to confirm your order.",
                order,
                razorpay: {
                    keyId: razorpayOrder.keyId,
                    orderId: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                },
            })
        }

        await order.populate("shopOrder.shop", "name")
        notifyShopOwners(order)
        return res.status(201).json({ message: "Order placed successfully.", order })
    } catch (error) {
        if (error instanceof mongoose.Error.ValidationError || error instanceof CartError || error instanceof CouponError) {
            return res.status(400).json({ message: error.message })
        }
        console.error("Place order error:", error)
        return res.status(500).json({ message: "Unable to place your order." })
    }
}

export const verifyPayment = async (req, res) => {
    try {
        const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body
        if (!mongoose.isValidObjectId(orderId) || typeof razorpayOrderId !== "string" ||
            typeof razorpayPaymentId !== "string") {
            return res.status(400).json({ message: "Payment details are incomplete." })
        }

        const order = await Order.findOne({ _id: orderId, user: req.userId, paymentMethod: "online" })
        if (!order || order.razorpayOrderId !== razorpayOrderId) {
            return res.status(404).json({ message: "Order not found for this payment." })
        }
        if (order.paymentStatus === "paid") {
            await order.populate("shopOrder.shop", "name")
            return res.status(200).json({ message: "Payment already verified.", order })
        }

        if (!isValidRazorpaySignature({ razorpayOrderId, razorpayPaymentId, signature: razorpaySignature })) {
            order.paymentStatus = "failed"
            await order.save()
            return res.status(400).json({ message: "Payment verification failed." })
        }

        order.paymentStatus = "paid"
        order.razorpayPaymentId = razorpayPaymentId
        await order.save()
        await order.populate("shopOrder.shop", "name")
        notifyShopOwners(order)
        return res.status(200).json({ message: "Payment successful. Order placed.", order })
    } catch (error) {
        console.error("Verify payment error:", error)
        return res.status(500).json({ message: "Unable to verify the payment." })
    }
}

// Status an owner may move a shop order to from its current status (forward only).
// "delivered" is never the owner's choice: only the delivery boy sets it, with the customer's OTP.
const allowedNextStatuses = {
    pending: ["preparing", "out-for-delivery", "cancelled"],
    preparing: ["out-for-delivery", "cancelled"],
    "out-for-delivery": [],
    delivered: [],
    cancelled: [],
}

export const getOwnerOrders = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("role")
        if (user?.role !== "owner") {
            return res.status(403).json({ message: "Only shop owners can view shop orders." })
        }

        const orders = await Order.find({
            "shopOrder.owner": req.userId,
            $or: [{ paymentMethod: "cod" }, { paymentStatus: "paid" }],
        })
            .sort({ createdAt: -1 })
            .populate("user", "fullName email mobile")
            .populate("shopOrder.shop", "name")
            .populate("shopOrder.assignedDeliveryBoy", "fullName mobile")
            .populate({
                path: "shopOrder.assignment",
                select: "status broadcastedTo",
                populate: { path: "broadcastedTo", select: "fullName mobile" },
            })
            .lean()

        // An owner only sees their own shops' parts of each order, one entry per shop.
        const ownerOrders = orders.flatMap((order) =>
            order.shopOrder
                .filter((part) => part.owner.toString() === req.userId)
                .map((shopOrder) => ({
                    _id: order._id,
                    user: order.user,
                    paymentMethod: order.paymentMethod,
                    paymentStatus: order.paymentStatus,
                    deliveryAddress: order.deliveryAddress,
                    createdAt: order.createdAt,
                    shopOrder,
                })),
        )

        return res.status(200).json({ orders: ownerOrders })
    } catch (error) {
        console.error("Get owner orders error:", error)
        return res.status(500).json({ message: "Unable to load shop orders." })
    }
}

export const updateShopOrderStatus = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.params
        const { status } = req.body
        if (!mongoose.isValidObjectId(orderId) || !mongoose.isValidObjectId(shopOrderId)) {
            return res.status(400).json({ message: "Invalid order ID." })
        }

        const order = await Order.findOne({ _id: orderId, "shopOrder._id": shopOrderId })
        const shopOrder = order?.shopOrder.id(shopOrderId)
        if (!shopOrder || shopOrder.owner.toString() !== req.userId) {
            return res.status(404).json({ message: "Order not found for your shop." })
        }
        if (!allowedNextStatuses[shopOrder.status]?.includes(status)) {
            return res.status(400).json({ message: `Cannot change status from ${shopOrder.status} to ${status}.` })
        }

        // Only changes if the status is still what we just checked, so a double click
        // cannot send the order out (and broadcast it) twice.
        const updated = await Order.findOneAndUpdate(
            { _id: orderId, shopOrder: { $elemMatch: { _id: shopOrderId, status: shopOrder.status } } },
            { $set: { "shopOrder.$.status": status } },
            { new: true },
        )
        if (!updated) {
            return res.status(409).json({ message: "This order was just updated. Please refresh and try again." })
        }
        const updatedShopOrder = updated.shopOrder.id(shopOrderId)
        emitToUser(updated.user, "order:updated", { orderId: updated._id })

        if (status === "out-for-delivery") {
            const { assignment, availableBoys } = await broadcastShopOrder(updated, updatedShopOrder)
            if (assignment) {
                updatedShopOrder.assignment = assignment._id
                await Order.updateOne(
                    { _id: orderId, "shopOrder._id": shopOrderId },
                    { $set: { "shopOrder.$.assignment": assignment._id } },
                )
                for (const boy of availableBoys) {
                    emitToUser(boy._id, "delivery:new", { assignmentId: assignment._id })
                }
            }
            return res.status(200).json({
                message: availableBoys.length > 0
                    ? `Order sent to ${availableBoys.length} nearby delivery boy(s).`
                    : "No delivery boys available nearby right now.",
                shopOrder: updatedShopOrder,
                assignedDeliveryBoy: updatedShopOrder.assignedDeliveryBoy,
                availableBoys,
                assignment: assignment?._id ?? null,
            })
        }

        return res.status(200).json({ message: "Order status updated.", shopOrder: updatedShopOrder })
    } catch (error) {
        console.error("Update order status error:", error)
        return res.status(500).json({ message: "Unable to update the order status." })
    }
}

export const getMyOrders = async (req, res) => {
    try {
        // Online orders whose payment never completed are not real orders.
        const orders = await Order.find({
            user: req.userId,
            $or: [{ paymentMethod: "cod" }, { paymentStatus: "paid" }],
        })
            .sort({ createdAt: -1 })
            .populate("shopOrder.shop", "name")
            .populate("shopOrder.assignedDeliveryBoy", "fullName mobile")
            .populate("user", "fullName email mobile")
        return res.status(200).json({ orders })
    } catch (error) {
        console.error("Get my orders error:", error)
        return res.status(500).json({ message: "Unable to load your orders." })
    }
}

// Where each shop's part of the order is: the delivery boy's live position once one is assigned.
export const getOrderTracking = async (req, res) => {
    try {
        const { orderId } = req.params
        if (!mongoose.isValidObjectId(orderId)) {
            return res.status(400).json({ message: "Invalid order." })
        }

        const order = await Order.findById(orderId)
            .populate("shopOrder.shop", "name location")
            .populate("shopOrder.assignedDeliveryBoy", "fullName mobile location")
            .lean()
        const isCustomer = order?.user.toString() === req.userId
        const isShopOwner = order?.shopOrder.some((part) => part.owner.toString() === req.userId)
        if (!order || (!isCustomer && !isShopOwner)) {
            return res.status(404).json({ message: "Order not found." })
        }

        const shopOrders = order.shopOrder
            // An owner only tracks their own shop's part.
            .filter((part) => isCustomer || part.owner.toString() === req.userId)
            .map((part) => {
                const boy = part.assignedDeliveryBoy
                // The rider's live position is shared only while they carry this order.
                const isOnTheWay = part.status === "out-for-delivery"
                const [longitude, latitude] = isOnTheWay ? boy?.location?.coordinates || [] : []
                const [shopLongitude, shopLatitude] = part.shop?.location?.coordinates || []
                return {
                    _id: part._id,
                    shopName: part.shop?.name,
                    shopLocation: shopLatitude != null ? { latitude: shopLatitude, longitude: shopLongitude } : null,
                    createdAt: part.createdAt,
                    status: part.status,
                    subtotal: part.subtotal,
                    shopOrderItems: part.shopOrderItems,
                    deliveryBoy: boy && {
                        _id: boy._id,
                        fullName: boy.fullName,
                        mobile: boy.mobile,
                        latitude,
                        longitude,
                    },
                }
            })

        return res.status(200).json({
            order: {
                _id: order._id,
                createdAt: order.createdAt,
                deliveryAddress: order.deliveryAddress,
                shopOrders,
            },
        })
    } catch (error) {
        console.error("Get order tracking error:", error)
        return res.status(500).json({ message: "Unable to load order tracking." })
    }
}

// The customer can cancel while no shop has started on the order yet.
export const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params
        if (!mongoose.isValidObjectId(orderId)) {
            return res.status(400).json({ message: "Invalid order." })
        }

        // Atomic: fails if any shop has moved past "pending" in the meantime.
        const order = await Order.findOneAndUpdate(
            {
                _id: orderId,
                user: req.userId,
                cancelledAt: null,
                shopOrder: { $not: { $elemMatch: { status: { $nin: ["pending", "cancelled"] } } } },
                $or: [{ paymentMethod: "cod" }, { paymentStatus: "paid" }],
            },
            { $set: { "shopOrder.$[].status": "cancelled", cancelledAt: new Date() } },
            { new: true },
        )
        if (!order) {
            return res.status(400).json({ message: "This order can no longer be cancelled; the shop has started on it." })
        }

        let message = "Order cancelled."
        if (order.paymentMethod === "online" && order.paymentStatus === "paid" && order.razorpayPaymentId) {
            try {
                await refundRazorpayPayment(order.razorpayPaymentId)
                order.paymentStatus = "refunded"
                await order.save()
                message = "Order cancelled. Your money will be refunded to the original payment method."
            } catch (error) {
                console.error("Refund error:", error)
                message = "Order cancelled. The refund could not start automatically; please contact support."
            }
        }

        for (const part of order.shopOrder) {
            emitToUser(part.owner, "order:updated", { orderId: order._id })
        }
        return res.status(200).json({ message, order })
    } catch (error) {
        console.error("Cancel order error:", error)
        return res.status(500).json({ message: "Unable to cancel the order." })
    }
}

// Once delivered, the customer rates each item (1-5) of a shop's part, once.
export const rateShopOrder = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.params
        if (!mongoose.isValidObjectId(orderId) || !mongoose.isValidObjectId(shopOrderId)) {
            return res.status(400).json({ message: "Invalid order." })
        }
        const ratings = req.body?.ratings
        const review = typeof req.body?.review === "string" ? req.body.review.trim().slice(0, 500) : ""
        if (!ratings || typeof ratings !== "object" || Array.isArray(ratings)) {
            return res.status(400).json({ message: "Rate at least one item." })
        }

        const existing = await Order.findOne({ _id: orderId, user: req.userId, "shopOrder._id": shopOrderId })
            .select("shopOrder._id shopOrder.shopOrderItems.item")
        const part = existing?.shopOrder.id(shopOrderId)
        if (!part) {
            return res.status(404).json({ message: "Order not found." })
        }
        const entries = part.shopOrderItems
            .map((orderItem) => [orderItem.item.toString(), Number(ratings[orderItem.item.toString()])])
            .filter(([, stars]) => Number.isInteger(stars) && stars >= 1 && stars <= 5)
        if (entries.length === 0) {
            return res.status(400).json({ message: "Give each item 1 to 5 stars." })
        }

        // Atomic: only a delivered, not-yet-rated part can be rated, so ratings count once.
        const $set = { "shopOrder.$[part].ratedAt": new Date(), "shopOrder.$[part].review": review }
        const arrayFilters = [{ "part._id": part._id }]
        entries.forEach(([itemId, stars], index) => {
            $set[`shopOrder.$[part].shopOrderItems.$[item${index}].rating`] = stars
            arrayFilters.push({ [`item${index}.item`]: new mongoose.Types.ObjectId(itemId) })
        })
        const updated = await Order.findOneAndUpdate(
            {
                _id: orderId,
                user: req.userId,
                shopOrder: { $elemMatch: { _id: part._id, status: "delivered", ratedAt: null } },
            },
            { $set },
            { arrayFilters, new: true },
        )
        if (!updated) {
            return res.status(400).json({ message: "You can rate an order once, after it is delivered." })
        }

        // Running average: new average = (average * count + stars) / (count + 1).
        await Promise.all(
            entries.map(([itemId, stars]) =>
                Item.updateOne({ _id: itemId }, [
                    {
                        $set: {
                            "rating.average": {
                                $divide: [
                                    { $add: [{ $multiply: ["$rating.average", "$rating.count"] }, stars] },
                                    { $add: ["$rating.count", 1] },
                                ],
                            },
                            "rating.count": { $add: ["$rating.count", 1] },
                        },
                    },
                ], { updatePipeline: true }),
            ),
        )

        return res.status(200).json({ message: "Thanks for rating!", shopOrder: updated.shopOrder.id(shopOrderId) })
    } catch (error) {
        console.error("Rate order error:", error)
        return res.status(500).json({ message: "Unable to save your rating." })
    }
}

const MAX_STATS_WINDOW_MS = 48 * 60 * 60 * 1000

// Today's orders, sales and best sellers for the owner's shops; the client sends its local midnight.
export const getOwnerStats = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("role")
        if (user?.role !== "owner") {
            return res.status(403).json({ message: "Only shop owners can view sales." })
        }
        const since = new Date(req.query.since)
        if (Number.isNaN(since.getTime()) || Date.now() - since.getTime() > MAX_STATS_WINDOW_MS) {
            return res.status(400).json({ message: "A valid start of today is required." })
        }

        const orders = await Order.find({
            "shopOrder.owner": req.userId,
            createdAt: { $gte: since },
            $or: [{ paymentMethod: "cod" }, { paymentStatus: "paid" }],
        })
            .select("createdAt shopOrder.owner shopOrder.status shopOrder.subtotal shopOrder.shopOrderItems")
            .lean()

        const parts = orders.flatMap((order) =>
            order.shopOrder
                .filter((part) => part.owner.toString() === req.userId && part.status !== "cancelled")
                .map((part) => ({ ...part, createdAt: order.createdAt })),
        )
        const itemTotals = new Map()
        for (const part of parts) {
            for (const orderItem of part.shopOrderItems) {
                const key = orderItem.item.toString()
                const current = itemTotals.get(key) || { name: orderItem.name, quantity: 0, sales: 0 }
                current.quantity += orderItem.quantity
                current.sales += orderItem.price * orderItem.quantity
                itemTotals.set(key, current)
            }
        }

        return res.status(200).json({
            orderTimes: parts.map((part) => part.createdAt),
            orderCount: parts.length,
            deliveredCount: parts.filter((part) => part.status === "delivered").length,
            sales: roundAmount(parts.reduce((sum, part) => sum + part.subtotal, 0)),
            topItems: [...itemTotals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
        })
    } catch (error) {
        console.error("Owner stats error:", error)
        return res.status(500).json({ message: "Unable to load today's sales." })
    }
}
