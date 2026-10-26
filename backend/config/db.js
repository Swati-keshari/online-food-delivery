import mongoose from "mongoose";
const connectDb=async() => {
    const mongoUrl = process.env.MONGODB_URL
    if (!mongoUrl) {
        throw new Error("MONGODB_URL is not set in the backend environment.")
    }

    try {
        await mongoose.connect(mongoUrl)
        console.log("db connected")
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const safeMessage = message.replace(/mongodb(?:\+srv)?:\/\/[^\s"'`]+/gi, "[MongoDB URI redacted]")
        console.error(`Database connection failed (${error.name || "Error"}): ${safeMessage}`)
        throw new Error("Database connection failed. See the server log for details.")
    }
}
export default connectDb