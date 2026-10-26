import crypto from "crypto"
import mongoose from "mongoose"
import DeliveryAssignment from "../models/deliveryAssignment.model.js"
import Order from "../models/order.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"
import { sendDeliveryOtpMail } from "../utils/mail.js"
import { emitToUser } from "../utils/socket.js"

// Tells the customer and the shop owner that this delivery changed.
const notifyOrderParties = async (assignment, event) => {
    const order = await Order.findById(assignment.order).select("user shopOrder._id shopOrder.owner")
    if (!order) return
    const shopOrder = order.shopOrder.id(assignment.shopOrderId)
    emitToUser(order.user, event, { orderId: order._id })
    emitToUser(shopOrder?.owner, event, { orderId: order._id })
}

// Matches NEARBY_RADIUS_KM in shop.controllers.js: any shop a customer can order from can find a rider.
const NEARBY_DELIVERY_RADIUS_METERS = 20000

const ensureDeliveryBoy = async (userId) => {
    const user = await User.findById(userId).select("role")
    return user?.role === "deliveryBoy"
}

// Offers one shop's part of an order to free delivery boys near the pickup shop,
// since the rider has to collect the food there first. Falls back to the delivery address.
export const broadcastShopOrder = async (order, shopOrder) => {
    const shop = await Shop.findById(shopOrder.shop).select("location")
    const { longitude, latitude } = order.deliveryAddress
    const coordinates = shop?.location?.coordinates?.length === 2
        ? shop.location.coordinates
        : [Number(longitude), Number(latitude)]

    const nearByDeliveryBoys = await User.find({
        role: "deliveryBoy",
        location: {
            $near: {
                $geometry: { type: "Point", coordinates },
                $maxDistance: NEARBY_DELIVERY_RADIUS_METERS,
            },
        },
    }).select("fullName mobile location")

    const nearByIds = nearByDeliveryBoys.map((boy) => boy._id)
    const busyIds = await DeliveryAssignment.distinct("assignedTo", {
        assignedTo: { $in: nearByIds },
        status: "assigned",
    })
    const busyIdSet = new Set(busyIds.map((id) => id.toString()))
    const availableBoys = nearByDeliveryBoys
        .filter((boy) => !busyIdSet.has(boy._id.toString()))
        .map((boy) => ({
            _id: boy._id,
            fullName: boy.fullName,
            mobile: boy.mobile,
            longitude: boy.location?.coordinates?.[0],
            latitude: boy.location?.coordinates?.[1],
        }))

    // Created even with nobody nearby yet: delivery boys who come online later pick it up.
    const assignment = await DeliveryAssignment.create({
        order: order._id,
        shop: shopOrder.shop,
        shopOrderId: shopOrder._id,
        broadcastedTo: availableBoys.map((boy) => boy._id),
    })
    return { assignment, availableBoys }
}

const populateAssignment = (query) =>
    query
        .populate("shop", "name address location")
        .populate({ path: "order", populate: { path: "user", select: "fullName mobile" } })
        .lean()

// Shapes an assignment with only the shop part the delivery boy needs.
const toDeliveryView = (assignment) => {
    const shopOrder = assignment.order?.shopOrder?.find(
        (part) => part._id.toString() === assignment.shopOrderId.toString(),
    )
    return {
        _id: assignment._id,
        status: assignment.status,
        createdAt: assignment.createdAt,
        acceptedAt: assignment.acceptedAt,
        shop: assignment.shop,
        shopName: assignment.shop?.name,
        items: shopOrder?.shopOrderItems || [],
        subtotal: shopOrder?.subtotal,
        orderId: assignment.order?._id,
        customer: assignment.order?.user,
        deliveryAddress: assignment.order?.deliveryAddress,
        paymentMethod: assignment.order?.paymentMethod,
        shopOrder: shopOrder && {
            _id: shopOrder._id,
            status: shopOrder.status,
            subtotal: shopOrder.subtotal,
            shopOrderItems: shopOrder.shopOrderItems,
        },
    }
}

export const getDeliveryAssignments = async (req, res) => {
    try {
        if (!(await ensureDeliveryBoy(req.userId))) {
            return res.status(403).json({ message: "Only delivery boys can view delivery requests." })
        }

        // A delivery boy who comes online after an order was broadcast should still see it,
        // so open requests from nearby shops are offered to them too.
        const deliveryBoy = await User.findById(req.userId).select("location")
        const [longitude, latitude] = deliveryBoy?.location?.coordinates || []
        const hasLocation = Number.isFinite(longitude) && Number.isFinite(latitude) && !(longitude === 0 && latitude === 0)
        if (hasLocation) {
            const nearbyShopIds = await Shop.find({
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [longitude, latitude] },
                        $maxDistance: NEARBY_DELIVERY_RADIUS_METERS,
                    },
                },
            }).distinct("_id")
            await DeliveryAssignment.updateMany(
                { status: "broadcasted", shop: { $in: nearbyShopIds }, broadcastedTo: { $ne: req.userId } },
                { $addToSet: { broadcastedTo: req.userId } },
            )
        }

        const assignments = await populateAssignment(
            DeliveryAssignment.find({ broadcastedTo: req.userId, status: "broadcasted" }).sort({ createdAt: -1 }),
        )
        return res.status(200).json({ assignments: assignments.map(toDeliveryView) })
    } catch (error) {
        console.error("Get delivery assignments error:", error)
        return res.status(500).json({ message: "Unable to load delivery requests." })
    }
}

export const getCurrentDelivery = async (req, res) => {
    try {
        if (!(await ensureDeliveryBoy(req.userId))) {
            return res.status(403).json({ message: "Only delivery boys can view deliveries." })
        }

        const assignment = await populateAssignment(
            DeliveryAssignment.findOne({ assignedTo: req.userId, status: "assigned" }),
        )
        return res.status(200).json({ delivery: assignment ? toDeliveryView(assignment) : null })
    } catch (error) {
        console.error("Get current delivery error:", error)
        return res.status(500).json({ message: "Unable to load your current delivery." })
    }
}

export const acceptDeliveryAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params
        if (!mongoose.isValidObjectId(assignmentId)) {
            return res.status(400).json({ message: "Invalid delivery request." })
        }
        if (!(await ensureDeliveryBoy(req.userId))) {
            return res.status(403).json({ message: "Only delivery boys can accept deliveries." })
        }
        if (await DeliveryAssignment.exists({ assignedTo: req.userId, status: "assigned" })) {
            return res.status(400).json({ message: "Finish your current delivery before accepting another." })
        }

        // Atomic: only the first delivery boy to accept gets the order. The unique
        // "one_active_delivery_per_boy" index rejects a second accept sent at the same moment.
        let assignment
        try {
            assignment = await DeliveryAssignment.findOneAndUpdate(
                { _id: assignmentId, status: "broadcasted", broadcastedTo: req.userId },
                { status: "assigned", assignedTo: req.userId, acceptedAt: new Date() },
                { new: true },
            )
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({ message: "Finish your current delivery before accepting another." })
            }
            throw error
        }
        if (!assignment) {
            return res.status(409).json({ message: "This order was already taken by another delivery boy." })
        }

        await Order.updateOne(
            { _id: assignment.order, "shopOrder._id": assignment.shopOrderId },
            { $set: { "shopOrder.$.assignedDeliveryBoy": req.userId } },
        )
        await notifyOrderParties(assignment, "order:updated")
        for (const boyId of assignment.broadcastedTo) {
            if (boyId.toString() !== req.userId) {
                emitToUser(boyId, "delivery:updated", { assignmentId: assignment._id })
            }
        }

        const delivery = await populateAssignment(DeliveryAssignment.findById(assignment._id))
        return res.status(200).json({ message: "Delivery accepted.", delivery: toDeliveryView(delivery) })
    } catch (error) {
        console.error("Accept delivery error:", error)
        return res.status(500).json({ message: "Unable to accept the delivery." })
    }
}

const DELIVERY_OTP_TTL_MS = 5 * 60 * 1000
const MAX_DELIVERY_OTP_ATTEMPTS = 5
// Limits on resending, so the 4-digit OTP cannot be guessed by sending again and again.
const DELIVERY_OTP_RESEND_COOLDOWN_MS = 60 * 1000
const MAX_DELIVERY_OTP_SENDS = 5

const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex")

const findActiveDelivery = (assignmentId, userId) =>
    DeliveryAssignment.findOne({ _id: assignmentId, assignedTo: userId, status: "assigned" })

// Step 1 of finishing a delivery: email the customer an OTP.
export const sendDeliveryOtp = async (req, res) => {
    try {
        const { assignmentId } = req.params
        if (!mongoose.isValidObjectId(assignmentId)) {
            return res.status(400).json({ message: "Invalid delivery." })
        }

        const assignment = await findActiveDelivery(assignmentId, req.userId)
        if (!assignment) {
            return res.status(404).json({ message: "Active delivery not found." })
        }
        const order = await Order.findById(assignment.order).populate("user", "fullName email")
        if (!order?.user?.email) {
            return res.status(400).json({ message: "The customer has no email to send the OTP to." })
        }

        const otp = crypto.randomInt(1000, 10000).toString()
        const now = new Date()
        // Claimed atomically, so parallel requests cannot skip the cooldown or the limit.
        const claimed = await DeliveryAssignment.findOneAndUpdate(
            {
                _id: assignment._id,
                status: "assigned",
                deliveryOtpSendCount: { $not: { $gte: MAX_DELIVERY_OTP_SENDS } },
                $or: [
                    { deliveryOtpSentAt: { $exists: false } },
                    { deliveryOtpSentAt: null },
                    { deliveryOtpSentAt: { $lte: new Date(now.getTime() - DELIVERY_OTP_RESEND_COOLDOWN_MS) } },
                ],
            },
            {
                $set: {
                    deliveryOtpHash: hashOtp(otp),
                    deliveryOtpExpiresAt: new Date(now.getTime() + DELIVERY_OTP_TTL_MS),
                    deliveryOtpSentAt: now,
                    deliveryOtpAttempts: 0,
                },
                $inc: { deliveryOtpSendCount: 1 },
            },
        )
        if (!claimed) {
            return res.status(429).json({
                message: (assignment.deliveryOtpSendCount || 0) >= MAX_DELIVERY_OTP_SENDS
                    ? "OTP limit reached for this order. Please contact the shop."
                    : "Please wait a minute before sending another OTP.",
            })
        }
        await sendDeliveryOtpMail(order.user.email, otp, order.user.fullName)

        return res.status(200).json({ message: `OTP sent to ${order.user.fullName}.`, customerName: order.user.fullName })
    } catch (error) {
        console.error("Send delivery OTP error:", error)
        return res.status(500).json({ message: "Unable to send the OTP. Please try again." })
    }
}

// Step 2: the OTP the customer shares proves the food reached them.
export const verifyDeliveryOtp = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const otp = String(req.body?.otp ?? "").trim()
        if (!mongoose.isValidObjectId(assignmentId)) {
            return res.status(400).json({ message: "Invalid delivery." })
        }
        if (!/^\d{4}$/.test(otp)) {
            return res.status(400).json({ message: "Enter the 4-digit OTP." })
        }

        if (!(await findActiveDelivery(assignmentId, req.userId))) {
            return res.status(404).json({ message: "Active delivery not found." })
        }
        // Each try is counted atomically before checking, so many requests sent at once
        // still get only MAX_DELIVERY_OTP_ATTEMPTS guesses.
        const assignment = await DeliveryAssignment.findOneAndUpdate(
            {
                _id: assignmentId,
                assignedTo: req.userId,
                status: "assigned",
                deliveryOtpHash: { $exists: true, $ne: null },
                deliveryOtpExpiresAt: { $gt: new Date() },
                deliveryOtpAttempts: { $lt: MAX_DELIVERY_OTP_ATTEMPTS },
            },
            { $inc: { deliveryOtpAttempts: 1 } },
            { new: true },
        ).select("+deliveryOtpHash")
        if (!assignment) {
            return res.status(400).json({ message: "OTP expired or too many wrong tries. Send a new OTP." })
        }

        const isMatch = crypto.timingSafeEqual(
            Buffer.from(hashOtp(otp), "hex"),
            Buffer.from(assignment.deliveryOtpHash, "hex"),
        )
        if (!isMatch) {
            if (assignment.deliveryOtpAttempts >= MAX_DELIVERY_OTP_ATTEMPTS) {
                await DeliveryAssignment.updateOne(
                    { _id: assignment._id },
                    { $unset: { deliveryOtpHash: 1, deliveryOtpExpiresAt: 1 } },
                )
                return res.status(400).json({ message: "Too many wrong tries. Send a new OTP." })
            }
            return res.status(400).json({ message: "Wrong OTP. Try again." })
        }

        await Order.updateOne(
            { _id: assignment.order, "shopOrder._id": assignment.shopOrderId },
            { $set: { "shopOrder.$.status": "delivered", "shopOrder.$.deliveredAt": new Date() } },
        )
        assignment.status = "completed"
        assignment.completedAt = new Date()
        assignment.deliveryOtpHash = undefined
        assignment.deliveryOtpExpiresAt = undefined
        await assignment.save()

        // Cash is collected at the door: once every shop's part has arrived, the order is paid.
        const order = await Order.findById(assignment.order).select("paymentMethod paymentStatus shopOrder.status")
        const isFinished = order?.shopOrder.every((part) => ["delivered", "cancelled"].includes(part.status))
        if (order?.paymentMethod === "cod" && order.paymentStatus !== "paid" && isFinished) {
            order.paymentStatus = "paid"
            await order.save()
        }
        await notifyOrderParties(assignment, "order:updated")

        return res.status(200).json({ message: "Order delivered." })
    } catch (error) {
        console.error("Verify delivery OTP error:", error)
        return res.status(500).json({ message: "Unable to mark the order as delivered." })
    }
}

// What a delivery boy earns for each completed delivery.
const EARNING_PER_DELIVERY = 50
const MAX_STATS_WINDOW_MS = 48 * 60 * 60 * 1000

// Today's completed deliveries; the client sends its own local midnight as `since`.
export const getTodayStats = async (req, res) => {
    try {
        if (!(await ensureDeliveryBoy(req.userId))) {
            return res.status(403).json({ message: "Only delivery boys can view delivery stats." })
        }

        const since = new Date(req.query.since)
        if (Number.isNaN(since.getTime()) || Date.now() - since.getTime() > MAX_STATS_WINDOW_MS) {
            return res.status(400).json({ message: "A valid start of today is required." })
        }

        const completed = await DeliveryAssignment.find({
            assignedTo: req.userId,
            status: "completed",
            $or: [
                { completedAt: { $gte: since } },
                // Deliveries finished before completedAt existed.
                { completedAt: { $exists: false }, updatedAt: { $gte: since } },
            ],
        })
            .select("completedAt updatedAt")
            .lean()

        const deliveredAt = completed.map((assignment) => assignment.completedAt || assignment.updatedAt)
        return res.status(200).json({
            deliveredAt,
            count: deliveredAt.length,
            earningPerDelivery: EARNING_PER_DELIVERY,
            earning: deliveredAt.length * EARNING_PER_DELIVERY,
        })
    } catch (error) {
        console.error("Get today delivery stats error:", error)
        return res.status(500).json({ message: "Unable to load today's deliveries." })
    }
}
