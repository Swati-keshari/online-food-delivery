import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import path from "node:path"
import { fileURLToPath } from "node:url"
dotenv.config()
const app=express()
import cookieParser from "cookie-parser"
import authRouther from "./routes/auth.routes.js"
import userRouter from "./routes/user.routes.js"
import shopRouter from "./routes/shop.routes.js"
import itemRouter from "./routes/item.routes.js"
import orderRouter from "./routes/order.routes.js"
import deliveryRouter from "./routes/delivery.routes.js"
import cors from "cors"
import http from "node:http"
import { initSocket } from "./utils/socket.js"


const port=process.env.PORT || 8000
const publicDirectory = fileURLToPath(new URL("./public/", import.meta.url))
const isAllowedOrigin = (origin) => {
    const isLocalFrontend = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "")
    return !origin || isLocalFrontend || origin === process.env.FRONTEND_URL
}
// golble middleware
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            return callback(null, true)
        }
        return callback(new Error("Origin is not allowed by CORS."))
    },
    credentials:true
}))
app.use("/uploads", express.static(path.join(publicDirectory, "uploads")))
app.use("/api/auth",authRouther)
app.use("/api/user", userRouter)
app.use("/api/shops", shopRouter)
app.use("/api/items", itemRouter)
app.use("/api/orders", orderRouter)
app.use("/api/delivery", deliveryRouter)
        const startServer = async () => {
            try {
                await connectDb()
                const server = http.createServer(app)
                initSocket(server, isAllowedOrigin)
                server.listen(port, () => {
                    console.log(`server is started at ${port}`)
                })
            } catch (error) {
                console.error(`Server startup failed: ${error.message}`)
                process.exitCode = 1
            }
        }

        startServer()
