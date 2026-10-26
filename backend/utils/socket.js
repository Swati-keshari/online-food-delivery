import jwt from "jsonwebtoken"
import { Server } from "socket.io"

let io = null

const getCookie = (cookieHeader, name) => {
    for (const part of (cookieHeader || "").split(";")) {
        const [key, ...value] = part.trim().split("=")
        if (key === name) return decodeURIComponent(value.join("="))
    }
    return null
}

// Each logged-in user joins their own room, so events can be sent to one person.
export const initSocket = (server, isAllowedOrigin) => {
    io = new Server(server, {
        cors: {
            origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
            credentials: true,
        },
    })

    io.use((socket, next) => {
        try {
            const token = getCookie(socket.handshake.headers.cookie, "token")
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            socket.userId = decoded.userId
            return next()
        } catch {
            return next(new Error("Authentication required."))
        }
    })

    io.on("connection", (socket) => {
        socket.join(`user:${socket.userId}`)
    })

    return io
}

export const emitToUser = (userId, event, payload = {}) => {
    if (!io || !userId) return
    io.to(`user:${userId.toString()}`).emit(event, payload)
}
