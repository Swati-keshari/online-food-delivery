import express from "express"
import {
    acceptDeliveryAssignment,
    getCurrentDelivery,
    getDeliveryAssignments,
    getTodayStats,
    sendDeliveryOtp,
    verifyDeliveryOtp,
} from "../controllers/delivery.controllers.js"
import isAuth from "../middleware/isAuth.js"

const deliveryRouter = express.Router()

deliveryRouter.get("/assignments", isAuth, getDeliveryAssignments)
deliveryRouter.get("/current", isAuth, getCurrentDelivery)
deliveryRouter.get("/today-stats", isAuth, getTodayStats)
deliveryRouter.post("/assignments/:assignmentId/accept", isAuth, acceptDeliveryAssignment)
// Delivered only after the customer's OTP is verified.
deliveryRouter.post("/assignments/:assignmentId/send-otp", isAuth, sendDeliveryOtp)
deliveryRouter.post("/assignments/:assignmentId/verify-otp", isAuth, verifyDeliveryOtp)

export default deliveryRouter
