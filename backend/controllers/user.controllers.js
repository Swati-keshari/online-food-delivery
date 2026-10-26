import mongoose from "mongoose"
import DeliveryAssignment from "../models/deliveryAssignment.model.js"
import Order from "../models/order.model.js"
import User from "../models/user.model.js"
import { emitToUser } from "../utils/socket.js"

export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("fullName email mobile role addresses")
        if (!user) {
            return res.status(404).json({ message: "User account was not found." })
        }

        return res.status(200).json({ user })
    } catch (error) {
        console.error("Get current user error:", error)
        return res.status(500).json({ message: "Unable to load the current user." })
    }
}

export const updateUserLocation = async (req, res) => {
    try {
        const { lat, lon } = req.body ?? {}
        const latitude = Number(lat)
        const longitude = Number(lon)
        if (
            lat == null || lon == null ||
            !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
            Math.abs(latitude) > 90 || Math.abs(longitude) > 180
        ) {
            return res.status(400).json({ message: "Valid latitude and longitude are required." })
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { location: { type: "Point", coordinates: [longitude, latitude] } },
            { new: true },
        ).select("location")
        if (!user) {
            return res.status(404).json({ message: "User account was not found." })
        }

        // A delivery boy on a delivery: the customer and shop owner watch them move live.
        const assignment = await DeliveryAssignment.findOne({ assignedTo: req.userId, status: "assigned" })
            .select("order shopOrderId")
        if (assignment) {
            const order = await Order.findById(assignment.order).select("user shopOrder._id shopOrder.owner")
            if (order) {
                const payload = {
                    orderId: order._id,
                    shopOrderId: assignment.shopOrderId,
                    deliveryBoyId: req.userId,
                    latitude,
                    longitude,
                }
                emitToUser(order.user, "delivery:location", payload)
                emitToUser(order.shopOrder.id(assignment.shopOrderId)?.owner, "delivery:location", payload)
            }
        }

        return res.status(200).json({ message: "Location updated.", location: user.location })
    } catch (error) {
        console.error("Update location error:", error)
        return res.status(500).json({ message: "Unable to update the location." })
    }
}

const MAX_SAVED_ADDRESSES = 5

export const updateProfile = async (req, res) => {
    try {
        const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : ""
        const mobile = typeof req.body?.mobile === "string" ? req.body.mobile.trim() : ""
        if (fullName.length < 2 || fullName.length > 60) {
            return res.status(400).json({ message: "Name must be 2 to 60 characters." })
        }
        if (!/^\+?\d{10,13}$/.test(mobile)) {
            return res.status(400).json({ message: "Enter a valid mobile number (10 to 13 digits)." })
        }
        const user = await User.findByIdAndUpdate(req.userId, { fullName, mobile }, { new: true, runValidators: true })
            .select("fullName email mobile role addresses")
        if (!user) {
            return res.status(404).json({ message: "User account was not found." })
        }
        return res.status(200).json({ message: "Profile updated.", user })
    } catch (error) {
        console.error("Update profile error:", error)
        return res.status(500).json({ message: "Unable to update your profile." })
    }
}

export const addAddress = async (req, res) => {
    try {
        const label = typeof req.body?.label === "string" && req.body.label.trim() ? req.body.label.trim() : "Home"
        const text = typeof req.body?.text === "string" ? req.body.text.trim() : ""
        const latitude = Number(req.body?.latitude)
        const longitude = Number(req.body?.longitude)
        if (!text || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
            Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            return res.status(400).json({ message: "Send the address with its location." })
        }
        // Atomic limit check, so parallel saves cannot go past the maximum.
        const user = await User.findOneAndUpdate(
            { _id: req.userId, [`addresses.${MAX_SAVED_ADDRESSES - 1}`]: { $exists: false } },
            { $push: { addresses: { label: label.slice(0, 30), text: text.slice(0, 300), latitude, longitude } } },
            { new: true, runValidators: true },
        ).select("addresses")
        if (!user) {
            return res.status(400).json({ message: `You can save up to ${MAX_SAVED_ADDRESSES} addresses.` })
        }
        return res.status(201).json({ message: "Address saved.", addresses: user.addresses })
    } catch (error) {
        console.error("Add address error:", error)
        return res.status(500).json({ message: "Unable to save the address." })
    }
}

export const deleteAddress = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.addressId)) {
            return res.status(400).json({ message: "Invalid address." })
        }
        const user = await User.findByIdAndUpdate(
            req.userId,
            { $pull: { addresses: { _id: req.params.addressId } } },
            { new: true },
        ).select("addresses")
        if (!user) {
            return res.status(404).json({ message: "User account was not found." })
        }
        return res.status(200).json({ message: "Address removed.", addresses: user.addresses })
    } catch (error) {
        console.error("Delete address error:", error)
        return res.status(500).json({ message: "Unable to remove the address." })
    }
}
