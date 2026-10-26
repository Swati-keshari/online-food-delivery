import express from "express"
import {
    cancelOrder,
    getCoupons,
    getMyOrders,
    getOwnerStats,
    quoteCoupon,
    rateShopOrder,
    getOrderTracking,
    getOwnerOrders,
    placeOrder,
    updateShopOrderStatus,
    verifyPayment,
} from "../controllers/order.controllers.js"
import isAuth from "../middleware/isAuth.js"

const orderRouter = express.Router()

orderRouter.post("/", isAuth, placeOrder)
orderRouter.post("/verify-payment", isAuth, verifyPayment)
orderRouter.get("/my-orders", isAuth, getMyOrders)
orderRouter.get("/coupons", isAuth, getCoupons)
orderRouter.post("/coupons/apply", isAuth, quoteCoupon)
orderRouter.get("/owner-stats", isAuth, getOwnerStats)
orderRouter.post("/:orderId/cancel", isAuth, cancelOrder)
orderRouter.post("/:orderId/shop-orders/:shopOrderId/rate", isAuth, rateShopOrder)
orderRouter.get("/owner-orders", isAuth, getOwnerOrders)
orderRouter.get("/:orderId/track", isAuth, getOrderTracking)
orderRouter.patch("/:orderId/shop-orders/:shopOrderId/status", isAuth, updateShopOrderStatus)

export default orderRouter
