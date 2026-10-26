import { createHmac, timingSafeEqual } from "node:crypto"

const getRazorpayKeys = () => {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay is not configured.")
    }
    return { keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET }
}

export const isRazorpayConfigured = () =>
    Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)

// amount is in rupees; Razorpay expects paise.
export const createRazorpayOrder = async ({ amount, receipt }) => {
    const { keyId, keySecret } = getRazorpayKeys()
    const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        },
        body: JSON.stringify({
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt,
        }),
    })
    const result = await response.json()
    if (!response.ok) {
        throw new Error(result.error?.description || "Razorpay order could not be created.")
    }
    return { ...result, keyId }
}

export const isValidRazorpaySignature = ({ razorpayOrderId, razorpayPaymentId, signature }) => {
    const { keySecret } = getRazorpayKeys()
    if (typeof signature !== "string") return false

    const expected = createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex")
    const expectedBuffer = Buffer.from(expected)
    const signatureBuffer = Buffer.from(signature)
    return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer)
}

// Full refund of a captured payment (used when the customer cancels a paid order).
export const refundRazorpayPayment = async (paymentId) => {
    const { keyId, keySecret } = getRazorpayKeys()
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        },
        body: JSON.stringify({}),
    })
    const result = await response.json()
    if (!response.ok) {
        throw new Error(result.error?.description || "Razorpay refund failed.")
    }
    return result
}
