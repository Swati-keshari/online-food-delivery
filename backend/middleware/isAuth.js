import jwt from "jsonwebtoken"

const isAuth = (req, res, next) => {
    const token = req.cookies?.token
    if (!token) {
        return res.status(401).json({ message: "Authentication required. Please sign in." })
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
        console.error("JWT_SECRET is not configured.")
        return res.status(500).json({ message: "Authentication is not configured on the server." })
    }

    try {
        const decoded = jwt.verify(token, secret)
        if (typeof decoded === "string" || typeof decoded.userId !== "string") {
            return res.status(401).json({ message: "Invalid authentication token. Please sign in again." })
        }

        req.userId = decoded.userId //auth ka midddleware
        return next()
    } catch {
        return res.status(401).json({ message: "Your session is invalid or expired. Please sign in again." })
    }
}

export default isAuth